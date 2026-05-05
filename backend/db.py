# ─── Database layer ───────────────────────────────────────────────────────────
# Tries PostgreSQL (asyncpg) first; falls back to local SQLite (aiosqlite)
# when the remote DB is unreachable — so the app always works offline.
#
# Tables:
#   datasets   — public dataset records (no patient data, no hospital names)
#   audit_log  — immutable audit trail (dataset_id + timestamp only)
#
# HIPAA note: record_count, hospital_name, researcher_id are NEVER stored.
# They exist only as private ZK witnesses during the API request lifetime.
# ─────────────────────────────────────────────────────────────────────────────

import os
import json
import asyncio
import aiosqlite
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "")

# SQLite file lives next to this module
_SQLITE_PATH = os.path.join(os.path.dirname(__file__), "mediproof.db")

# After startup, this is set to "postgres" or "sqlite"
_db_mode: str = "sqlite"
_pg_pool = None   # asyncpg pool when Postgres is reachable


async def _try_postgres():
    """Return an asyncpg pool if DATABASE_URL is set and reachable, else None."""
    if not DATABASE_URL:
        return None
    try:
        import asyncpg
        pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10,
                                          timeout=8)
        # quick connectivity check
        async with pool.acquire() as c:
            await c.fetchval("SELECT 1")
        return pool
    except Exception:
        return None


async def init_db():
    """Create tables (Postgres or SQLite). Called on app startup."""
    global _db_mode, _pg_pool

    _pg_pool = await _try_postgres()
    if _pg_pool:
        _db_mode = "postgres"
        async with _pg_pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS datasets (
                    dataset_id          TEXT PRIMARY KEY,
                    hospital_id_hash    TEXT NOT NULL,
                    disease_category    TEXT NOT NULL,
                    schema_fields       JSONB NOT NULL DEFAULT '[]',
                    schema_hash         TEXT NOT NULL,
                    commit_timestamp    TIMESTAMPTZ NOT NULL,
                    compliance_status   INTEGER NOT NULL DEFAULT 1,
                    dataset_available   INTEGER NOT NULL DEFAULT 1,
                    bytes_patient_exposed INTEGER NOT NULL DEFAULT 0,
                    proof_hash          TEXT NOT NULL,
                    zk_mode             TEXT NOT NULL DEFAULT 'mock',
                    training_proven     INTEGER NOT NULL DEFAULT 0,
                    model_output_hash   TEXT,
                    training_proof_hash TEXT
                )
            """)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id                SERIAL PRIMARY KEY,
                    dataset_id        TEXT NOT NULL,
                    auditor_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
    else:
        _db_mode = "sqlite"
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS datasets (
                    dataset_id            TEXT PRIMARY KEY,
                    hospital_id_hash      TEXT NOT NULL,
                    disease_category      TEXT NOT NULL,
                    schema_fields         TEXT NOT NULL DEFAULT '[]',
                    schema_hash           TEXT NOT NULL,
                    commit_timestamp      TEXT NOT NULL,
                    compliance_status     INTEGER NOT NULL DEFAULT 1,
                    dataset_available     INTEGER NOT NULL DEFAULT 1,
                    bytes_patient_exposed INTEGER NOT NULL DEFAULT 0,
                    proof_hash            TEXT NOT NULL,
                    zk_mode               TEXT NOT NULL DEFAULT 'mock',
                    training_proven       INTEGER NOT NULL DEFAULT 0,
                    model_output_hash     TEXT,
                    training_proof_hash   TEXT
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id                INTEGER PRIMARY KEY AUTOINCREMENT,
                    dataset_id        TEXT NOT NULL,
                    auditor_timestamp TEXT NOT NULL
                )
            """)
            await db.commit()


# ── Dataset helpers ───────────────────────────────────────────────────────────

async def insert_dataset(d: dict):
    ts = d["commit_timestamp"]
    if isinstance(ts, str):
        ts_str = ts
        ts_dt  = datetime.fromisoformat(ts)
    else:
        ts_dt  = ts
        ts_str = ts.isoformat()

    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO datasets (
                    dataset_id, hospital_id_hash, disease_category, schema_fields,
                    schema_hash, commit_timestamp, compliance_status, dataset_available,
                    bytes_patient_exposed, proof_hash, zk_mode,
                    training_proven, model_output_hash, training_proof_hash
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            """,
                d["dataset_id"], d["hospital_id_hash"], d["disease_category"],
                json.dumps(d["schema_fields"]), d["schema_hash"], ts_dt,
                d["compliance_status"], d["dataset_available"], d["bytes_patient_exposed"],
                d["proof_hash"], d["zk_mode"],
                d["training_proven"], d.get("model_output_hash"), d.get("training_proof_hash"),
            )
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            await db.execute("""
                INSERT INTO datasets (
                    dataset_id, hospital_id_hash, disease_category, schema_fields,
                    schema_hash, commit_timestamp, compliance_status, dataset_available,
                    bytes_patient_exposed, proof_hash, zk_mode,
                    training_proven, model_output_hash, training_proof_hash
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                d["dataset_id"], d["hospital_id_hash"], d["disease_category"],
                json.dumps(d["schema_fields"]), d["schema_hash"], ts_str,
                d["compliance_status"], d["dataset_available"], d["bytes_patient_exposed"],
                d["proof_hash"], d["zk_mode"],
                d["training_proven"], d.get("model_output_hash"), d.get("training_proof_hash"),
            ))
            await db.commit()


async def get_dataset(dataset_id: str) -> dict | None:
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM datasets WHERE dataset_id = $1", dataset_id
            )
        return _row_to_dict(row) if row else None
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM datasets WHERE dataset_id = ?", (dataset_id,)
            ) as cur:
                row = await cur.fetchone()
        return _sqlite_row(row) if row else None


async def list_datasets() -> list[dict]:
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM datasets ORDER BY commit_timestamp DESC"
            )
        return [_row_to_dict(r) for r in rows]
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM datasets ORDER BY commit_timestamp DESC"
            ) as cur:
                rows = await cur.fetchall()
        return [_sqlite_row(r) for r in rows]


async def update_training(dataset_id: str, model_output_hash: str,
                          training_proof_hash: str):
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            await conn.execute("""
                UPDATE datasets
                SET training_proven = 1,
                    model_output_hash = $2,
                    training_proof_hash = $3
                WHERE dataset_id = $1
            """, dataset_id, model_output_hash, training_proof_hash)
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            await db.execute("""
                UPDATE datasets
                SET training_proven = 1,
                    model_output_hash = ?,
                    training_proof_hash = ?
                WHERE dataset_id = ?
            """, (model_output_hash, training_proof_hash, dataset_id))
            await db.commit()


# ── Audit log helpers ─────────────────────────────────────────────────────────

async def append_audit(dataset_id: str):
    now = datetime.now(timezone.utc).isoformat()
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO audit_log (dataset_id) VALUES ($1)", dataset_id
            )
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            await db.execute(
                "INSERT INTO audit_log (dataset_id, auditor_timestamp) VALUES (?, ?)",
                (dataset_id, now)
            )
            await db.commit()


async def get_audit_log() -> list[dict]:
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT dataset_id, auditor_timestamp FROM audit_log ORDER BY auditor_timestamp DESC"
            )
        return [{"dataset_id": r["dataset_id"],
                 "auditor_timestamp": r["auditor_timestamp"].isoformat()} for r in rows]
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT dataset_id, auditor_timestamp FROM audit_log ORDER BY auditor_timestamp DESC"
            ) as cur:
                rows = await cur.fetchall()
        return [{"dataset_id": r["dataset_id"], "auditor_timestamp": r["auditor_timestamp"]}
                for r in rows]


# ── Row helpers ───────────────────────────────────────────────────────────────

def _row_to_dict(row) -> dict:
    """Convert an asyncpg Record to a plain dict."""
    d = dict(row)
    if isinstance(d.get("schema_fields"), str):
        d["schema_fields"] = json.loads(d["schema_fields"])
    if hasattr(d.get("commit_timestamp"), "isoformat"):
        d["commit_timestamp"] = d["commit_timestamp"].isoformat()
    return d


def _sqlite_row(row) -> dict:
    """Convert an aiosqlite Row to a plain dict."""
    d = dict(row)
    if isinstance(d.get("schema_fields"), str):
        try:
            d["schema_fields"] = json.loads(d["schema_fields"])
        except Exception:
            d["schema_fields"] = []
    return d

