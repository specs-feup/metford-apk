#!/usr/bin/env bash
# Robust full-app mutation run: auto-resumes until all mutants are scored.
#
# Usage:
#   ./scripts/score-app.sh <app> <total_mutants> [exclude_class] [confirm] [reset_every]
#
# Example:
#   ./scripts/score-app.sh amazefilemanager 1012 com.amaze.filemanager.asynchronous.services.ftp.FtpServiceStaticMethodsTest 2 25
set -uo pipefail

METFORD="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"

APP="${1:?app name required}"
TOTAL="${2:?total mutant count required}"
EXCLUDE="${3:-}"
CONFIRM="${4:-2}"
RESET_EVERY="${5:-25}"

# Per-app default exclude list (env/precondition tests that fail regardless of
# mutant). Used when no exclude is passed as $3. Comma-separated.
if [ -z "$EXCLUDE" ]; then
    case "$APP" in
        amazefilemanager) EXCLUDE="com.amaze.filemanager.asynchronous.services.ftp.FtpServiceStaticMethodsTest" ;;
    esac
fi
echo ">>> app=$APP total=$TOTAL exclude=${EXCLUDE:-<none>} confirm=$CONFIRM reset_every=$RESET_EVERY"

case "$APP" in
    amazefilemanager) DIR="AmazeFileManager" ;;
    antennapod)       DIR="AntennaPod" ;;
    aegis)            DIR="Aegis" ;;
    keepassdroid)     DIR="keepassdroid" ;;
    omni-notes)       DIR="Omni-Notes" ;;
    simplenote)       DIR="simplenote-android" ;;
    *) echo "Unknown app: $APP"; exit 1 ;;
esac
CSV="$METFORD/apks/$DIR/metford-results.csv"

RUNNER_CLASS="androidx.test.runner.AndroidJUnitRunner"
case "$APP" in
    amazefilemanager) PKG="com.amaze.filemanager.debug";          TESTPKG="$PKG.test" ;;
    antennapod)       PKG="de.danoeh.antennapod.debug";           TESTPKG="$PKG.test" ;;
    aegis)            PKG="com.beemdevelopment.aegis.debug";       TESTPKG="$PKG.test"; RUNNER_CLASS="com.beemdevelopment.aegis.AegisTestRunner" ;;
    keepassdroid)     PKG="com.android.keepass";                  TESTPKG="com.keepassdroid.tests" ;;
    omni-notes)       PKG="it.feio.android.omninotes.foss.debug"; TESTPKG="$PKG.test" ;;
    simplenote)       PKG="com.automattic.simplenote.debug";      TESTPKG="$PKG.test" ;;
esac
RUNNER="$TESTPKG/$RUNNER_CLASS"

# Health check: is the ORIGINAL program runnable? If it crashes, the emulator has
# degraded (resource/dexopt pressure) and would record false crashes. Reboot it.
baseline_ok() {
    adb shell setprop debug.mutant.id -1 >/dev/null 2>&1 || true
    adb shell am force-stop "$PKG" >/dev/null 2>&1 || true
    local out
    out=$(adb shell am instrument -w ${EXCLUDE:+-e notClass "$EXCLUDE"} "$RUNNER" 2>&1 || true)
    echo "$out" | grep -q "Process crashed\|INSTRUMENTATION_FAILED"  && return 1
    return 0
}

reboot_emulator() {
    echo ">>> emulator degraded — rebooting"
    adb shell pm trim-caches 9999999999 >/dev/null 2>&1 || true
    adb reboot
    adb wait-for-device
    until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 3; done
    adb shell settings put global hidden_api_policy 1 >/dev/null 2>&1 || true
    sleep 5
}

ARGS=(--app "$APP" --confirm "$CONFIRM" --reset-every "$RESET_EVERY")
[ -n "$EXCLUDE" ] && ARGS+=(--exclude "$EXCLUDE")

for i in $(seq 1 30); do
    # Drop any false crash/error rows (degraded-emulator artifacts) so they re-run.
    if [ -f "$CSV" ]; then
        head -1 "$CSV" > "$CSV.tmp"
        tail -n +2 "$CSV" | awk -F, '$2!="crash" && $2!="error"' >> "$CSV.tmp"
        mv "$CSV.tmp" "$CSV"
    fi
    if ! baseline_ok; then reboot_emulator; fi
    "$METFORD/scripts/run-mutants.sh" "${ARGS[@]}"
    done=$(tail -n +2 "$CSV" 2>/dev/null | wc -l | tr -d ' ')
    echo ">>> pass $i complete: $done / $TOTAL scored"
    [ "$done" -ge "$TOTAL" ] && { echo ">>> ALL DONE"; break; }
    sleep 3
done