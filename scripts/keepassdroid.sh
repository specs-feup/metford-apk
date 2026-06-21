#!/usr/bin/env bash
# KeePassDroid — Kadabra vs metford-apk comparison pipeline
set -euo pipefail

THESIS="$(cd "$(dirname "$0")/.." && pwd)"
SUBJECTS="$THESIS/paper-metford/subjects"
METFORD="$THESIS/metford-apk"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=~/Android/Sdk

APP=keepassdroid
GRADLE_TASK=assembleGeneralDebug
ORIGINAL_APK="$SUBJECTS/$APP/app/build/outputs/apk/general/debug/app-general-debug.apk"
SCHEMATA_APK="$SUBJECTS/$APP-schemata/app/build/outputs/apk/general/debug/app-general-debug.apk"
METFORD_REPORT="$METFORD/reports/mutation-report-keepassdroid.json"
METFORD_CONFIG="keepassdroid.config.json"
KADABRA_SCHEMATA_CONFIG="keepassdroid-schemata"

# shellcheck source=pipeline.sh
source "$(dirname "$0")/pipeline.sh"
