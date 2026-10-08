#!/usr/bin/env python3
"""Verify four implemented Field Spells through the actual local duel UI.

Run Vite in development, then:
  python scripts/verify-official-fields-browser.py --base-url http://127.0.0.1:5173
The DEV-only QA hook prepares initial positions. Activation, Normal Summoning,
attacks and Battle Phase exit use the application's real controls. Observers
wrap and call the original engine callback and Three.js effect method.
"""
import argparse
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

DATE = '2026-10-07'
CASES = [
    {'key': 'wetlands', 'field': '2084239'},
    {'key': 'skyscraper', 'field': '63035430', 'profile': 'skyscraper-boost'},
    {'key': 'sanctuary', 'field': '56433456', 'profile': 'sanctuary-protection'},
    {'key': 'ancient-forest', 'field': '87624166', 'profile': 'ancient-forest-destruction'},
]

OBSERVE_JS = """async () => {
 const {RealDuelScene3D}=await import('/src/ui/RealDuelScene3D.js');
 window.__fieldAudit={visuals:[],events:[],scene:null};
 const original=RealDuelScene3D.prototype.playCombatEffect;
 RealDuelScene3D.prototype.playCombatEffect=function(event){
   const played=original.call(this,event);
   window.__fieldAudit.scene=this;
   window.__fieldAudit.visuals.push({profile:event.profile||null,kind:event.kind,played,
     source:event.source,target:event.target,sourceRef:event.sourceRef,targetRef:event.targetRef,
     poseKind:event.poseKind,poseTarget:event.poseTarget});
   return played;
 };
 const game=window.__YGO_QA__.getGame();
 const animation=game.callbacks.onAnimation;
 game.callbacks.onAnimation=function(event){
   const record={type:event.type,phase:game.currentPhase,damageStep:game.phases.damageStepSubPhase};
   if(event.type==='skyscraper-boost-cinematic'){
     record.bonus=event.bonus;record.calculatedAtk=event.calculatedAtk;
     record.publicAtk=event.targetCard?.getAtk();
   }
   if(event.type==='sanctuary-protection-cinematic')record.preventedDamage=event.preventedDamage;
   window.__fieldAudit.events.push(record);
   return animation.call(this,event);
 };
} """

PREPARE_JS = """async ({key,fieldId}) => {
 const {CardState}=await import('/src/core/CardState.js');
 const {STARTER_CARDS}=await import('/src/cards.js');
 const game=window.__YGO_QA__.getGame();
 game.reset();
 game.phases.currentTurnOwner='player';game.phases.currentPhase='main1';game.phases.turnCount=2;
 let serial=0;
 const make=(id,side='player')=>{
   const template=STARTER_CARDS.find(value=>String(value.id)===id);
   if(!template)throw new Error('Missing official card '+id);
   const card=new CardState({...template,uid:`field-audit-${key}-${serial++}`});
   card.ownerId=card.controllerId=side;return card;
 };
 const place=(id,side,index,hidden=false)=>{
   const card=make(id,side);game.field.setMonsterZone(side,index,card);
   card.position=hidden?'defense':'attack';card.isSetFaceDown=hidden;return card;
 };
 const field=make(fieldId);field.location='hand';game.playerHand.push(field);
 if(key==='wetlands'){
   const slime=make('68638985');slime.location='hand';game.playerHand.push(slime);
 }else if(key==='skyscraper'){
   place('20721928','player',0);place('48305365','opponent',0);
 }else if(key==='sanctuary'){
   place('39552864','player',0);place('48305365','opponent',0);
 }else{
   place('54652250','player',0,true);place('31560081','opponent',0,true);
   place('20721928','player',1);
   const spell=make('83764718','opponent');game.field.sendToGraveyard(spell,'opponent');
 }
 window.__fieldAudit.visuals.length=0;window.__fieldAudit.events.length=0;
 window.__fieldAudit.initialGame=game;
 game.stateChanged();
 return {rulesMode:game.rulesMode,generation:game._duelGeneration};
} """

SNAPSHOT_JS = """() => {
 const game=window.__YGO_QA__.getGame();
 const activeBackdrop=document.querySelector('.real-duel-environment-backdrop[data-active="true"]');
 const backdrop=activeBackdrop?getComputedStyle(activeBackdrop):null;
 const monster=(card,index)=>card?(card.isSetFaceDown?{zone:index,faceUp:false}:
   {zone:index,faceUp:true,id:String(card.id),atk:card.getAtk(),def:card.getDef(),position:card.position}):null;
 return {sameGame:game===window.__fieldAudit.initialGame,generation:game._duelGeneration,
   mode:window.__YGO_QA__.getViewMode(),phase:game.currentPhase,turn:game.turnCount,
   playerLP:game.playerLP,opponentLP:game.opponentLP,
   playerMonsters:game.playerMonsters.map(monster),opponentMonsters:game.opponentMonsters.map(monster),
   playerGraveyard:game.playerGraveyard.map(card=>String(card.id)),
   opponentGraveyard:game.opponentGraveyard.map(card=>String(card.id)),
   field:game.playerFieldSpell?{id:String(game.playerFieldSpell.id),state:game.playerFieldSpell.fieldActivationState}:null,
   pendingEffects:window.__fieldAudit.scene?window.__fieldAudit.scene._combatEffects.map(effect=>effect.profile.id):[],
   renderedModelKeys:window.__fieldAudit.scene?[...window.__fieldAudit.scene._fieldHolograms.keys()]:[],
   inspectorAtk:document.querySelector('#inspector-display .inspector-stat-atk')?.textContent||null,
   activeBackdrop:backdrop?{image:backdrop.backgroundImage,fit:backdrop.backgroundSize,filter:backdrop.filter}:null,
   canvasCount:document.querySelectorAll('canvas').length,bodyWidth:document.body.scrollWidth};
} """


def wait_idle(page, phase=None):
    page.wait_for_function("phase => {const g=window.__YGO_QA__?.getGame();return g && !g.isResolvingAction && g.chain.chainStatus==='idle' && (!phase || g.currentPhase===phase)}", arg=phase, timeout=25000)


def choose_first_player(page, base_url):
    # Use the real opening decision. Retry the random draw when the AI won it.
    for attempt in range(12):
        page.goto(base_url, wait_until='domcontentloaded')
        page.locator('#btn-start-duel').click()
        page.wait_for_function("() => [...document.querySelectorAll('#decision-options button')].some(button=>button.textContent==='JE COMMENCE') || window.__YGO_QA__?.getGame()", timeout=15000)
        choice = page.get_by_role('button', name='JE COMMENCE', exact=True)
        if choice.is_visible():
            choice.click()
            wait_idle(page, 'main1')
            return attempt + 1
    raise AssertionError('No player opening decision after twelve random draws')


def screenshot(page, output, name, full_page=True):
    path = output / f'official-field-{name}-{DATE}.png'
    page.screenshot(path=str(path), full_page=full_page)
    return path.name


def activate_field(page, card_id):
    page.locator(f'#player-hand .card-entity[data-id="{card_id}"]').click()
    page.locator('#player-field-zone').click()
    page.get_by_role('button', name='ACTIVER LE TERRAIN', exact=True).click()
    wait_idle(page, 'main1')
    page.wait_for_function("id => {const field=window.__YGO_QA__.getGame().playerFieldSpell;return field && String(field.id)===id && field.fieldActivationState==='resolved'}", arg=card_id)


def attack(page):
    page.locator('#btn-next-phase').click()
    wait_idle(page, 'battle')
    page.locator('.player-m-zone[data-index="0"]').click()
    page.locator('.opponent-m-zone[data-index="0"]').click()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:5173')
    parser.add_argument('--output-dir', default='docs/audits/artifacts')
    args = parser.parse_args()
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    result = {'date': DATE, 'baseUrl': args.base_url, 'runtime': 'Chromium / SwiftShader',
              'initialState': 'DEV QA hook; official CardState templates', 'actions': 'original UI handlers and engine',
              'cases': [], 'pageErrors': [], 'consoleErrors': [], 'consoleErrorLocations': [],
              'failedRequests': [], 'webglMessages': [], 'fontResponses': [], 'googleFontsRequests': []}
    browser = None
    page = None
    try:
        with sync_playwright() as driver:
            browser = driver.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=[
                '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            page = browser.new_page(viewport={'width': 1440, 'height': 1180}, device_scale_factor=1)
            page.on('pageerror', lambda error: result['pageErrors'].append(str(error)))

            def record_console(message):
                if message.type == 'error':
                    result['consoleErrors'].append(message.text)
                    result['consoleErrorLocations'].append({'text': message.text, 'location': message.location})
                if message.type in ['error', 'warning'] and re.search(r'WebGL|GL_|shader', message.text, re.I):
                    result['webglMessages'].append({'type': message.type, 'text': message.text})

            def record_failure(request):
                response = request.response()
                result['failedRequests'].append({'url': request.url, 'failure': request.failure,
                                                'status': response.status if response else None})

            page.on('console', record_console)
            page.on('requestfailed', record_failure)
            page.on('request', lambda request: result['googleFontsRequests'].append(request.url)
                    if re.search(r'^https://fonts\.(?:googleapis|gstatic)\.com/', request.url) else None)
            page.on('response', lambda response: result['fontResponses'].append({'url': response.url, 'status': response.status})
                    if '.woff2' in response.url else None)
            result['openingAttempts'] = choose_first_player(page, args.base_url)
            result['fonts'] = page.evaluate("""async () => {
              await document.fonts.ready;
              const inter=await document.fonts.load('800 16px Inter','éèŒœ');
              const orbitron=await document.fonts.load('900 16px Orbitron','éèŒœ');
              return {Inter:inter.map(face=>({family:face.family,status:face.status})),
                Orbitron:orbitron.map(face=>({family:face.family,status:face.status}))};
            }""")
            assert all(result['fonts'][family] and all(face['status'] == 'loaded' for face in result['fonts'][family])
                       for family in ['Inter', 'Orbitron'])
            page.evaluate(OBSERVE_JS)
            for entry in CASES:
                record = {'scenario': entry['key'], 'captures': []}
                result['cases'].append(record)
                page.set_viewport_size({'width': 1440, 'height': 1180})
                record['initial'] = page.evaluate(PREPARE_JS, {'key': entry['key'], 'fieldId': entry['field']})
                page.evaluate("async () => await window.__YGO_QA__.setViewMode('real')")
                page.wait_for_selector('.real-duel-view-layer canvas')
                activate_field(page, entry['field'])
                page.wait_for_function("id => {const layer=document.querySelector('.real-duel-environment-backdrop[data-active=\"true\"]');return layer && getComputedStyle(layer).backgroundImage.includes('/field-art/'+id+'.jpg')}", arg=entry['field'])
                if entry['key'] == 'wetlands':
                    page.locator('#player-hand .card-entity[data-id="68638985"]').click()
                    page.locator('.player-m-zone[data-index="0"]').click()
                    page.get_by_role('button', name='INVOQUER FACE RECTO', exact=True).click()
                    wait_idle(page, 'main1')
                    page.wait_for_function("() => window.__YGO_QA__.getGame().playerMonsters[0]?.getAtk()===1900")
                page.locator('.player-m-zone[data-index="0"]').focus()
                record['beforeBattle'] = page.evaluate(SNAPSHOT_JS)
                assert record['beforeBattle']['field']['state'] == 'resolved'
                assert record['beforeBattle']['canvasCount'] == 1
                assert record['beforeBattle']['activeBackdrop']['fit'] == 'contain'
                assert record['beforeBattle']['activeBackdrop']['filter'] == 'none'
                record['captures'].append(screenshot(page, output, entry['key'] + '-resolved'))
                if entry['key'] != 'wetlands':
                    if entry['key'] == 'ancient-forest':
                        assert record['beforeBattle']['playerMonsters'][0]['faceUp']
                        assert record['beforeBattle']['opponentMonsters'][0]['faceUp']
                        assert record['beforeBattle']['playerMonsters'][0]['position'] == 'attack'
                        assert record['beforeBattle']['opponentMonsters'][0]['position'] == 'attack'
                        assert record['beforeBattle']['opponentGraveyard'] == ['83764718']
                    attack(page)
                    if entry['key'] != 'ancient-forest':
                        page.wait_for_function("profile => window.__fieldAudit.visuals.some(event=>event.profile===profile && event.played===true)", arg=entry['profile'], timeout=20000)
                        record['duringEffect'] = page.evaluate(SNAPSHOT_JS)
                        record['captures'].append(screenshot(page, output, entry['key'] + '-effect'))
                    wait_idle(page, 'battle')
                    record['afterAttack'] = page.evaluate(SNAPSHOT_JS)
                    if entry['key'] == 'ancient-forest':
                        assert record['afterAttack']['playerMonsters'][0]['id'] == '54652250'
                        page.locator('#btn-next-phase').click()
                        page.wait_for_function("() => window.__fieldAudit.visuals.some(event=>event.profile==='ancient-forest-destruction' && event.played===true)", timeout=20000)
                        record['duringEffect'] = page.evaluate(SNAPSHOT_JS)
                        record['captures'].append(screenshot(page, output, entry['key'] + '-effect'))
                        wait_idle(page, 'main2')
                        record['afterBattleEnd'] = page.evaluate(SNAPSHOT_JS)
                record['visuals'] = page.evaluate('window.__fieldAudit.visuals')
                record['events'] = page.evaluate('window.__fieldAudit.events')
                if entry['key'] == 'wetlands':
                    assert record['beforeBattle']['playerMonsters'][0]['atk'] == 1900
                    assert record['beforeBattle']['playerMonsters'][0]['def'] == 500
                    before_switch = page.evaluate(SNAPSHOT_JS)
                    page.set_viewport_size({'width': 390, 'height': 844})
                    page.evaluate("async () => {await window.__YGO_QA__.setViewMode('compact');await window.__YGO_QA__.setViewMode('real')}")
                    page.locator('.player-m-zone[data-index="0"]').focus()
                    page.wait_for_function("() => document.querySelector('#inspector-display .inspector-stat-atk')?.textContent==='ATK 1900'")
                    page.evaluate('window.scrollTo(0,0)')
                    after_switch = page.evaluate(SNAPSHOT_JS)
                    for field in ['generation', 'playerLP', 'opponentLP', 'playerMonsters', 'field']:
                        assert before_switch[field] == after_switch[field], field
                    assert after_switch['sameGame'] and after_switch['canvasCount'] == 1
                    assert after_switch['bodyWidth'] == 390
                    assert after_switch['inspectorAtk'] == 'ATK 1900'
                    record['mobile'] = after_switch
                    record['captures'].append(screenshot(page, output, 'wetlands-mobile-390', full_page=False))
                elif entry['key'] == 'skyscraper':
                    assert record['beforeBattle']['playerMonsters'][0]['atk'] == 1600
                    assert record['afterAttack']['playerMonsters'][0]['atk'] == 1600
                    assert record['afterAttack']['opponentLP'] == 7100
                    assert '48305365' in record['afterAttack']['opponentGraveyard']
                    boost = next(event for event in record['events'] if event['type'] == 'skyscraper-boost-cinematic')
                    assert (boost['damageStep'], boost['bonus'], boost['calculatedAtk'], boost['publicAtk']) == ('calc', 1000, 2600, 1600)
                elif entry['key'] == 'sanctuary':
                    assert record['afterAttack']['playerLP'] == 8000
                    assert record['afterAttack']['playerMonsters'][0] is None
                    assert '39552864' in record['afterAttack']['playerGraveyard']
                    protection = next(event for event in record['events'] if event['type'] == 'sanctuary-protection-cinematic')
                    assert (protection['damageStep'], protection['preventedDamage']) == ('calc', 1200)
                else:
                    assert record['afterBattleEnd']['playerMonsters'][0] is None
                    assert record['afterBattleEnd']['playerMonsters'][1]['id'] == '20721928'
                    assert '54652250' in record['afterBattleEnd']['playerGraveyard']
                    assert not any(event['type'] in ['flip-destroy-cinematic', 'spell-recovery-cinematic'] for event in record['events'])
                    assert record['afterBattleEnd']['opponentGraveyard'].count('83764718') == 1
                if entry.get('profile'):
                    observed = next(event for event in record['visuals'] if event['profile'] == entry['profile'])
                    assert observed['played'] is True
                    assert observed['sourceRef'] == {'owner': 'player', 'zoneType': 'field', 'zoneIndex': 0}
                    assert observed['targetRef'] == {'owner': 'player', 'zoneType': 'main', 'zoneIndex': 0}
                    assert observed['poseTarget'] == 'target'
                record['passed'] = True
                print(json.dumps({'scenario': entry['key'], 'passed': True}, ensure_ascii=False), flush=True)
            assert not result['pageErrors'], result['pageErrors']
            assert not result['consoleErrors'], result['consoleErrors']
            assert not result['failedRequests'], result['failedRequests']
            assert not result['googleFontsRequests'], result['googleFontsRequests']
            assert len(result['fontResponses']) >= 2 and all(response['status'] in [200, 304] for response in result['fontResponses'])
            assert not any(re.search(r'INVALID_|Shader Error|Error compiling|Error linking|VALIDATE_STATUS.*false',
                                     message['text'], re.I) for message in result['webglMessages'])
            result['passed'] = True
            browser.close()
            browser = None
    except Exception as error:
        result['passed'] = False
        result['failure'] = str(error)
        if page:
            try:
                screenshot(page, output, 'failure')
            except Exception:
                pass
        raise
    finally:
        (output / f'official-fields-browser-{DATE}.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        if browser:
            try:
                browser.close()
            except Exception:
                pass


if __name__ == '__main__':
    main()
