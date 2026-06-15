#!/usr/bin/env bash
# Omni-Notes — Kadabra vs metford-apk comparison pipeline
# Note: APK version (6.2.8) is hardcoded in the output filename — update if different.
set -euo pipefail

THESIS="$(cd "$(dirname "$0")/.." && pwd)"
SUBJECTS="$THESIS/paper-metford/subjects"
METFORD="$THESIS/metford-apk"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=~/Android/Sdk

APP=Omni-Notes
GRADLE_TASK=assembleFossDebug
ORIGINAL_APK="$SUBJECTS/$APP/omniNotes/build/outputs/apk/foss/debug/OmniNotes-fossDebug-6.2.8.apk"
SCHEMATA_APK="$SUBJECTS/$APP-schemata/omniNotes/build/outputs/apk/foss/debug/OmniNotes-fossDebug-6.2.8.apk"
METFORD_REPORT="$METFORD/reports/mutation-report-omni-notes.json"
METFORD_CONFIG="omni-notes.config.json"
KADABRA_SCHEMATA_CONFIG="omni-notes-schemata"

# shellcheck source=pipeline.sh
source "$(dirname "$0")/pipeline.sh"
