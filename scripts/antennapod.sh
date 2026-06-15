#!/usr/bin/env bash
# AntennaPod — Kadabra vs metford-apk comparison pipeline
set -euo pipefail

THESIS="$(cd "$(dirname "$0")/.." && pwd)"
SUBJECTS="$THESIS/paper-metford/subjects"
METFORD="$THESIS/metford-apk"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=~/Android/Sdk

APP=AntennaPod
GRADLE_TASK=assembleFreeDebug
ORIGINAL_APK="$SUBJECTS/$APP/app/build/outputs/apk/free/debug/app-free-debug.apk"
SCHEMATA_APK="$SUBJECTS/$APP-schemata/app/build/outputs/apk/free/debug/app-free-debug.apk"
METFORD_REPORT="$METFORD/reports/mutation-report-antennapod.json"
METFORD_CONFIG="antennapod.config.json"
KADABRA_SCHEMATA_CONFIG="antennapod-schemata"

# shellcheck source=pipeline.sh
source "$(dirname "$0")/pipeline.sh"
