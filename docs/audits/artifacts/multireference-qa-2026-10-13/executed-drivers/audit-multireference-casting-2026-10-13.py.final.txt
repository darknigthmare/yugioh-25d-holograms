#!/usr/bin/env python3
"""Inspect Faith's public source-model casting pose and shoulder attachment.

This isolated fixture imports the real model and PoseAnimation APIs. It starts
no Duel or application object. Five casting phases are rendered under identical
light/cameras at front and three-quarter angles. The shoulder anchor comparison
uses the exact retained shader pivots and actual pose/life uniforms; it measures
anchor displacement, not an inferred collision mesh or a fidelity certificate.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RECIPE = ROOT / 'scripts/audit-model-fidelity-2026-10-11.py'


def pin(path):
    return {'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', required=True)
    parser.add_argument('--source-root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    spec = importlib.util.spec_from_file_location('multireference_faith_casting', RECIPE)
    recipe = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recipe)
    recipe_before = pin(RECIPE)
    old = "else{action=createHologramPoseAnimation(model,{kind:'attack'});action.update(.48);renderer.render(scene,camera);action.dispose();}"
    assert recipe.RENDER.count(old) == 1
    render = recipe.RENDER.replace(old, "else{action=createHologramPoseAnimation(model,{kind:'casting'});action.update(entry.progress);renderer.render(scene,camera);}")
    marker = '  const bufferStable=geometry.every('
    assert render.count(marker) == 1
    render = render.replace(marker, '''
  const poseUniforms=model.userData.poseRig.pose.value.toArray(),lifeUniforms=model.userData.poseRig.life.value.toArray();
  function rotateX(v,angle){const c=Math.cos(angle),s=Math.sin(angle);return new T.Vector3(v.x,v.y*c-v.z*s,v.y*s+v.z*c);}
  function moveAnchor(joint){let v=new T.Vector3(.27,2.206,.016);if(joint===3){const pivot=new T.Vector3(.43,2.41,0);v=rotateX(v.sub(pivot),poseUniforms[1]).add(pivot);}const center=new T.Vector3(0,.1,0);v=rotateX(v.sub(center),poseUniforms[2]).multiplyScalar(lifeUniforms[1]).add(center);v.add(new T.Vector3(lifeUniforms[3],lifeUniforms[0],lifeUniforms[2]));return v;}
  const bodyAnchor=moveAnchor(0),sleeveAnchor=moveAnchor(3),anchorSeparation=bodyAnchor.distanceTo(sleeveAnchor);
''' + marker)
    render = render.replace('partCount:parts.length,triangles:totalTriangles,',
        'partCount:parts.length,castingProgress:entry.progress,poseUniforms,lifeUniforms,bodyAnchor:bodyAnchor.toArray(),sleeveAnchor:sleeveAnchor.toArray(),anchorSeparation,nominalUpperSleeveRadius:.122,triangles:totalTriangles,')
    old_camera = 'const cameraSpec=oldCamera||{position:[center.x+distance*.24,center.y+distance*.12,center.z+distance],target:center.toArray(),fov:34};'
    assert render.count(old_camera) == 1
    render = render.replace(old_camera,
        'const cameraSpec=oldCamera||{position:[center.x+distance*Math.sin(options.angle),center.y+distance*.12,center.z+distance*Math.cos(options.angle)],target:center.toArray(),fov:34};')
    sources = sorted(str(p.relative_to(args.source_root)) for p in (args.source_root / 'src').rglob('*') if p.is_file())
    before = {name: pin(args.source_root / name) for name in sources}
    report = {'scope': __doc__, 'driver': {'path': str(Path(__file__).relative_to(ROOT)), **pin(Path(__file__))},
        'retainedRecipeBefore': recipe_before, 'sourcePinsBefore': before, 'sets': [], 'errors': [], 'httpErrors': [],
        'anchorMethod': {'neutralShoulder': [.27, 2.206, .016], 'STAFFPivot': [.43, 2.41, 0],
            'nominalUpperSleeveRadius': .122, 'thresholdMeaning': 'Nominal sleeve radius exceeds center-anchor displacement; visual attachment remains independently inspected. No collision-volume proof is claimed.'}}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1500, 'height': 1582}, device_scale_factor=1)
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
        page.on('response', lambda r: report['httpErrors'].append({'status': r.status, 'url': r.url}) if r.status >= 400 else None)
        page.route('**/favicon.ico', lambda route: route.fulfill(status=204))
        page.goto(args.base_url.rstrip('/') + '/package.json', wait_until='domcontentloaded')
        original = next(e for e in page.evaluate(recipe.INVENTORY) if e['id'] == '31560081')
        entries = [{**original, 'progress': progress,
                    'name': 'Magicienne de la Foi · incantation ' + str(progress)}
                   for progress in [0, .25, .5, .75, 1]]
        for angle, yaw in [('front', 0), ('three-quarter', .7853981633974483)]:
            page.set_content(recipe.HTML)
            data = page.evaluate(render, {'phase': 'casting', 'label': angle,
                'entries': entries, 'angle': yaw, 'cameras': {}})
            page.screenshot(path=str(args.output / ('casting-' + angle + '.png')), full_page=True)
            page.evaluate('window.__fidelityDisposeRenderer()')
            report['sets'].append({'angle': angle, **data})
        browser.close()
    report['sourcePinsAfter'] = {name: pin(args.source_root / name) for name in sources}
    report['retainedRecipeAfter'] = pin(RECIPE)
    rows = [r for s in report['sets'] for r in s['measurements']]
    report['maximumAnchorSeparation'] = max(r['anchorSeparation'] for r in rows)
    report['ok'] = not report['errors'] and not report['httpErrors'] and len(rows) == 10 and \
        before == report['sourcePinsAfter'] and recipe_before == report['retainedRecipeAfter'] and \
        all(r['finite'] and r['bufferStable'] and r['anchorSeparation'] < .122 and
            r['afterDispose']['geometries'] == 0 and r['afterDispose']['textures'] == 0 for r in rows)
    (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'ok': report['ok'], 'poses': len(rows),
        'maximumShoulderAnchorDisplacement': report['maximumAnchorSeparation'],
        'nominalSleeveRadius': .122, 'errors': report['errors']}), flush=True)
    assert report['ok']


if __name__ == '__main__':
    main()
