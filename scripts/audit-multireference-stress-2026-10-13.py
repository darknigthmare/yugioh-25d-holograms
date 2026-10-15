#!/usr/bin/env python3
"""Run the retained 14-model desktop/mobile source stress comparison unchanged.

The twelve heaviest candidate holograms and two heaviest avatars are selected
from this wave's successful source gallery, then reused before and after. The
fixture uses public model IDs and synthetic poses, starts no Game, and does not
claim a legally reachable board or physical-phone FPS. All source bytes are
pinned around the run, in addition to the retained recipe's geometry checks.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
RECIPE = ROOT / 'scripts/audit-model-fidelity-stress-2026-10-11.py'
GALLERY_RECIPE = ROOT / 'scripts/audit-model-fidelity-2026-10-11.py'


def pin(path):
    return {'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def source_pins(root):
    return {str(p.relative_to(root)): pin(p) for p in sorted((root / 'src').rglob('*')) if p.is_file()}


def main():
    baseline = Path(sys.argv[sys.argv.index('--baseline-root') + 1])
    candidate = Path(sys.argv[sys.argv.index('--candidate-root') + 1]) if '--candidate-root' in sys.argv else ROOT
    output = Path(sys.argv[sys.argv.index('--output') + 1])
    output.mkdir(parents=True, exist_ok=True)
    before = {str(p.relative_to(ROOT)): pin(p) for p in [RECIPE, GALLERY_RECIPE]}
    source_before = {'baseline': source_pins(baseline), 'candidate': source_pins(candidate)}
    spec = importlib.util.spec_from_file_location('multireference_stress', RECIPE)
    recipe = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recipe)
    recipe.main()
    after = {str(p.relative_to(ROOT)): pin(p) for p in [RECIPE, GALLERY_RECIPE]}
    source_after = {'baseline': source_pins(baseline), 'candidate': source_pins(candidate)}
    report = json.loads((output / 'report.json').read_text())
    report['multiReferenceWrapper'] = {'path': str(Path(__file__).relative_to(ROOT)), **pin(Path(__file__))}
    report['retainedRecipesBefore'] = before
    report['retainedRecipesAfter'] = after
    report['allSourcesBefore'] = source_before
    report['allSourcesAfter'] = source_after
    report['ok'] = report['ok'] and before == after and source_before == source_after
    (output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    assert report['ok']
    print(json.dumps({'multiReferenceStress': True, 'ok': True, 'paths': len(report['paths']),
        'unchangedRecipes': before == after, 'stableSources': source_before == source_after}), flush=True)


if __name__ == '__main__':
    main()
