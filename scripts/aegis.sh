#!/usr/bin/env bash
# Aegis — Kadabra vs metford-apk comparison pipeline
set -euo pipefail

THESIS="$(cd "$(dirname "$0")/.." && pwd)"
SUBJECTS="$THESIS/paper-metford/subjects"
METFORD="$THESIS/metford-apk"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=~/Android/Sdk

APP=Aegis
GRADLE_TASK=assembleDebug
ORIGINAL_APK="$SUBJECTS/$APP/app/build/outputs/apk/debug/app-debug.apk"
SCHEMATA_APK="$SUBJECTS/$APP-schemata/app/build/outputs/apk/debug/app-debug.apk"
METFORD_REPORT="$METFORD/reports/mutation-report-aegis.json"
METFORD_CONFIG="aegis.config.json"
KADABRA_SCHEMATA_CONFIG="aeges-schemata"

# shellcheck source=pipeline.sh
source "$(dirname "$0")/pipeline.sh"
