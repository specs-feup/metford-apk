#!/usr/bin/env bash
# Simplenote — Kadabra vs metford-apk comparison pipeline
set -euo pipefail

THESIS="$(cd "$(dirname "$0")/.." && pwd)"
SUBJECTS="$THESIS/paper-metford/subjects"
METFORD="$THESIS/metford-apk"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=~/Android/Sdk
# Simplenote uses Gradle 6.1.1 which requires Java 11
GRADLE_JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64

APP=simplenote-android
GRADLE_TASK=:Simplenote:assembleDebug
ORIGINAL_APK="$SUBJECTS/$APP/Simplenote/build/outputs/apk/debug/Simplenote-debug.apk"
SCHEMATA_APK="$SUBJECTS/$APP-schemata/Simplenote/build/outputs/apk/debug/Simplenote-debug.apk"
METFORD_REPORT="$METFORD/reports/mutation-report-simplenote.json"
METFORD_CONFIG="simplenote.config.json"
KADABRA_SCHEMATA_CONFIG="simplenote-schemata"

# shellcheck source=pipeline.sh
source "$(dirname "$0")/pipeline.sh"
