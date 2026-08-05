#!/usr/bin/env bash
# Red-line tripwire (CONTRIBUTING「派工與驗收作業」§3): fails when lines ADDED
# by a change look like governed NHI data outside the designated receipt-record
# files. Patterns are structural tripwires — a hit requires human review, and a
# clean run is NOT clearance; RDL-005/RDL-007 still apply in full.
set -uo pipefail

BASE_REF="${1:?usage: governance-scan.sh <base-ref, e.g. origin/main>}"
git fetch --quiet origin "${BASE_REF#origin/}" 2>/dev/null || true

# Files whose whole purpose is hash-only receipt records / governance history,
# plus this scanner and the workflow that carry the patterns themselves.
# data/governed/ holds RA-approved, hash-locked payload (RDL-012 and successor
# approvals); its integrity is enforced by storage-manifest verification, not
# by this tripwire, and payload anywhere else still trips the scan.
EXCLUDES=(
  ':(exclude)docs/spec-source-status.md'
  ':(exclude)docs/regulatory-decision-log.md'
  ':(exclude)docs/phase1-readiness.md'
  ':(exclude)CHANGELOG.md'
  ':(exclude).github/workflows/ci.yml'
  ':(exclude)scripts/governance-scan.sh'
  # Task Contracts record what was dispatched and verified, and that record has
  # to be able to name the patterns it checked for — a contract describing this
  # scan trips it (CI run 30959516258). This is the widest exemption here and
  # the only one covering a directory that keeps growing, so it is also the one
  # that carries real risk: a contract is free prose, and payload pasted into
  # one is no longer caught. Naming a pattern by reference rather than quoting
  # its text still keeps the record inside the tripwire and remains preferred.
  ':(exclude)docs/task-contracts/**'
  # RDL-016 codegen output; drift tests guard governed-dataset integrity, as storage guards data/governed/**.
  ':(exclude)packages/domain/src/generated/**'
  ':(exclude)data/governed/**'
)

added_all="$(git diff "$BASE_REF"...HEAD -- . "${EXCLUDES[@]}" | grep -E '^\+' | grep -vE '^\+\+\+' || true)"
added_code="$(git diff "$BASE_REF"...HEAD -- packages apps | grep -E '^\+' | grep -vE '^\+\+\+' || true)"

# Local runs must also see files not yet committed: untracked files are
# invisible to git diff, which would let a red line slip through pre-commit
# checks (in CI, checkouts have everything committed, so this adds nothing).
EXCLUDE_RE='^(docs/spec-source-status\.md|docs/regulatory-decision-log\.md|docs/phase1-readiness\.md|CHANGELOG\.md|\.github/workflows/ci\.yml|scripts/governance-scan\.sh|docs/task-contracts/.*|data/governed/.*)$'
while IFS= read -r untracked; do
  [ -f "$untracked" ] || continue
  content="$(cat "$untracked" 2>/dev/null || true)"
  added_all="${added_all}"$'\n'"${content}"
  case "$untracked" in
    packages/*|apps/*) added_code="${added_code}"$'\n'"${content}" ;;
  esac
done < <(git ls-files --others --exclude-standard | grep -vE "$EXCLUDE_RE" || true)

fail=0

# Set A (everywhere except designated files): NHI-code shape (two uppercase
# alnum starting A/B + 8 digits — demo codes are D-prefixed and pass),
# announcement-reference marker, non-demo price wording.
hits_a="$(printf '%s\n' "$added_all" | grep -nE '[A-B][A-Z0-9][0-9]{8}|健保審字|(新|舊|核定)支付價' || true)"
if [ -n "$hits_a" ]; then
  printf 'governance-scan RED LINE — governed-data patterns outside designated receipt files:\n%s\n' "$hits_a"
  fail=1
fi

# Set B (code directories only): patient identifiers and eligibility copy.
# Exact-literal exemption: the mandatory no-patient-data NOTICE (Phase 0 required
# copy) names the forbidden identifiers in order to forbid them; moved lines would
# re-trip Set B forever. Only this exact sentence is exempt — any variation trips.
hits_b="$(printf '%s\n' "$added_code" | grep -nE '病歷號|身分證字號|病人姓名|符合給付' | grep -vF '請勿輸入姓名、病歷號、檢驗值、診斷或任何可識別病人資訊。' || true)"
if [ -n "$hits_b" ]; then
  printf 'governance-scan RED LINE — patient/eligibility patterns in code:\n%s\n' "$hits_b"
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "governance-scan: no red-line patterns in added lines (tripwire only, not clearance)."
fi
exit "$fail"
