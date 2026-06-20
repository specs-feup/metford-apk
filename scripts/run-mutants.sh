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
RANGE_ARGS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --app)      APP="$2"; shift 2 ;;
        --ids-file) IDS_FILE="$2"; shift 2 ;;
        *)          RANGE_ARGS+=("$1"); shift ;;
    esac
done

declare -A APP_PACKAGE=(
    ["amazefilemanager"]="com.amaze.filemanager.debug"
    ["antennapod"]="de.danoeh.antennapod.debug"
    ["aegis"]="com.beemdevelopment.aegis.debug"
    ["keepassdroid"]="com.android.keepass.debug"
    ["omni-notes"]="it.feio.android.omninotes.foss.debug"
    ["simplenote"]="com.automattic.simplenote.debug"
)

declare -A APP_DIR=(
    ["amazefilemanager"]="AmazeFileManager"
    ["antennapod"]="AntennaPod"
    ["aegis"]="Aegis"
    ["keepassdroid"]="keepassdroid"
    ["omni-notes"]="Omni-Notes"
    ["simplenote"]="simplenote-android"
)

PACKAGE="${APP_PACKAGE[$APP]}"
DIR="${APP_DIR[$APP]}"
APK="$METFORD/apks/$DIR/metford-schemata.apk"
REPORT="$METFORD/apks/$DIR/mutation-report.json"
RESULTS_FILE="$METFORD/apks/$DIR/metford-results.csv"
RUNNER="$PACKAGE.test/androidx.test.runner.AndroidJUnitRunner"
TIMEOUT=120

if [[ ! -f "$APK" ]]; then
    echo "ERROR: APK not found: $APK"
    exit 1
fi

if [[ ! -f "$REPORT" ]]; then
    echo "ERROR: Mutation report not found: $REPORT"
    exit 1
fi

TEST_APK="$METFORD/apks/$DIR/test.apk"

echo "Installing $APK ..."
adb install -r "$APK"

if [[ -f "$TEST_APK" ]]; then
    echo "Installing $TEST_APK ..."
    adb install -r "$TEST_APK"
fi

TOTAL=$(python3 -c "import json; d=json.load(open('$REPORT')); print(sum(len(s['variants']) for s in d['sites']))")

if [[ -n "$IDS_FILE" ]]; then
    mapfile -t ID_LIST < <(grep -v '^#' "$IDS_FILE" | grep -v '^$')
    echo "Running ${#ID_LIST[@]} mutants from $IDS_FILE"
else
    START=${RANGE_ARGS[0]:-1}
    END=${RANGE_ARGS[1]:-$TOTAL}
    mapfile -t ID_LIST < <(seq "$START" "$END")
    echo "Running mutant IDs $START-$END of $TOTAL total"
fi

echo "Results -> $RESULTS_FILE"

if [[ ! -f "$RESULTS_FILE" ]]; then
    echo "id,status,failures" > "$RESULTS_FILE"
fi

DONE=$(tail -n +2 "$RESULTS_FILE" | cut -d, -f1 | sort -n)

for ID in "${ID_LIST[@]}"; do
    if echo "$DONE" | grep -qx "$ID"; then
        echo "Mutant $ID -- already done, skipping"
        continue
    fi
    echo -n "Mutant $ID/$TOTAL ... "

    adb shell setprop debug.mutant.id "$ID" >/dev/null
    adb shell am force-stop "$PACKAGE" >/dev/null 2>&1
    sleep 0.5

    RAW=$(timeout "$TIMEOUT" adb shell am instrument -w "$RUNNER" 2>&1 || true)

    if echo "$RAW" | grep -q "INSTRUMENTATION_FAILED\|Process crashed"; then
        STATUS="crash"
        FAILURES="crash"
    elif echo "$RAW" | grep -q "FAILURES\!\!\!"; then
        FAIL_COUNT=$(echo "$RAW" | grep -oP 'Tests run: \d+,  Failures: \K\d+' || echo "?")
        STATUS="killed"
        FAILURES="$FAIL_COUNT"
    elif echo "$RAW" | grep -q "^OK"; then
        STATUS="survived"
        FAILURES="0"
    else
        STATUS="error"
        FAILURES="unknown"
    fi

    echo "$STATUS ($FAILURES failures)"
    echo "$ID,$STATUS,$FAILURES" >> "$RESULTS_FILE"
done

adb shell setprop debug.mutant.id -1 >/dev/null
adb shell am force-stop "$PACKAGE" >/dev/null 2>&1

echo ""
echo "=== Summary ==="
IDS_STR=$(printf '%s,' "${ID_LIST[@]}")
python3 - "$RESULTS_FILE" "$IDS_STR" <<'EOF'
import csv, sys
ids = set(sys.argv[2].rstrip(',').split(','))
rows = [r for r in csv.DictReader(open(sys.argv[1])) if r['id'] in ids]
total    = len(rows)
killed   = sum(1 for r in rows if r['status'] in ('killed', 'crash'))
survived = sum(1 for r in rows if r['status'] == 'survived')
errors   = sum(1 for r in rows if r['status'] == 'error')
score    = killed / total * 100 if total else 0
print(f"Total:    {total}")
print(f"Killed:   {killed}  (includes crashes)")
print(f"Survived: {survived}")
print(f"Errors:   {errors}")
print(f"Mutation score: {score:.1f}%")
EOF
