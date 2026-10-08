#!/usr/bin/env python3
"""Play official Trap Monsters through public production controls on desktop/mobile.

This audit serves an already-built immutable dist with production CSP. A saved
40-card custom registration and deterministic crypto stream affect only each
isolated browser context. Set, activation, zone/position choices, later position
changes and view switches use rendered controls. No game object, QA hook,
engine response injection, opponent private state or post-start fixture is used.
"""
import argparse
from collections import Counter
import functools
import hashlib
from http.server import ThreadingHTTPServer
import importlib.util
import json
from pathlib import Path
import re
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('native_ui_audit', ROOT / 'scripts/audit-native-duel-ui.py')
ui = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ui)
OPENING = ['26905245', '28649820', '97590747', '12607053', '14315573']
NAMES = {'26905245': 'Metal Reflect Slime', '28649820': 'Embodiment of Apophis'}



GPU_OBSERVER = r"""(() => {
  const records=[];const known=new WeakMap();
  const nativeGetContext=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(...args){
    const context=nativeGetContext.apply(this,args);
    if (!context || !/^webgl/.test(String(args[0])) || known.has(context)) return context;
    const record={canvas:this,lost:false,created:{},deleted:{},live:{}};known.set(context,record);records.push(record);
    for(const kind of ['Buffer','Texture','Program','Shader','Framebuffer','Renderbuffer','VertexArray','Sampler','Query','TransformFeedback']){
      const create='create'+kind,remove='delete'+kind;
      if(typeof context[create]!=='function'||typeof context[remove]!=='function')continue;
      const live=new Set();record.live[kind]=live;record.created[kind]=0;record.deleted[kind]=0;
      const originalCreate=context[create],originalDelete=context[remove];
      context[create]=function(...values){const object=originalCreate.apply(context,values);if(object){live.add(object);record.created[kind]++}return object};
      context[remove]=function(object){if(live.delete(object))record.deleted[kind]++;return originalDelete.call(context,object)};
    }
    this.addEventListener('webglcontextlost',()=>{record.lost=true;for(const live of Object.values(record.live))live.clear()});
    return context;
  };
  window.__auditGpuSnapshot=()=>records.filter(r=>r.canvas.classList.contains('real-duel-scene-3d-canvas')).map(r=>({lost:r.lost,created:{...r.created},deleted:{...r.deleted},live:Object.fromEntries(Object.entries(r.live).map(([key,values])=>[key,values.size]))}));
})()"""


def gpu_snapshot(page):
    values=page.evaluate('window.__auditGpuSnapshot()')
    assert values and all(not value['lost'] for value in values), values
    return values



REAL_PROJECTION_READINESS = """() => {
  const host=document.querySelector('#parallax-container');
  const layer=document.querySelector('.real-duel-view-layer');
  const scene=document.querySelector('[data-real-duel-scene3d="true"]');
  const root=document.querySelector('.real-duel-css3d-root');
  const camera=root?.firstElementChild?.firstElementChild;
  const board=document.querySelector('#duel-board');
  const hand=document.querySelector('#player-hand');
  if (!host || !layer || !scene || !root || !camera || !board || !hand
    || document.querySelector('#btn-toggle-view')?.getAttribute('aria-busy')!=='false'
    || layer.dataset.active!=='true' || scene.hasAttribute('data-camera-transitioning')
    || host.scrollTop!==0 || host.scrollLeft!==0) return null;
  const bounds=host.getBoundingClientRect();
  const width=Math.round(bounds.width),height=Math.round(bounds.height);
  if (width<=0 || height<=0) return null;
  const dimensions=element=>({width:element.offsetWidth,height:element.offsetHeight});
  const matrix=element=>{
    const style=getComputedStyle(element),transform=style.transform;
    const match=transform.match(/^matrix3d\\((.+)\\)$/);
    const values=match?.[1].split(',').map(Number);
    if (!values || values.length!==16 || values.some(value=>!Number.isFinite(value))) return null;
    return {transform,values,perspective:style.perspective,transformOrigin:style.transformOrigin};
  };
  for (const element of [root,root.firstElementChild,camera]) {
    if (!element || element.offsetWidth!==width || element.offsetHeight!==height) return null;
  }
  const cameraMatrix=matrix(camera),boardMatrix=matrix(board),handMatrix=matrix(hand);
  if (!cameraMatrix || !boardMatrix || !handMatrix
    || ![3,7,11].some(index=>Math.abs(cameraMatrix.values[index])>1e-12)) return null;
  return {host:{width,height,scrollTop:host.scrollTop,scrollLeft:host.scrollLeft},
    root:dimensions(root),cameraParent:dimensions(camera),
    cameraMatrix,boardMatrix,handMatrix};
}"""


def wait_real_projection(page):
    # Wait for the public renderer layout, without changing camera or game state.
    predicate = """async () => {
      const read=READ_PUBLIC_PROJECTION;
      const initial=read();
      if (!initial) return false;
      const expected=JSON.stringify(initial);
      for (let tick=0;tick<2;tick++) {
        await new Promise(resolve=>requestAnimationFrame(resolve));
        const next=read();
        if (!next || JSON.stringify(next)!==expected) return false;
      }
      return true;
    }""".replace('READ_PUBLIC_PROJECTION', REAL_PROJECTION_READINESS)
    ui.wait_until(page, predicate)
    readiness = page.evaluate(REAL_PROJECTION_READINESS)
    assert readiness, 'Real projection changed after its stable capture gate'
    return {'stableAnimationFrameTicks': 2, **readiness}


def real_bounds(page):
    return page.evaluate("""() => {
      const host=document.querySelector('.field-container');
      const canvas=document.querySelector('.real-duel-scene-3d-canvas');
      const toolbar=document.querySelector('.real-duel-camera-controls');
      const rect=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
      const h=rect(host);const inside=b=>b.x>=h.x-2&&b.y>=h.y-2&&b.right<=h.right+2&&b.bottom<=h.bottom+2;
      const c=rect(canvas),t=rect(toolbar);
      return {host:{...h,scrollTop:host.scrollTop,scrollLeft:host.scrollLeft},canvas:{...c,withinHost:inside(c),visible:canvas.checkVisibility()},
        toolbar:{...t,withinHost:inside(t),visible:toolbar.checkVisibility()},
        buttons:[...toolbar.querySelectorAll('button')].map(e=>({preset:e.dataset.cameraPreset,visible:e.checkVisibility(),disabled:e.disabled,...rect(e)}))};
    }""")


def assert_real_bounds(page):
    projection=wait_real_projection(page)
    bounds=real_bounds(page)
    bounds['css3dProjection']=projection
    assert bounds['host']['scrollTop']==0 and bounds['host']['scrollLeft']==0, bounds
    assert bounds['canvas']['visible'] and bounds['canvas']['withinHost'],bounds
    assert bounds['toolbar']['visible'] and bounds['toolbar']['withinHost'],bounds
    assert bounds['canvas']['width']>0 and bounds['canvas']['height']>0,bounds
    assert all(b['visible'] and not b['disabled'] for b in bounds['buttons']),bounds
    return bounds


def camera_public_visibility(page,preset):
    return page.locator(f'.real-duel-camera-button[data-camera-preset="{preset}"]').evaluate("""e=>{
      const b=e.getBoundingClientRect();const hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
      return {preset:e.dataset.cameraPreset,visible:e.checkVisibility(),disabled:e.disabled,
        withinViewport:b.x>=0&&b.y>=0&&b.right<=innerWidth&&b.bottom<=innerHeight,
        centerReceivesPointer:hit===e||Boolean(hit&&e.contains(hit)),pressed:e.getAttribute('aria-pressed')};
    }""")


def select_view(page, mode):
    for _ in range(3):
        if page.locator('#btn-toggle-view').get_attribute('data-view-mode')==mode:
            break
        page.locator('#btn-toggle-view').click()
        page.wait_for_timeout(150)
    ui.wait_until(page, 'mode=>document.querySelector("#btn-toggle-view").dataset.viewMode===mode', mode)
    if mode=='real':
        page.locator('.real-duel-scene-3d-canvas').wait_for(state='visible')
        page.wait_for_timeout(700)
        assert_real_bounds(page)


def fixture():
    normals = ['89631139', '46986414', '97590747', '15025844', '70781052',
               '5053103', '76812113', '91152256', '32452818', '91939608']
    main = [code for code in normals for _ in range(3)]
    main += ['26905245'] * 2 + ['28649820'] * 2 + ['12607053'] * 3 + ['14315573'] * 3
    # These registered positions become the real opening five under the shared
    # varied crypto stream. Swap registration positions, preserving copy limits.
    locked = set()
    for position, code in zip([11, 14, 18, 4, 25], OPENING):
        source = next(index for index, value in enumerate(main) if value == code and index not in locked)
        main[position], main[source] = main[source], main[position]
        locked.add(position)
    assert len(main) == 40 and max(Counter(main).values()) <= 3
    rows = {str(row[0]): row for row in json.loads((ROOT / 'public/native/card-data.json').read_text())['rows']}
    assert all(code in rows for code in main)
    assert all(rows[code][4] & 1 for code in normals)
    return {'main': main, 'extra': [], 'side': []}


def fingerprints(dist):
    html = (dist / 'index.html').read_text()
    index = re.search(r'src="([^"]+/index-[^"]+\.js)"', html).group(1).lstrip('/')
    css = re.search(r'href="([^"]+/index-[^"]+\.css)"', html).group(1).lstrip('/')
    paths = ['index.html', index, css, 'native/ocgcore.sync.wasm', 'native/card-data.json', 'native/scripts.json']
    paths += [str(next((dist / 'assets').glob('NativeDuelGame-*.js')).relative_to(dist))]
    paths += [str(next((dist / 'assets').glob('ocgcore-*.js')).relative_to(dist))]
    paths += [str(path.relative_to(dist)) for path in sorted((dist / 'assets').glob('*')) if path.suffix in {'.js', '.css'}]
    paths += [f'cards/{kind}/{code}.jpg' for kind in ['reference','cropped','small'] for code in NAMES]
    paths = list(dict.fromkeys(paths))
    return {path: {'bytes': (dist / path).stat().st_size,
                   'sha256': hashlib.sha256((dist / path).read_bytes()).hexdigest()} for path in paths}


def public_control_state(page):
    # Observable rendered controls and public combat log only; no game object.
    return page.evaluate("""() => ({
      status:document.querySelector('#turn-status')?.textContent?.trim(),
      phases:[...document.querySelectorAll('.phase-step.active')].map(e=>e.id),
      endTurn:{disabled:document.querySelector('#btn-end-turn')?.disabled,visible:document.querySelector('#btn-end-turn')?.checkVisibility()},
      nextPhase:{disabled:document.querySelector('#btn-next-phase')?.disabled,visible:document.querySelector('#btn-next-phase')?.checkVisibility()},
      decision:document.querySelector('#decision-modal')?.checkVisibility()?document.querySelector('#decision-modal-title')?.textContent:null,
      log:[...document.querySelectorAll('#log-content .log-entry')].slice(-12).map(e=>e.textContent.trim())
    })""")


def settle(page, trace, timeout=120, allow_placement=False):
    started = time.monotonic()
    deadline = started + timeout
    while time.monotonic() < deadline:
        if page.locator('#decision-modal').is_visible():
            title = page.locator('#decision-modal-title').inner_text()
            choices = page.locator('#decision-options .decision-choice-list button')
            passing = choices.filter(has_text=re.compile('PASSER LA PRIORITÉ'))
            if passing.count():
                trace.append({'kind': 'chain', 'choice': 'PASSER LA PRIORITÉ'})
                passing.click()
            elif title == 'ACTIVER UN EFFET ?' and page.get_by_role('button', name='NON', exact=True).is_visible():
                page.get_by_role('button', name='NON', exact=True).click()
            elif allow_placement and title == 'CHOISIR LA ZONE':
                options = page.locator('#decision-options .decision-card-option')
                mains = options.filter(has_text=re.compile(r'^Votre Zone Monstre [1-5]$'))
                assert mains.count(), 'No legal own Main Monster Zone offered'
                trace.append({'kind': 'place', 'offered': options.all_inner_texts(), 'choice': mains.first.inner_text()})
                mains.first.click()
                page.locator('#decision-options > button.btn-magenta').click()
            elif allow_placement and title == 'CHOISIR LA POSITION':
                defense = page.get_by_role('button', name='DÉFENSE FACE RECTO', exact=True)
                attack = page.get_by_role('button', name='ATTAQUE FACE RECTO', exact=True)
                choice = defense if defense.is_visible() else attack
                assert choice.is_visible() and choice.is_enabled()
                trace.append({'kind': 'position', 'choice': choice.inner_text()})
                choice.click()
            else:
                raise AssertionError(f'Unexpected required public decision: {title}')
        elif page.evaluate("""() => !document.querySelector('#btn-end-turn').disabled
          && document.querySelector('#phase-main1').classList.contains('active')"""):
            trace.append({'kind':'settled-public-main1','elapsedSeconds':round(time.monotonic()-started,2),
                          'status':page.locator('#turn-status').inner_text()})
            return
        page.wait_for_timeout(100)
    raise AssertionError('Native duel did not return to actionable player Main Phase: '+json.dumps(public_control_state(page),ensure_ascii=False))


def public_monsters(page):
    # Read only revealed own monsters. Deliberately omit duel UIDs and all hands.
    return page.locator('.player-m-zone').evaluate_all("""zones => zones.flatMap(zone => {
      const card=zone.querySelector('.card-entity[data-card-visible="true"]');
      if (!card || card.querySelector('.face-down')) return [];
      const holo=zone.querySelector('.monster-hologram-entity:not(.face-down)');
      return [{publicCode:card.dataset.id,category:card.dataset.cardType,zone:Number(zone.dataset.index),
        position:zone.classList.contains('defense-position')?'defense':'attack',
        hologram:Boolean(holo),hologramAttribute:holo?.className.match(/attr-([a-z-]+)/)?.[1]||null,
        attack:holo?.querySelector('.stat-badge.atk')?.textContent||null,
        defense:holo?.querySelector('.stat-badge.def')?.textContent||null,
        label:holo?.getAttribute('aria-label')||null}];
    })""")


def check_monster(page, code, type_label, attribute, attack, defense, require_stat_bounds=False):
    zone = page.locator('.player-m-zone').filter(has=page.locator(f'.card-entity[data-id="{code}"]'))
    assert zone.count() == 1, f'Missing transformed public monster {code}'
    # Focus is the accessible public inspector path, including touch layouts.
    zone.focus()
    card = zone.locator('.card-entity')
    card.focus()
    ui.wait_until(page, "name => document.querySelector('#inspector-display .inspector-title')?.textContent===name", NAMES[code])
    title = page.locator('#inspector-display .inspector-title').inner_text()
    projected_type = page.locator('#inspector-display .inspector-type').text_content().strip()
    stats = re.sub(r'\s+', ' ', page.locator('#inspector-display .inspector-stats').text_content()).strip()
    facts = next(card for card in public_monsters(page) if card['publicCode'] == code)
    assert facts['category'] == 'monster' and facts['hologram']
    assert facts['hologramAttribute'] == attribute.lower()
    assert facts['attack'] == f'ATK {attack}' and facts['defense'] == f'DEF {defense}'
    assert projected_type == type_label and f'ATK {attack}' in stats and f'DEF {defense}' in stats
    bounds = page.locator('#inspector-display').evaluate("""display => {
      const parent=display.getBoundingClientRect();
      const stats=[...display.querySelectorAll('.inspector-stat-atk,.inspector-stat-def')].map(span=>{
        const box=span.getBoundingClientRect();
        const text=document.createRange();text.selectNodeContents(span);
        const glyph=text.getBoundingClientRect();
        return {text:span.textContent.trim(),withinInspector:box.left>=parent.left-1&&box.right<=parent.right+1&&box.top>=parent.top-1&&box.bottom<=parent.bottom+1,
          textFitsSpan:glyph.left>=box.left-1&&glyph.right<=box.right+1&&glyph.top>=box.top-1&&glyph.bottom<=box.bottom+1,
          width:Math.round(box.width),textWidth:Math.round(glyph.width)};
      });
      return {checked:stats.length===2,spans:stats,allFit:stats.length===2&&stats.every(s=>s.withinInspector&&s.textFitsSpan)};
    }""")
    if require_stat_bounds:
        assert bounds['allFit'], f'Public ATK/DEF text exceeds the inspector: {bounds}'
    images = {'full': page.locator('#inspector-display .inspector-image-wrapper img'), 'cropped': zone.locator('img.holo-sprite')}
    art = {}
    for kind, image in images.items():
        image.evaluate('(image)=>image.decode()')
        detail=image.evaluate('image=>({path:new URL(image.currentSrc).pathname,width:image.naturalWidth,height:image.naturalHeight,complete:image.complete})')
        expected=f'/cards/{"reference" if kind=="full" else "cropped"}/{code}.jpg'
        assert detail['path']==expected and detail['complete'] and detail['width']>0, detail
        art[kind]=detail
    return {**facts, 'referenceArt': art, 'inspector': {'title': title, 'type': projected_type, 'stats': stats, 'statBounds': bounds}}


def activate_set(page, zone_index, code, trace, pose_capture=None):
    zone = page.locator(f'.player-s-zone[data-index="{zone_index}"]')
    assert zone.locator('.card-inner.face-down').count() == 1
    zone.focus()
    zone.press('Enter')
    trace.append({'kind':'set-card-menu','publicCode':code,'input':'keyboard Enter on focusable own zone'})
    page.locator('#decision-modal').wait_for(state='visible')
    assert page.locator('#decision-modal-title').inner_text() == NAMES[code]
    action = page.get_by_role('button', name='ACTIVER FACE RECTO', exact=True)
    assert action.is_enabled()
    action.click()
    settle(page, trace, allow_placement=True)
    # Capture only after the native chain has resolved and the public controls
    # are actionable. A visible decision overlay must never count as a model
    # frame. This is a post-summon presentation, not proof of active animation.
    if pose_capture:
        model_zone=page.locator('.player-m-zone.has-real-hologram-model').filter(has=page.locator(f'.card-entity[data-id="{code}"]'))
        assert model_zone.count()==1, f'Missing rendered new model for {code}'
        assert not page.locator('#decision-modal').is_visible()
        assert page.locator('#btn-end-turn').is_enabled()
        page.locator('.real-duel-scene-3d-canvas').scroll_into_view_if_needed()
        page.wait_for_timeout(250)
        assert_real_bounds(page)
        assert not page.locator('#decision-modal').is_visible()
        page.screenshot(path=str(pose_capture), animations='disabled', timeout=60000)
        trace.append({'kind':'resolved-native-summon-model-frame','publicCode':code,
                      'filename':pose_capture.name,'dialogueHidden':True,'realModelRendered':True,
                      'status':page.locator('#turn-status').inner_text()})
    assert zone.locator('.card-entity').count() == 0, 'Summoned Trap still occupies a Spell/Trap Zone'


def capture_details(page, destination, width):
    if width < 600:
        page.locator('#inspector-display').scroll_into_view_if_needed()
    page.screenshot(path=str(destination), animations='disabled', timeout=60000)
    page.locator('#btn-end-turn').scroll_into_view_if_needed()


def run_view(page, url, view, output, draft):
    errors, failed, csp, trace, loaded = [], [], [], [], set()
    view.update(decisionTrace=trace,pageErrors=errors,nativeRequestFailures=failed,cspViolations=csp)
    page.on('pageerror', lambda error: errors.append(str(error)[:600]))
    page.on('requestfailed', lambda request: failed.append(urlsplit(request.url).path) if '/native/' in request.url or '/cards/' in request.url or '/assets/' in request.url else None)
    page.on('response', lambda response: failed.append({'path':urlsplit(response.url).path,'status':response.status}) if response.status>=400 and any(part in response.url for part in ['/native/','/cards/','/assets/']) else None)
    page.on('response', lambda response: loaded.add(urlsplit(response.url).path) if ('/native/' in response.url or '/cards/' in response.url) and response.status == 200 else None)
    page.add_init_script(ui.RNG_FIXTURE)
    page.add_init_script(GPU_OBSERVER)
    page.add_init_script(f"localStorage.setItem('ygo_custom_deck',{json.dumps(json.dumps(draft))});")
    print(f'Chain UI {view["width"]}: registration',flush=True)
    response = page.goto(url, wait_until='domcontentloaded')
    policy = response.header_value('content-security-policy') or ''
    assert "'wasm-unsafe-eval'" in policy and "'unsafe-eval'" not in policy
    assert page.evaluate('typeof window.__YGO_QA__') == 'undefined'
    page.locator('input[name="game-mode"][value="native"]').check()
    page.locator('input[name="ai-difficulty"][value="easy"]').check()
    page.locator('[data-deck-id="custom"]').click()
    ui.wait_until(page, "() => document.querySelector('#builder-catalogue-status')?.textContent.includes('cartes avec règles natives')")
    assert page.locator('#deck-validity-badge').inner_text() == 'Deck valide'
    assert page.locator('#deck-size-val').inner_text() == 'Main: 40 / Extra: 0 / Side: 0'
    page.screenshot(path=str(output / f'chain-registration-{view["width"]}.png'), animations='disabled', timeout=60000)
    page.locator('#btn-start-duel').click()
    ui.wait_until(page, "() => !document.querySelector('#start-modal').checkVisibility() || [...document.querySelectorAll('#decision-options button')].some(button=>button.checkVisibility())")
    page.get_by_role('button', name='JE COMMENCE', exact=True).click()
    page.locator('#start-modal').wait_for(state='hidden')
    page.wait_for_selector('#player-hand .card-entity')
    settle(page, trace)
    own_opening = page.locator('#player-hand .card-entity').evaluate_all('cards => cards.map(card=>card.dataset.id)')
    assert Counter(own_opening) == Counter(OPENING), f'Unexpected own fixed shuffled opening {own_opening}'
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    view['checks']['validFortyCardRegistrationAndRealShuffle'] = True
    slime_zone = ui.place_hand_card(page, '26905245', 'spell', False)
    apophis_zone = ui.place_hand_card(page, '28649820', 'spell', False)
    assert slime_zone != apophis_zone
    view['checks']['bothTrapsSetThroughControls'] = True
    print(f'Chain UI {view["width"]}: both traps set',flush=True)
    page.screenshot(path=str(output / f'chain-set-{view["width"]}.png'), animations='disabled', timeout=60000)
    page.locator('#btn-end-turn').click()
    settle(page, trace)
    select_view(page, 'real')
    camera=page.locator('.real-duel-camera-button[data-camera-preset="console"]')
    camera.click()
    page.wait_for_timeout(700)
    activate_set(page, slime_zone, '26905245', trace, output / f'chain-slime-native-summon-pose-{view["width"]}.png')
    slime = check_monster(page, '26905245', 'Trap Effect Monster', 'WATER', 0, 3000, view['requireStatBounds'])
    assert slime['position'] == 'defense'
    view['checks']['slimePublicNativeMonster'] = slime
    print(f'Chain UI {view["width"]}: native Slime and exact JPEGs/stat bounds verified',flush=True)
    capture_details(page, output / f'chain-slime-details-{view["width"]}.png', view['width'])
    # Advance normally once more: a freshly summoned monster cannot change its
    # position this turn. On the next own Main Phase the core offers it legally.
    page.locator('#btn-end-turn').click()
    settle(page, trace)
    slime_cell = page.locator('.player-m-zone').filter(has=page.locator('.card-entity[data-id="26905245"]'))
    slime_cell.focus()
    slime_cell.press('Enter')
    page.locator('#decision-modal').wait_for(state='visible')
    change = page.get_by_role('button', name='CHANGER LA POSITION DE COMBAT', exact=True)
    assert change.is_enabled()
    change.click()
    settle(page, trace)
    assert next(card for card in public_monsters(page) if card['publicCode'] == '26905245')['position'] == 'attack'
    view['checks']['nextTurnNativePositionChangeThroughMenu'] = True
    activate_set(page, apophis_zone, '28649820', trace, output / f'chain-apophis-native-summon-pose-{view["width"]}.png')
    apophis = check_monster(page, '28649820', 'Trap Normal Monster', 'EARTH', 1600, 1800, view['requireStatBounds'])
    view['checks']['apophisPublicNativeMonster'] = apophis
    print(f'Chain UI {view["width"]}: native Apophis and exact JPEGs/stat bounds verified',flush=True)
    capture_details(page, output / f'chain-apophis-details-{view["width"]}.png', view['width'])
    initial = public_monsters(page)
    view['presentations'] = []
    page.wait_for_timeout(1300)
    view['gpuStableStateBeforeCycles'] = gpu_snapshot(page)
    for mode in ['compact', 'arena', 'real', 'compact']:
        if page.locator('#btn-toggle-view').get_attribute('data-view-mode') != mode:
            page.locator('#btn-toggle-view').click()
        ui.wait_until(page, 'mode => document.querySelector("#btn-toggle-view").dataset.viewMode===mode', mode)
        if mode == 'real':
            page.locator('.real-duel-scene-3d-canvas').wait_for(state='visible')
            page.wait_for_timeout(700)
            assert_real_bounds(page)
        assert public_monsters(page) == initial, 'View switch changed the public duel projection'
        assert not page.locator('#decision-modal').is_visible()
        assert page.locator('#btn-end-turn').is_enabled()
        view['presentations'].append({'mode': mode, 'samePublicState': True,
            'webglCanvasVisible': mode == 'real' and page.locator('.real-duel-scene-3d-canvas').is_visible()})
        if len(view['presentations']) <= 3:
            page.screenshot(path=str(output / f'chain-{mode}-{view["width"]}.png'), animations='disabled', timeout=60000)
    view['checks']['threeViewsAndReturnSharePublicState'] = True
    select_view(page, 'real')
    view['realCameraBounds'] = []
    for preset in ['player','diagonal-left','console']:
        page.locator(f'.real-duel-camera-button[data-camera-preset="{preset}"]').click()
        page.wait_for_timeout(700)
        bounds=assert_real_bounds(page)
        public_button=camera_public_visibility(page,preset)
        assert public_button['visible'] and not public_button['disabled'] and public_button['withinViewport'] and public_button['centerReceivesPointer'] and public_button['pressed']=='true', public_button
        view['realCameraBounds'].append({'preset':preset,'bounds':bounds,'selectedPublicButton':public_button})
        page.screenshot(path=str(output / f'chain-real-camera-{preset}-{view["width"]}.png'), animations='disabled', timeout=60000)
        assert public_monsters(page)==initial
    view['checks']['realCanvasToolbarAndPublicCameraControlsWithinHost'] = True
    view['checks']['bothModelsUseActualRealCanvas'] = page.locator('.player-m-zone.has-real-hologram-model').count()==2
    assert view['checks']['bothModelsUseActualRealCanvas']
    page.wait_for_timeout(1300)
    baseline_gpu=gpu_snapshot(page)
    view['gpuCycles'] = []
    for cycle in range(3):
        for mode in ['compact','arena','real']:
            select_view(page,mode)
            assert public_monsters(page)==initial
        page.wait_for_timeout(1300)
        values=gpu_snapshot(page)
        assert [{"live":v["live"],"lost":v["lost"]}for v in values]==[{"live":v["live"],"lost":v["lost"]}for v in baseline_gpu], (baseline_gpu,values)
        view['gpuCycles'].append({'cycle':cycle+1,'sameLiveResourceCounts':True,'snapshots':values})
        print(f'Chain UI {view["width"]}: GPU cycle {cycle+1}/3 stable',flush=True)
    select_view(page,'compact')
    view['checks']['cachedRendererDoesNotGrowAcrossThreeCycles'] = True
    view['checks']['opponentConcealment'] = ui.verify_concealment(page)
    assert page.evaluate('document.body.scrollWidth<=innerWidth')
    assert page.evaluate('JSON.parse(localStorage.getItem("ygo_custom_deck"))') == draft
    assert {'/native/ocgcore.sync.wasm', '/native/scripts.json', '/native/card-data.json'} <= loaded
    art_paths={f'/cards/{kind}/{code}.jpg'for kind in ['reference','cropped']for code in NAMES}
    assert art_paths<=loaded, (art_paths-loaded)
    view['checks']['fourExactJpegsLoadedWith200'] = sorted(art_paths)
    small_paths={f'/cards/small/{code}.jpg'for code in NAMES}
    assert small_paths<=loaded,small_paths-loaded
    view['checks']['bothSmallArtVariantsLoadedWith200'] = sorted(small_paths)
    csp.extend(page.evaluate('window.__auditCspViolations || []'))
    assert not errors and not failed and not csp, {'errors': errors, 'failed': failed, 'csp': csp}
    view.update(decisionTrace=trace, pageErrors=errors, nativeRequestFailures=failed,
                cspViolations=csp, nativeAssets=sorted(loaded), publicFinal=initial)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/native-chain-ui-2026-10-08')
    parser.add_argument('--viewport', choices=['both', 'desktop', 'mobile'], default='both')
    parser.add_argument('--final', action='store_true', help='Gate final publication on readable ATK/DEF bounds as well as native controls')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    before = fingerprints(args.dist)
    headers = ui.production_headers()
    ui.AuditServer.headers_to_add = headers
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(ui.AuditServer, directory=str(args.dist)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}'
    index = next(path for path in before if re.match(r'assets/index-.+\.js$', path))
    report = {'ok': False, 'target': 'immutable final compiled production bundle' if args.final else 'immutable intermediate compiled production bundle',
        'requireStatBounds': args.final,
        'testedIndexAsset': '/' + index, 'testedIndexSha256': before[index]['sha256'],
        'testedWasmSha256': before['native/ocgcore.sync.wasm']['sha256'],
        'productionCsp': headers['Content-Security-Policy'], 'compiledSnapshotBefore': before,
        'generatedOn':'2026-10-08', 'sourceAuditSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'sourceHelperSha256': hashlib.sha256((ROOT/'scripts/audit-native-duel-ui.py').read_bytes()).hexdigest(),
        'settleTimeoutSeconds':120, 'limits':['Public production controls and observable DOM only; WebGL resource counters observe graphics API allocation/deletion without accessing a game object.','The cached Real renderer intentionally retains live resources in compact view; three cycles verify stable allocation counts, not zero GPU memory on view switch.','Complete model disposal is verified separately by audit-trap-monster-models.py.','The two summon model screenshots show the resolved native Special Summon with no overlay; they do not certify an active animation frame. Metal Reflect Slime remains unable to attack.'],
        'sourceFacadeSha256': hashlib.sha256((ROOT / 'src/core/native/NativeDuelGame.js').read_bytes()).hexdigest(),
        'registeredFixture': fixture(), 'qaHook': False, 'postStartInjection': False, 'viewports': []}
    page = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            for width, height in [(1280, 900), (390, 844)]:
                if args.viewport == 'desktop' and width != 1280 or args.viewport == 'mobile' and width != 390:
                    continue
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='no-preference')
                page = context.new_page()
                page.set_default_timeout(30000)
                view = {'width': width, 'height': height, 'requireStatBounds': args.final, 'checks': {}}
                report['viewports'].append(view)
                try:
                    run_view(page, url, view, args.output, report['registeredFixture'])
                except Exception:
                    view['failurePublicControlStateBeforeCapture']=public_control_state(page)
                    page.screenshot(path=str(args.output / f'failure-{width}.png'), animations='disabled', timeout=60000)
                    if page.locator('#decision-modal').is_visible():
                        view['pendingDecision'] = {'title': page.locator('#decision-modal-title').inner_text(),
                            'offered': page.locator('#decision-options button').all_inner_texts()}
                    raise
                context.close()
            browser.close()
        report['ok'] = True
    except Exception as error:
        report['failure'] = {'type': type(error).__name__, 'message': str(error)[:1500]}
        raise
    finally:
        after = fingerprints(args.dist)
        report['captures']={path.name:{'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}for path in sorted(args.output.glob('chain-*.png'))}
        report['sourceAuditSha256After'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
        report['sourceHelperSha256After'] = hashlib.sha256((ROOT/'scripts/audit-native-duel-ui.py').read_bytes()).hexdigest()
        report['immutableAuditSources'] = report['sourceAuditSha256']==report['sourceAuditSha256After'] and report['sourceHelperSha256']==report['sourceHelperSha256After']
        report['compiledSnapshotAfter'] = after
        report['immutableCompiledSnapshot'] = before == after
        if before != after or not report['immutableAuditSources']:
            report['ok'] = False
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        server.shutdown()
        server.server_close()
    assert before == after, 'Compiled snapshot changed during audit'
    assert report['immutableAuditSources'], 'Audit scripts changed during run'
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
