// ─── MediProof Contract API (browser layer) ───────────────────────────────────
// The browser cannot run the Midnight SDK directly (WASM + Node.js deps),
// so this module calls the midnight-service (Node.js, port 6300) for health
// checks and wallet-side operations.
//
// Note: Dataset and training proof submission goes through the Python backend,
// not directly through midnight-service from the browser.
// ─────────────────────────────────────────────────────────────────────────────

const MIDNIGHT_SERVICE = import.meta.env.VITE_MIDNIGHT_SERVICE_URL ?? 'http://localhost:6300'

/**
 * Submit a trade proof — kept verbatim from AlphaShield for wallet compatibility.
 * In MediProof the main proof flows go through the Python backend.
 *
 * @param {object|null} _walletApi
 * @param {object} tradeData
 * @returns {Promise<object>}
 */
export async function submitTradeProof(_walletApi, tradeData) {
  const { asset, amount, price, timestamp, signal } = tradeData

  try {
    const res = await fetch(`${MIDNIGHT_SERVICE}/submit-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset, amount, price, timestamp, signal }),
      signal: AbortSignal.timeout(90_000),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error ?? `Service error ${res.status}`)
    }
    return await res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('ZK proof generation timed out (>90s)')
    console.warn('[MediProof] Midnight service unreachable, using client mock:', err.message)
  }

  return generateClientMock(tradeData)
}

async function generateClientMock({ asset, amount, timestamp }) {
  const proofHash = await sha256(`${asset}${amount}${timestamp}MIDNIGHT_ZK`)
  return { proofHash, contractAddress: null, txHash: null, mode: 'mock' }
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Check if the Midnight service (and by extension the proof server) is reachable.
 * @returns {Promise<{ serviceUp: boolean, proofServerUp: boolean, contractCompiled: boolean, networkId: string|null, zkMode: string }>}
 */
export async function checkMidnightService() {
  try {
    const res = await fetch(`${MIDNIGHT_SERVICE}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return { serviceUp: false, proofServerUp: false, contractCompiled: false, networkId: null, zkMode: 'mock' }
    const data = await res.json()
    return {
      serviceUp: true,
      proofServerUp: data.proof_server === 'reachable',
      contractCompiled: data.contract_compiled ?? false,
      networkId: data.network_id ?? null,
      zkMode: data.zk_mode ?? 'mock',
    }
  } catch {
    return { serviceUp: false, proofServerUp: false, contractCompiled: false, networkId: null, zkMode: 'mock' }
  }
}
