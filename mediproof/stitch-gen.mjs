#!/usr/bin/env node
// Generates MediProof screens via Google Stitch API
// Run: STITCH_TOKEN=$(gcloud auth application-default print-access-token) node stitch-gen.mjs

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

const PROJECT_ID = '7023817915184387455'
const TOKEN = execSync('gcloud auth application-default print-access-token', { encoding: 'utf8' }).trim()
const BASE = 'https://stitch.googleapis.com/mcp'

async function callStitch(method, params, id = 1) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': 'meownty',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  })
  return res.json()
}

async function generateScreen(prompt, name) {
  console.log(`\n[Stitch] Generating: ${name} …`)
  const r = await callStitch('tools/call', {
    name: 'generate_screen_from_text',
    arguments: {
      projectId: PROJECT_ID,
      deviceType: 'DESKTOP',
      prompt,
    }
  })

  const text = r?.result?.content?.[0]?.text ?? ''
  if (r?.result?.isError) { console.error('[ERR]', text); return null }

  try {
    const parsed = JSON.parse(text)
    // outputComponents can have:  { design: { screens: [{htmlCode, screenshot}] } }
    //                         or  { designSystem: {...} }   (first call creates design system)
    for (const comp of (parsed.outputComponents ?? [])) {
      if (comp.design?.screens?.length) {
        for (const scr of comp.design.screens) {
          const htmlCodeName = scr.htmlCode?.name
          const htmlDownload = scr.htmlCode?.downloadUrl
          const imgUrl = scr.screenshot?.downloadUrl
          if (htmlCodeName) {
            console.log(`[Stitch] ✅ ${name} — htmlCode: ${htmlCodeName}`)
            return { htmlCodeName, htmlDownload, imgUrl, sessionId: parsed.sessionId }
          }
        }
      }
    }
    console.warn('[Stitch] no design screens in outputComponents for', name)
    console.log('  keys:', JSON.stringify(parsed.outputComponents?.map(c => Object.keys(c))))
    return null
  } catch {
    console.log('[Stitch] parse error, raw:', text.slice(0, 200))
    return null
  }
}

async function downloadUrl(url) {
  const TOKEN_FRESH = execSync('gcloud auth application-default print-access-token', { encoding: 'utf8' }).trim()
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${TOKEN_FRESH}` }
  })
  if (!res.ok) {
    // Some download URLs are public (lh3.googleusercontent.com)
    const res2 = await fetch(url)
    if (!res2.ok) return null
    return res2.text()
  }
  return res.text()
}

async function fetchCode(screenId) {
  const r = await callStitch('tools/call', {
    name: 'fetch_screen_code',
    arguments: { projectId: PROJECT_ID, screenId }
  })
  const text = r?.result?.content?.[0]?.text ?? ''
  if (r?.result?.isError) { return null }
  return text
}

async function main() {
  const PROMPTS = {
    hospital: `
MediProof - Hospital Dataset Commitment. Dark web dashboard. Dark background #0a0a14, violet #7c3aed accents.

Top navigation bar: shield icon + "MediProof" text in violet, subtitle "v1.0 · Midnight Network" in gray. 
Three tab buttons: "🏥 Hospital" (active, violet underline), "🔬 Researcher", "🔍 Auditor".
Right side of navbar: "Connect Lace Wallet" button in gray, "🔵 ZK mock" badge.

Main content (max-w-3xl centered):
1. Header card with violet border: Database icon, title "Hospital Dataset Commitment", subtitle "Commit your de-identified patient dataset to the Midnight Network. ZK proofs guarantee HIPAA compliance."

2. Form card with dark background, violet border:
   - "Hospital Name" text input, full width, dark. Label: "Hashed to hospital_id_hash — never stored raw"
   - "Disease Category" dropdown with options: oncology, cardiology, neurology, orthopedics, diabetes
   - "Schema Fields" section: grid of checkbox pills for: age, gender, icd_10_code, admission_date, lab_results, medications, vitals, procedure_codes, cpt_codes, outcome_flag. Selected ones in violet.
   - "Record Count" number input. Violet label: "(Used as ZK witness — never stored or transmitted)". Gray note: "Minimum threshold: 500 records (enforced by ZK circuit)"
   - Large violet "🔒 Commit Dataset with ZK Proof" button

3. ZK progress tracker (6 steps in vertical list with checkmarks):
   ✓ Hashing hospital identity
   › Building compliance witness  (active, violet)
   · Running commit_dataset circuit locally
   · Sending to proof server
   · Generating HIPAA compliance ZK proof
   · Submitting to Midnight Network

4. Privacy message centered: "🔒 Your patient records never leave your server."

Success state below: Emerald card with "Dataset Committed Successfully" showing dataset_id, compliance_proof_hash, "0 bytes" exposed, ZK mode badge.
`,

    researcher: `
MediProof - Research Dataset Browser. Dark web dashboard. Dark background #0a0a14, violet #7c3aed accents.

Top navigation bar: shield icon + "MediProof", 3 tabs. "🔬 Researcher" tab active.

Main content (max-w-5xl):
1. Header card: Flask icon, "Research Dataset Browser", subtitle "Browse HIPAA-proven datasets and request model training — raw patient records are never accessed." Refresh button on right.

2. Grid of 4 dataset cards (2x2):
   Each card: violet "Oncology" category badge, "HIPAA Proven ✓" emerald badge, timestamp. 
   Schema Hash: truncated monospace hash.
   Dataset ID: truncated monospace.
   "0 bytes exposed 🔒" in emerald.
   One card selected (violet ring/highlight).

3. Training request panel (for selected dataset):
   - "Request Training on Oncology dataset" heading
   - "Researcher ID" text input with note "(hashed before storage)"
   - Model type selector: 3 buttons [Classifier] [Regression] [Transformer], one selected violet
   - ZK training progress steps:
     ✓ Verifying dataset commitment…
     ✓ Simulating training run…
     › Building training witness…  (active)
     · Generating ZK proof…
     · Recording on Midnight Network…
   - Large violet "Request Model Training" button

4. Success result card (emerald): 
   Model Output Hash: monospace hash
   Training Proof Hash: monospace violet hash  
   "Training Proven: ✅ Yes"
   "Raw patient records: never accessed 🔒"
`,

    auditor: `
MediProof - Compliance Auditor. Dark web dashboard. Dark background #0a0a14, violet #7c3aed accents.

Top navigation bar: shield icon + "MediProof", 3 tabs. "🔍 Auditor" tab active.

Main content (max-w-3xl):
1. Header card: ShieldCheck icon, "Compliance Auditor", subtitle "Inspect on-chain ZK proofs. HIPAA compliance is verifiable on-chain — no auditor can access patient data."

2. Search card: "Dataset ID" label, UUID text input (monospace), blue "🔍 Audit" button.

3. Compliance banner: Large emerald card with checkmark "HIPAA Compliant — ZK Verified". Subtitle "commit_dataset circuit confirmed de-identification and record threshold without revealing patient data".

4. "On-Chain Proof Record" card with copy button:
   Table rows:
   - Compliance: HIPAA Compliant
   - Training Proven: ✅ Yes
   - Model Hash: truncated monospace
   - Proof Hash: violet monospace hash
   - Bytes Exposed: "0 bytes" in emerald bold
   - ZK Mode: "🔵 ZK mock" badge

5. Audit Log panel: dark card, list of entries showing dataset_id + timestamp. "2 entries" count.

6. Privacy message: "🔒 HIPAA compliance is verifiable on-chain. No auditor can access patient data."

7. "Compact Smart Contract" code viewer: dark card, file path label, Copy button.
   Syntax-highlighted Compact contract code showing commit_dataset and prove_training circuits.
   PRIVATE witness comments in rose/pink italic.
   assert() lines in amber.
   disclose() lines in emerald.
`
  }

  const screens = {}
  for (const [key, prompt] of Object.entries(PROMPTS)) {
    const screen = await generateScreen(prompt.trim(), key)
    if (!screen) continue
    screens[key] = screen

    // Try to download HTML from the download URL first, then fall back to fetch_screen_code
    let code = null
    if (screen.htmlDownload) {
      console.log(`[Stitch] Downloading HTML for ${key}…`)
      code = await downloadUrl(screen.htmlDownload)
    }
    if (!code && screen.htmlCodeName) {
      // Use fetch_screen_code with the file resource name as screenId
      const fileId = screen.htmlCodeName.split('/').pop()
      console.log(`[Stitch] Fetching code for ${key} (${fileId})…`)
      code = await fetchCode(fileId)
    }

    if (code) {
      const filename = `stitch_${key}.html`
      writeFileSync(filename, code)
      console.log(`[Stitch] ✅ Saved ${filename} (${code.length} chars)`)
    } else {
      console.warn(`[Stitch] ⚠️  Could not retrieve HTML for ${key}`)
    }
    await new Promise(r => setTimeout(r, 1500))
  }

  writeFileSync('stitch_screens.json', JSON.stringify(screens, null, 2))
  console.log('\n[Stitch] All screens saved to stitch_screens.json')
}

main().catch(e => { console.error(e); process.exit(1) })
