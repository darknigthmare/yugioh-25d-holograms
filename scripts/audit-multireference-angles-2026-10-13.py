#!/usr/bin/env python3
"""Four controlled source-WebGL views of curated multi-reference models.

Front, three-quarter, profile and back views share the same per-ID camera,
lights and neutral pose before and after. The original gallery driver is
imported unchanged. This source fixture neither loads a Duel nor certifies a
compiled application, and unseen surfaces remain inferred geometry.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RECIPE = ROOT / 'scripts/audit-model-fidelity-2026-10-11.py'
ANGLES = [('front', 0), ('three-quarter', 0.7853981633974483),
          ('profile', 1.5707963267948966), ('back', 3.141592653589793)]


def pin(path):
    return {'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline-url', required=True)
    parser.add_argument('--candidate-url', required=True)
    parser.add_argument('--baseline-root', type=Path, required=True)
    parser.add_argument('--candidate-root', type=Path, default=ROOT)
    parser.add_argument('--curated', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--phase', choices=['before', 'after', 'both'], default='both')
    parser.add_argument('--baseline-report', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    spec = importlib.util.spec_from_file_location('multireference_angles_gallery', RECIPE)
    recipe = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recipe)
    recipe_before = pin(RECIPE)
    curated = json.loads(args.curated.read_text())
    identities = {(row['kind'], str(row['id'])) for row in curated['entries']}
    assert len(identities) == len(curated['entries'])
    old_camera = 'const cameraSpec=oldCamera||{position:[center.x+distance*.24,center.y+distance*.12,center.z+distance],target:center.toArray(),fov:34};'
    assert recipe.RENDER.count(old_camera) == 1
    render = recipe.RENDER.replace(old_camera,
        'const cameraSpec=oldCamera||{position:[center.x+distance*Math.sin(options.angle),center.y+distance*.12,center.z+distance*Math.cos(options.angle)],target:center.toArray(),fov:34};')
    report = {'scope': __doc__, 'wrapper': {'path': str(Path(__file__).relative_to(ROOT)), **pin(Path(__file__))},
        'retainedRecipeBefore': recipe_before, 'curated': {'path': str(args.curated), **pin(args.curated)},
        'angles': [{'name': name, 'yawRadians': yaw} for name, yaw in ANGLES],
        'references': curated.get('references', []), 'sets': [], 'errors': [], 'httpErrors': [], 'cameras': {}}
    if args.phase == 'after':
        assert args.baseline_report, '--baseline-report is required for after'
        baseline = json.loads(args.baseline_report.read_text())
        assert baseline['ok'] and baseline['capturedPhases'] == ['before']
        report['baselineReport'] = {'path': str(args.baseline_report), **pin(args.baseline_report)}
        report['cameras'] = baseline['cameras']
        report['sets'] = baseline['sets'][:]
        report['beforeSourcePinsBefore'] = baseline['beforeSourcePinsBefore']
        report['beforeSourcePinsAfter'] = baseline['beforeSourcePinsAfter']
        report['retainedBaselineWrapper'] = baseline['wrapper']
    reference_pins = {}
    for ref in curated.get('references', []):
        for name in ref.get('retainedPaths', []):
            reference_pins[name] = pin(ROOT / name)
    report['retainedReferencePinsBefore'] = reference_pins
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        phases = [('before', args.baseline_url, args.baseline_root),
                  ('after', args.candidate_url, args.candidate_root)]
        for phase, url, source in phases:
            if args.phase != 'both' and phase != args.phase:
                continue
            sources = sorted(str(p.relative_to(source)) for p in (source / 'src').rglob('*') if p.is_file())
            source_before = {name: pin(source / name) for name in sources}
            page = browser.new_page(viewport={'width': 1500, 'height': 1582}, device_scale_factor=1)
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
            page.on('response', lambda r: report['httpErrors'].append({'status': r.status, 'url': r.url}) if r.status >= 400 else None)
            page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
            page.goto(url.rstrip('/') + '/package.json', wait_until='domcontentloaded')
            inventory = page.evaluate(recipe.INVENTORY)
            entries = [e for e in inventory if (e['kind'], str(e['id'])) in identities]
            assert len(entries) == len(identities), (len(entries), len(identities))
            for angle, yaw in ANGLES:
                cameras = report['cameras'].get(angle, {})
                for start in range(0, len(entries), 25):
                    label = f'{angle}-{start // 25 + 1:02}'
                    page.set_content(recipe.HTML)
                    data = page.evaluate(render, {'phase': phase, 'label': label,
                        'entries': entries[start:start + 25], 'cameras': cameras, 'angle': yaw})
                    page.screenshot(path=str(args.output / f'{phase}-{label}.png'), full_page=True)
                    page.evaluate('window.__fidelityDisposeRenderer()')
                    report['sets'].append({'phase': phase, 'angle': angle, 'name': label, **data})
                    if phase == 'before':
                        report['cameras'].setdefault(angle, {}).update({r['key']: r['camera'] for r in data['measurements']})
                    print(json.dumps({'phase': phase, 'angle': angle, 'models': len(data['measurements']),
                        'remaining': data['remaining']}), flush=True)
            page.close()
            report[phase + 'SourcePinsBefore'] = source_before
            report[phase + 'SourcePinsAfter'] = {name: pin(source / name) for name in sources}
        browser.close()
    report['retainedRecipeAfter'] = pin(RECIPE)
    report['retainedReferencePinsAfter'] = {name: pin(ROOT / name) for name in reference_pins}
    before = {(s['angle'], r['key']): r for s in report['sets'] if s['phase'] == 'before' for r in s['measurements']}
    after = {(s['angle'], r['key']): r for s in report['sets'] if s['phase'] == 'after' for r in s['measurements']}
    report['comparisons'] = [{'angle': angle, 'key': key, 'sameCamera': row['camera'] == before[(angle, key)]['camera'],
        'beforeTriangles': before[(angle, key)]['triangles'], 'afterTriangles': row['triangles'],
        'geometryChanged': before[(angle, key)]['geometryHash'] != row['geometryHash']}
        for (angle, key), row in after.items()]
    rows = list(before.values()) + list(after.values())
    report['capturedPhases'] = ['before'] if args.phase == 'before' else ['before', 'after']
    report['ok'] = not report['errors'] and not report['httpErrors'] and \
        len(rows) == len(identities) * len(ANGLES) * len(report['capturedPhases']) and \
        all(r['finite'] and r['bufferStable'] and r['afterDispose']['geometries'] == 0 and
            r['afterDispose']['textures'] == 0 for r in rows) and \
        all(r['sameCamera'] for r in report['comparisons']) and \
        report['beforeSourcePinsBefore'] == report['beforeSourcePinsAfter'] and \
        (args.phase == 'before' or report['afterSourcePinsBefore'] == report['afterSourcePinsAfter']) and \
        report['retainedRecipeBefore'] == report['retainedRecipeAfter'] and \
        report['retainedReferencePinsBefore'] == report['retainedReferencePinsAfter']
    (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'ok': report['ok'], 'models': len(identities), 'views': len(rows),
        'captures': len(report['sets']), 'errors': report['errors']}), flush=True)
    assert report['ok']


if __name__ == '__main__':
    main()
