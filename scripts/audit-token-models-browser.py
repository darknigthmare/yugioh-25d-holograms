#!/usr/bin/env python3
"""Audit the public Token Atlas and genuine Token generation in the native Duel.

No build, QA hook, application object, private opponent hand, custom Lua or
post-start Game injection is used. Declared Deck/RNG/capability fixtures precede
bootstrap. A compiled run requires the coordinator's frozen source/build pins.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import functools
import hashlib
from http.server import ThreadingHTTPServer
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import threading
import time
import traceback
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DEPENDENCIES = ['scripts/audit-native-duel-ui.py']
NATIVE_ASSETS = ['native/ocgcore.sync.wasm', 'native/card-data.json', 'native/scripts.json']
SEALED_PROOFS = [
    'scripts/audit-duelist-avatar-motion-browser.py',
    'docs/audits/duelist-avatar-motion-browser-2026-10-11.md',
    'docs/audits/artifacts/duelist-avatar-motion-2026-10-11/build-freeze.json',
    'docs/audits/artifacts/duelist-avatar-motion-2026-10-11/browser-compiled/report.json',
    'docs/audits/artifacts/duelist-avatar-motion-2026-10-11/browser-compiled/delivery-index.json',
]
spec = importlib.util.spec_from_file_location('token_native_ui', ROOT / DEPENDENCIES[0])
ui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ui)

BOOTSTRAP = r"""(() => {
 window.addEventListener('securitypolicyviolation', event => console.debug('TOKEN_AUDIT_CSP:'+JSON.stringify({
  directive:event.effectiveDirective,blocked:['eval','wasm-eval','inline'].includes(event.blockedURI)?event.blockedURI:'resource'})));
 let state=0x9e3779b9;
 Object.defineProperty(crypto,'getRandomValues',{value(view){
  if(view.length===1){view[0]=2;return view;}
  for(let i=0;i<view.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;view[i]=state>>>0;}
  return view;
 }});
 const pending=new WeakMap(),fieldSignatures=new WeakMap();
 for(const Constructor of [globalThis.WebGLRenderingContext,globalThis.WebGL2RenderingContext]){
  if(!Constructor)continue;
  const original=Constructor.prototype.clear;
  Object.defineProperty(Constructor.prototype,'clear',{configurable:true,writable:true,value:function(...args){
   const result=original.apply(this,args);
   if(this.canvas?.hasAttribute('data-token-atlas-canvas')){
    const stage=this.canvas.closest('#token-atlas-preview');
    const frame={time:performance.now(),
     presentationId:stage?.dataset.tokenPresentationId,cardId:stage?.dataset.tokenCardId,
     avatarId:stage?.dataset.tokenAvatarId,modelKind:stage?.dataset.tokenModelKind,
     pose:stage?.dataset.tokenPose,label:this.canvas.getAttribute('aria-label'),geometryDrawCalls:0};
    pending.set(this,frame);
    queueMicrotask(()=>console.debug('TOKEN_AUDIT_FRAME:'+JSON.stringify(frame)));
   }else{
    const scene=this.canvas?.closest('[data-real-duel-scene3d]');
    const signature=scene?.dataset.fieldHologramProfiles;
    if(signature!=null&&fieldSignatures.get(this)!==signature){
     fieldSignatures.set(this,signature);
     const frame={time:performance.now(),models:JSON.parse(signature),geometryDrawCalls:0};
     pending.set(this,frame);
     queueMicrotask(()=>console.debug('TOKEN_AUDIT_FIELD_FRAME:'+JSON.stringify(frame)));
    }
   }
   return result;
  }});
  for(const method of ['drawElements','drawArrays']){
   const draw=Constructor.prototype[method];
   Object.defineProperty(Constructor.prototype,method,{configurable:true,writable:true,value:function(...args){
    const result=draw.apply(this,args);const frame=pending.get(this);
    if(frame&&(this.canvas?.hasAttribute('data-token-atlas-canvas')||this.canvas?.closest('[data-real-duel-scene3d]')))frame.geometryDrawCalls++;
    return result;
   }});
  }
 }
 const observe=()=>{
  let last='';
  const read=()=>{
   const scene=document.querySelector('[data-real-duel-scene3d]');if(!scene)return;
   const text=scene.dataset.fieldHologramProfiles;
   if(text==null||text===last)return;last=text;
   console.debug('TOKEN_AUDIT_MODELS:'+text);
  };
  new MutationObserver(read).observe(document.documentElement,{subtree:true,childList:true,attributes:true,
   attributeFilter:['data-field-hologram-profiles']});read();
 };
 if(document.documentElement)observe();else document.addEventListener('DOMContentLoaded',observe,{once:true});
})()"""

PUBLIC_STATE = r"""() => {
 const card=c=>({id:c.dataset.id,uid:c.dataset.uid,visible:c.dataset.cardVisible,
  atk:c.querySelector('.stat-badge.atk')?.textContent,def:c.querySelector('.stat-badge.def')?.textContent,
  label:c.getAttribute('aria-label')});
 const ownZones=[...document.querySelectorAll('.card-zone[data-side="player"][data-zone-type="monster"]')]
  .map(z=>({owner:'player',index:Number(z.dataset.index),classes:z.className,
   cards:[...z.querySelectorAll('.card-entity')].map(card)}));
 const publicOpponent=[...document.querySelectorAll('.card-zone[data-side="opponent"]')]
  .map(z=>({owner:'opponent',index:Number(z.dataset.index),zoneType:z.dataset.zoneType,
   cards:[...z.querySelectorAll('.card-entity[data-card-visible="true"]')].map(card)}));
 const extraZones=[...document.querySelectorAll('.card-zone[data-zone-type="extra-monster"]')]
  .map(z=>({controller:z.dataset.controllerId,index:Number(z.dataset.index),classes:z.className,
   cards:[...z.querySelectorAll('.card-entity[data-card-visible="true"]')].map(card)}));
 return {ownHand:[...document.querySelectorAll('#player-hand .card-entity')].map(card),ownZones,publicOpponent,extraZones,
  playerLp:document.querySelector('#player-lp')?.textContent,opponentLp:document.querySelector('#opponent-lp')?.textContent,
  ownGraveCount:document.querySelector('#player-gy-count')?.textContent,
  opponentGraveCount:document.querySelector('#opponent-gy-count')?.textContent,
  ownBanishedCount:document.querySelector('#player-banished-count')?.textContent,
  opponentBanishedCount:document.querySelector('#opponent-banished-count')?.textContent,
  phase:document.querySelector('.phase-step.active')?.id,publicLog:document.querySelector('#log-content')?.innerText,
  models:JSON.parse(document.querySelector('[data-real-duel-scene3d]')?.dataset.fieldHologramProfiles||'[]')};
}"""


def pin(path):
    return {'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def fingerprints(names, root=ROOT):
    return {name: pin(root / name) for name in names}


def read_native_records():
    payload = json.loads((ROOT / 'public/native/card-data.json').read_text())
    rows = {str(row[0]): dict(zip(payload['columns'], row)) for row in payload['rows']}
    tokens = {code: row for code, row in rows.items() if int(row['type']) & 0x4000}
    assert len(tokens) == 243
    assert sum(bool(int(row['type']) & 1) for row in tokens.values()) == 240
    assert {code for code, row in tokens.items() if not int(row['type']) & 1} == {'9995767', '10000110', '10000120'}
    return rows, tokens


def catalogue_records(catalogue):
    """Read the frozen presentation snapshot; never query an application object."""
    if catalogue.suffix == '.json':
        payload = json.loads(catalogue.read_text())
    else:
        expression = "import {TOKEN_PRESENTATION_CATALOG} from " + json.dumps(catalogue.resolve().as_uri()) + ";process.stdout.write(JSON.stringify(TOKEN_PRESENTATION_CATALOG));"
        payload = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', expression], cwd=ROOT, text=True))
    records = payload if isinstance(payload, list) else payload['records']
    assert records and all(isinstance(record, dict) for record in records)
    return records


def compiled_pins(dist, freeze):
    names = ['index.html'] + [str(path.relative_to(dist)) for path in sorted((dist / 'assets').glob('*')) if path.suffix in ('.js', '.css')]
    names += NATIVE_ASSETS + list(freeze.get('additionalStaticAssets', {}))
    return fingerprints(list(dict.fromkeys(names)), dist)


def http_pins(request, base, expected):
    result = {}
    for name in expected:
        response = request.get(base.rstrip('/') + '/' + name)
        assert response.status == 200, (name, response.status)
        if name.endswith('.jpg'):
            assert response.headers.get('content-type', '').split(';')[0] == 'image/jpeg', name
        if name.endswith('.png'):
            assert response.headers.get('content-type', '').split(';')[0] == 'image/png', name
        body = response.body()
        result[name] = {'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}
    assert result == expected
    return result


def screenshot(page, output, name):
    page.screenshot(path=str(output / (name + '.png')), animations='disabled', timeout=60000)


def start_page(page, base, item, compiled, fixture=None):
    item.update(pageErrors=[], httpErrors=[], nativeRequestFailures=[], browserConsoleErrors=[],
                browserConsoleErrorLocations=[], cspViolations=[], studioFrames=[], publicSceneFrames=[], publicModelObservations=[])
    def console(message):
        if message.type == 'error':
            item['browserConsoleErrors'].append(message.text)
            item['browserConsoleErrorLocations'].append({'text': message.text, 'location': message.location})
        for prefix, key in [('TOKEN_AUDIT_CSP:', 'cspViolations'), ('TOKEN_AUDIT_FRAME:', 'studioFrames'), ('TOKEN_AUDIT_FIELD_FRAME:', 'publicSceneFrames'), ('TOKEN_AUDIT_MODELS:', 'publicModelObservations')]:
            if message.text.startswith(prefix):
                item[key].append(json.loads(message.text[len(prefix):]))
    def response(response):
        if response.status >= 400:
            item['httpErrors'].append({'status': response.status, 'url': response.url, 'path': urlsplit(response.url).path})
    page.on('console', console)
    page.on('pageerror', lambda error: item['pageErrors'].append(str(error)))
    page.on('response', response)
    page.on('requestfailed', lambda request: item['nativeRequestFailures'].append(urlsplit(request.url).path) if '/native/' in request.url else None)
    page.on('dialog', lambda dialog: dialog.accept() if dialog.type == 'confirm' else dialog.dismiss())
    page.add_init_script(BOOTSTRAP)
    if fixture is not None:
        item['preBootstrapFixture'] = {'ygo_custom_deck': fixture, 'description': 'Legal saved registration and deterministic crypto before bootstrap only; every later Duel action uses real public controls.'}
        page.add_init_script(f'if(!localStorage.getItem("ygo_custom_deck"))localStorage.setItem("ygo_custom_deck",{json.dumps(json.dumps(fixture))});')
    response = page.goto(base, wait_until='domcontentloaded')
    assert response and response.status == 200
    page.locator('#btn-open-token-atlas').wait_for(state='visible')
    item['existingDevelopmentQaHookPresentButUnused'] = page.evaluate('typeof window.__YGO_QA__') != 'undefined'
    if compiled:
        assert not item['existingDevelopmentQaHookPresentButUnused']
        assert response.header_value('content-security-policy') == ui.production_headers()['Content-Security-Policy']


def reset_atlas(page):
    page.locator('#token-atlas-search').fill('')
    for name in ('kind', 'race', 'attribute'):
        page.locator('#token-atlas-' + name).select_option('all')


def visible_presentations(page):
    return page.locator('#token-atlas-list [data-token-presentation-id]').evaluate_all('(elements)=>elements.map(element=>({presentationId:element.dataset.tokenPresentationId,cardId:element.dataset.tokenCardId}))')


def atlas_angle(page):
    return int(page.locator('#token-atlas-preview').get_attribute('data-token-atlas-angle'))


def wait_render(page, item, presentation_id, offset):
    ui.wait_until(page, 'id=>document.querySelector("#token-atlas-detail")?.dataset.tokenPresentationId===id', presentation_id)
    page.locator('#token-atlas-preview').scroll_into_view_if_needed()
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if any(frame.get('presentationId') == presentation_id and frame.get('geometryDrawCalls', 0) > 1 for frame in item['studioFrames'][offset:]):
            assert page.locator('canvas[data-token-atlas-canvas]').count() == 1
            return
        page.wait_for_timeout(25)
    raise AssertionError('No genuine studio rendering for ' + presentation_id)


def choose_atlas(page, item, presentation_id):
    card = page.locator(f'#token-atlas-list [data-token-presentation-id="{presentation_id}"]')
    offset = len(item['studioFrames'])
    card.click()
    stage = page.locator('#token-atlas-preview')
    stage.scroll_into_view_if_needed()
    page.wait_for_timeout(100)
    if stage.get_attribute('data-token-presentation-id') == presentation_id:
        stage.focus()
        page.keyboard.press('Home')
    wait_render(page, item, presentation_id, offset)


def validate_catalogue(records):
    rows, tokens = read_native_records()
    ids = [record['presentationId'] for record in records]
    assert len(ids) == len(set(ids)), 'Presentation aliases must remain distinct.'
    duel = {record['cardId']: record for record in records if record['kind'] == 'duel'}
    assert set(duel) == {code for code, row in tokens.items() if int(row['type']) & 1}
    placeholders = {record['cardId'] for record in records if record['kind'] == 'placeholder'}
    assert placeholders == {'9995767', '10000110', '10000120'}
    for code, record in duel.items():
        native = rows[code]
        assert record['presentationId'] == 'duel:' + code and record['modelAvailable'] is True
        for key in ('atk', 'def'):
            assert record[key] == native[key], (code, key)
        assert record['level'] == int(native['level']) & 0xff
        assert record['nativeTypeCode'] == native['type']
        assert record['nativeAliasCode'] == native['alias']
        assert record['nativeRaceCode'] == int(native['race'])
        assert record['nativeAttributeCode'] == int(native['attribute'])
    for record in records:
        assert record['kind'] in ('duel', 'decorative', 'placeholder')
        assert record['modelAvailable'] == (record['kind'] != 'placeholder')
        if record['kind'] == 'decorative' and record.get('modelKind') != 'duelist-avatar':
            assert record['presentationId'] == 'printed:' + str(record['imageId'])
        if record.get('modelKind') == 'duelist-avatar':
            assert record['kind'] == 'decorative' and record['presentationId'].startswith('commemorative:')
            assert record['avatarId'] in ('atem', 'kaiba', 'joey')
            assert all(record.get(key) is None for key in ('cardId', 'code', 'level', 'atk', 'def'))
        if record.get('referenceArtPath'):
            assert record['referenceArtPath'].startswith('/tokens/')
            assert (ROOT / 'public' / record['referenceArtPath'].lstrip('/')).is_file()
    return dict(Counter(record['kind'] for record in records))


def atlas_result_count(page):
    return int(page.locator('#token-atlas-results').inner_text().split()[0])


def atlas_storage(page):
    return page.evaluate('()=>Object.fromEntries(["ygo_custom_deck","ygo_duel_statistics","ygo_campaign_progress","ygo_duelist_avatar_v1"].map(key=>[key,localStorage.getItem(key)]))')


def assert_atlas_detail(page, profile, load_reference=False):
    detail = page.locator('#token-atlas-detail')
    assert detail.get_attribute('data-token-presentation-id') == profile['presentationId']
    assert detail.get_attribute('data-token-card-id') == (profile.get('cardId') or '')
    assert page.locator('#token-atlas-info h3').inner_text() == profile['name']
    kind_labels = {'duel': 'Jeton de Duel', 'decorative': 'Carte Jeton imprimée', 'placeholder': 'Repère natif'}
    assert page.locator('#token-atlas-kind-label').inner_text() == ('Carte Jeton commémorative' if profile.get('modelKind') == 'duelist-avatar' else kind_labels[profile['kind']])
    if profile.get('cardId'):
        assert profile['cardId'] in page.locator('.token-atlas-code').inner_text()
    else:
        assert not re.search(r'Code de référence\s*:\s*\d+', page.locator('.token-atlas-code').inner_text())
        assert profile['physicalSetCode'] in page.locator('.token-atlas-code').inner_text()
    image = page.locator('#token-atlas-reference-image')
    link = page.locator('#token-atlas-reference-link')
    if profile.get('referenceArtPath'):
        assert image.count() == 1 and image.get_attribute('src') == profile['referenceArtPath']
        assert profile['name'] in image.get_attribute('alt')
        if load_reference:
            image.scroll_into_view_if_needed()
            ui.wait_until(page, '()=>{const image=document.querySelector("#token-atlas-reference-image");return image?.complete&&image.naturalWidth>0}')
    else:
        assert image.count() == 0
        assert 'Illustration de référence indisponible' in page.locator('.token-atlas-reference').inner_text()
    if profile.get('referenceArtUrl'):
        assert link.count() == 1 and link.get_attribute('href') == profile['referenceArtUrl']
        assert link.get_attribute('target') == '_blank'
        assert set(link.get_attribute('rel').split()) == {'noopener', 'noreferrer'}
    else:
        assert link.count() == 0
    if profile.get('modelKind') == 'duelist-avatar':
        assert not page.locator('.token-atlas-stats').count()
        assert not page.locator('.token-atlas-poses').is_visible()
        assert 'Silhouette stylisée' in page.locator('#token-atlas-info').inner_text()
    elif profile['kind'] == 'placeholder':
        assert page.locator('#token-atlas-no-model').is_visible()
        assert page.locator('canvas[data-token-atlas-canvas]').count() == 0
        assert not page.locator('.token-atlas-stats').count()
        assert page.locator('button[data-token-pose="attack"]').is_disabled()
    else:
        stats = page.locator('.token-atlas-stats').evaluate('(dl)=>Object.fromEntries([...dl.querySelectorAll("div")].map(row=>[row.querySelector("dt").textContent,row.querySelector("dd").textContent]))')
        for source, label in [('level', 'Niveau'), ('atk', 'ATK'), ('def', 'DEF')]:
            value = profile[source]
            expected = '?' if value in (-1, -2) else str(value) if isinstance(value, (int, float)) and value >= 0 else '—'
            assert stats[label] == expected, (profile['presentationId'], label, stats[label], expected)
        assert stats['Type'] and stats['Attribut']
    return {'presentationId': profile['presentationId'], 'cardId': profile.get('cardId'), 'kind': profile['kind'],
            'avatarId': profile.get('avatarId'), 'modelKind': profile.get('modelKind', 'token-monster'),
            'referenceArtPath': profile.get('referenceArtPath'), 'referenceArtUrl': profile.get('referenceArtUrl'),
            'referenceKind': profile.get('referenceKind'), 'modelAvailable': profile['modelAvailable']}


def find_atlas_presentation(page, item, profile):
    reset_atlas(page)
    page.locator('#token-atlas-search').fill(profile['presentationId'])
    assert atlas_result_count(page) == 1
    if profile['modelAvailable']:
        choose_atlas(page, item, profile['presentationId'])
    else:
        page.locator(f'#token-atlas-list [data-token-presentation-id="{profile["presentationId"]}"]').click()
        ui.wait_until(page, 'document.querySelectorAll("canvas[data-token-atlas-canvas]").length===0')


def atlas_all_presentations(page, item, records):
    reset_atlas(page)
    assert atlas_result_count(page) == len(records)
    assert page.locator('#token-atlas-page').inner_text() == f'1 / {(len(records) + 23) // 24}'
    observed = []
    metadata = []
    canvas = None
    epochs = 0
    started = time.monotonic()
    page.emulate_media(reduced_motion='reduce')
    assert page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches')
    while True:
        listed = visible_presentations(page)
        assert 0 < len(listed) <= 24
        for entry in listed:
            profile = next(record for record in records if record['presentationId'] == entry['presentationId'])
            assert entry['cardId'] == (profile.get('cardId') or '')
            if profile['modelAvailable']:
                choose_atlas(page, item, profile['presentationId'])
                current = page.locator('canvas[data-token-atlas-canvas]')
                assert current.get_attribute('data-token-presentation-id') == profile['presentationId']
                assert current.get_attribute('data-token-card-id') == (profile.get('cardId') or '')
                if profile.get('modelKind') == 'duelist-avatar':
                    assert current.get_attribute('data-token-avatar-id') == profile['avatarId']
                    assert current.get_attribute('data-token-model-kind') == 'duelist-avatar'
                    assert page.locator('#token-atlas-preview').get_attribute('data-token-pose') == 'portrait'
                else:
                    assert current.get_attribute('data-token-model-kind') == 'token-monster'
                    assert current.get_attribute('data-token-avatar-id') == ''
                label_prefix = 'Silhouette 3D du duelliste' if profile.get('modelKind') == 'duelist-avatar' else 'Modèle 3D du Jeton'
                assert current.get_attribute('aria-label') == label_prefix + ' : ' + profile['name']
                if canvas is None:
                    canvas = current.element_handle()
                    epochs += 1
                else:
                    assert canvas.evaluate('element=>element===document.querySelector("canvas[data-token-atlas-canvas]")')
            else:
                page.locator(f'#token-atlas-list [data-token-presentation-id="{profile["presentationId"]}"]').click()
                ui.wait_until(page, 'document.querySelectorAll("canvas[data-token-atlas-canvas]").length===0')
                if canvas is not None:
                    assert not canvas.evaluate('element=>element.isConnected')
                    canvas.dispose()
                    canvas = None
            metadata.append(assert_atlas_detail(page, profile))
            observed.append(profile['presentationId'])
            if len(observed) % 24 == 0 or len(observed) == len(records):
                elapsed = time.monotonic() - started
                print(json.dumps({'progress': 'atlas-real-draws', 'presentations': len(observed), 'total': len(records), 'elapsedSeconds': round(elapsed, 1), 'estimatedRemainingSeconds': round(elapsed / len(observed) * (len(records) - len(observed)), 1)}), flush=True)
        if page.locator('#token-atlas-next').is_disabled():
            break
        page.locator('#token-atlas-next').click()
    assert observed == [record['presentationId'] for record in records]
    assert len(set(observed)) == len(records)
    if canvas is not None:
        canvas.dispose()
    page.emulate_media(reduced_motion=item['reducedMotion'])
    assert page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches') == (item['reducedMotion'] == 'reduce')
    item['allPresentations'] = {'count': len(observed), 'modeledCount': sum(record['modelAvailable'] for record in records),
                                'ids': observed, 'canvasEpochs': epochs, 'metadata': metadata,
                                'sameCanvasBetweenModeledSelections': True, 'temporaryReducedMotionRestored': True}


def atlas_filters(page, item, records):
    reset_atlas(page)
    counts = Counter(record['kind'] for record in records)
    results = {}
    for kind in ('duel', 'decorative', 'placeholder'):
        page.locator('#token-atlas-kind').select_option(kind)
        assert atlas_result_count(page) == counts[kind]
        results[kind] = counts[kind]
    reset_atlas(page)
    page.locator('#token-atlas-race').select_option('Beast')
    page.locator('#token-atlas-attribute').select_option('EARTH')
    count = sum(record.get('race') == 'Beast' and record.get('attribute') == 'EARTH' for record in records)
    assert atlas_result_count(page) == count and count >= 4
    results['Beast/EARTH'] = count
    reset_atlas(page)
    page.locator('#token-atlas-search').fill('bête')
    accented = atlas_result_count(page)
    page.locator('#token-atlas-search').fill('bete')
    assert atlas_result_count(page) == accented and accented >= 4
    results['accentInsensitiveBeast'] = accented
    page.locator('#token-atlas-search').fill('73915053')
    assert any(entry['presentationId'] == 'duel:73915053' for entry in visible_presentations(page))
    results['exactAliasCodePreserved'] = visible_presentations(page)
    page.locator('#token-atlas-search').fill('zzzz-no-token-presentation-726491')
    assert atlas_result_count(page) == 0 and page.locator('#token-atlas-empty').is_visible()
    assert page.locator('canvas[data-token-atlas-canvas]').count() == 0
    page.locator('#token-atlas-reset-filters').click()
    assert atlas_result_count(page) == len(records)
    assert page.locator('#token-atlas-search').input_value() == ''
    item['searchFiltersAndEmptyCleanup'] = results


def atlas_pagination_and_keyboard_selection(page, item, records):
    reset_atlas(page)
    first = [record['presentationId'] for record in records[:24]]
    second = [record['presentationId'] for record in records[24:48]]
    assert [entry['presentationId'] for entry in visible_presentations(page)] == first
    assert page.locator('#token-atlas-prev').is_disabled()
    page.locator('#token-atlas-next').click()
    assert [entry['presentationId'] for entry in visible_presentations(page)] == second
    assert page.locator('#token-atlas-page').inner_text().startswith('2 / ')
    page.locator('#token-atlas-prev').click()
    assert [entry['presentationId'] for entry in visible_presentations(page)] == first
    page.locator('#token-atlas-search').fill('7391505')
    tile = page.locator('#token-atlas-list [data-token-presentation-id="duel:73915053"]')
    tile.focus()
    offset = len(item['studioFrames'])
    page.keyboard.press('Enter')
    assert page.evaluate('document.activeElement.dataset.tokenPresentationId') == 'duel:73915053'
    wait_render(page, item, 'duel:73915053', offset)
    item['realPreviousNextPaginationAndEnterSelectionFocus'] = True


def studio_unchanging(page, item, milliseconds=400):
    page.locator('#token-atlas-preview').scroll_into_view_if_needed()
    page.wait_for_timeout(150)
    before = len(item['studioFrames'])
    page.wait_for_timeout(milliseconds)
    assert len(item['studioFrames']) == before, 'Token studio should render on demand, with no continuous RAF.'
    return {'framesBefore': before, 'framesAfter': len(item['studioFrames']), 'observedMilliseconds': milliseconds}


def atlas_rotation_and_motion(page, item, output):
    stage = page.locator('#token-atlas-preview')
    stage.scroll_into_view_if_needed()
    page.wait_for_timeout(150)
    canvas = page.locator('canvas[data-token-atlas-canvas]').element_handle()
    stage.focus()
    page.keyboard.press('Home')
    assert atlas_angle(page) == 0
    page.keyboard.press('ArrowRight')
    assert atlas_angle(page) == 23
    page.keyboard.press('ArrowLeft')
    assert atlas_angle(page) == 0
    page.locator('#token-atlas-rotate-left').click()
    stage.scroll_into_view_if_needed()
    ui.wait_until(page, 'document.querySelector("#token-atlas-preview").dataset.tokenAtlasAngle==="-23"')
    page.locator('#token-atlas-rotate-right').click()
    ui.wait_until(page, 'document.querySelector("#token-atlas-preview").dataset.tokenAtlasAngle==="0"')
    stage.scroll_into_view_if_needed()
    page.wait_for_timeout(150)
    box = stage.bounding_box()
    x = box['x'] + box['width'] / 2
    y = box['y'] + box['height'] / 2
    if item['width'] < 600:
        session = page.context.new_cdp_session(page)
        session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x + 65, 'y': y}]})
        session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        session.detach()
        item['nativeTouchRotation'] = True
    else:
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x + 65, y, steps=5)
        page.mouse.up()
        item['realMouseDragRotation'] = True
    assert abs(atlas_angle(page)) > 5
    page.locator('#token-atlas-recenter').click()
    ui.wait_until(page, 'document.querySelector("#token-atlas-preview").dataset.tokenAtlasAngle==="0"')
    for pose in ('defense', 'attack'):
        offset = len(item['studioFrames'])
        page.locator(f'button[data-token-pose="{pose}"]').click()
        stage.scroll_into_view_if_needed()
        ui.wait_until(page, 'pose=>document.querySelector("#token-atlas-preview").dataset.tokenPose===pose', pose)
        assert any(frame.get('pose') == pose for frame in item['studioFrames'][offset:])
        assert page.locator(f'button[data-token-pose="{pose}"]').get_attribute('aria-pressed') == 'true'
        assert canvas.evaluate('element=>element===document.querySelector("canvas[data-token-atlas-canvas]")')
        screenshot(page, output, f'tokens-atlas-sheep-{pose}-{item["width"]}')
    item['renderOnDemandByMotionPreference'] = {}
    for motion in ('no-preference', 'reduce'):
        page.emulate_media(reduced_motion=motion)
        item['renderOnDemandByMotionPreference'][motion] = studio_unchanging(page, item)
        offset = len(item['studioFrames'])
        stage.focus()
        page.keyboard.press('ArrowRight')
        ui.wait_until(page, 'document.querySelector("#token-atlas-preview").dataset.tokenAtlasAngle==="23"')
        page.wait_for_timeout(25)
        assert len(item['studioFrames']) > offset
        page.keyboard.press('Home')
    page.emulate_media(reduced_motion=item['reducedMotion'])
    item['keyboardButtonsRecenterPosesSameCanvas'] = True
    canvas.dispose()


def atlas_offscreen_pause(page, item):
    stage = page.locator('#token-atlas-preview')
    stage.scroll_into_view_if_needed()
    page.wait_for_timeout(150)
    page.locator('#token-atlas-search').scroll_into_view_if_needed()
    box = stage.bounding_box()
    if box and box['y'] < item['height'] and box['y'] + box['height'] > 0:
        # A desktop column may keep the stage visible. Use a real smaller
        # viewport and the actual modal scroll rather than a fake observer.
        page.set_viewport_size({'width': item['width'], 'height': 240})
        page.locator('#token-atlas-title').scroll_into_view_if_needed()
    page.wait_for_timeout(200)
    visibility = stage.evaluate('element=>{const r=element.getBoundingClientRect();return {top:r.top,bottom:r.bottom,viewport:innerHeight}}')
    assert visibility['top'] >= visibility['viewport'] or visibility['bottom'] <= 0, visibility
    before = len(item['studioFrames'])
    page.wait_for_timeout(400)
    assert len(item['studioFrames']) == before
    page.set_viewport_size({'width': item['width'], 'height': item['height']})
    stage.scroll_into_view_if_needed()
    page.wait_for_timeout(200)
    assert len(item['studioFrames']) > before
    item['offscreenPauseAndVisibleRedraw'] = {'offscreenViewport': visibility, 'framesWhileOffscreen': 0, 'resumedFrames': len(item['studioFrames']) - before}


def atlas_focus_and_cleanup(page, item, output, profile):
    help_summary = page.locator('.token-atlas-help summary')
    help_summary.focus()
    page.keyboard.press('Tab')
    assert page.evaluate('document.activeElement.id') == 'token-atlas-close'
    page.keyboard.press('Shift+Tab')
    assert help_summary.evaluate('element=>element===document.activeElement')
    help_summary.click()
    page.keyboard.press('Tab')
    assert page.evaluate('document.activeElement.id') == 'token-atlas-close'
    help_summary.click()
    item['focusTrapClosedAndOpenedHelp'] = True
    before = page.locator('canvas[data-token-atlas-canvas]').element_handle()
    page.keyboard.press('Escape')
    page.locator('#start-modal').wait_for(state='visible')
    ui.wait_until(page, 'document.activeElement.id==="btn-open-token-atlas"')
    assert page.locator('canvas[data-token-atlas-canvas]').count() == 0
    assert not before.evaluate('element=>element.isConnected')
    before.dispose()
    page.locator('#btn-open-token-atlas').click()
    page.locator('#token-atlas-modal').wait_for(state='visible')
    find_atlas_presentation(page, item, profile)
    assert_atlas_detail(page, profile, load_reference=True)
    stage = page.locator('#token-atlas-preview')
    stage.scroll_into_view_if_needed()
    page.wait_for_timeout(150)
    canvas = page.locator('canvas[data-token-atlas-canvas]').element_handle()
    lost = canvas.evaluate('element=>{const gl=element.getContext("webgl2")||element.getContext("webgl");const extension=gl?.getExtension("WEBGL_lose_context");if(!extension)return false;extension.loseContext();return true}')
    assert lost, 'Real WebGL context-loss fixture must be supported.'
    ui.wait_until(page, 'document.querySelector("#token-atlas-preview-status").textContent.includes("indisponible")')
    assert not canvas.evaluate('element=>element.isConnected')
    assert page.locator('canvas[data-token-atlas-canvas]').count() == 0
    assert_atlas_detail(page, profile, load_reference=True)
    screenshot(page, output, f'tokens-atlas-real-context-loss-{item["width"]}')
    offset = len(item['studioFrames'])
    page.locator('#token-atlas-retry').click()
    wait_render(page, item, profile['presentationId'], offset)
    assert not canvas.evaluate('element=>element===document.querySelector("canvas[data-token-atlas-canvas]")')
    canvas.dispose()
    page.locator('#token-atlas-close').click()
    assert page.locator('canvas[data-token-atlas-canvas]').count() == 0
    ui.wait_until(page, 'document.activeElement.id==="btn-open-token-atlas"')
    item['escapeCloseContextLossMetadataRetryAndCanvasCleanup'] = True


def atlas_checks(page, item, output, records, all_presentations=False):
    storage = atlas_storage(page)
    page.locator('#btn-open-token-atlas').click()
    page.locator('#token-atlas-modal').wait_for(state='visible')
    assert atlas_result_count(page) == len(records)
    counts = Counter(record['kind'] for record in records)
    assert page.locator('#token-atlas-summary').inner_text() == f'{counts["duel"]} Jetons de Duel · {counts["decorative"]} présentations imprimées · {counts["placeholder"]} repères natifs'
    by_id = {record['presentationId']: record for record in records}
    samples = [key for key in ('duel:73915052', 'duel:73915053', 'duel:73915054', 'duel:73915055',
               'duel:67922703', 'duel:3285552', 'duel:29843092', 'duel:44330099', 'duel:2819436') if key in by_id]
    printed = [record['presentationId'] for record in records if record['kind'] == 'decorative']
    samples += printed[:2]
    samples += [record['presentationId'] for record in records if record.get('modelKind') == 'duelist-avatar']
    item['iconicPresentationMetadata'] = []
    for presentation_id in samples:
        profile = by_id[presentation_id]
        find_atlas_presentation(page, item, profile)
        item['iconicPresentationMetadata'].append(assert_atlas_detail(page, profile, load_reference=True))
        page.locator('#token-atlas-preview').scroll_into_view_if_needed()
        screenshot(page, output, f'tokens-atlas-{presentation_id.replace(":", "-")}-{item["width"]}')
    if all_presentations:
        atlas_all_presentations(page, item, records)
    atlas_filters(page, item, records)
    atlas_pagination_and_keyboard_selection(page, item, records)
    sheep = by_id['duel:73915052']
    find_atlas_presentation(page, item, sheep)
    atlas_rotation_and_motion(page, item, output)
    atlas_offscreen_pause(page, item)
    item['noHorizontalOverflow'] = page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    assert item['noHorizontalOverflow']
    atlas_focus_and_cleanup(page, item, output, sheep)
    assert atlas_storage(page) == storage, 'Viewing Tokens must preserve registered Deck and progression.'
    item['atlasNeverAddsCardsToDeckOrChangesProgression'] = True
    item['ok'] = True


def webgl_unavailable_checks(page, item, output, records):
    page.locator('#btn-open-token-atlas').click()
    ui.wait_until(page, 'document.querySelector("#token-atlas-preview-status")?.textContent.includes("indisponible")')
    presentation_id = page.locator('#token-atlas-detail').get_attribute('data-token-presentation-id')
    profile = next(record for record in records if record['presentationId'] == presentation_id)
    assert page.locator('canvas[data-token-atlas-canvas]').count() == 0
    assert_atlas_detail(page, profile, load_reference=True)
    assert page.locator('#token-atlas-retry').is_visible()
    assert page.locator('#token-atlas-rotate-left').is_disabled()
    screenshot(page, output, 'tokens-atlas-webgl-unavailable-reference')
    page.keyboard.press('Escape')
    page.locator('#start-modal').wait_for(state='visible')
    ui.wait_until(page, 'document.activeElement.id==="btn-open-token-atlas"')
    item['referencesAndNativePropertiesUsableWithoutWebGL'] = {'presentationId': presentation_id, 'reference': profile.get('referenceArtPath')}
    item['ok'] = True


def delayed_atlas_navigation_check(page, item, output, compiled):
    """Delay only a real public module request; no app navigation object is read."""
    held = []
    pattern = re.compile(r'/assets/TokenModelAtlas-[^/]+\.js(?:\?.*)?$' if compiled else r'/src/ui/TokenModelAtlas\.js(?:\?.*)?$')
    def hold(route):
        held.append(route)
    page.route(pattern, hold)
    page.locator('#btn-open-token-atlas').click()
    deadline = time.monotonic() + 15
    while not held and time.monotonic() < deadline:
        page.wait_for_timeout(50)
    assert len(held) == 1, 'The real Atlas import must be intercepted once.'
    assert page.locator('#btn-open-token-atlas').get_attribute('aria-busy') == 'true'
    page.locator('#btn-open-campaign').click()
    page.locator('#campaign-modal').wait_for(state='visible')
    page.locator('#btn-campaign-back').click()
    page.locator('#start-modal').wait_for(state='visible')
    held[0].continue_()
    page.unroute(pattern, hold)
    ui.wait_until(page, 'document.querySelector("#btn-open-token-atlas").getAttribute("aria-busy")!=="true"')
    page.wait_for_timeout(250)
    assert not page.locator('#token-atlas-modal').is_visible()
    assert page.locator('#start-modal').is_visible()
    assert not page.locator('canvas[data-token-atlas-canvas]').count()
    screenshot(page, output, 'tokens-atlas-delayed-import-navigation-safe')
    page.locator('#btn-open-token-atlas').click()
    page.locator('#token-atlas-modal').wait_for(state='visible')
    presentation_id = page.locator('#token-atlas-detail').get_attribute('data-token-presentation-id')
    wait_render(page, item, presentation_id, 0)
    page.locator('#token-atlas-close').click()
    assert not page.locator('canvas[data-token-atlas-canvas]').count()
    item['realImportDelayedAcrossCampaignRoundTripIsCancelledAndRetryWorks'] = True
    item['interceptedRequestCount'] = len(held)
    item['ok'] = True


def assert_public_models(page, item):
    state = page.evaluate(PUBLIC_STATE)
    fields = {'owner', 'zoneType', 'zoneIndex', 'cardId', 'profileId', 'anatomy', 'position'}
    assert len(state['models']) <= 12
    for model in state['models']:
        assert set(model) == fields, model
        assert model['owner'] in ('player', 'opponent')
        assert model['zoneType'] in ('main', 'extra')
        selector = f'.card-zone[data-side="{model["owner"]}"][data-zone-type="monster"][data-index="{model["zoneIndex"]}"]'
        if model['zoneType'] == 'extra':
            selector = f'.card-zone[data-zone-type="extra-monster"][data-index="{model["zoneIndex"]}"]'
            assert page.locator(selector).get_attribute('data-controller-id') == model['owner'], model
        visible = page.locator(selector + ' .card-entity[data-card-visible="true"]')
        assert visible.count() == 1, model
        assert visible.get_attribute('data-id') == model['cardId'], model
        assert model['profileId'] and model['anatomy']
    item['publicModelMetadataAllowlistAndVisibility'] = True
    item['opponentConcealment'] = ui.verify_concealment(page)
    return state


def assert_token_model_identity(page, item, state, codes):
    profiles = {record['cardId']: record for record in catalogue_records(ROOT / 'src/ui/TokenMonsterProfiles.js') if record['kind'] == 'duel'}
    for code in codes:
        models = [model for model in state['models'] if model['cardId'] == code]
        assert models, code
        assert all(model['profileId'] == 'token-' + code and model['anatomy'] == profiles[code]['tokenAnatomy'] for model in models), models
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        frames = [frame for frame in item['publicSceneFrames'] if frame['models'] == state['models'] and frame['geometryDrawCalls'] > 1]
        if frames:
            item.setdefault('genuineSceneGeometryForTokenStates', []).append(frames[-1])
            return
        page.wait_for_timeout(50)
    raise AssertionError('Public Token models were not actually drawn by the real field renderer.')


def token_fixture(opening, extra=None):
    text = (ROOT / 'main.js').read_text().split('const PREMADE_DECKS = {', 1)[1]
    part = text.split('kaiba: {', 1)[1].split('main: [', 1)[1].split(']', 1)[0]
    main = [str(int(code)) for code in re.findall(r"'([0-9]+)'", part)]
    assert len(main) == 40 and len(opening) <= 5
    for index, code in zip([25, 4, 18, 14, 11], opening):
        main[index] = str(code)
    draft = {'main': main, 'extra': list(extra or ['98978921']), 'side': []}
    assert max(Counter(main + draft['extra']).values()) <= 3
    rows, _ = read_native_records()
    assert all(not int(rows[code]['type']) & 0x4000 for code in main + draft['extra'])
    return draft


def decision_step(page, item, wanted=None):
    modal = page.locator('#decision-modal')
    if not modal.is_visible():
        return False
    title = page.locator('#decision-modal-title').inner_text()
    buttons = modal.locator('button:not([disabled])').filter(visible=True)
    assert buttons.count(), 'Mandatory native decision has no public choices.'
    item.setdefault('publicDecisionTrace', []).append({'title': title, 'offered': buttons.all_inner_texts()})
    wanted_button = buttons.filter(has_text=wanted) if wanted else None
    if page.locator('#decision-options .decision-confirm-button').is_visible() and page.locator('#decision-options .decision-confirm-button').is_enabled():
        page.locator('#decision-options .decision-confirm-button').click()
    elif wanted_button is not None and wanted_button.count():
        wanted_button.first.click()
    elif page.locator('#decision-options .decision-confirm-button').is_visible() and modal.locator('button[aria-pressed="false"]:not([disabled])').filter(visible=True).count():
        modal.locator('button[aria-pressed="false"]:not([disabled])').filter(visible=True).first.click()
    elif buttons.filter(has_text=re.compile('^PASSER LA PRIORITÉ')).count():
        buttons.filter(has_text=re.compile('^PASSER LA PRIORITÉ')).click()
    elif page.get_by_role('button', name='NON', exact=True).is_visible():
        page.get_by_role('button', name='NON', exact=True).click()
    elif page.locator('#btn-decision-cancel').is_visible() and page.locator('#btn-decision-cancel').is_enabled():
        page.locator('#btn-decision-cancel').click()
    else:
        buttons.first.click()
    page.wait_for_timeout(60)
    return True


def settle(page, item, wanted=None, timeout=40):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if decision_step(page, item, wanted):
            continue
        if page.locator('#btn-end-turn').is_visible() and page.locator('#btn-end-turn').is_enabled():
            return
        page.wait_for_timeout(75)
    raise AssertionError('Native action did not settle through public controls.')


def start_native(page, item, draft, first_player='player'):
    page.locator('input[name="game-mode"][value="strict"]').check()
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page, 'document.querySelector("#builder-catalogue-status")?.textContent.includes("TCG • liste Advanced complète")', timeout=90)
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    item['actualAdvancedDeckValidation'] = {'status': page.locator('#deck-validity-badge').inner_text(), 'sizes': page.locator('#deck-size-val').inner_text()}
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    page.locator('#btn-start-duel').click()
    ui.wait_until(page, '()=>Boolean(document.querySelector("#player-hand .card-entity"))||[...document.querySelectorAll("#decision-options button")].some(button=>button.checkVisibility()&&button.textContent.trim()==="JE COMMENCE")', timeout=90)
    first = page.get_by_role('button', name='JE COMMENCE', exact=True)
    if first.is_visible():
        page.get_by_role('button', name='JE COMMENCE' if first_player == 'player' else "L'ADVERSAIRE COMMENCE", exact=True).click()
    page.wait_for_selector('#player-hand .card-entity')
    settle(page, item)
    item['actualOwnOpening'] = page.locator('#player-hand .card-entity').evaluate_all('(cards)=>cards.map(card=>card.dataset.id)')
    for _ in range(4):
        if page.locator('#btn-toggle-view').get_attribute('data-view-mode') == 'real':
            break
        page.locator('#btn-toggle-view').click()
        ui.wait_until(page, 'document.querySelector("#btn-toggle-view").getAttribute("aria-busy")==="false"')
    assert page.locator('#btn-toggle-view').get_attribute('data-view-mode') == 'real'
    ui.wait_until(page, 'document.querySelector("[data-real-duel-scene3d]")?.dataset.webglAvailable==="true"')


def play_hand(page, item, code, zone_type='spell', wanted=None, drag=False):
    before = page.evaluate(PUBLIC_STATE)
    card = page.locator(f'#player-hand .card-entity[data-id="{code}"]').first
    card.focus()
    assert card.evaluate('element=>element===document.activeElement')
    card.click()
    zones = page.locator(f'.card-zone[data-side="player"][data-zone-type="{zone_type}"].active-zone')
    assert zones.count(), 'No public legal destination for ' + code
    zone = zones.first
    assert zone.get_attribute('role') == 'button' and zone.get_attribute('tabindex') == '0'
    zone.focus()
    assert zone.evaluate('element=>element===document.activeElement')
    if drag:
        assert card.get_attribute('draggable') == 'true'
        card.drag_to(zone)
    else:
        zone.click()
    page.locator('#action-modal').wait_for(state='visible')
    action = page.locator('#btn-action-faceup')
    assert action.is_enabled()
    action.click()
    page.locator('#action-modal').wait_for(state='hidden')
    settle(page, item, wanted)
    after = page.evaluate(PUBLIC_STATE)
    item.setdefault('realActions', []).append({'code': code, 'placement': 'native-mouse-drag' if drag else 'mouse-click',
                                              'handAndLegalZoneFocusVerified': True, 'before': before, 'after': after})
    return after


def inspect_public_card(page, code, owner='player', uid=None):
    selector = f'.card-zone[data-side="{owner}"] .card-entity[data-id="{code}"][data-card-visible="true"]'
    if uid is not None:
        selector += f'[data-uid="{uid}"]'
    card = page.locator(selector).first
    assert card.count()
    card.focus()
    assert card.evaluate('element=>element===document.activeElement')
    ui.wait_until(page, 'document.querySelector("#inspector-display .inspector-stat-atk")!=null')
    ui.wait_until(page, '()=>{const image=document.querySelector("#inspector-display .inspector-image-wrapper img");return image?.complete&&image.naturalWidth>0}')
    return {'code': code, 'owner': owner, 'uid': card.get_attribute('data-uid'),
            'name': page.locator('#inspector-display .inspector-title').inner_text(),
            'referenceImage': page.locator('#inspector-display .inspector-image-wrapper img').get_attribute('src'),
            'type': page.locator('#inspector-display .inspector-type').inner_text(),
            'attack': page.locator('#inspector-display .inspector-stat-atk').inner_text(),
            'defense': page.locator('#inspector-display .inspector-stat-def').inner_text(),
            'level': page.locator('#inspector-display .inspector-stat-lvl').inner_text()}


def public_pile(page, owner, kind):
    suffix = 'graveyard' if kind == 'graveyard' else 'banished'
    trigger = page.locator(f'#{owner}-{suffix}-zone')
    assert trigger.get_attribute('role') == 'button' and trigger.get_attribute('tabindex') == '0'
    trigger.click()
    page.locator('#public-zone-modal').wait_for(state='visible')
    cards = page.locator('#public-zone-list .card-entity[data-card-visible="true"]').evaluate_all('(cards)=>cards.map(card=>({id:card.dataset.id,label:card.getAttribute("aria-label")}))')
    title = page.locator('#public-zone-title').inner_text()
    page.locator('#btn-close-public-zone').click()
    return {'owner': owner, 'kind': kind, 'title': title, 'cards': cards}


def assert_no_token_piles(page, item, owners=('player',)):
    _, tokens = read_native_records()
    piles = []
    for owner in owners:
        for kind in ('graveyard', 'banished'):
            pile = public_pile(page, owner, kind)
            assert not any(card['id'] in tokens for card in pile['cards']), pile
            piles.append(pile)
    item.setdefault('realPublicPileInspections', []).append(piles)
    return piles


def sheep_then_destroy(page, item, output, draft):
    start_native(page, item, draft)
    assert {'73915051', '53129443'} <= set(item['actualOwnOpening'])
    play_hand(page, item, '73915051')
    ui.wait_until(page, '()=>JSON.parse(document.querySelector("[data-real-duel-scene3d]").dataset.fieldHologramProfiles||"[]").length===4')
    state = assert_public_models(page, item)
    assert_token_model_identity(page, item, state, ['73915052', '73915053', '73915054', '73915055'])
    own = [card for zone in state['ownZones'] for card in zone['cards']]
    assert len(own) == 4 and len({card['uid'] for card in own}) == 4
    assert {card['id'] for card in own} == {'73915052', '73915053', '73915054', '73915055'}
    assert len({model['zoneIndex'] for model in state['models']}) == 4
    assert all(model['owner'] == 'player' and model['position'] == 'defense' for model in state['models'])
    assert all('defense-position' in zone['classes'] for zone in state['ownZones'] if zone['cards'])
    item['fourSheepActualInspectorStats'] = [inspect_public_card(page, card['id'], uid=card['uid']) for card in own]
    assert all(card['attack'] == 'ATK 0' and card['defense'] == 'DEF 0' and card['level'] == '★' for card in item['fourSheepActualInspectorStats'])
    assert all(urlsplit(card['referenceImage']).path == '/tokens/cards/' + card['code'] + '.jpg' for card in item['fourSheepActualInspectorStats'])
    item['fourSheepActualFaceUpCardImages'] = page.locator('.card-zone[data-side="player"][data-zone-type="monster"] .card-entity[data-card-visible="true"] .card-front').evaluate_all(r'''async (fronts)=>Promise.all(fronts.map(async front=>{
      const backgroundImage=getComputedStyle(front).backgroundImage;
      const src=backgroundImage.slice(4,-1).replace(/^["']|["']$/g,'');
      const image=new Image();image.src=src;await image.decode();
      return {code:front.closest('.card-entity').dataset.id,backgroundImage,src,complete:image.complete,naturalWidth:image.naturalWidth};
    }))''')
    assert len(item['fourSheepActualFaceUpCardImages']) == 4
    assert all(image['complete'] and image['naturalWidth'] > 0 and urlsplit(image['src']).path == '/tokens/cards/' + image['code'] + '.jpg' for image in item['fourSheepActualFaceUpCardImages'])
    item['fourGenuineSheepTokens'] = state
    screenshot(page, output, f'tokens-native-four-sheep-{item["width"]}')
    settings_atlas_during_duel(page, item, output)
    grave_before = int(state['ownGraveCount'])
    play_hand(page, item, '53129443')
    ui.wait_until(page, '()=>JSON.parse(document.querySelector("[data-real-duel-scene3d]").dataset.fieldHologramProfiles||"[]").length===0')
    after = assert_public_models(page, item)
    assert not any(zone['cards'] for zone in after['ownZones'])
    assert int(after['ownGraveCount']) == grave_before + 1
    assert after['ownBanishedCount'] == '0'
    piles = assert_no_token_piles(page, item)
    assert {card['id'] for card in piles[0]['cards']} == {'73915051', '53129443'}
    item['darkHoleRemovesTokensAndModelsWithoutTokenGraveyardEntries'] = after
    screenshot(page, output, f'tokens-native-sheep-destroyed-{item["width"]}')
    item['ok'] = True


TETHERWOLF_TRIGGER = re.compile(r'^OUI, ACTIVER$|^ACTIVER.*Tetherwolf|^DÉFENSE FACE RECTO$', re.I)


def tetherwolf_then_link(page, item, output, draft):
    start_native(page, item, draft)
    assert '67922702' in item['actualOwnOpening']
    play_hand(page, item, '67922702', zone_type='monster', wanted=TETHERWOLF_TRIGGER, drag=True)
    ui.wait_until(page, '()=>JSON.parse(document.querySelector("[data-real-duel-scene3d]").dataset.fieldHologramProfiles||"[]").some(model=>model.cardId==="67922703")')
    before = assert_public_models(page, item)
    assert_token_model_identity(page, item, before, ['67922703'])
    token = inspect_public_card(page, '67922703')
    monster = inspect_public_card(page, '67922702')
    assert token['attack'] == 'ATK 0' and token['defense'] == 'DEF 0' and token['level'] == '★★★'
    assert monster['level'] == '★★★★★★★'
    item['genuineTetherwolfAndToken'] = {'publicState': before, 'token': token, 'tetherwolf': monster}
    screenshot(page, output, 'tokens-native-tetherwolf-and-token')
    page.locator('#player-extra-zone').click()
    page.locator('#extra-deck-modal').wait_for(state='visible')
    spider = page.locator('#extra-deck-list .card-entity[data-id="98978921"]')
    assert spider.count() == 1 and spider.get_attribute('aria-disabled') == 'false'
    spider.focus()
    page.keyboard.press('Enter')
    page.locator('#extra-deck-modal').wait_for(state='hidden')
    settle(page, item, wanted=re.compile(r'^AJOUTER — Mecha Phantom Beast Token|^CONFIRMER LES MATÉRIELS$'))
    ui.wait_until(page, '()=>{const models=JSON.parse(document.querySelector("[data-real-duel-scene3d]").dataset.fieldHologramProfiles||"[]");return models.some(model=>model.cardId==="98978921")&&!models.some(model=>model.cardId==="67922703")}')
    after = assert_public_models(page, item)
    assert not page.locator(f'.card-zone .card-entity[data-uid="{token["uid"]}"]').count()
    assert after['ownGraveCount'] == '0' and after['ownBanishedCount'] == '0'
    returned = inspect_public_card(page, '67922702')
    assert returned['level'] == '★★★★'
    item['genuineTokenUsedAsLinkMaterial'] = {'publicState': after, 'tetherwolfLevelAfterTokenLeaves': returned, 'tokenUidRemoved': token['uid']}
    assert_no_token_piles(page, item)
    screenshot(page, output, 'tokens-native-link-spider-token-material')
    item['ok'] = True


def token_control_change(page, item, output, draft):
    start_native(page, item, draft, first_player='opponent')
    assert {'67922702', '31036355', '53129443'} <= set(item['actualOwnOpening'])
    opening = assert_public_models(page, item)
    assert page.locator('.card-zone[data-side="opponent"][data-zone-type="monster"] .card-entity').count(), 'The actual first AI turn must create a monster before Creature Swap; its hidden identity is never inspected.'
    play_hand(page, item, '67922702', zone_type='monster', wanted=TETHERWOLF_TRIGGER)
    ui.wait_until(page, '()=>JSON.parse(document.querySelector("[data-real-duel-scene3d]").dataset.fieldHologramProfiles||"[]").some(model=>model.owner==="player"&&model.cardId==="67922703")')
    before = assert_public_models(page, item)
    assert_token_model_identity(page, item, before, ['67922703'])
    token = inspect_public_card(page, '67922703')
    play_hand(page, item, '31036355', wanted=re.compile('Mecha Phantom Beast Token', re.I))
    ui.wait_until(page, '()=>JSON.parse(document.querySelector("[data-real-duel-scene3d]").dataset.fieldHologramProfiles||"[]").some(model=>model.owner==="opponent"&&model.cardId==="67922703")')
    after = assert_public_models(page, item)
    assert_token_model_identity(page, item, after, ['67922703'])
    transferred = inspect_public_card(page, '67922703', owner='opponent', uid=token['uid'])
    assert transferred['level'] == '★★★' and transferred['attack'] == 'ATK 0' and transferred['defense'] == 'DEF 0'
    assert inspect_public_card(page, '67922702')['level'] == '★★★★'
    assert next(model for model in before['models'] if model['cardId'] == '67922703')['position'] == next(model for model in after['models'] if model['cardId'] == '67922703')['position']
    item['actualCreatureSwapTokenControlChange'] = {'before': before, 'after': after, 'samePublicTokenUid': transferred['uid'] == token['uid'], 'transferredTokenStats': transferred}
    screenshot(page, output, 'tokens-native-creature-swap-opponent-token')
    play_hand(page, item, '53129443')
    ui.wait_until(page, '()=>!JSON.parse(document.querySelector("[data-real-duel-scene3d]").dataset.fieldHologramProfiles||"[]").some(model=>model.cardId==="67922703")')
    item['afterTransferredTokenDestruction'] = assert_public_models(page, item)
    assert_no_token_piles(page, item, owners=('player', 'opponent'))
    screenshot(page, output, 'tokens-native-transferred-token-destroyed')
    item['ok'] = True


def settings_atlas_during_duel(page, item, output):
    before = page.evaluate(PUBLIC_STATE)
    saved_deck = page.evaluate('localStorage.getItem("ygo_custom_deck")')
    page.locator('#btn-settings').click()
    page.locator('#settings-modal').wait_for(state='visible')
    page.locator('#btn-settings-token-atlas').click()
    page.locator('#token-atlas-modal').wait_for(state='visible')
    records = catalogue_records(ROOT / 'src/ui/TokenMonsterProfiles.js')
    profile = next(record for record in records if record['presentationId'] == 'duel:73915053')
    find_atlas_presentation(page, item, profile)
    assert_atlas_detail(page, profile, load_reference=True)
    page.locator('#token-atlas-preview').scroll_into_view_if_needed()
    screenshot(page, output, f'tokens-atlas-settings-during-native-duel-{item["width"]}')
    page.keyboard.press('Escape')
    page.locator('#settings-modal').wait_for(state='visible')
    ui.wait_until(page, 'document.activeElement.id==="btn-settings-token-atlas"')
    assert page.locator('canvas[data-token-atlas-canvas]').count() == 0
    page.locator('#btn-close-settings').click()
    page.locator('#settings-modal').wait_for(state='hidden')
    assert page.evaluate(PUBLIC_STATE) == before
    assert page.evaluate('localStorage.getItem("ygo_custom_deck")') == saved_deck
    item['settingsAtlasReturnsToParentWithoutRestartingDuelOrChangingDeck'] = True


def adventurer_then_destroy(page, item, output, draft):
    start_native(page, item, draft)
    assert {'3285551', '53129443'} <= set(item['actualOwnOpening'])
    play_hand(page, item, '3285551', wanted=re.compile('^ATTAQUE FACE RECTO$'))
    ui.wait_until(page, '()=>JSON.parse(document.querySelector("[data-real-duel-scene3d]").dataset.fieldHologramProfiles||"[]").some(model=>model.cardId==="3285552")')
    state = assert_public_models(page, item)
    assert_token_model_identity(page, item, state, ['3285552'])
    token = inspect_public_card(page, '3285552')
    assert token['attack'] == 'ATK 2000' and token['defense'] == 'DEF 2000' and token['level'] == '★★★★'
    item['genuineAdventurerToken'] = {'publicState': state, 'actualInspector': token}
    screenshot(page, output, 'tokens-native-adventurer-created')
    play_hand(page, item, '53129443')
    ui.wait_until(page, '()=>!JSON.parse(document.querySelector("[data-real-duel-scene3d]").dataset.fieldHologramProfiles||"[]").some(model=>model.cardId==="3285552")')
    assert_no_token_piles(page, item)
    item['adventurerDisappearsWithoutTokenPileEntries'] = assert_public_models(page, item)
    screenshot(page, output, 'tokens-native-adventurer-destroyed')
    item['ok'] = True


def expected_console_errors(item):
    if item.get('kind') != 'webgl-unavailable':
        return []
    assert item['browserCapabilityFixture'] == ['--disable-webgl', '--disable-3d-apis']
    accepted = [text for text in item['browserConsoleErrors'] if text == 'THREE.WebGLRenderer: Error creating WebGL context.' or (text.startswith('THREE.WebGLRenderer: A WebGL context could not be created.') and 'disabled by enterprise policy or commandline switch' in text)]
    assert len(accepted) == 3
    assert accepted.count('THREE.WebGLRenderer: Error creating WebGL context.') == 1
    assert sum(text.startswith('THREE.WebGLRenderer: A WebGL context could not be created.') for text in accepted) == 2
    return accepted


def assert_no_errors(item):
    item['expectedCapabilityConsoleErrors'] = expected_console_errors(item)
    item['unexpectedConsoleErrors'] = [text for text in item['browserConsoleErrors'] if text not in item['expectedCapabilityConsoleErrors']]
    for key in ('unexpectedConsoleErrors', 'pageErrors', 'httpErrors', 'nativeRequestFailures', 'cspViolations'):
        assert not item[key], (key, item[key])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--phase', choices=['source', 'compiled'], required=True)
    parser.add_argument('--stage', choices=['atlas', 'native', 'full'], default='full')
    parser.add_argument('--base-url')
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--freeze', type=Path)
    parser.add_argument('--expected-entry-sha256')
    parser.add_argument('--preparation-quick', action='store_true', help='Source-only diagnostic: sample Atlas instead of certifying all models.')
    parser.add_argument('--native-scenario', choices=['genuine-four-sheep-and-destruction', 'genuine-tetherwolf-token-link-material', 'genuine-token-creature-swap', 'genuine-adventurer-token'], help='Source-only recipe diagnostic.')
    parser.add_argument('--catalogue', type=Path, default=ROOT / 'src/ui/TokenMonsterProfiles.js')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert not (args.phase == 'compiled' and args.preparation_quick), 'Compiled certification requires the complete catalogue traversal.'
    assert not args.native_scenario or (args.phase == 'source' and args.stage == 'native'), 'Recipe filtering is preparation only.'
    args.output.mkdir(parents=True, exist_ok=True)
    report = {'ok': False, 'date': '2026-10-11', 'executedAtUtc': datetime.now(timezone.utc).isoformat(),
              'scope': __doc__, 'phase': args.phase, 'stage': args.stage, 'preparationQuick': args.preparation_quick,
              'sourceRecipeFilter': args.native_scenario,
              'driverBefore': pin(Path(__file__)), 'helpersBefore': fingerprints(DEPENDENCIES),
              'historicalSealedProofsBefore': fingerprints(SEALED_PROOFS), 'paths': []}
    records = catalogue_records(args.catalogue)
    report['catalogue'] = {'path': str(args.catalogue), **pin(args.catalogue), 'counts': validate_catalogue(records)}
    server = None
    compiled = args.phase == 'compiled'
    if compiled:
        assert args.freeze and args.expected_entry_sha256, 'Compiled run requires explicit coordinator freeze/build GO.'
        freeze = json.loads(args.freeze.read_text())
        report['freeze'] = {'path': str(args.freeze), **pin(args.freeze)}
        report['frozenSourcesBefore'] = fingerprints(freeze['source'])
        assert report['frozenSourcesBefore'] == freeze['source']
        local = compiled_pins(args.dist, freeze)
        assert all(local[name] == value for name, value in freeze['compiled'].items())
        assert all(local[name] == value for name, value in freeze.get('additionalStaticAssets', {}).items())
        entry = re.search(r'src="([^"]+/index-[^"]+\.js)"', (args.dist / 'index.html').read_text()).group(1).lstrip('/')
        assert local[entry]['sha256'] == args.expected_entry_sha256
        report.update(expectedEntrySha256=args.expected_entry_sha256, compiledBefore=local)
        ui.AuditServer.headers_to_add = ui.production_headers()
        server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ui.AuditServer, directory=str(args.dist)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}'
    else:
        assert args.base_url
        base = args.base_url
    report['baseUrl'] = base
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            if compiled:
                context = browser.new_context()
                report['servedBefore'] = http_pins(context.request, base, local)
                context.close()
            if args.stage in ('atlas', 'full'):
                context = browser.new_context(viewport={'width': 1280, 'height': 900})
                page = context.new_page()
                item = {'kind': 'atlas-delayed-import-navigation', 'width': 1280, 'height': 900}
                report['paths'].append(item)
                start_page(page, base, item, compiled)
                try:
                    delayed_atlas_navigation_check(page, item, args.output, compiled)
                except Exception:
                    screenshot(page, args.output, 'failure-token-atlas-delayed-import')
                    raise
                assert_no_errors(item)
                context.close()
                for width, height, motion in [(1280, 900, 'no-preference'), (390, 844, 'reduce')]:
                    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion=motion, has_touch=width < 600)
                    page = context.new_page()
                    item = {'kind': 'atlas-all-presentations' if width == 1280 and not args.preparation_quick else 'atlas-iconic-and-lifecycle',
                            'width': width, 'height': height, 'reducedMotion': motion}
                    report['paths'].append(item)
                    start_page(page, base, item, compiled)
                    try:
                        atlas_checks(page, item, args.output, records, all_presentations=width == 1280 and not args.preparation_quick)
                    except Exception:
                        screenshot(page, args.output, f'failure-token-atlas-{width}')
                        raise
                    assert_no_errors(item)
                    context.close()
            if args.stage in ('native', 'full'):
                scenarios = [
                    ('genuine-four-sheep-and-destruction', 1280, 900, 'no-preference', ['73915051', '53129443'], sheep_then_destroy),
                    ('genuine-four-sheep-and-destruction', 390, 844, 'reduce', ['73915051', '53129443'], sheep_then_destroy),
                    ('genuine-tetherwolf-token-link-material', 1280, 900, 'no-preference', ['67922702'], tetherwolf_then_link),
                    ('genuine-token-creature-swap', 1280, 900, 'reduce', ['67922702', '31036355', '53129443'], token_control_change),
                    ('genuine-adventurer-token', 1280, 900, 'no-preference', ['3285551', '53129443'], adventurer_then_destroy),
                ]
                for kind, width, height, motion, opening, scenario in scenarios:
                    if args.native_scenario and kind != args.native_scenario:
                        continue
                    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion=motion, has_touch=width < 600)
                    page = context.new_page()
                    item = {'kind': kind, 'width': width, 'height': height, 'reducedMotion': motion}
                    report['paths'].append(item)
                    draft = token_fixture(opening)
                    start_page(page, base, item, compiled, draft)
                    try:
                        scenario(page, item, args.output, draft)
                    except Exception:
                        screenshot(page, args.output, f'failure-{kind}-{width}')
                        item['failurePublicState'] = page.evaluate(PUBLIC_STATE)
                        raise
                    assert_no_errors(item)
                    context.close()
            if args.stage in ('atlas', 'full'):
                disabled_browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                    args=['--no-sandbox', '--disable-webgl', '--disable-3d-apis'])
                context = disabled_browser.new_context(viewport={'width': 1280, 'height': 900})
                page = context.new_page()
                item = {'kind': 'webgl-unavailable', 'width': 1280, 'height': 900,
                        'browserCapabilityFixture': ['--disable-webgl', '--disable-3d-apis']}
                report['paths'].append(item)
                start_page(page, base, item, compiled)
                try:
                    webgl_unavailable_checks(page, item, args.output, records)
                except Exception:
                    screenshot(page, args.output, 'failure-token-atlas-webgl-unavailable')
                    raise
                assert_no_errors(item)
                context.close()
                disabled_browser.close()
            if compiled:
                context = browser.new_context()
                report['servedAfter'] = http_pins(context.request, base, local)
                context.close()
                report['frozenSourcesAfter'] = fingerprints(freeze['source'])
                assert report['frozenSourcesAfter'] == report['frozenSourcesBefore'] == freeze['source']
                assert compiled_pins(args.dist, freeze) == local == report['servedBefore'] == report['servedAfter']
            report.update(driverAfter=pin(Path(__file__)), helpersAfter=fingerprints(DEPENDENCIES),
                          historicalSealedProofsAfter=fingerprints(SEALED_PROOFS),
                          captures={path.name: pin(path) for path in sorted(args.output.glob('*.png'))})
            assert report['driverBefore'] == report['driverAfter']
            assert report['helpersBefore'] == report['helpersAfter']
            assert report['historicalSealedProofsBefore'] == report['historicalSealedProofsAfter']
            assert pin(args.catalogue) == {key: report['catalogue'][key] for key in ('bytes', 'sha256')}
            report['ok'] = bool(report['paths']) and all(item.get('ok') for item in report['paths'])
            browser.close()
    except Exception as error:
        report['failure'] = {'type': type(error).__name__, 'message': str(error)[:2500], 'traceback': traceback.format_exc()}
        raise
    finally:
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        if server:
            server.shutdown()
    print(json.dumps({'ok': report['ok'], 'paths': len(report['paths']), 'captures': len(report['captures'])}))


if __name__ == '__main__':
    main()
