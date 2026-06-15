#!/usr/bin/env python3
"""
Compare Kadabra vs metford-apk mutation scores.

Usage:
  python3 scripts/score-compare.py --app amazefilemanager

Reads from apks/<App>/:
  kadabra-ids.txt      -- from select-mutants.py
  metford-ids.txt      -- from select-mutants.py
  kadabra-matrix.csv   -- Kadabra killing matrix (semicolon-separated)
  metford-results.csv  -- from run-mutants.sh
"""

import argparse, csv, os, sys

APP_DIR = {
    "amazefilemanager": "AmazeFileManager",
    "antennapod":       "AntennaPod",
    "aegis":            "Aegis",
    "keepassdroid":     "keepassdroid",
    "omni-notes":       "Omni-Notes",
    "simplenote":       "simplenote-android",
}

def load_kadabra_matrix(path):
    result = {}
    with open(path) as f:
        for row in csv.reader(f, delimiter=';'):
            if not row:
                continue
            mid = row[0].strip()
            killed = any(c.strip() not in ('0', '') for c in row[1:])
            result[mid] = killed
    return result

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--app", default="amazefilemanager")
    args = parser.parse_args()

    metford = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    apk_dir = os.path.join(metford, "apks", APP_DIR[args.app])

    kad_ids_file  = os.path.join(apk_dir, "kadabra-ids.txt")
    met_ids_file  = os.path.join(apk_dir, "metford-ids.txt")
    matrix_file   = os.path.join(apk_dir, "kadabra-matrix.csv")
    results_file  = os.path.join(apk_dir, "metford-results.csv")

    for f in [kad_ids_file, met_ids_file, matrix_file, results_file]:
        if not os.path.exists(f):
            print(f"Missing: {f}", file=sys.stderr)
            sys.exit(1)

    kad_ids = [l.strip() for l in open(kad_ids_file) if l.strip() and not l.startswith('#')]
    met_ids = [l.strip() for l in open(met_ids_file)  if l.strip() and not l.startswith('#')]

    kad_matrix = load_kadabra_matrix(matrix_file)
    met_rows   = {r['id']: r for r in csv.DictReader(open(results_file))}

    kad_results, kad_missing = [], []
    for mid in kad_ids:
        if mid in kad_matrix:
            kad_results.append(kad_matrix[mid])
        else:
            kad_missing.append(mid)

    met_results, met_missing = [], []
    for mid in met_ids:
        if mid in met_rows:
            met_results.append(met_rows[mid]['status'] in ('killed', 'crash'))
        else:
            met_missing.append(mid)

    def score_str(results):
        if not results:
            return "N/A", 0, 0
        killed = sum(results)
        total  = len(results)
        return f"{killed}/{total} ({100*killed/total:.1f}%)", killed, total

    kad_s, kad_k, kad_t = score_str(kad_results)
    met_s, met_k, met_t = score_str(met_results)

    col = 20
    print(f"{'':>{col}}  {'Kadabra':>18}  {'metford-apk':>18}")
    print("-" * (col + 40))
    print(f"{'Mutants run':>{col}}  {kad_t:>18}  {met_t:>18}")
    print(f"{'Killed':>{col}}  {kad_k:>18}  {met_k:>18}")
    print(f"{'Mutation score':>{col}}  {kad_s:>18}  {met_s:>18}")

    if kad_missing:
        print(f"\nWarning: {len(kad_missing)} Kadabra IDs not in matrix: {kad_missing[:5]}{'...' if len(kad_missing)>5 else ''}")
    if met_missing:
        print(f"Warning: {len(met_missing)} metford IDs not yet run: {met_missing[:5]}{'...' if len(met_missing)>5 else ''}")

if __name__ == "__main__":
    main()
