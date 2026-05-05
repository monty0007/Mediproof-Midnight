import os
import httpx

ZK_SERVICE_URL = os.getenv("ZK_SERVICE_URL", "http://localhost:6300")


async def submit_dataset_proof(payload: dict) -> dict:
    """POST /submit-dataset-proof to midnight-service (port 6300).

    payload keys: dataset_id, hospital_id_hash, schema_hash, timestamp,
                  record_count, min_record_count, deidentified
    Returns: { proofHash, complianceHash, mode }
    """
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{ZK_SERVICE_URL}/submit-dataset-proof",
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


async def submit_training_proof(payload: dict) -> dict:
    """POST /submit-training-proof to midnight-service (port 6300).

    payload keys: dataset_id, model_hash, schema_hash, training_rows
    Returns: { proofHash, modelHash, mode }
    """
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{ZK_SERVICE_URL}/submit-training-proof",
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()
