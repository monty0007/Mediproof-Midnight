from typing import Optional
from pydantic import BaseModel


class ProofOverride(BaseModel):    # kept verbatim from AlphaShield
    mode: str                      # "mock" | "real"


class DatasetCommitRequest(BaseModel):
    hospital_name: str             # hashed to hospital_id_hash, never stored raw
    record_count: int              # private witness — never stored or logged
    schema_fields: list[str]       # hashed to dataset_schema_hash
    disease_category: str          # public label e.g. "oncology"
    proof_override: Optional[ProofOverride] = None


class TrainingRequest(BaseModel):
    dataset_id: str
    researcher_id: str             # hashed before storage
    model_type: str                # "classifier" | "regression" | "transformer"
    proof_override: Optional[ProofOverride] = None


class AuditRequest(BaseModel):
    dataset_id: str
