// ─── MediProof Midnight Service ───────────────────────────────────────────────
// Node.js middleware that bridges the Python backend and the Midnight Network.
//
// Why a separate service?
//   The Midnight SDK ships WASM + Node.js-only modules (fs, path, crypto) that
//   cannot run inside FastAPI/Python. This service runs in Node.js where those
//   modules are available natively.
//
// Architecture:
//   Backend (FastAPI:8000)
//     → calls this service (midnight-service:6300)
//   This service
//     → @midnight-ntwrk/* SDK (WASM, Node.js)
//     → Proof server (localhost:6301) — always local, HIPAA privacy requirement
//     → Midnight testnet or local node
//
// Mock mode (default): sha256 hashes computed locally, no proof server needed.
// Real mode: actual ZK circuits invoked via Midnight SDK + proof server.
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id'

// ── Structured logger ────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',  bold:   '\x1b[1m',
  grey:   '\x1b[90m', cyan:   '\x1b[36m', green:  '\x1b[32m',
  yellow: '\x1b[33m', red:    '\x1b[31m', magenta:'\x1b[35m',
}
function ts() { return new Date().toTimeString().slice(0,8) }
const log = {
  info:  (tag, msg) => console.log(`${C.grey}${ts()}${C.reset} ${C.green}INFO ${C.reset} ${C.magenta}[${tag}]${C.reset} ${msg}`),
  warn:  (tag, msg) => console.log(`${C.grey}${ts()}${C.reset} ${C.yellow}WARN ${C.reset} ${C.magenta}[${tag}]${C.reset} ${msg}`),
  error: (tag, msg) => console.log(`${C.grey}${ts()}${C.reset} ${C.red}ERROR${C.reset} ${C.magenta}[${tag}]${C.reset} ${msg}`),
  debug: (tag, msg) => console.log(`${C.grey}${ts()}${C.reset} ${C.grey}DEBUG${C.reset} ${C.magenta}[${tag}]${C.reset} ${msg}`),
  req:   (method, path, status, ms) => {
    const sc = status < 400 ? C.green : status < 500 ? C.yellow : C.red
    console.log(`${C.grey}${ts()}${C.reset} ${C.cyan}HTTP ${C.reset} ${C.magenta}[midnight]${C.reset} ${method} ${path} → ${sc}${status}${C.reset}  ${ms}ms`)
  },
}

// ── __dir must be defined before loadZKDeps uses it ───────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))

// ── ZK proof imports ──────────────────────────────────────────────────────────
// Loaded lazily to avoid crashing the server if something is missing.
let _zkReady = null  // null=unchecked, true/false after first attempt
let _zkDeps  = null

async function loadZKDeps() {
  if (_zkReady !== null) return _zkReady
  try {
    const ROOT = resolve(__dir, '..')

    // All three WASM modules must use the same shared WASM heap.
    const [runtimeMod, ledgerMod, contractMod] = await Promise.all([
      import(resolve(__dir, 'node_modules/@midnight-ntwrk/compact-runtime/dist/index.js')),
      import(resolve(__dir, 'node_modules/@midnight-ntwrk/ledger-v8/midnight_ledger_wasm_fs.js')),
      import(resolve(ROOT, 'contract/dist/dataset_proof/contract/index.js')),
    ])

    const KEYS = resolve(ROOT, 'contract/dist/dataset_proof/keys')
    const ZKIR = resolve(ROOT, 'contract/dist/dataset_proof/zkir')

    _zkDeps = {
      runtime:  runtimeMod,
      ledger:   ledgerMod,
      Contract: contractMod.Contract,
      commitKeys: {
        proverKey:   readFileSync(resolve(KEYS, 'commit_dataset.prover')),
        verifierKey: readFileSync(resolve(KEYS, 'commit_dataset.verifier')),
        ir:          readFileSync(resolve(ZKIR,  'commit_dataset.bzkir')),
      },
      trainingKeys: {
        proverKey:   readFileSync(resolve(KEYS, 'prove_training.prover')),
        verifierKey: readFileSync(resolve(KEYS, 'prove_training.verifier')),
        ir:          readFileSync(resolve(ZKIR,  'prove_training.bzkir')),
      },
    }
    console.log('[ZK] ✅ Proof dependencies loaded')
    log.info('zk', '✅ Proof dependencies loaded — real ZK mode available')
    _zkReady = true
  } catch (e) {
    console.warn('[ZK] Failed to load proof dependencies:', e.message)
    log.warn('zk', `Proof dependencies missing — running in mock mode. (${e.message})`)
    _zkReady = false
  }
  return _zkReady
}

// ── .env loader (verbatim from AlphaShield) ───────────────────────────────────
try {
  const envPath = resolve(__dir, '.env')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = val
  }
} catch { /* no .env is fine */ }

const app = express()
app.use(cors())
app.use(express.json())

// ── Request logger middleware ─────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => log.req(req.method, req.path, res.statusCode, Date.now() - start))
  next()
})

// ── Network config ────────────────────────────────────────────────────────────
const MIDNIGHT_ENV = process.env.MIDNIGHT_ENV ?? 'local'
const NETWORK_CONFIGS = {
  local: {
    networkId:   'undeployed',
    indexer:     'http://127.0.0.1:8088/api/v3/graphql',
    indexerWS:   'ws://127.0.0.1:8088/api/v3/graphql/ws',
    node:        'http://127.0.0.1:9944',
    // Proof server runs on 6301 so it doesn't conflict with this service (6300)
    proofServer: 'http://localhost:6301',
  },
  testnet: {
    networkId:   'testnet-02',
    indexer:     'https://indexer.testnet-02.midnight.network/api/v3/graphql',
    indexerWS:   'wss://indexer.testnet-02.midnight.network/api/v3/graphql/ws',
    node:        'wss://rpc.testnet-02.midnight.network',
    proofServer: 'http://localhost:6301',  // always local — HIPAA privacy requirement
  },
}
const netConfig = NETWORK_CONFIGS[MIDNIGHT_ENV]
setNetworkId(netConfig.networkId)

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const proofServerOk = await checkProofServer()
  const zkReady = await loadZKDeps()
  res.json({
    status: 'ok',
    midnight_env: MIDNIGHT_ENV,
    network_id: netConfig.networkId,
    proof_server: proofServerOk ? 'reachable' : 'unreachable',
    contract_compiled: zkReady,
    zk_mode: zkReady && proofServerOk ? 'real' : 'mock',
  })
})

// ── POST /submit-dataset-proof ────────────────────────────────────────────────
// Invokes the commit_dataset ZK circuit.
//
// Body: { dataset_id, hospital_id_hash, schema_hash, timestamp,
//         record_count, min_record_count, deidentified }
//
// Private witnesses (never logged or returned): record_count, min_record_count, deidentified
// Returns: { proofBytes (base64), proofHash, complianceHash, mode }
// ─────────────────────────────────────────────────────────────────────────────
app.post('/submit-dataset-proof', async (req, res) => {
  const {
    dataset_id, hospital_id_hash, schema_hash, timestamp,
    record_count, min_record_count, deidentified,
  } = req.body

  if (!dataset_id || !hospital_id_hash || !schema_hash) {
    return res.status(400).json({ error: 'dataset_id, hospital_id_hash, schema_hash required' })
  }

  // SHA-256 compliance hash — committed on-chain, inputs never disclosed
  const complianceHash = crypto
    .createHash('sha256')
    .update(`${hospital_id_hash}${schema_hash}${dataset_id}`)
    .digest('hex')

  // ── Real ZK proof via proof server ────────────────────────────────────────
  const zkReady = await loadZKDeps()
  if (zkReady) {
    try {
      const { runtime, ledger, Contract, commitKeys } = _zkDeps

      const dummyCoinPubKey = { bytes: new Uint8Array(32) }
      const addr = runtime.sampleContractAddress()
      const contract = new Contract({})
      const { currentContractState } = contract.initialState({
        initialZswapLocalState: { coinPublicKey: dummyCoinPubKey },
        initialPrivateState: {},
      })

      const ctx = runtime.createCircuitContext(
        addr,
        dummyCoinPubKey,
        currentContractState.data,
        {}
      )

      // Run commit_dataset circuit — private witnesses never leave this process
      const { proofData } = contract.circuits.commit_dataset(
        ctx,
        dataset_id,
        hospital_id_hash,
        schema_hash,
        timestamp,
        BigInt(record_count),      // PRIVATE
        BigInt(min_record_count),  // PRIVATE
        BigInt(deidentified),      // PRIVATE
      )

      const preimage = ledger.proofDataIntoSerializedPreimage(
        proofData.input,
        proofData.output,
        proofData.publicTranscript,
        proofData.privateTranscriptOutputs,
        null
      )

      const payload = ledger.createProvingPayload(
        preimage,
        undefined,
        {
          proverKey:   new Uint8Array(commitKeys.proverKey),
          verifierKey: new Uint8Array(commitKeys.verifierKey),
          ir:          new Uint8Array(commitKeys.ir),
        }
      )

      const proofStart = Date.now()
      const proofResp = await fetch(`${netConfig.proofServer}/prove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: payload,
        signal: AbortSignal.timeout(60000),
      })

      if (!proofResp.ok) {
        const errText = await proofResp.text()
        throw new Error(`Proof server ${proofResp.status}: ${errText}`)
      }

      const proofBytes = new Uint8Array(await proofResp.arrayBuffer())
      const proofGeneratedMs = Date.now() - proofStart
      const proofHash = crypto.createHash('sha256').update(proofBytes).digest('hex')

      log.info('zk', `commit_dataset real proof ✅  ${proofBytes.length} bytes  ${proofGeneratedMs}ms`)
      console.log(`[ZK] Real commit_dataset proof ✅ (${proofBytes.length} bytes, ${proofGeneratedMs}ms)`)

      return res.json({
        proofHash,
        complianceHash,
        mode: 'real',
        proofBytes: Buffer.from(proofBytes).toString('base64'),
        proofSizeBytes: proofBytes.length,
        proofGeneratedMs,
      })
    } catch (err) {
      log.warn('zk', `Real commit_dataset proof failed, falling back to mock: ${err.message}`)
      console.warn('[ZK] Real proof failed, falling back to mock:', err.message)
    }
  }

  // ── Fallback: SHA-256 mock proof ──────────────────────────────────────────
  const proofHash = crypto
    .createHash('sha256')
    .update(`${dataset_id}${hospital_id_hash}${schema_hash}${timestamp}MEDIPROOF_ZK`)
    .digest('hex')
  log.info('zk', `commit_dataset mock proof  hash=${proofHash.slice(0,16)}…`)
  return res.json({ proofHash, complianceHash, mode: 'mock' })
})

// ── POST /submit-training-proof ───────────────────────────────────────────────
// Invokes the prove_training ZK circuit.
//
// Body: { dataset_id, model_hash, schema_hash, training_rows }
//
// Private witness (never logged or returned): training_rows
// Returns: { proofBytes (base64), proofHash, modelHash, mode }
// ─────────────────────────────────────────────────────────────────────────────
app.post('/submit-training-proof', async (req, res) => {
  const { dataset_id, model_hash, schema_hash, training_rows } = req.body

  if (!dataset_id || !model_hash || !schema_hash) {
    return res.status(400).json({ error: 'dataset_id, model_hash, schema_hash required' })
  }

  // ── Real ZK proof via proof server ────────────────────────────────────────
  const zkReady = await loadZKDeps()
  if (zkReady) {
    try {
      const { runtime, ledger, Contract, trainingKeys } = _zkDeps

      const dummyCoinPubKey = { bytes: new Uint8Array(32) }
      const addr = runtime.sampleContractAddress()
      const contract = new Contract({})
      const { currentContractState } = contract.initialState({
        initialZswapLocalState: { coinPublicKey: dummyCoinPubKey },
        initialPrivateState: {},
      })

      const ctx = runtime.createCircuitContext(
        addr,
        dummyCoinPubKey,
        currentContractState.data,
        {}
      )

      // Run prove_training circuit — training_rows is a private witness
      const { proofData } = contract.circuits.prove_training(
        ctx,
        dataset_id,
        model_hash,
        schema_hash,
        BigInt(training_rows),  // PRIVATE
      )

      const preimage = ledger.proofDataIntoSerializedPreimage(
        proofData.input,
        proofData.output,
        proofData.publicTranscript,
        proofData.privateTranscriptOutputs,
        null
      )

      const payload = ledger.createProvingPayload(
        preimage,
        undefined,
        {
          proverKey:   new Uint8Array(trainingKeys.proverKey),
          verifierKey: new Uint8Array(trainingKeys.verifierKey),
          ir:          new Uint8Array(trainingKeys.ir),
        }
      )

      const proofStart = Date.now()
      const proofResp = await fetch(`${netConfig.proofServer}/prove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: payload,
        signal: AbortSignal.timeout(60000),
      })

      if (!proofResp.ok) {
        const errText = await proofResp.text()
        throw new Error(`Proof server ${proofResp.status}: ${errText}`)
      }

      const proofBytes = new Uint8Array(await proofResp.arrayBuffer())
      const proofGeneratedMs = Date.now() - proofStart
      const proofHash = crypto.createHash('sha256').update(proofBytes).digest('hex')

      log.info('zk', `prove_training real proof ✅  ${proofBytes.length} bytes  ${proofGeneratedMs}ms`)
      console.log(`[ZK] Real prove_training proof ✅ (${proofBytes.length} bytes, ${proofGeneratedMs}ms)`)

      return res.json({
        proofHash,
        modelHash: model_hash,
        mode: 'real',
        proofBytes: Buffer.from(proofBytes).toString('base64'),
        proofSizeBytes: proofBytes.length,
        proofGeneratedMs,
      })
    } catch (err) {
      log.warn('zk', `Real training proof failed, falling back to mock: ${err.message}`)
      console.warn('[ZK] Real training proof failed, falling back to mock:', err.message)
    }
  }

  // ── Fallback: SHA-256 mock proof ────────────────────────────────────────────
  const proofHash = crypto
    .createHash('sha256')
    .update(`${dataset_id}${model_hash}${schema_hash}TRAINING_ZK`)
    .digest('hex')

  log.info('zk', `prove_training mock proof  hash=${proofHash.slice(0,16)}…`)
  return res.json({ proofHash, modelHash: model_hash, mode: 'mock' })
})

// ─────────────────────────────────────────────────────────────────────────────
async function checkProofServer() {
  try {
    const r = await fetch(`${netConfig.proofServer}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    return r.ok
  } catch {
    return false
  }
}

const PORT = process.env.PORT ?? 6300
app.listen(PORT, async () => {
  const zkReady = await loadZKDeps()
  const zkMode  = zkReady ? 'real' : 'mock'
  console.log('')
  log.info('midnight', `${C.bold}MediProof Midnight Service started${C.reset}`)
  log.info('midnight', `Listening on   http://localhost:${PORT}`)
  log.info('midnight', `Network env    ${MIDNIGHT_ENV}  (${netConfig.networkId})`)
  log.info('midnight', `ZK mode        ${zkMode === 'real' ? C.green + 'real' + C.reset : C.yellow + 'mock (no compiled contract)' + C.reset}`)
  log.info('midnight', `Proof server   ${netConfig.proofServer}`)
  console.log('')
})
