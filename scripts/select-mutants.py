#!/usr/bin/env python3
"""
Select mutant IDs for sampling or operator-specific runs.

Usage:
  # Random sample of N mutants from each tool
  python3 scripts/select-mutants.py --mode sample --n 100 --app amazefilemanager

  # All mutants for a specific operator
  python3 scripts/select-mutants.py --mode operator --operator InvalidViewFocusMutator --app amazefilemanager

Outputs:
  apks/<App>/kadabra-ids.txt   -- Kadabra mutantIdNumbers (used by score-compare.py)
  apks/<App>/metford-ids.txt   -- metford-apk sequential IDs (feed into run-mutants.sh)
"""

import argparse, json, os, random, sys

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
OP_MAP_REV = {v: k for k, v in OP_MAP.items()}

APP_DIR = {
    "amazefilemanager": "AmazeFileManager",
    "antennapod":       "AntennaPod",
    "aegis":            "Aegis",
    "keepassdroid":     "keepassdroid",
    "omni-notes":       "Omni-Notes",
    "simplenote":       "simplenote-android",
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["sample", "operator"], required=True)
    parser.add_argument("--app", default="amazefilemanager")
    parser.add_argument("--n", type=int, default=100, help="Sample size (mode=sample)")
    parser.add_argument("--operator", help="Operator name in metford naming (mode=operator)")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    metford = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    apk_dir = os.path.join(metford, "apks", APP_DIR[args.app])

    kad_report = json.load(open(os.path.join(apk_dir, "kadabra-report.json")))
    met_report = json.load(open(os.path.join(apk_dir, "mutation-report.json")))

    # Build metford index: sequential ID -> operator
    met_index = []
    for site in met_report["sites"]:
        for v in site["variants"]:
            met_index.append({"id": len(met_index), "operator": v["operator"]})

    if args.mode == "sample":
        random.seed(args.seed)
        kad_ids = [m["mutantIdNumber"] for m in kad_report]
        met_ids = [m["id"] for m in met_index]
        kad_sample = sorted(random.sample(kad_ids, min(args.n, len(kad_ids))))
        met_sample = sorted(random.sample(met_ids, min(args.n, len(met_ids))))
        desc = f"random sample of {len(kad_sample)} Kadabra / {len(met_sample)} metford-apk mutants (seed={args.seed})"
    else:
        if not args.operator:
            print("--operator required for mode=operator", file=sys.stderr)
            sys.exit(1)
        kad_op = OP_MAP_REV.get(args.operator, args.operator)
        kad_sample = sorted(
            m["mutantIdNumber"] for m in kad_report
            if "mutantion" in m and m["mutantion"]["operator"] == kad_op
        )
        met_sample = sorted(
            m["id"] for m in met_index
            if m["operator"] == args.operator
        )
        desc = f"operator={args.operator}: {len(kad_sample)} Kadabra / {len(met_sample)} metford-apk mutants"

    kad_file = os.path.join(apk_dir, "kadabra-ids.txt")
    met_file = os.path.join(apk_dir, "metford-ids.txt")

    with open(kad_file, "w") as f:
        f.write(f"# {desc}\n")
        f.write("\n".join(str(i) for i in kad_sample) + "\n")

    with open(met_file, "w") as f:
        f.write(f"# {desc}\n")
        f.write("\n".join(str(i) for i in met_sample) + "\n")

    print(f"Kadabra IDs -> {kad_file}  ({len(kad_sample)} mutants)")
    print(f"metford IDs -> {met_file}  ({len(met_sample)} mutants)")
    print(f"Description: {desc}")
    print()
    print("Next steps:")
    print(f"  1. Run metford-apk mutants:  ./scripts/run-mutants.sh --ids-file {met_file} --app {args.app}")
    print(f"  2. Compare scores:           python3 scripts/score-compare.py --app {args.app}")

if __name__ == "__main__":
    main()
