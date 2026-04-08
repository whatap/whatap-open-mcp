#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# whatap-open-mcp acceptance test runner
#
# Runs 30 prompts through Codex CLI with a live WhaTap MCP server,
# validates each response, and produces a summary report.
#
# Usage:
#   ./tests/acceptance/run.sh [--results-dir DIR] [--threshold PCT]
#
# Prerequisites:
#   - codex CLI installed and configured with WhaTap MCP server
#   - jq installed
#   - npx tsx available (for validate.ts)
#   - WHATAP_API_TOKEN set in environment (or in codex config)
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROMPTS_FILE="$SCRIPT_DIR/prompts.json"
VALIDATE_SCRIPT="$SCRIPT_DIR/validate.ts"

# Defaults
RESULTS_DIR="$PROJECT_ROOT/test-results"
THRESHOLD=90
TIMEOUT_SECS=120

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --results-dir)
      RESULTS_DIR="$2"
      shift 2
      ;;
    --threshold)
      THRESHOLD="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: $0 [--results-dir DIR] [--threshold PCT]" >&2
      exit 1
      ;;
  esac
done

# Validate prerequisites
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required but not installed." >&2
  exit 1
fi

if ! command -v codex &>/dev/null; then
  echo "ERROR: codex CLI is required but not installed." >&2
  exit 1
fi

if ! command -v npx &>/dev/null; then
  echo "ERROR: npx is required but not installed." >&2
  exit 1
fi

if [[ ! -f "$PROMPTS_FILE" ]]; then
  echo "ERROR: prompts.json not found at $PROMPTS_FILE" >&2
  exit 1
fi

# Setup results directory
mkdir -p "$RESULTS_DIR"

TOTAL=$(jq 'length' "$PROMPTS_FILE")
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# Arrays to track results
declare -a RESULT_IDS=()
declare -a RESULT_CATEGORIES=()
declare -a RESULT_STATUSES=()
declare -a RESULT_REASONS=()

echo "============================================================" >&2
echo " WhaTap Open MCP — Acceptance Test Suite" >&2
echo " Prompts: $TOTAL | Threshold: ${THRESHOLD}% | Timeout: ${TIMEOUT_SECS}s" >&2
echo " Results: $RESULTS_DIR" >&2
echo "============================================================" >&2
echo "" >&2

START_TIME=$(date +%s)

for i in $(seq 0 $((TOTAL - 1))); do
  PROMPT_ID=$(jq -r ".[$i].id" "$PROMPTS_FILE")
  CATEGORY=$(jq -r ".[$i].category" "$PROMPTS_FILE")
  PROMPT=$(jq -r ".[$i].prompt" "$PROMPTS_FILE")
  OUTPUT_FILE="$RESULTS_DIR/prompt_${PROMPT_ID}.txt"

  echo -n "[$PROMPT_ID/$TOTAL] ($CATEGORY) $PROMPT ... " >&2

  # Run codex CLI with timeout
  CODEX_EXIT=0
  timeout "${TIMEOUT_SECS}s" codex exec --dangerously-bypass-approvals-and-sandbox --json "$PROMPT" > "$OUTPUT_FILE" 2>/dev/null || CODEX_EXIT=$?

  if [[ $CODEX_EXIT -eq 124 ]]; then
    # Timeout
    echo "TIMEOUT" >> "$OUTPUT_FILE"
    STATUS="FAIL"
    REASON="timeout after ${TIMEOUT_SECS}s"
    echo "FAIL (timeout)" >&2
  else
    # Validate output
    VALIDATE_OUTPUT=$(npx tsx "$VALIDATE_SCRIPT" \
      --output "$OUTPUT_FILE" \
      --prompt-id "$PROMPT_ID" \
      --prompts-file "$PROMPTS_FILE" 2>/dev/null) || true

    STATUS=$(echo "$VALIDATE_OUTPUT" | jq -r '.status // "FAIL"' 2>/dev/null || echo "FAIL")
    REASON=$(echo "$VALIDATE_OUTPUT" | jq -r '.reason // "validation error"' 2>/dev/null || echo "validation error")

    # Save validation result alongside output
    echo "$VALIDATE_OUTPUT" > "$RESULTS_DIR/prompt_${PROMPT_ID}_result.json"

    if [[ "$STATUS" == "PASS" ]]; then
      echo "PASS" >&2
    else
      echo "FAIL ($REASON)" >&2
    fi
  fi

  # Track results
  RESULT_IDS+=("$PROMPT_ID")
  RESULT_CATEGORIES+=("$CATEGORY")
  RESULT_STATUSES+=("$STATUS")
  RESULT_REASONS+=("$REASON")

  if [[ "$STATUS" == "PASS" ]]; then
    ((PASS_COUNT++)) || true
  else
    ((FAIL_COUNT++)) || true
  fi
done

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

# Calculate pass rate
if [[ $TOTAL -gt 0 ]]; then
  PASS_RATE=$(( (PASS_COUNT * 100) / TOTAL ))
else
  PASS_RATE=0
fi

echo "" >&2
echo "============================================================" >&2
echo " Completed in ${ELAPSED}s — $PASS_COUNT/$TOTAL passed (${PASS_RATE}%)" >&2
echo "============================================================" >&2

# Build JSON results array
JSON_RESULTS="["
for i in $(seq 0 $((${#RESULT_IDS[@]} - 1))); do
  if [[ $i -gt 0 ]]; then
    JSON_RESULTS+=","
  fi
  JSON_RESULTS+=$(jq -n \
    --argjson id "${RESULT_IDS[$i]}" \
    --arg category "${RESULT_CATEGORIES[$i]}" \
    --arg status "${RESULT_STATUSES[$i]}" \
    --arg reason "${RESULT_REASONS[$i]}" \
    '{id: $id, category: $category, status: $status, reason: $reason}')
done
JSON_RESULTS+="]"

# Generate JSON summary
JSON_SUMMARY=$(jq -n \
  --argjson total "$TOTAL" \
  --argjson passed "$PASS_COUNT" \
  --argjson failed "$FAIL_COUNT" \
  --argjson pass_rate "$PASS_RATE" \
  --argjson threshold "$THRESHOLD" \
  --argjson elapsed "$ELAPSED" \
  --argjson results "$JSON_RESULTS" \
  '{
    summary: {
      total: $total,
      passed: $passed,
      failed: $failed,
      pass_rate_pct: $pass_rate,
      threshold_pct: $threshold,
      elapsed_secs: $elapsed,
      verdict: (if $pass_rate >= $threshold then "PASS" else "FAIL" end)
    },
    results: $results
  }')

# Save JSON report
echo "$JSON_SUMMARY" > "$RESULTS_DIR/report.json"

# Generate markdown summary
{
  echo "# WhaTap MCP Acceptance Test Report"
  echo ""
  echo "**Date:** $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo "**Duration:** ${ELAPSED}s"
  echo "**Result:** ${PASS_COUNT}/${TOTAL} passed (${PASS_RATE}%) — threshold: ${THRESHOLD}%"
  echo ""

  if [[ $PASS_RATE -ge $THRESHOLD ]]; then
    echo "**Verdict: PASS**"
  else
    echo "**Verdict: FAIL**"
  fi

  echo ""
  echo "## Results by Category"
  echo ""

  # Group by category
  for CAT in discovery infra apm k8s database promql url_rum install edge; do
    CAT_PASS=0
    CAT_FAIL=0
    CAT_TOTAL=0

    for i in $(seq 0 $((${#RESULT_IDS[@]} - 1))); do
      if [[ "${RESULT_CATEGORIES[$i]}" == "$CAT" ]]; then
        ((CAT_TOTAL++)) || true
        if [[ "${RESULT_STATUSES[$i]}" == "PASS" ]]; then
          ((CAT_PASS++)) || true
        else
          ((CAT_FAIL++)) || true
        fi
      fi
    done

    if [[ $CAT_TOTAL -gt 0 ]]; then
      echo "### $CAT ($CAT_PASS/$CAT_TOTAL)"
      echo ""
      echo "| ID | Status | Reason |"
      echo "|----|--------|--------|"
      for i in $(seq 0 $((${#RESULT_IDS[@]} - 1))); do
        if [[ "${RESULT_CATEGORIES[$i]}" == "$CAT" ]]; then
          echo "| ${RESULT_IDS[$i]} | ${RESULT_STATUSES[$i]} | ${RESULT_REASONS[$i]} |"
        fi
      done
      echo ""
    fi
  done

  # List failures
  HAS_FAILURES=false
  for i in $(seq 0 $((${#RESULT_IDS[@]} - 1))); do
    if [[ "${RESULT_STATUSES[$i]}" != "PASS" ]]; then
      HAS_FAILURES=true
      break
    fi
  done

  if [[ "$HAS_FAILURES" == "true" ]]; then
    echo "## Failures"
    echo ""
    echo "| ID | Category | Reason |"
    echo "|----|----------|--------|"
    for i in $(seq 0 $((${#RESULT_IDS[@]} - 1))); do
      if [[ "${RESULT_STATUSES[$i]}" != "PASS" ]]; then
        PROMPT_TEXT=$(jq -r ".[] | select(.id == ${RESULT_IDS[$i]}) | .prompt" "$PROMPTS_FILE")
        echo "| ${RESULT_IDS[$i]} | ${RESULT_CATEGORIES[$i]} | ${RESULT_REASONS[$i]} |"
      fi
    done
    echo ""
  fi
} > "$RESULTS_DIR/report.md"

# Print both reports to stdout
echo "$JSON_SUMMARY"
echo ""
cat "$RESULTS_DIR/report.md"

# Exit based on threshold
if [[ $PASS_RATE -ge $THRESHOLD ]]; then
  exit 0
else
  echo "" >&2
  echo "FAIL: pass rate ${PASS_RATE}% is below threshold ${THRESHOLD}%" >&2
  exit 1
fi
