# Privacy and data inventory

## Data accepted by the API

| Field | Purpose | Stored? | Classification |
| --- | --- | --- | --- |
| `query` | Drug code/name/ingredient lookup | No | Non-patient product query |
| `as_of_date` | Select data-effective date | No | Non-patient metadata |
| `dataset_version` | Require a known data version | No | Non-patient metadata |

The Worker logs event type, status, candidate count and generated request ID. It intentionally does not log query content. No database, analytics SDK, cookie, patient profile or user account exists in Phase 0.

## Explicitly prohibited input

Patient name, medical record number, national identifier, age, sex, diagnosis, lab values, images, prescription history, free-text clinical note and any patient eligibility input are out of scope. Unknown request fields are rejected.

## Retention and sharing

Phase 0 stores nothing. Future production retention, access controls, subcontractors, cross-border transfer and deletion policy require a separate approved privacy assessment before implementation.
