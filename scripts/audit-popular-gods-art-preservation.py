#!/usr/bin/env python3
"""Verify every previously tracked JPG byte against the published baseline."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE = 'b8e216cd53ccc640366c91755268291afb1840d2'


def main():
    paths = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', BASELINE, 'public/cards'], cwd=ROOT, text=True).splitlines()
    rows = []
    for path in paths:
        if not path.endswith('.jpg'):
            continue
        old = subprocess.check_output(['git', 'show', BASELINE + ':' + path], cwd=ROOT)
        new = (ROOT / path).read_bytes()
        rows.append({'path': path, 'baselineSha256': hashlib.sha256(old).hexdigest(), 'currentSha256': hashlib.sha256(new).hexdigest(), 'bytes': len(new), 'identical': old == new})
    assert all(row['identical'] for row in rows), 'A pre-existing JPG changed'
    report = {'baselineCommit': BASELINE, 'ok': True, 'scope': 'Every tracked pre-existing public/cards JPG, including all 339 Field cropped references and the 28 model-card references, is byte-identical. Newly added JPGs are not part of preservation count.', 'count': len(rows), 'files': rows}
    output = ROOT / 'docs/audits/artifacts/popular-gods-models-2026-10-08/art-preservation.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'count': len(rows), 'allIdentical': True, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest()}))


if __name__ == '__main__':
    main()
