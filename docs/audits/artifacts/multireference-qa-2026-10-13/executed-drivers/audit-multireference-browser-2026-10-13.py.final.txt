#!/usr/bin/env python3
"""Run the preserved strict compiled-browser recipe for multi-reference work.

The coordinator must first complete the build and supply its exact freeze and
entry SHA-256. This adapter imports the published 13 October recipe unchanged:
real public controls, native Duels, exact source/HTTP fingerprints, strict studio
pause observations and disposal checks stay active. It performs no build,
deployment or application-state mutation of its own.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
RECIPE = ROOT / 'scripts/audit-model-fidelity-browser-2026-10-11.py'


def pin(path):
    return {'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    output = Path(sys.argv[sys.argv.index('--output') + 1])
    freeze = Path(sys.argv[sys.argv.index('--freeze') + 1])
    expected_entry = sys.argv[sys.argv.index('--expected-entry-sha256') + 1]
    scope = sys.argv[sys.argv.index('--scope') + 1]
    output.mkdir(parents=True, exist_ok=True)
    before = pin(RECIPE)
    report = {'scope': scope, 'phase': 'compiled', 'executedAtUtc': datetime.now(timezone.utc).isoformat(),
        'multiReferenceWrapper': {'path': str(Path(__file__).relative_to(ROOT)), **pin(Path(__file__))},
        'retainedRecipe': {'path': str(RECIPE.relative_to(ROOT)), 'before': before},
        'freeze': {'path': str(freeze), **pin(freeze)},
        'expectedEntrySha256': expected_entry, 'ok': False}
    spec = importlib.util.spec_from_file_location('multireference_compiled_browser', RECIPE)
    recipe = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recipe)
    failure = None
    try:
        recipe.main()
        inner = json.loads((output / 'fidelity-wrapper.json').read_text())
        actual = json.loads((output / 'report.json').read_text())
        assert inner['ok'] and actual['ok']
        assert inner['expectedEntrySha256'] == expected_entry
        report.update(ok=True, retainedRecipeReport=pin(output / 'fidelity-wrapper.json'),
            browserReport=pin(output / 'report.json'), browserPathCount=len(actual['paths']),
            captureCount=len(list(output.glob('*.png'))))
    except BaseException as error:
        failure = error
        report['failure'] = {'type': type(error).__name__, 'message': str(error)[:1600]}
    finally:
        report['retainedRecipe']['after'] = pin(RECIPE)
        report['retainedRecipe']['unchanged'] = before == pin(RECIPE)
        report['ok'] = report['ok'] and report['retainedRecipe']['unchanged']
        (output / 'multireference-wrapper.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    if failure:
        raise failure
    assert report['ok']
    print(json.dumps({'multiReferenceCompiled': True, 'scope': scope, 'ok': True,
        'paths': report['browserPathCount'], 'captures': report['captureCount'],
        'retainedRecipeUnchanged': True}), flush=True)


if __name__ == '__main__':
    main()
