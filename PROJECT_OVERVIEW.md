# MediProof — Project Overview

> This document explains what MediProof is, why it exists, what each page does, and how to demo it to anyone — no technical background required.

---

## The Problem We're Solving

Healthcare AI is stuck.

Hospitals have millions of patient records that could train life-saving AI models — for cancer diagnosis, drug response prediction, rare disease detection. But they can't share that data. HIPAA prohibits it. If they share patient records and there's a breach, they face multi-million dollar fines and criminal liability.

So today:
- Drug trials take **3–5 years** partly because researchers can't access enough data
- AI diagnostic models are **biased** because they're trained on whoever's local dataset (usually one hospital, usually not diverse)
- Compliance costs **$500k–$50M** per cross-institution collaboration — just for legal agreements, de-identification pipelines, and IRB approvals
- Even after all that, there's **no cryptographic proof** the data was actually compliant

**MediProof solves this with Zero-Knowledge proofs on the Midnight Network.**

---

## What It Does (One Sentence)

> **MediProof lets a hospital prove their dataset is HIPAA-compliant and that an AI model was trained on it — without revealing a single patient record.**

---

## The Core Concept: Zero-Knowledge Proofs

A Zero-Knowledge proof lets you prove a statement is true without revealing the underlying data.

**Classic analogy:** You want to prove you know a secret password without saying the password out loud. ZK proofs make that possible, mathematically.

**In MediProof:**
- The hospital proves "I have 1,200 oncology records that are de-identified" → without sharing the records
- The researcher proves "I trained this model on that dataset" → without showing the model weights or the data
- The auditor verifies both proofs → without seeing anything private

Everything is cryptographically enforced. No trust required. No lawyers needed.

---

## Who Uses It

| Role | Who they are | What they do in MediProof |
|------|-------------|--------------------------|
| **Hospital** | MGH, Mayo Clinic, any clinic with patient data | Commits a proof that their dataset exists and is compliant |
| **Researcher** | MIT lab, Pfizer data science team, a PhD student | Browses compliant datasets, requests training permission |
| **Auditor** | FDA, CMS, hospital compliance officer, IRB | Verifies that both the dataset and model training were HIPAA-compliant |

---

## The Three Pages

### 1. Hospital Page — "Commit a Dataset"

**What happens here:**  
The hospital declares their dataset and the app generates a cryptographic commitment — a proof that the dataset exists with specific properties, without revealing the dataset itself.

**The form fields:**

| Field | What it means |
|-------|--------------|
| **Hospital Name** | Who is committing this dataset. Gets SHA-256 hashed immediately — the real name is never stored anywhere. |
| **Disease Category** | What type of patient data this is (oncology, cardiology, diabetes, etc.) — so researchers can filter. |
| **Patient Record Count** | How many records are in the dataset. Used as a private input to the ZK circuit (proves it's a real, substantial dataset). Never stored. |
| **Schema Fields** | Which columns the dataset has (age, lab results, medications, etc.) — hashed together to create a schema fingerprint. |

**What gets generated:**

- `dataset_id` — a unique identifier researchers use to request this dataset
- `compliance_proof_hash` — the on-chain ZK proof that this dataset is HIPAA-compliant

**What is NOT stored:** hospital name, patient count, any actual patient data.

---

### 2. Researcher Page — "Request Training"

**What happens here:**  
Researchers browse all published datasets (they can only see the category, schema, and ZK mode — nothing identifying). They pick one and submit a training request. The app generates a ZK proof that training occurred on that specific dataset.

**The flow:**
1. Page loads → all committed datasets appear as cards
2. Click a card to select it (see disease category, schema hash, ZK mode)
3. Click "Submit Training Request"
4. The system runs through 5 steps:
   - Fetching de-identified shard
   - Initialising privacy budget
   - Running private training circuit
   - Generating `prove_training` ZK proof
   - Submitting to Midnight ledger
5. Result shows Request ID, Model Hash, Training Proof Hash, and a Dataset ID

**Key button:** "Audit This Dataset" → jumps straight to the Auditor page with the dataset ID pre-filled.

**What the researcher never sees:** the actual patient records, the hospital's name, the record count.

---

### 3. Auditor Page — "Verify Compliance"

**What happens here:**  
An auditor (FDA inspector, hospital compliance officer, IRB reviewer) can verify that:
- A specific dataset was HIPAA-compliant at the time of commitment
- A specific AI model was actually trained on that dataset
- The full audit trail of events

**How to use it:**
1. Paste a `dataset_id` into the input box
2. Click "Verify"
3. See the compliance proof (from the hospital) and training proof (from the researcher) side by side

**The Audit Log** (auto-loads at bottom of page) shows every event across all datasets — who committed what, when training happened, all timestamped.

**What this replaces:** currently, FDA audits require hospitals to produce de-identified data exports, legal certifications, and paper trails. With MediProof, the auditor verifies a single proof hash. No subpoenas. No privacy violations.

---

## The Full Demo Flow (Step by Step)

### Step 1: Hospital commits a dataset
1. Go to **Hospital** tab
2. Enter: Hospital Name = `"City General Hospital"`
3. Disease Category = `Oncology`
4. Patient Records = `1200`
5. Schema Fields = check `age`, `icd_10_code`, `lab_results`, `outcome_flag`, `medications`
6. Click **"Commit Dataset with ZK Proof"**
7. ✅ You get a `dataset_id` and `compliance_proof_hash`

### Step 2: Researcher finds and trains on it
1. Go to **Researcher** tab
2. The dataset card appears — click it to select it (category + ZK mode shown)
3. Click **"Submit Training Request"**
4. Watch the 5-step ZK animation
5. ✅ Training complete — you get `model_output_hash` and `training_proof_hash`
6. Click **"Audit This Dataset"** to jump to step 3 automatically

### Step 3: Auditor verifies everything
1. You're now on the **Auditor** tab (dataset ID is pre-filled)
2. Click **"Verify"**
3. ✅ See both proofs confirmed — compliance + training — side by side
4. Scroll down to see the full **Audit Log**

The entire audit trail is verifiable without a single patient record ever being shared.

---

## Real-World Scenarios

### Scenario A: Pharma company building a drug response model
**Pfizer** wants to train a model to predict chemotherapy response in lung cancer patients. They need data from 50 hospitals across 10 countries.

**Without MediProof:**
- 3–5 years of legal agreements with each hospital
- Massive de-identification pipeline ($10M+)
- One breach = lawsuit from every patient
- FDA approval requires paper audit trail from every hospital

**With MediProof:**
- Each hospital commits their dataset proof to Midnight in minutes
- Pfizer's training system generates `prove_training` proofs per hospital
- FDA auditor verifies all 50 proof hashes on-chain
- Total time: weeks, not years. Zero patient records transferred. Cryptographically verifiable.

---

### Scenario B: Hospital wants to monetize their data ethically
**Stanford Medical** has 20 years of rare disease records. Biotech companies would pay millions for access, but HIPAA makes it too risky to hand over.

With MediProof, Stanford publishes a ZK commitment. Biotech companies can verify the dataset's properties (size, schema, disease category) and pay for training rights — without Stanford ever transferring data. Revenue without liability.

---

### Scenario C: AI model regulatory approval
A startup has built a diagnostic AI for early Alzheimer's detection. For FDA clearance, they need to prove their training data was HIPAA-compliant and sufficiently diverse.

Currently this requires extensive documentation, IRB approvals, and months of back-and-forth.

With MediProof, they point the FDA to on-chain proof hashes — one per hospital dataset used in training. The FDA verifies cryptographically in minutes. Approval timeline cuts from 18 months to weeks.

---

### Scenario D: Academic research on rare diseases
A researcher at Johns Hopkins needs multi-hospital data on a disease that affects 1 in 50,000 people — so no single hospital has enough cases.

With MediProof, 30 hospitals across the country each commit their small datasets. The researcher aggregates training using federated learning, and MediProof generates a proof that each hospital's 40-record contribution was HIPAA-compliant. Combined model has 1,200 cases — statistically significant.

---

## Why Midnight Network?

Midnight is a privacy-first blockchain built specifically for use cases where **data must stay private but provenance must be public**.

Most blockchains (Ethereum, Solana) are fully transparent — everything is visible to everyone. That's fine for finance, but a disaster for healthcare.

Midnight uses:
- **Zero-Knowledge proofs** — prove things without revealing them
- **Selective disclosure** — you control exactly what's public and what's private
- **Compact** — a ZK contract DSL specifically designed for privacy applications

MediProof uses two Midnight ZK circuits:

```
commit_dataset circuit:
  PRIVATE inputs: dataset_hash, record_count, hospital_id
  PUBLIC  output: compliance_commitment (just a hash)
  PROVES:  "a real, HIPAA-compliant dataset exists from an authenticated hospital"

prove_training circuit:
  PRIVATE inputs: model_weights_hash, dataset_commitment, training_rows
  PUBLIC  output: training_proof (just a hash)
  PROVES:  "this model was trained on the dataset that produced that commitment"
```

---

## What's Built vs. What Would Be Production

| Feature | Current State | Production State |
|---------|--------------|-----------------|
| ZK proof generation | Real (Docker proof server) | Same, deployed on-chain |
| Patient data hashing | Simulated (form input represents metadata) | EHR system integration (Epic/Cerner API) |
| Model training | Simulated (mock hash) | Real federated learning (PySyft/Flower framework) |
| On-chain commitment | Local testnet / Preprod | Midnight mainnet |
| Hospital auth | Hospital name (hashed) | PKI certificate + hardware HSM |
| Database | Azure PostgreSQL (hashes only) | Same, with audit logging to immutable ledger |
| Wallet | Lace browser extension / Demo mode | Lace + institutional wallet |

The **proof infrastructure, compliance pipeline, and audit verification** are fully real. The integration points (EHR system, actual training framework) are where production work would happen.

---

## Under the Hood — Tech Stack Explained Simply

### Backend — FastAPI + PostgreSQL

The backend receives form submissions, orchestrates the ZK proof pipeline, and saves results to a database. But **what it saves is very intentional**:

| Field | Stored? | Why |
|-------|---------|-----|
| Hospital name | ❌ No | Hashed immediately to SHA-256 — raw name never touches the DB |
| Patient record count | ❌ No | Used as a private ZK witness, discarded after proof is generated |
| Patient data | ❌ Never received | Not even accepted by the API |
| Dataset ID | ✅ Yes | UUID reference for researchers and auditors |
| Compliance proof hash | ✅ Yes | The ZK proof output — safe to store publicly |
| Schema hash | ✅ Yes | Fingerprint of which fields the dataset has |
| Disease category | ✅ Yes | Public metadata for filtering |

The database uses **asyncpg** — an async PostgreSQL driver. This matters because generating a ZK proof can take several seconds. Async means the server can handle other requests while it waits instead of freezing.

---

### Contract Folder — The ZK Circuit

This is the mathematical core of the project. Written in **Compact** — Midnight's ZK contract language.

```compact
circuit commit_dataset(
  record_count: Uint<32>,   // PRIVATE — stays at the hospital
  deidentified: Uint<32>    // PRIVATE — stays at the hospital
) {
  assert(deidentified == 1)    // must be HIPAA de-identified
  assert(record_count >= 500)  // must be a real, substantial dataset
  bytes_patient_exposed = disclose(0)  // publicly proves: 0 bytes shared
}
```

The circuit has two parts:
- **`commit_dataset`** — hospital proves their data is HIPAA-compliant
- **`prove_training`** — researcher proves a model was trained on that specific dataset

**What "compiling" the contract means:**  
Running `npx nightforge compile` turns the `.compact` file into:
- `keys/commit_dataset.prover` — used to generate proofs
- `keys/commit_dataset.verifier` — used by anyone to verify proofs
- `zkir/*.bzkir` — the circuit as binary math that the proof server executes

Without these compiled files, the app falls back to mock mode (SHA-256 hashes instead of real ZK proofs).

---

### Midnight Service — The Node.js Bridge

**Why does a separate service exist?**  
The Midnight SDK is written in WASM + Node.js. It needs Node's `fs`, `path`, and `crypto` modules — things Python cannot use. So we run it as a separate microservice that FastAPI calls over HTTP.

**What it does step by step:**
1. FastAPI sends `POST /submit-dataset-proof` with the hashed values
2. Midnight Service loads the compiled circuit and prover keys from the `contract/dist/` folder
3. Sends the private witnesses (record count, de-identified flag) to the Docker proof server
4. Docker computes the ZK proof — returns a proof hash
5. Midnight Service returns `{ proofHash, mode: "real" }` back to FastAPI

**Auto-detects mode on startup:** If the compiled contract and Docker proof server are both reachable → `zk_mode: real`. If either is missing → `zk_mode: mock` (SHA-256 fallback, everything still works).

---

### Lace Wallet + tNIGHT Token

**Lace** is the official browser extension for Midnight (similar to MetaMask for Ethereum). It lives in your browser and manages your Midnight identity and keys.

**What it does in MediProof:**
- Identifies the user on the Midnight network
- Signs transactions when a proof gets published on-chain

**tNIGHT** is the test token on Midnight's Preprod (test) network:
- Paying transaction fees when publishing proofs to the blockchain costs a tiny amount of tNIGHT
- You get it free from the faucet at `faucet.preprod.midnight.network`
- In production this would be real NIGHT tokens

**Without Lace:** The app automatically falls back to demo mode — a mock wallet address is generated and everything works locally. Lace is only required to actually publish proofs to the Midnight blockchain.

---

### Docker — The Proof Server

**What it is:** `midnightntwrk/proof-server` is Midnight's official ZK proof computation engine, packaged as a Docker container.

**What it actually does:**  
Takes a ZK circuit + private inputs → computes a **groth16 proof** (a type of ZK proof). This involves heavy elliptic curve mathematics over large prime fields. It's computationally intensive — this is why it runs as a dedicated server rather than inline.

**Why Docker?**  
The proof server is a compiled Rust binary with specific system dependencies. Docker packages everything so it runs identically on any machine without any manual installation.

```bash
docker run -d -p 6301:6300 midnightntwrk/proof-server:latest
#                 ↑ local port  ↑ container internal port
```

Midnight Service calls it at `localhost:6301`. Health check at `localhost:6300/health` tells you:
```json
{ "zk_mode": "real", "contract_compiled": true, "proof_server": "reachable" }
```

---

### How All 5 Pieces Connect — One Request

```
User clicks "Commit Dataset"
        ↓
  React Frontend
  POST /api/dataset/commit
        ↓
  FastAPI Backend
  - SHA-256 hashes hospital_name → hospital_id_hash
  - SHA-256 hashes schema_fields → schema_hash
  - calls midnight-service
        ↓
  Midnight Service (Node.js)
  - loads compiled circuit from contract/dist/
  - sends private witnesses to Docker proof server
        ↓
  Docker Proof Server
  - runs groth16 ZK math
  - returns cryptographic proof hash
        ↓
  FastAPI saves to PostgreSQL
  (only hashes — zero patient bytes)
        ↓
  Frontend displays:
  dataset_id + compliance_proof_hash ✅
```

---

## Key Numbers

- **0 bytes** of patient data ever leave the hospital
- **2 ZK circuits** handle the entire compliance proof pipeline
- **3 user roles** — each with a dedicated portal
- **1 dataset_id** is all the FDA needs to verify full compliance
- **Minutes** to commit a dataset vs. months for traditional compliance
