#!/usr/bin/env python3
"""Controlled source-only WebGL coverage for the multi-reference refinement.

The retained gallery recipe is imported without editing its file. This wrapper
adds finite unit-normal measurements, records all source files and compares the
triangle budget both to this wave's baseline and to the original 11 October
fixture. It starts no application, Duel, WASM engine or build. Software-renderer
timings are comparisons, not a claim about physical phone frame rates.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
RECIPE = ROOT / 'scripts/audit-model-fidelity-2026-10-11.py'
ORIGINAL = ROOT / 'docs/audits/artifacts/model-fidelity-2026-10-11/before/report.json'


def pin(path):
    return {'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    spec = importlib.util.spec_from_file_location('multireference_gallery', RECIPE)
    recipe = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recipe)
    source = Path(sys.argv[sys.argv.index('--source-root') + 1]) if '--source-root' in sys.argv else ROOT
    output = Path(sys.argv[sys.argv.index('--output-dir') + 1])
    recipe_before = pin(RECIPE)
    recipe.SOURCES = sorted(str(p.relative_to(source)) for p in (source / 'src').rglob('*') if p.is_file())
    old_line = "  const totalTriangles=geometry.reduce((sum,g)=>sum+(g.geometry.index?g.geometry.index.count:g.geometry.attributes.position.count)/3,0);"
    assert recipe.RENDER.count(old_line) == 1
    recipe.RENDER = recipe.RENDER.replace(old_line, old_line + '''
  let normalCount=0,nonUnitNormals=0,maxNormalLengthError=0;
  for(const g of geometry){const a=g.geometry.attributes.normal;if(!a)continue;for(let i=0;i<a.count;i++){
   const length=Math.hypot(a.getX(i),a.getY(i),a.getZ(i));normalCount++;
   const error=Math.abs(length-1);maxNormalLengthError=Math.max(maxNormalLengthError,error);
   if(!Number.isFinite(length)||error>0.0002)nonUnitNormals++;
  }}
''')
    recipe.RENDER = recipe.RENDER.replace('partCount:parts.length,triangles:totalTriangles,',
        'partCount:parts.length,normalCount,nonUnitNormals,maxNormalLengthError,triangles:totalTriangles,')
    recipe.main()
    report_path = output / 'report.json'
    report = json.loads(report_path.read_text())
    original = json.loads(ORIGINAL.read_text())
    original_rows = {r['key']: r for s in original['sets'] for r in s['measurements']}
    rows = [r for s in report['sets'] for r in s['measurements']]
    report['multiReferenceWrapper'] = {'path': str(Path(__file__).relative_to(ROOT)), **pin(Path(__file__))}
    report['retainedRecipe'] = {'path': str(RECIPE.relative_to(ROOT)), 'before': recipe_before,
        'after': pin(RECIPE), 'unchanged': recipe_before == pin(RECIPE)}
    report['originalTriangleFixture'] = {'path': str(ORIGINAL.relative_to(ROOT)), **pin(ORIGINAL)}
    report['originalBudgetRatios'] = {r['key']: {
        'originalTriangles': original_rows[r['key']]['triangles'],
        'currentTriangles': r['triangles'],
        'ratio': r['triangles'] / original_rows[r['key']]['triangles']
    } for r in rows}
    report['unitNormals'] = {'tolerance': 0.0002,
        'normalCount': sum(r['normalCount'] for r in rows),
        'nonUnitNormals': sum(r['nonUnitNormals'] for r in rows),
        'maximumLengthError': max(r['maxNormalLengthError'] for r in rows)}
    report['ok'] = report['ok'] and report['retainedRecipe']['unchanged'] and \
        report['unitNormals']['nonUnitNormals'] == 0 and \
        all(r['ratio'] <= 5 for r in report['originalBudgetRatios'].values())
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'multiReference': True, 'ok': report['ok'], 'models': len(rows),
        'normalCount': report['unitNormals']['normalCount'],
        'nonUnitNormals': report['unitNormals']['nonUnitNormals'],
        'maxOriginalTriangleRatio': max(r['ratio'] for r in report['originalBudgetRatios'].values()),
        'reportSha256': pin(report_path)['sha256']}), flush=True)
    assert report['ok']


if __name__ == '__main__':
    main()
