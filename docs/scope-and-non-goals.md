# Scope and non-goals

v3.2 §30 item 1. Derived from Master Project Prompt v3.2 §2 (received 2026-08-02; receipt recorded in docs/spec-source-status.md). This is a structural restatement in the project's own words; regulatory semantics stay out of this repository until governed intake and RA approval. If any point below is later found to conflict with the received v3.2 text, v3.2 prevails and the conflict is resolved through the RA procedure.

## Product scope (target state, phase-gated)

- A drug-level Taiwan NHI coverage-rule locator and official-text lookup for lipid-lowering medications (initial cardiovascular module), designed for physicians immediately after a consultation.
- Deterministic resolution from an input (NHI code, brand name, generic name or ingredient) to: product identity; the rule-set labels applicable on the queried date; product-level exceptions such as trial-period exceptions; formal warnings; official text blocks; sources, announcement references, effective dates; and application/regulatory/price data versions.
- Two lookup paths: drug-first quick lookup as the primary interaction, and rule-first browsing over approved rule labels as a secondary entry that never becomes a patient questionnaire.
- Cross-platform delivery: Web, iOS and Android clients plus a Cloudflare Worker API sharing one deterministic core, one regulatory data version and one price data version; no per-platform rule engines.
- Versioned, `as_of_date`-driven queries with fail-closed behavior outside validated coverage; three-layer output separation (official text / deterministic applicable clauses / clearly labeled plain-language summary).
- NHI payment-price display and strictly-gated price comparison limited to products verified directly comparable.

## Explicit non-goals (first release stage)

- No patient-level eligibility determination; patient eligibility is always reported `NOT_ASSESSED`.
- No treatment recommendations or clinical decision support derived from patient parameters.
- No claim that results equal NHI adjudication, guarantee reimbursement, or carry official endorsement.
- No LLM-generated or LLM-adjudicated regulatory text in formal outputs; official text is stored, approved text only.
- No patient data in any form — no identifiers, diagnoses, laboratory values or free-text patient notes, anywhere.
- No framing of the NHI payment price as patient out-of-pocket cost, procurement cost or retail price; no lowest-price ranking across non-comparable products; no prescription recommendation by price.
- No collection of physician certificate images or national-ID data; no advertising SDKs, advertising identifiers, third-party session replay, or commercial profiling of physician query behavior.

## Current-repository boundary (Phase 0 / 0.5 reality)

This repository currently contains only the demo-only foundation: invented `DEMO_DATA_ONLY` records with mandatory warnings, and a synthetic-only source-intake quarantine. Every part of the product scope that requires official rules, real prices or production deployment remains BLOCKED behind RDL-005 and the phase gates (docs/phase-plan.md, docs/phase1-readiness.md).
