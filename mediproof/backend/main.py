import asyncio
import hashlib
import logging
import sys
import time
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from models import DatasetCommitRequest, TrainingRequest
from db import init_db, insert_dataset, get_dataset, list_datasets, update_training, append_audit, get_audit_log
from zk_client import submit_dataset_proof, submit_training_proof

# ── Logging setup ─────────────────────────────────────────────────────────────
CYAN   = "\033[36m";  GREEN  = "\033[32m";  YELLOW = "\033[33m"
RED    = "\033[31m";  GREY   = "\033[90m";  BOLD   = "\033[1m";  RESET = "\033[0m"

class ColourFormatter(logging.Formatter):
    LEVEL_COLOURS = {
        logging.DEBUG:    GREY   + "DEBUG" + RESET,
        logging.INFO:     GREEN  + "INFO " + RESET,
        logging.WARNING:  YELLOW + "WARN " + RESET,
        logging.ERROR:    RED    + "ERROR" + RESET,
        logging.CRITICAL: RED    + BOLD + "CRIT " + RESET,
    }
    def format(self, record):
        ts   = datetime.now().strftime("%H:%M:%S")
        lvl  = self.LEVEL_COLOURS.get(record.levelno, record.levelname)
        tag  = CYAN + f"[{record.name}]" + RESET
        return f"{GREY}{ts}{RESET} {lvl} {tag} {record.getMessage()}"

def _make_logger(name: str) -> logging.Logger:
    log = logging.getLogger(name)
    if not log.handlers:
        h = logging.StreamHandler(sys.stdout)
        h.setFormatter(ColourFormatter())
        log.addHandler(h)
    log.setLevel(logging.DEBUG)
    log.propagate = False
    return log

log      = _make_logger("backend")
log_req  = _make_logger("http")
log_zk   = _make_logger("zk")

# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="MediProof API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request/response logger middleware ────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    log_req.info(f"→ {request.method} {request.url.path}")
    response: Response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    colour = GREEN if response.status_code < 400 else YELLOW if response.status_code < 500 else RED
    log_req.info(f"← {colour}{response.status_code}{RESET} {request.url.path}  {ms:.0f}ms")
    return response

@app.on_event("startup")
async def on_startup():
    await init_db()
    from db import _db_mode
    db_label = "PostgreSQL (Azure)" if _db_mode == "postgres" else "SQLite (local)"
    log.info(f"{BOLD}MediProof backend started{RESET}  →  http://localhost:8000")
    log.info(f"Database: {CYAN}{db_label}{RESET}")
    log.info("Docs: http://localhost:8000/docs")


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


# ── POST /api/dataset/commit ──────────────────────────────────────────────────
@app.post("/api/dataset/commit")
async def commit_dataset(req: DatasetCommitRequest):
    dataset_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    # Hash hospital identity — raw name is NEVER stored
    hospital_id_hash = sha256(req.hospital_name)

    # Hash sorted schema fields — original list is NEVER stored
    schema_hash = sha256(",".join(sorted(req.schema_fields)))

    log.info(f"Committing dataset  hospital={hospital_id_hash[:12]}…  disease={req.disease_category}  fields={len(req.schema_fields)}")

    # Call midnight-service to run commit_dataset ZK circuit
    # record_count passes as a private witness; the service never logs it
    log_zk.info("Calling midnight-service › commit_dataset circuit")
    try:
        zk_result = await submit_dataset_proof({
            "dataset_id": dataset_id,
            "hospital_id_hash": hospital_id_hash,
            "schema_hash": schema_hash,
            "timestamp": timestamp,
            "record_count": req.record_count,   # private witness — not stored here
            "min_record_count": 500,
            "deidentified": 1,
        })
        proof_hash = zk_result.get("proofHash") or zk_result.get("complianceHash", "")
        zk_mode = zk_result.get("mode", "mock")
        log_zk.info(f"commit_dataset › mode={zk_mode}  hash={proof_hash[:16]}…")
    except Exception as e:
        # Midnight-service unreachable — derive mock hash locally
        log_zk.warning(f"midnight-service unreachable ({e}), using local mock hash")
        proof_hash = sha256(f"{dataset_id}{hospital_id_hash}{timestamp}MEDIPROOF_ZK")
        zk_mode = "mock"

    # Store public fields only — record_count is intentionally excluded
    await insert_dataset({
        "dataset_id": dataset_id,
        "hospital_id_hash": hospital_id_hash,
        "disease_category": req.disease_category,
        "schema_fields": req.schema_fields,
        "schema_hash": schema_hash,
        "commit_timestamp": timestamp,
        "compliance_status": 1,
        "dataset_available": 1,
        "bytes_patient_exposed": 0,
        "proof_hash": proof_hash,
        "zk_mode": zk_mode,
        "training_proven": 0,
        "model_output_hash": None,
        "training_proof_hash": None,
    })

    log.info(f"Dataset committed  id={dataset_id[:12]}…  mode={zk_mode}")
    return {
        "dataset_id": dataset_id,
        "compliance_proof_hash": proof_hash,
        "zk_mode": zk_mode,
    }


# ── GET /api/dataset/list ─────────────────────────────────────────────────────
@app.get("/api/dataset/list")
async def list_datasets_route():
    """Return public dataset records only — no hospital names, record counts, or raw schema."""
    rows = await list_datasets()
    return [
        {
            "id": d["dataset_id"],
            "dataset_id": d["dataset_id"],
            "disease_category": d["disease_category"],
            "schema_fields": d.get("schema_fields", []),
            "schema_hash": d["schema_hash"],
            "commit_timestamp": d["commit_timestamp"],
            "compliance_status": d["compliance_status"],
            "bytes_patient_exposed": d["bytes_patient_exposed"],
            "zk_mode": d["zk_mode"],
        }
        for d in rows
    ]


# ── POST /api/training/request ────────────────────────────────────────────────
@app.post("/api/training/request")
async def request_training(req: TrainingRequest):
    dataset = await get_dataset(req.dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if not dataset.get("dataset_available"):
        raise HTTPException(status_code=409, detail="Dataset not available for training")

    # Hash researcher identity — raw ID is NEVER stored
    _researcher_id_hash = sha256(req.researcher_id)

    # Mock training — non-blocking sleep to simulate federated learning
    await asyncio.sleep(1.5)

    timestamp = datetime.now(timezone.utc).isoformat()
    model_output_hash = sha256(f"{req.dataset_id}{req.model_type}{timestamp}")

    log.info(f"Training request  dataset={req.dataset_id[:12]}…  model={req.model_type}")
    log_zk.info("Calling midnight-service › prove_training circuit")
    try:
        zk_result = await submit_training_proof({
            "dataset_id": req.dataset_id,
            "model_hash": model_output_hash,
            "schema_hash": dataset["schema_hash"],
            "training_rows": 1000,   # private witness — mock; never stored
        })
        training_proof_hash = zk_result.get("proofHash") or zk_result.get("modelHash", "")
        zk_mode = zk_result.get("mode", "mock")
        log_zk.info(f"prove_training › mode={zk_mode}  hash={training_proof_hash[:16]}…")
    except Exception as e:
        log_zk.warning(f"midnight-service unreachable ({e}), using local mock hash")
        training_proof_hash = sha256(f"{req.dataset_id}{model_output_hash}TRAINING_ZK")
        zk_mode = "mock"

    await update_training(req.dataset_id, model_output_hash, training_proof_hash)

    log.info(f"Training completed  dataset={req.dataset_id[:12]}…  mode={zk_mode}")
    return {
        "request_id": str(uuid.uuid4()),
        "dataset_id": req.dataset_id,
        "status": "completed",
        "model_output_hash": model_output_hash,
        "training_proof_hash": training_proof_hash,
        "training_proven": 1,
        "zk_mode": zk_mode,
    }


# ── GET /api/dataset/{dataset_id}/proof ──────────────────────────────────────
@app.get("/api/dataset/{dataset_id}/proof")
async def get_dataset_proof(dataset_id: str):
    dataset = await get_dataset(dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {
        "compliance_status": dataset["compliance_status"],
        "training_proven": dataset["training_proven"],
        "model_output_hash": dataset.get("model_output_hash"),
        "bytes_patient_exposed": dataset["bytes_patient_exposed"],
        "compliance_proof_hash": dataset["proof_hash"],
        "zk_mode": dataset["zk_mode"],
    }


# ── GET /api/audit/log  (defined BEFORE /{dataset_id} to avoid route conflict) ──
@app.get("/api/audit/log")
async def get_audit_log_route():
    rows = await get_audit_log()
    return [
        {
            "dataset_id": e["dataset_id"],
            "timestamp": datetime.fromisoformat(e["auditor_timestamp"]).timestamp(),
            "compliant": True,
        }
        for e in rows
    ]


# ── GET /api/audit/{dataset_id} ───────────────────────────────────────────────
@app.get("/api/audit/{dataset_id}")
async def audit_dataset(dataset_id: str):
    log.info(f"Audit requested  id={dataset_id[:12]}…")
    dataset = await get_dataset(dataset_id)
    if not dataset:
        log.warning(f"Audit 404: dataset {dataset_id[:12]}… not found")
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Append to audit log — no patient data is ever recorded here
    await append_audit(dataset_id)

    # Derive unix timestamp from stored commit_timestamp
    ts = dataset.get("commit_timestamp")
    if ts:
        try:
            ts = datetime.fromisoformat(ts).timestamp()
        except Exception:
            ts = None

    return {
        "dataset_id": dataset_id,
        "compliant": dataset["compliance_status"] == 1,
        "compliance_status": dataset["compliance_status"],
        "compliance_label": "HIPAA Compliant" if dataset["compliance_status"] == 1 else "Non-Compliant",
        "hospital_id_hash": dataset["hospital_id_hash"],
        "schema_hash": dataset["schema_hash"],
        "compliance_proof_hash": dataset["proof_hash"],
        "training_proven": dataset["training_proven"],
        "model_output_hash": dataset.get("model_output_hash"),
        "bytes_patient_exposed": dataset["bytes_patient_exposed"],
        "zk_mode": dataset["zk_mode"],
        "timestamp": ts,
    }


# ── GET /health ───────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}
