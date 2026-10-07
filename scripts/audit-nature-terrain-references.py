#!/usr/bin/env python3
"""Compare intact Field sources and actual scene factories on a local Vite server.

Requires Python Playwright and Chromium; adds no application dependency.
python scripts/audit-nature-terrain-references.py --base-url http://127.0.0.1:5174
"""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ENTRIES = [
    ['4064256', 'Zombie World', [0, 18, 28], [0, 7, -16], 58],
    ['295517', 'A Legendary Ocean', [0, 18, 25], [0, 4, -20], 57],
    ['78082039', 'Closed Forest', [0, 10, 1], [0, 9, -30], 60],
    ['35956022', 'Acidic Downpour', [0, 18, 28], [0, 5, -15], 58],
    ['28120197', 'Canyon', [0, 23, 22], [0, 7, -15], 55],
    ['712559', 'Amazoness Village', [0, 18, 28], [0, 6, -15], 58],
    ['15854426', 'Divine Wind of Mist Valley', [0, 11, 0], [0, 11, -31], 66],
    ['37322745', 'Naturia Forest', [0, 18, 28], [0, 7, -15], 58],
    ['70222318', 'Mount Sylvania', [0, 18, 20], [0, 7, -20], 58],
    ['54306223', 'Venom Swamp', [0, 17, 28], [0, 5, -15], 58],
    ['7142724', 'Icejade Cenote Enion Cradle', [0, 19, 28], [0, 7, -15], 58],
    ['17000165', 'Reptilianne Recoil', [0, 12, 4], [0, 12, -31], 66],
    ['88288421', 'Field Power Bonus', [0, 25, 28], [0, 3, -14], 58],
    ['33700664', 'Trirealm Rift Territory - Valvols', [0, 19, 26], [0, 9, -19], 58]
]

HTML = """<!doctype html><html lang="fr"><meta charset="utf-8"><title>Références des terrains naturels</title>
<style>*{box-sizing:border-box}body{margin:0;background:#111b2c;color:#eef4ff;font:14px Arial}header{padding:18px 20px}
h1{font-size:23px;margin:0 0 8px}p{margin:0;color:#aec3dd;font-size:12px}article{margin:0 12px 14px;border:1px solid #405373;background:#19283e}
h2{font-size:16px;margin:12px}.images{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 8px 8px}
figure{margin:0;background:#21364e}img{width:100%;height:250px;object-fit:contain;display:block}figcaption{font-size:11px;padding:8px;color:#c1d0e5}
</style><header><h1>Terrains naturels : sources et volumes</h1><p>Illustrations originales intactes · avant/après en éclairage neutre et même caméra.
<br>Les personnages restent dans la peinture. Volumes adaptés au corridor de duel ; aucune revendication de reconstruction spatiale exacte.</p></header><main></main>
<script type="module">
import * as THREE from '/node_modules/.vite/deps/three.js';
import {FIELD_GEOMETRY_THREE} from '/src/ui/FieldGeometryThree.js';
import {createFieldEnvironmentGeometry as current,disposeFieldEnvironmentGeometry as dispose} from '/src/ui/FieldEnvironmentGeometry.js';
import {createFieldEnvironmentGeometry as old} from '/__nature-baseline__.js';
import {getFieldEnvironmentForCardId} from '/src/ui/FieldEnvironmentRegistry.js';
const entries=__ENTRIES__,results=[];
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setSize(520,420);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const render=(entry,factory)=>{
 const scene=new THREE.Scene(),group=factory(FIELD_GEOMETRY_THREE,getFieldEnvironmentForCardId(entry[0]));scene.add(group);
 scene.add(new THREE.HemisphereLight('#f0f4ff','#566574',2));
 const light=new THREE.DirectionalLight('#fff5e6',2.1);light.position.set(-10,25,12);scene.add(light);
 const camera=new THREE.PerspectiveCamera(entry[4],520/420,.1,180);camera.position.set(...entry[2]);camera.lookAt(...entry[3]);
 renderer.render(scene,camera);
 const result={image:renderer.domElement.toDataURL('image/png'),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,
   sourcePrimitives:group.userData.referencePrimitiveCount||group.userData.meshCount,batchedPrimitives:group.userData.meshCount,materials:group.userData.materialCount};
 dispose(group);scene.clear();return result;
};
for(const entry of entries){
 const before=render(entry,old),after=render(entry,current);const article=document.createElement('article');article.id='card-'+entry[0];
 const title=document.createElement('h2');title.textContent=entry[1]+' — '+entry[0];article.append(title);
 const row=document.createElement('div');row.className='images';article.append(row);
 for(const [url,label]of [['/environments/field-art/'+entry[0]+'.jpg','Illustration originale conservée'],[before.image,'Volumes antérieurs : '+before.drawCalls+' appels'],
 [after.image,'Volumes dédiés : '+after.drawCalls+' appels · '+after.materials+' matériaux']]){
  const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');image.src=url;caption.textContent=label;figure.append(image,caption);row.append(figure);
 }
 const {image:beforeImage,...beforeMetrics}=before,{image:afterImage,...afterMetrics}=after;
 results.push({cardId:entry[0],name:entry[1],camera:entry[2],target:entry[3],fov:entry[4],before:beforeMetrics,after:afterMetrics});document.querySelector('main').append(article);
}
await Promise.all([...document.images].map(image=>image.decode()));renderer.dispose();renderer.forceContextLoss();
window.natureAudit={complete:true,results,sourceImageCount:entries.length};
</script></html>"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:5174')
    parser.add_argument('--output-dir', default='docs/audits/artifacts')
    args = parser.parse_args()
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    baseline = Path('docs/audits/artifacts/field-geometry-baseline-6c0232f.js').read_text()
    errors = []
    with sync_playwright() as driver:
        browser = driver.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1060, 'height': 1000}, device_scale_factor=1)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        url = args.base_url.rstrip('/') + '/__nature-terrain-audit__'
        page.route(url, lambda route: route.fulfill(status=200, content_type='text/html', body=HTML.replace('__ENTRIES__', json.dumps(ENTRIES))))
        page.route(args.base_url.rstrip('/') + '/__nature-baseline__.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=baseline))
        page.goto(url)
        page.wait_for_function('window.natureAudit?.complete === true', timeout=60000)
        report = page.evaluate('window.natureAudit')
        report.update({'browserErrors': errors, 'baselineSource': 'field-geometry-baseline-6c0232f.js',
            'moduleSha256': hashlib.sha256(Path('src/ui/FieldEnvironmentNatureReferences.js').read_bytes()).hexdigest(),
            'fidelity': 'reference-informed geometry, adapted peripheral placement'})
        report['references'] = [{'cardId': entry[0], 'sha256': hashlib.sha256(Path('public/environments/field-art/'+entry[0]+'.jpg').read_bytes()).hexdigest()} for entry in ENTRIES]
        for index in range(2):
            ids = [entry[0] for entry in ENTRIES[index*7:(index+1)*7]]
            page.locator('article').evaluate_all('(articles,ids)=>articles.forEach(article=>article.style.display=ids.includes(article.id.slice(5))?"block":"none")', ids)
            page.screenshot(path=str(output / f'field-nature-comparison-2026-10-07-{index+1}.png'), full_page=True)
        (output / 'field-nature-reference-2026-10-07.json').write_text(json.dumps(report, indent=2)+'\n')
        browser.close()
    if errors:
        raise RuntimeError('; '.join(errors))
    print(json.dumps({'references': len(report['results']), 'maxDrawCalls': max(entry['after']['drawCalls'] for entry in report['results']), 'browserErrors': errors}))


if __name__ == '__main__':
    main()
