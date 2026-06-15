#!/usr/bin/env bash
# AmazeFileManager — Kadabra vs metford-apk comparison pipeline
set -euo pipefail

THESIS="$(cd "$(dirname "$0")/.." && pwd)"
SUBJECTS="$THESIS/paper-metford/subjects"
METFORD="$THESIS/metford-apk"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=~/Android/Sdk

APP=AmazeFileManager
GRADLE_TASK=assembleFdroidDebug
ORIGINAL_APK="$SUBJECTS/$APP/app/build/outputs/apk/fdroid/debug/app-fdroid-debug.apk"
SCHEMATA_APK="$SUBJECTS/$APP-schemata/app/build/outputs/apk/fdroid/debug/app-fdroid-debug.apk"
METFORD_REPORT="$METFORD/reports/mutation-report-amaze.json"
METFORD_CONFIG="amazefilemanager.config.json"
KADABRA_SCHEMATA_CONFIG="amazefilemanager-schemata"

# shellcheck source=pipeline.sh
source "$(dirname "$0")/pipeline.sh"
