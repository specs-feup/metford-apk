#!/usr/bin/env bash
# Shared pipeline: Steps 1–6 for any subject app.
# Do not run directly — source from an app script after setting:
#   THESIS, SUBJECTS, METFORD, APP, GRADLE_TASK,
#   ORIGINAL_APK, SCHEMATA_APK, METFORD_REPORT, METFORD_CONFIG, KADABRA_SCHEMATA_CONFIG

# GRADLE_JAVA_HOME can be overridden per-app script for older Gradle versions.
_GRADLE_JAVA_HOME="${GRADLE_JAVA_HOME:-$JAVA_HOME}"

# ── Step 1: Build original APK ───────────────────────────────────────────────
echo "=== Step 1: Build original APK ==="
cd "$SUBJECTS/$APP"
JAVA_HOME="$_GRADLE_JAVA_HOME" ./gradlew "$GRADLE_TASK"
echo "Original APK: $ORIGINAL_APK"

# ── Step 2: Run Kadabra mutation generation, then build schemata APK ─────────
echo "=== Step 2: Kadabra mutation generation ==="
KADABRA_WORKSPACE="$THESIS/mutation-testing-v2/Kadabra"
mkdir -p "$THESIS/mutation-testing-v2/output"
cd "$KADABRA_WORKSPACE"
KADABRA_START=$SECONDS
java -jar "$THESIS/paper-metford/bin/kadabra.jar" -c "$KADABRA_SCHEMATA_CONFIG.kadabra"
KADABRA_TIME=$((SECONDS - KADABRA_START))
echo "Kadabra mutation generation done in ${KADABRA_TIME}s"
KADABRA_REPORT="$THESIS/mutation-testing-v2/output/$KADABRA_SCHEMATA_CONFIG/mutated_project/MutationInfo.json"

echo "=== Step 2b: Build Kadabra schemata APK ==="
cd "$SUBJECTS/$APP-schemata"
JAVA_HOME="$_GRADLE_JAVA_HOME" ./gradlew clean "$GRADLE_TASK"
echo "Kadabra schemata APK: $SCHEMATA_APK"

# ── Step 3: Run metford-apk (Alpakka) weaver ────────────────────────────────
echo "=== Step 3: Run metford-apk weaver ==="
cp "$METFORD/configs/$METFORD_CONFIG" "$METFORD/metford.config.json"
METFORD_APK="$METFORD/$(python3 -c "import json; print(json.load(open('$METFORD/metford.config.json'))['outputApk'])")"
cd "$METFORD"
METFORD_START=$SECONDS
npm run run
METFORD_TIME=$((SECONDS - METFORD_START))
echo "metford-apk report: $METFORD_REPORT"

# ── Save APKs ────────────────────────────────────────────────────────────────
APK_DIR="$METFORD/apks/$APP"
mkdir -p "$APK_DIR"
cp "$ORIGINAL_APK"   "$APK_DIR/original.apk"
cp "$SCHEMATA_APK"   "$APK_DIR/kadabra-schemata.apk"
cp "$METFORD_APK"    "$APK_DIR/metford-schemata.apk"
cp "$METFORD_REPORT" "$APK_DIR/mutation-report.json"
echo "APKs saved → $APK_DIR/"

# ── Steps 4–6: Analysis (tee to results file) ───────────────────────────────
RESULTS_FILE="$THESIS/results/$APP-results.txt"
mkdir -p "$THESIS/results"
echo "Results → $RESULTS_FILE"
{

# ── Step 4: Mutation counts comparison ──────────────────────────────────────
echo "=== Step 4: Mutation counts ==="
python3 - "$KADABRA_REPORT" "$METFORD_REPORT" <<'EOF'
import json, sys, os
if not os.path.exists(sys.argv[1]):
    print(f"(skipped — Kadabra report not found: {sys.argv[1]})")
    sys.exit(0)

OP_MAP = {
    "RandomActionIntentDefinitionOperatorMutator": "RandomIntentActionMutator",
    "NullValueIntentPutExtraOperatorMutator":      "NullPutExtraValueMutator",
    "IntentPayloadReplacementOperatorMutator":     "NullPutExtraKeyMutator",
    "BuggyGUIListenerOperatorMutator":            "BuggyGUIListenerMutator",
    "LengthyGUIListenerOperatorMutator":          "LengthyGUIListenerMutator",
    "LengthyGUICreationOperatorMutator":          "LengthyGUICreationMutator",
    "FindViewByIdReturnsNullOperatorMutator":     "FindViewByIdReturnsNullMutator",
    "InvalidIDFindViewOperatorMutator":           "InvalidIDFindViewMutator",
    "InvalidViewFocusOperatorMutator":            "InvalidViewFocusMutator",
    "ViewComponentNotVisibleOperatorMutator":     "ViewComponentNotVisibleMutator",
    "NullIntentOperatorMutator":                  "NullIntentMutator",
    "BinaryMutator":                              "ArithmeticOperatorMutator",
    "InvalidKeyIntentOperatorMutator":            "InvalidKeyIntentMutator",
    "IntentTargetReplacementOperatorMutator":     "IntentTargetReplacementMutator",
}

kad_raw = json.load(open(sys.argv[1]))
kad = {}
for m in kad_raw:
    if 'mutantion' not in m:
        continue  # Kadabra error record
    op = OP_MAP.get(m['mutantion']['operator'], m['mutantion']['operator'])
    kad[op] = kad.get(op, 0) + 1

met_raw = json.load(open(sys.argv[2]))
met = {}
for s in met_raw['sites']:
    for v in s['variants']:
        met[v['operator']] = met.get(v['operator'], 0) + 1

all_ops = sorted(set(kad) | set(met))
col = max(len(o) for o in all_ops)
print(f"{'Operator':<{col}}  {'Kadabra':>8}  {'metford':>8}  {'diff':>6}")
print("-" * (col + 28))
for op in all_ops:
    k = kad.get(op, 0)
    m = met.get(op, 0)
    diff = m - k
    diff_str = f"+{diff}" if diff > 0 else str(diff)
    print(f"{op:<{col}}  {k:>8}  {m:>8}  {diff_str:>6}")
print("-" * (col + 28))
total_k = sum(kad.values())
total_m = sum(met.values())
diff = total_m - total_k
diff_str = f"+{diff}" if diff > 0 else str(diff)
print(f"{'TOTAL':<{col}}  {total_k:>8}  {total_m:>8}  {diff_str:>6}")
EOF

# ── Step 5: Line-level comparison ───────────────────────────────────────────
echo ""
echo "=== Step 5: Line-level comparison (class + line number) ==="
python3 - "$KADABRA_REPORT" "$METFORD_REPORT" <<'EOF'
import json, sys, os
if not os.path.exists(sys.argv[1]):
    print(f"(skipped — Kadabra report not found: {sys.argv[1]})")
    sys.exit(0)

OP_MAP = {
    "RandomActionIntentDefinitionOperatorMutator": "RandomIntentActionMutator",
    "NullValueIntentPutExtraOperatorMutator":       "NullPutExtraValueMutator",
    "IntentPayloadReplacementOperatorMutator":      "NullPutExtraKeyMutator",
    "BuggyGUIListenerOperatorMutator":             "BuggyGUIListenerMutator",
    "LengthyGUIListenerOperatorMutator":           "LengthyGUIListenerMutator",
    "LengthyGUICreationOperatorMutator":           "LengthyGUICreationMutator",
    "FindViewByIdReturnsNullOperatorMutator":      "FindViewByIdReturnsNullMutator",
    "InvalidIDFindViewOperatorMutator":            "InvalidIDFindViewMutator",
    "InvalidViewFocusOperatorMutator":             "InvalidViewFocusMutator",
    "ViewComponentNotVisibleOperatorMutator":      "ViewComponentNotVisibleMutator",
    "NullIntentOperatorMutator":                   "NullIntentMutator",
    "BinaryMutator":                               "ArithmeticOperatorMutator",
    "InvalidKeyIntentOperatorMutator":             "InvalidKeyIntentMutator",
    "IntentTargetReplacementOperatorMutator":      "IntentTargetReplacementMutator",
}

kadabra = json.load(open(sys.argv[1]))
kad_sites = {}
for m in kadabra:
    if 'mutantion' not in m:
        continue
    cls = m['filePath'].replace('.java', '')
    line = m.get('mutationLine')
    op = m['mutantion']['operator']
    mop = OP_MAP.get(op, op)
    key = (cls, line, mop)
    kad_sites[key] = kad_sites.get(key, 0) + 1

metford = json.load(open(sys.argv[2]))
met_sites = {}
for s in metford['sites']:
    line = s.get('line')
    if line is None:
        continue
    cls = s['method'].split(';')[0].lstrip('L')
    for v in s['variants']:
        key = (cls, line, v['operator'])
        met_sites[key] = met_sites.get(key, 0) + 1

kad_keys = set(kad_sites)
met_keys = set(met_sites)
both = kad_keys & met_keys
kad_only = kad_keys - met_keys
met_only = met_keys - kad_keys

print(f"Matched (same class+line+operator): {len(both)}")
print(f"Kadabra only:                       {len(kad_only)}")
print(f"metford-apk only:                   {len(met_only)}")

print("\n--- Matches per operator ---")
op_matches = {}
for (cls, line, op) in both:
    op_matches[op] = op_matches.get(op, 0) + 1
for op, n in sorted(op_matches.items()):
    print(f"  {op}: {n}")

print("\n--- Kadabra-only (not found in smali) per operator ---")
op_kad = {}
for (cls, line, op) in kad_only:
    op_kad[op] = op_kad.get(op, 0) + 1
for op, n in sorted(op_kad.items()):
    print(f"  {op}: {n}")

# ── Class+operator match (no line required) ──────────────────────────────────
print("\n--- Class+operator match (ignoring line numbers) ---")
kad_co = set()
for m in kadabra:
    if 'mutantion' not in m:
        continue
    cls = m['filePath'].replace('.java', '')
    op = OP_MAP.get(m['mutantion']['operator'], m['mutantion']['operator'])
    kad_co.add((cls, op))

met_co = set()
for s in metford['sites']:
    cls = s['method'].split(';')[0].lstrip('L')
    for v in s['variants']:
        met_co.add((cls, v['operator']))

both_co = kad_co & met_co
kad_co_only = kad_co - met_co
met_co_only = met_co - kad_co

print(f"Matched (same class+operator):  {len(both_co)} / {len(kad_co)} Kadabra pairs  ({100*len(both_co)/len(kad_co):.1f}%)")
print(f"Kadabra only:                   {len(kad_co_only)}")
print(f"metford-apk only:               {len(met_co_only)}")

print("\n  Per-operator class coverage (Kadabra classes also found in metford-apk):")
op_total, op_matched = {}, {}
for (cls, op) in kad_co:
    op_total[op] = op_total.get(op, 0) + 1
    if (cls, op) in met_co:
        op_matched[op] = op_matched.get(op, 0) + 1
for op in sorted(op_total):
    matched = op_matched.get(op, 0)
    total = op_total[op]
    print(f"    {op}: {matched}/{total} ({100*matched/total:.0f}%)")
EOF

# ── Step 6: Time and space comparison ───────────────────────────────────────
echo ""
echo "=== Step 6: Time and space ==="
python3 - "$ORIGINAL_APK" "$SCHEMATA_APK" "$METFORD_APK" "$KADABRA_TIME" "$METFORD_TIME" <<'EOF'
import sys, os

def fmt_size(b):
    return f"{b / 1024 / 1024:.1f} MB"

def fmt_time(s):
    s = int(s)
    return f"{s // 60}m{s % 60:02d}s"

orig = os.path.getsize(sys.argv[1])
kad  = os.path.getsize(sys.argv[2])
met  = os.path.getsize(sys.argv[3])
kt   = sys.argv[4]
mt   = sys.argv[5]

col = 22
print(f"{'':>{col}}  {'Kadabra':>12}  {'metford':>12}")
print("-" * (col + 28))
print(f"{'Original APK':>{col}}  {fmt_size(orig):>12}  {fmt_size(orig):>12}")
print(f"{'Schemata APK':>{col}}  {fmt_size(kad):>12}  {fmt_size(met):>12}")
print(f"{'Bloat factor':>{col}}  {kad/orig:>11.1f}x  {met/orig:>11.1f}x")
print(f"{'Mutation time':>{col}}  {fmt_time(kt):>12}  {fmt_time(mt):>12}")
EOF

} 2>&1 | tee "$RESULTS_FILE"
