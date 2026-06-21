#!/usr/bin/env bash
# Run the test suite against metford-apk mutants.
#
# Usage:
#   ./scripts/run-mutants.sh [--app APP] [--ids-file FILE] [start_id [end_id]]
#
#   --app APP          App name (default: amazefilemanager)
#   --ids-file FILE    Run only the IDs listed in FILE (one per line, # comments ignored)
#   start_id / end_id  Range mode (default: 1 to total mutant count)
#
# Output: apks/<App>/metford-results.csv  (id,status,failures)
set -euo pipefail

METFORD="$(cd "$(dirname "$0")/.." && pwd)"

APP="amazefilemanager"
IDS_FILE=""
EXCLUDE=""
CONFIRM=0          # re-run each killed/verifyerror mutant this many extra times (in reset state); keep verdict only if it reproduces every time
RESET_EVERY=25     # clear ART verification cache every N mutants (0 = never); avoids dex2oat verify-caching false verifyerrors over long runs
RANGE_ARGS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --app)         APP="$2"; shift 2 ;;
        --ids-file)    IDS_FILE="$2"; shift 2 ;;
        --exclude)     EXCLUDE="$2"; shift 2 ;;   # comma-separated test classes to skip (env/precondition tests)
        --confirm)     CONFIRM="$2"; shift 2 ;;
        --reset-every) RESET_EVERY="$2"; shift 2 ;;
        *)             RANGE_ARGS+=("$1"); shift ;;
    esac
done

# case lookups (compatible with macOS bash 3.2 which lacks associative arrays).
# PACKAGE = app under test; TESTRUNNER = the instrumentation component
# (test pkg / runner class). Most apps use <pkg>.test + AndroidJUnitRunner, but
# some differ (keepassdroid: app com.android.keepass, test com.keepassdroid.tests).
RUNNER_CLASS="androidx.test.runner.AndroidJUnitRunner"
case "$APP" in
    amazefilemanager) PACKAGE="com.amaze.filemanager.debug";          DIR="AmazeFileManager"; TESTPKG="$PACKAGE.test" ;;
    antennapod)       PACKAGE="de.danoeh.antennapod.debug";           DIR="AntennaPod";       TESTPKG="$PACKAGE.test" ;;
    aegis)            PACKAGE="com.beemdevelopment.aegis.debug";       DIR="Aegis";            TESTPKG="$PACKAGE.test"; RUNNER_CLASS="com.beemdevelopment.aegis.AegisTestRunner" ;;
    keepassdroid)     PACKAGE="com.android.keepass";                  DIR="keepassdroid";     TESTPKG="com.keepassdroid.tests" ;;
    omni-notes)       PACKAGE="it.feio.android.omninotes.foss.debug"; DIR="Omni-Notes";       TESTPKG="$PACKAGE.test" ;;
    simplenote)       PACKAGE="com.automattic.simplenote.debug";      DIR="simplenote-android"; TESTPKG="$PACKAGE.test" ;;
    *) echo "Unknown app: $APP" >&2; exit 1 ;;
esac
APK="$METFORD/apks/$DIR/metford-schemata.apk"
REPORT="$METFORD/apks/$DIR/mutation-report.json"
RESULTS_FILE="$METFORD/apks/$DIR/metford-results.csv"
RUNNER="$TESTPKG/$RUNNER_CLASS"
TIMEOUT=25

# Build the notClass argument from --exclude (skip env/precondition tests that
# fail regardless of mutant and would otherwise mark every mutant as killed).
EXCLUDE_ARGS=()
if [[ -n "$EXCLUDE" ]]; then
    EXCLUDE_ARGS=(-e notClass "$EXCLUDE")
fi

if [[ ! -f "$APK" ]]; then
    echo "ERROR: APK not found: $APK"
    exit 1
fi

if [[ ! -f "$REPORT" ]]; then
    echo "ERROR: Mutation report not found: $REPORT"
    exit 1
fi

# Per-mutant timeout: GNU `timeout` (or `gtimeout` from coreutils on macOS).
# If neither exists, run without a timeout.
TIMEOUT_CMD=()
if command -v timeout >/dev/null 2>&1; then
    TIMEOUT_CMD=(timeout "$TIMEOUT")
elif command -v gtimeout >/dev/null 2>&1; then
    TIMEOUT_CMD=(gtimeout "$TIMEOUT")
fi

TEST_APK="$METFORD/apks/$DIR/test.apk"

echo "Installing $APK ..."
adb install -r "$APK"

if [[ -f "$TEST_APK" ]]; then
    echo "Installing $TEST_APK ..."
    adb install -r "$TEST_APK"
fi

TOTAL=$(python3 -c "import json; d=json.load(open('$REPORT')); print(sum(len(s['variants']) for s in d['sites']))")

# read into an array without mapfile (macOS bash 3.2 compatible)
ID_LIST=()
if [[ -n "$IDS_FILE" ]]; then
    while IFS= read -r line; do ID_LIST+=("$line"); done < <(grep -v '^#' "$IDS_FILE" | grep -v '^$')
    echo "Running ${#ID_LIST[@]} mutants from $IDS_FILE"
else
    START=${RANGE_ARGS[0]:-1}
    END=${RANGE_ARGS[1]:-$TOTAL}
    while IFS= read -r line; do ID_LIST+=("$line"); done < <(seq "$START" "$END")
    echo "Running mutant IDs $START-$END of $TOTAL total"
fi

echo "Results -> $RESULTS_FILE"

if [[ ! -f "$RESULTS_FILE" ]]; then
    echo "id,status,failures" > "$RESULTS_FILE"
fi

DONE=$(tail -n +2 "$RESULTS_FILE" | cut -d, -f1 | sort -n)

# Disable errexit for the mutant loop: a transient adb/instrument nonzero must
# not abort the whole run. Each iteration classifies its own result and the run
# is resumable, so we tolerate per-mutant failures and keep going.
set +e

# Clear ART's accumulated dex verification cache (dex2oat/vdex). Over a long
# sequential run ART caches strict-verification verdicts that wrongly reject the
# (valid) schemata bytecode, producing false verifyerrors. `compile --reset`
# returns the package to its just-installed state, restoring honest verification.
reset_cache() {
    adb shell cmd package compile --reset "$PACKAGE" >/dev/null 2>&1 || true
}

# Extract the set of failing test identifiers (testName(fqcn)) from instrument output.
fail_set() {
    echo "$1" | tr '\r' '\n' | grep -oE "[A-Za-z0-9_]+\([A-Za-z0-9_.]+\)" | sort -u
}

# Baseline = tests that already fail on the ORIGINAL program (mutant -1): env/
# precondition/flaky-deterministic failures. A mutant is "killed" only if it
# fails a test OUTSIDE this set (textbook definition: fails a test the original
# passes). This makes always-failing tests irrelevant without manual excludes.
BASELINE_FAILS=""

# Run the test suite once against the currently-selected mutant; sets STATUS/FAILURES.
# When BASELINE_FAILS is set, a FAILURES result only counts as killed if it
# introduces a failure not present in the baseline.
run_instrument() {
    adb shell am force-stop "$PACKAGE" >/dev/null 2>&1 || true
    sleep 0.5
    local RAW rc
    RAW=$(${TIMEOUT_CMD[@]+"${TIMEOUT_CMD[@]}"} adb shell am instrument -w ${EXCLUDE_ARGS[@]+"${EXCLUDE_ARGS[@]}"} "$RUNNER" 2>&1)
    rc=$?

    # gtimeout/timeout exits 124 when the test run exceeds TIMEOUT: the mutant
    # caused an infinite loop / hang. That is a detected mutation -> killed.
    if [[ "$rc" -eq 124 ]]; then
        STATUS="timeout"; FAILURES="timeout"
        return
    fi

    if echo "$RAW" | grep -q "INSTRUMENTATION_FAILED\|Process crashed"; then
        STATUS="crash"; FAILURES="crash"
    elif echo "$RAW" | grep -q "FAILURES\!\!\!"; then
        if echo "$RAW" | grep -qE "VerifyError|Verifier rejected|ArrayStoreException|ExceptionInInitializerError"; then
            STATUS="verifyerror"
            FAILURES="verify"
        else
            # New failures = this run's failing set minus the baseline failing set.
            local EXTRA
            EXTRA=$(comm -23 <(fail_set "$RAW") <(echo "$BASELINE_FAILS") | grep -c .)
            if [[ "$EXTRA" -gt 0 ]]; then
                STATUS="killed"; FAILURES="$EXTRA"
            else
                STATUS="survived"; FAILURES="baseline"
            fi
        fi
    elif echo "$RAW" | grep -q "^OK"; then
        STATUS="survived"; FAILURES="0"
    else
        STATUS="error"; FAILURES="unknown"
    fi
}

# Compute the baseline failing set on the ORIGINAL program (mutant -1).
echo -n "Computing baseline (original program) failing tests ... "
reset_cache
adb shell setprop debug.mutant.id -1 >/dev/null 2>&1 || true
adb shell am force-stop "$PACKAGE" >/dev/null 2>&1 || true
BASE_RAW=$(${TIMEOUT_CMD[@]+"${TIMEOUT_CMD[@]}"} adb shell am instrument -w ${EXCLUDE_ARGS[@]+"${EXCLUDE_ARGS[@]}"} "$RUNNER" 2>&1 || true)
BASELINE_FAILS=$(fail_set "$BASE_RAW")
BN=$(echo "$BASELINE_FAILS" | grep -c .)
echo "$BN baseline failure(s) (ignored when scoring)"
[ "$BN" -gt 0 ] && echo "$BASELINE_FAILS" | sed 's/^/    baseline-fail: /'

COUNT=0
CRASH_STREAK=0
for ID in "${ID_LIST[@]}"; do
    if echo "$DONE" | grep -qx "$ID"; then
        echo "Mutant $ID -- already done, skipping"
        continue
    fi
    COUNT=$((COUNT + 1))
    if [[ "$RESET_EVERY" -gt 0 ]] && [[ $((COUNT % RESET_EVERY)) -eq 1 ]]; then
        reset_cache
    fi
    echo -n "Mutant $ID/$TOTAL ... "

    adb shell setprop debug.mutant.id "$ID" >/dev/null 2>&1 || true
    run_instrument

    # Confirmation pass: a killed/verifyerror verdict may be a flaky test or a
    # cache-induced false verifyerror. Reset state and re-run; only keep the
    # verdict if it reproduces every time, else demote to survived (flaky).
    if [[ "$CONFIRM" -gt 0 ]] && { [[ "$STATUS" == "killed" ]] || [[ "$STATUS" == "verifyerror" ]] || [[ "$STATUS" == "crash" ]]; }; then
        FIRST="$STATUS"
        REPRODUCED=1
        for ((c=1; c<=CONFIRM; c++)); do
            reset_cache
            run_instrument
            if [[ "$STATUS" == "survived" ]]; then REPRODUCED=0; break; fi
        done
        if [[ "$REPRODUCED" -eq 1 ]]; then
            STATUS="$FIRST"
        else
            STATUS="survived"; FAILURES="flaky"
        fi
    fi

    echo "$STATUS ($FAILURES failures)"

    # Circuit breaker: a run of consecutive crash/error means the emulator has
    # degraded (not real results). Stop the pass WITHOUT recording these so the
    # caller can reboot and resume; the offending ids re-run cleanly next pass.
    if [[ "$STATUS" == "crash" ]] || [[ "$STATUS" == "error" ]]; then
        CRASH_STREAK=$((CRASH_STREAK + 1))
        if [[ "$CRASH_STREAK" -ge 5 ]]; then
            echo ">>> $CRASH_STREAK consecutive crash/error — emulator degraded, stopping pass (not recording)"
            break
        fi
    else
        CRASH_STREAK=0
    fi

    echo "$ID,$STATUS,$FAILURES" >> "$RESULTS_FILE"
done

adb shell setprop debug.mutant.id -1 >/dev/null 2>&1 || true
adb shell am force-stop "$PACKAGE" >/dev/null 2>&1 || true

echo ""
echo "=== Summary ==="
IDS_STR=$(printf '%s,' "${ID_LIST[@]}")
python3 - "$RESULTS_FILE" "$IDS_STR" <<'EOF'
import csv, sys
ids = set(sys.argv[2].rstrip(',').split(','))
rows = [r for r in csv.DictReader(open(sys.argv[1])) if r['id'] in ids]
total    = len(rows)
# A timeout is a detected mutation (infinite loop): counts as killed.
killed   = sum(1 for r in rows if r['status'] in ('killed', 'crash', 'timeout'))
timeout  = sum(1 for r in rows if r['status'] == 'timeout')
verifyerr= sum(1 for r in rows if r['status'] == 'verifyerror')
survived = sum(1 for r in rows if r['status'] == 'survived')
errors   = sum(1 for r in rows if r['status'] == 'error')
# Score excludes verifyerror: those are killed by OUR malformed bytecode, not
# by the test suite detecting the mutation. Denominator drops them too.
valid    = total - verifyerr
score    = killed / valid * 100 if valid else 0
print(f"Total:    {total}")
print(f"Killed:   {killed}  (incl. {timeout} timeouts; real test detections + crashes)")
print(f"Survived: {survived}")
print(f"VerifyError (excluded, codegen false-kills): {verifyerr}")
print(f"Errors:   {errors}")
print(f"Mutation score: {score:.1f}%  ({killed}/{valid} valid mutants)")
EOF
