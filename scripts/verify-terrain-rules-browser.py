#!/usr/bin/env python3
"""Exercise twelve additional official Field Spells through the local duel UI.

Run Vite in development, then run this script with --base-url. The DEV QA
hook prepares CardState fixtures only. Summons, Spell activations, monster
effects, targets, attacks and turn exits use original controls. No resolver,
delay, Chain or engine result is replaced. Observation calls original callbacks.
"""
import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

DATE = '2026-10-07'
CASES = [
    ('ocean', '295517'), ('saber-vault', '73787254'),
    ('jurassic', '10080320'), ('acidic-downpour', '35956022'),
    ('sorcerous-wall', '81231742'), ('zombie-world', '4064256'),
    ('secret-village', '68462976'), ('closed-forest', '78082039'),
    ('temple', '92481084'), ('canyon', '28120197'),
    ('shien', '11102908'), ('dark-city', '53527835'),
    ('village-with-zombie', '68462976'), ('temple-with-canyon', '92481084')
]

OBSERVE_JS = """async () => {
 // Vite versioned imports must resolve to the active scene's exact module.
 // Importing the unversioned path after a hot update creates another class.
 const sceneModule=[...performance.getEntriesByType('resource')].reverse().find(entry=>
   new URL(entry.name).pathname==='/src/ui/RealDuelScene3D.js');
 if(!sceneModule)throw new Error('Real scene module was not loaded');
 const {RealDuelScene3D}=await import(sceneModule.name);
 window.__terrainAudit={events:[],visuals:[],turnSamples:[],scene:null};
 const originalEffect=RealDuelScene3D.prototype.playCombatEffect;
 RealDuelScene3D.prototype.playCombatEffect=function(event){
   const played=originalEffect.call(this,event);
   window.__terrainAudit.scene=this;
   window.__terrainAudit.visuals.push({profile:event.profile||null,kind:event.kind,played,
     sourceRef:event.sourceRef,targetRef:event.targetRef,ruleChange:event.ruleChange||null});
   return played;
 };
 const game=window.__YGO_QA__.getGame();
 const originalAnimation=game.callbacks.onAnimation;
 game.callbacks.onAnimation=function(event){
   const visible=card=>card&&!card.isSetFaceDown&&!card.hidden?String(card.id):null;
   window.__terrainAudit.events.push({type:event.type,phase:game.currentPhase,
     damageStep:game.phases.damageStepSubPhase,cardId:visible(event.card),
     bonus:event.bonus,reduction:event.reduction,calculatedAtk:event.calculatedAtk,
     originalDamage:event.originalDamage,modifiedDamage:event.modifiedDamage,
     damage:event.damage,tributeCount:event.tributeCount,sourceCount:event.sourceCount});
   return originalAnimation.call(this,event);
 };
 const originalState=game.callbacks.onStateChange;
 game.callbacks.onStateChange=function(state){
   const result=originalState.call(this,state);
   if(window.__terrainAudit.key==='sorcerous-wall'&&game.currentTurn==='opponent'){
     const card=game.playerMonsters[0];
     if(card&&!card.isSetFaceDown)window.__terrainAudit.turnSamples.push({
       turn:game.currentTurn,phase:game.currentPhase,atk:card.getAtk(),def:card.getDef(),
       field:String(game.playerFieldSpell?.id||'')});
   }
   return result;
 };
} """

PREPARE_JS = """async ({key,fieldId,controls,freeScale}) => {
 const {CardState}=await import('/src/core/CardState.js');
 const {STARTER_CARDS,EXTRA_DECK_CARDS}=await import('/src/cards.js');
 const {markFieldSpellResolved}=await import('/src/core/FieldSpellRules.js');
 const game=window.__YGO_QA__.getGame();
 game.reset();game.phases.currentTurnOwner='player';game.phases.currentPhase='main1';game.phases.turnCount=2;
 window.__terrainAudit.key=key;
 window.__terrainAudit.events.length=0;window.__terrainAudit.visuals.length=0;
 window.__terrainAudit.turnSamples.length=0;window.__terrainAudit.initialGame=game;
 let serial=0;
 const make=(id,side='player')=>{
   const template=[...STARTER_CARDS,...EXTRA_DECK_CARDS].find(card=>String(card.id).replace(/^0+(?=\\d)/,'')===String(id).replace(/^0+(?=\\d)/,''));
   if(!template)throw new Error('Missing official fixture '+id);
   const card=new CardState({...template,uid:`terrain-audit-${key}-${serial++}`});
   card.ownerId=card.controllerId=side;return card;
 };
 const hand=(id)=>{const card=make(id);card.location='hand';game.playerHand.push(card);return card;};
 const place=(id,side,index,position='attack',hidden=false)=>{
   const card=make(id,side);game.field.setMonsterZone(side,index,card);
   card.position=position;card.isSetFaceDown=hidden;return card;
 };
 const grave=(id,side='player')=>{const card=make(id,side);game.field.sendToGraveyard(card,side);return card;};
 const opposingField=(id)=>{const source=make(id,'opponent');game.field.placeFieldSpell('opponent',source);
   game._fieldSpellActivationSequence+=1;markFieldSpellResolved(source,game._fieldSpellActivationSequence);};
 hand(fieldId);
 if(key==='ocean'){hand('43793530');place('81823360','opponent',0);if(freeScale)hand('94415058');}
 else if(key==='saber-vault'){hand('23115241');place('23115241','opponent',0);}
 else if(key==='jurassic'){hand('81823360');place('81823360','opponent',0);}
 else if(key==='acidic-downpour'){hand('48305365');place('91152256','opponent',0);}
 else if(key==='sorcerous-wall'){
   hand('91152256');place('91152256','opponent',0,'defense');
   for(const side of ['player','opponent']){
     const card=make('43793530',side);card.location='deck';game.getSideState(side).deck.push(card);
   }
 }else if(key==='zombie-world'){
   hand('66602787');hand('89631139');place('13039848','player',1);place('20721928','player',2);
   place('97590747','opponent',0);grave('46986414');grave('40640057','opponent');
 }else if(key==='secret-village'||key==='village-with-zombie'){
   place('66602787','player',0);place('97590747','opponent',0);
   hand('14087893');hand('22702055');grave('91152256');
   if(controls)hand('94415058');
   if(key==='village-with-zombie')opposingField('4064256');
 }else if(key==='closed-forest'){
   place('64428736','player',0);place('64428736','opponent',0);
   const arcanite=place('31924889','player',1);arcanite.addCounter('spell',2);
   grave('91152256');grave('13039848');grave('55144522');grave('39552864','opponent');hand('22702055');
 }else if(key==='temple'){
   place('48305365','player',0);place('91152256','opponent',0);
 }else if(key==='canyon'||key==='temple-with-canyon'){
   place('48305365','player',0);place('13039848','opponent',0,'defense',true);
   if(key==='temple-with-canyon')opposingField('28120197');
 }else if(key==='shien'){
   place('48305365','player',0);place('44430454','opponent',0,'defense',true);
 }else if(key==='dark-city'){
   place('20721928','player',0);place('48305365','opponent',0);
 }
 game.stateChanged();
 const normalUids=game.getAvailableActions('player').normalSummonCardUids;
 return {rulesMode:game.rulesMode,generation:game._duelGeneration,
   initialNormalSummonIds:game.playerHand.filter(card=>normalUids.includes(card.uid)).map(card=>String(card.id))};
} """

SNAPSHOT_JS = """() => {
 const game=window.__YGO_QA__.getGame();
 const publicCard=(card,index)=>!card?null:card.isSetFaceDown?{zone:index,faceUp:false,position:card.position}:
   {zone:index,id:String(card.id),faceUp:true,atk:card.getAtk(),def:card.getDef(),level:card.getLevel(),
    race:card.currentRace,printedRace:card.race,position:card.position};
 const source=card=>!card?null:card.isSetFaceDown?{faceUp:false}:
   {id:String(card.id),state:card.fieldActivationState,faceUp:true};
 const activeBackdrop=document.querySelector('.real-duel-environment-backdrop[data-active="true"]');
 const backdrop=activeBackdrop?getComputedStyle(activeBackdrop):null;
 const ownHand=game.playerHand.map(card=>({id:String(card.id),uid:card.uid,race:card.currentRace,
   atk:card.getAtk(),def:card.getDef(),level:card.getLevel(),canActivate:card.card_type==='spell'?game.canActivateSpell(card,'player'):null}));
 return {sameGame:game===window.__terrainAudit?.initialGame,generation:game._duelGeneration,
   phase:game.currentPhase,turn:game.currentTurn,turnCount:game.turnCount,mode:window.__YGO_QA__.getViewMode(),
   playerLP:game.playerLP,opponentLP:game.opponentLP,
   playerMonsters:game.playerMonsters.map(publicCard),opponentMonsters:game.opponentMonsters.map(publicCard),
   playerGraveyard:game.playerGraveyard.map(card=>({id:String(card.id),race:card.currentRace})),
   opponentGraveyard:game.opponentGraveyard.map(card=>({id:String(card.id),race:card.currentRace})),
   hand:ownHand,normalSummonCardUids:game.getAvailableActions('player').normalSummonCardUids,
   field:source(game.playerFieldSpell),opposingField:source(game.opponentFieldSpell),
   canvasCount:document.querySelectorAll('canvas').length,bodyWidth:document.body.scrollWidth,
   viewportWidth:window.innerWidth,closedForestTurnLocked:game.fieldRules.isClosedForestDestructionRestrictionActive(game),
   activeBackdrop:backdrop?{image:backdrop.backgroundImage,fit:backdrop.backgroundSize,filter:backdrop.filter}:null};
} """


def pass_optional_chain(page):
    button = page.locator('#btn-decision-cancel')
    if button.is_visible() and button.inner_text() == 'PASSER LA PRIORITÉ':
        button.click()
        return True
    return False


def wait_idle(page, phase='main1', timeout=30):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        pass_optional_chain(page)
        if page.evaluate("phase=>{const g=window.__YGO_QA__?.getGame();return g&&!g.isResolvingAction&&!g.pendingSummon&&g.chain.chainStatus==='idle'&&(!phase||g.currentPhase===phase)}", phase):
            return
        page.wait_for_timeout(100)
    raise AssertionError(f'Original engine did not finish action in phase {phase}')


def start_player_duel(page, base_url):
    for attempt in range(12):
        page.goto(base_url, wait_until='domcontentloaded')
        page.locator('#btn-start-duel').click()
        page.wait_for_function("()=>[...document.querySelectorAll('#decision-options button')].some(button=>button.textContent==='JE COMMENCE')||window.__YGO_QA__?.getGame()", timeout=20000)
        first = page.get_by_role('button', name='JE COMMENCE', exact=True)
        if first.is_visible():
            first.click()
            wait_idle(page)
            return attempt + 1
    raise AssertionError('No player opening choice after twelve random draws')


def real_view(page):
    for _ in range(3):
        mode = page.evaluate("window.__YGO_QA__.getViewMode()")
        if mode == 'real':
            break
        page.locator('#btn-toggle-view').click()
        # Lazy scene loading marks the button aria-disabled. Wait for that
        # actual transition before another click; never cycle past a pending
        # Real View merely because its module takes longer than 300 ms.
        next_mode = {'compact': 'arena', 'arena': 'real'}[mode]
        page.wait_for_function("mode=>window.__YGO_QA__.getViewMode()===mode&&document.querySelector('#btn-toggle-view').getAttribute('aria-disabled')!=='true'", arg=next_mode, timeout=30000)
    page.wait_for_selector('.real-duel-view-layer canvas')
    assert page.evaluate("window.__YGO_QA__.getViewMode()") == 'real'


def hand_action(page, card_id, zone, button='INVOQUER FACE RECTO'):
    page.locator(f'#player-hand .card-entity[data-id="{card_id}"]').click()
    page.locator(zone).click()
    page.get_by_role('button', name=button, exact=True).click()


def activate_field(page, card_id):
    hand_action(page, card_id, '#player-field-zone', 'ACTIVER LE TERRAIN')
    wait_idle(page)
    page.wait_for_function("id=>{const f=window.__YGO_QA__.getGame().playerFieldSpell;return f&&String(f.id)===id&&f.fieldActivationState==='resolved'}", arg=card_id)
    # The scene initially shows its WebP transition while decoding the source
    # JPEG. Observe the final decoded illustration, not the asynchronous swap.
    page.wait_for_function("id=>{const el=document.querySelector('.real-duel-environment-backdrop[data-active=\"true\"]');if(!el)return false;const style=getComputedStyle(el);return style.backgroundImage.includes('/field-art/'+id+'.jpg')&&style.backgroundSize==='contain'&&style.filter==='none'}", arg=card_id)


def reject_field_activation(page, card_id):
    page.locator(f'#player-hand .card-entity[data-id="{card_id}"]').click()
    page.locator('#player-field-zone').click()
    activate = page.get_by_role('button', name='ACTIVER LE TERRAIN', exact=True)
    disabled = activate.is_disabled()
    can_set = page.get_by_role('button', name='POSER FACE CACHÉE', exact=True).is_enabled()
    if disabled:
        page.locator('#btn-action-cancel').click()
    else:
        activate.click()
    wait_idle(page)
    return {'activationControlDisabled': disabled, 'setControlEnabled': can_set,
            'validation': 'Disabled UI control' if disabled else 'Original activation handler rejected the action'}


def check_restricted_pendulum_and_set(page):
    # Stargazer is an actual supported card; no synthetic Pendulum identity.
    pendulum = page.locator('#player-hand .card-entity[data-id="94415058"]')
    blocked_at = 'hand' if pendulum.get_attribute('aria-disabled') == 'true' else 'activation-dialog'
    if blocked_at == 'activation-dialog':
        pendulum.click()
        page.locator('.player-s-zone[data-index="0"]').click()
        button = page.get_by_role('button', name='ACTIVER L’ÉCHELLE 1', exact=True)
        assert button.is_disabled()
        page.locator('#btn-action-cancel').click()
    hand_action(page, '22702055', '#player-field-zone', 'POSER FACE CACHÉE')
    wait_idle(page)
    page.wait_for_function("()=>{const f=window.__YGO_QA__.getGame().playerFieldSpell;return String(f?.id)==='22702055'&&f.isSetFaceDown===true}")
    return {'pendulumActivationControlDisabled': True, 'pendulumBlockedAt': blocked_at,
            'fieldSetThroughUI': page.evaluate(SNAPSHOT_JS)}


def summon(page, card_id, index=0):
    hand_action(page, card_id, f'.player-m-zone[data-index="{index}"]')
    wait_idle(page)
    page.wait_for_function("({id,index})=>String(window.__YGO_QA__.getGame().playerMonsters[index]?.id)===id", arg={'id': card_id, 'index': index})


def attack(page):
    page.locator('#btn-next-phase').click()
    wait_idle(page, 'battle')
    page.locator('.player-m-zone[data-index="0"]').click()
    page.locator('.opponent-m-zone[data-index="0"]').click()
    wait_idle(page, 'battle')


def own_hand(snapshot, card_id):
    return next(card for card in snapshot['hand'] if card['id'] == card_id)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://127.0.0.1:5174')
    parser.add_argument('--output-dir', default='docs/audits/artifacts')
    parser.add_argument('--cases', help='Comma-separated scenario keys for a focused diagnostic run')
    parser.add_argument('--check-activation-controls', action='store_true',
                        help='Require disabled activation controls and exercise legal Field Sets')
    parser.add_argument('--check-free-pendulum-scale', action='store_true',
                        help='Play Stargazer through the UI without Tribute materials in the Ocean scenario')
    parser.add_argument('--report-name', default=f'terrain-rules-browser-{DATE}.json')
    args = parser.parse_args()
    selected = set(args.cases.split(',')) if args.cases else None
    cases = [(key, field) for key, field in CASES if selected is None or key in selected]
    if not cases:
        parser.error('No matching scenario')
    if Path(args.report_name).name != args.report_name:
        parser.error('--report-name must be a filename')
    output = Path(args.output_dir); output.mkdir(parents=True, exist_ok=True)
    report = {'date': DATE, 'startedAt': datetime.now(timezone.utc).isoformat(),
              'baseUrl': args.base_url, 'runtime': 'Chromium / SwiftShader',
              'fixtureMethod': 'DEV QA initial CardState positions only',
              'activationControlsRequired': args.check_activation_controls,
              'freePendulumScaleRequired': args.check_free_pendulum_scale,
              'actions': 'Original UI buttons, zones, choices, callbacks, delays and Chains',
              'cases': [], 'captures': [], 'pageErrors': [], 'consoleErrors': [], 'failedRequests': []}
    page = None
    browser = None
    driver = None
    try:
        driver = sync_playwright().start()
        browser = driver.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=[
            '--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
        page.set_default_timeout(20000)
        page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))
        page.on('console', lambda message: report['consoleErrors'].append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: report['failedRequests'].append({'url': request.url, 'failure': request.failure}))
        report['openingAttempts'] = start_player_duel(page, args.base_url)
        real_view(page)
        page.evaluate(OBSERVE_JS)
        for key, field_id in cases:
            print(json.dumps({'scenario': key, 'stage': 'starting'}), flush=True)
            started = time.monotonic()
            record = {'scenario': key, 'fieldId': field_id}
            report['cases'].append(record)
            page.set_viewport_size({'width': 1440, 'height': 1100})
            record['initial'] = page.evaluate(PREPARE_JS, {'key': key, 'fieldId': field_id,
                                                         'controls': args.check_activation_controls,
                                                         'freeScale': args.check_free_pendulum_scale})
            real_view(page)
            if key == 'ocean' and args.check_free_pendulum_scale:
                assert '94415058' not in record['initial']['initialNormalSummonIds']
                pendulum = page.locator('#player-hand .card-entity[data-id="94415058"]')
                assert pendulum.get_attribute('aria-disabled') == 'false'
                record['pendulumBeforeActivation'] = page.evaluate(SNAPSHOT_JS)
                assert not any(record['pendulumBeforeActivation']['playerMonsters'])
                hand_action(page, '94415058', '.player-s-zone[data-index="0"]', 'ACTIVER L’ÉCHELLE 1')
                wait_idle(page)
                page.wait_for_function("()=>{const s=window.__YGO_QA__.getGame().playerSpells[0];return String(s?.id)==='94415058'&&s.isPendulumScale===true}")
                record['freePendulumScaleResolved'] = page.evaluate("()=>{const g=window.__YGO_QA__.getGame();const s=g.playerSpells[0];return {id:String(s.id),faceUp:!s.isSetFaceDown,location:s.location,isPendulumScale:s.isPendulumScale,normalSummonAllowanceUsed:g.summons.normalSummonAllowance.used}}")
                assert record['freePendulumScaleResolved']['normalSummonAllowanceUsed'] == 0
            activate_field(page, field_id)
            record['activated'] = page.evaluate(SNAPSHOT_JS)
            assert record['activated']['canvasCount'] == 1
            assert record['activated']['activeBackdrop']['fit'] == 'contain'
            assert record['activated']['activeBackdrop']['filter'] == 'none'
            assert '/field-art/' + field_id + '.jpg' in record['activated']['activeBackdrop']['image']

            summon_ids = {'ocean': '43793530', 'saber-vault': '23115241', 'jurassic': '81823360',
                          'acidic-downpour': '48305365', 'sorcerous-wall': '91152256', 'zombie-world': '66602787'}
            if key in summon_ids:
                if key == 'ocean':
                    assert own_hand(record['activated'], '43793530')['level'] == 4
                    assert '43793530' not in record['initial']['initialNormalSummonIds']
                    assert own_hand(record['activated'], '43793530')['uid'] in record['activated']['normalSummonCardUids']
                if key == 'zombie-world':
                    assert '89631139' in record['initial']['initialNormalSummonIds']
                    dragon = own_hand(record['activated'], '89631139')
                    assert dragon['race'] == 'Dragon' and dragon['uid'] not in record['activated']['normalSummonCardUids']
                    assert own_hand(record['activated'], '66602787')['uid'] in record['activated']['normalSummonCardUids']
                    assert page.locator('#player-hand .card-entity[data-id="89631139"]').get_attribute('aria-disabled') == 'true'
                summon(page, summon_ids[key])
            before = page.evaluate(SNAPSHOT_JS); record['afterSummonOrActivation'] = before
            if key == 'ocean':
                assert (before['playerMonsters'][0]['atk'], before['playerMonsters'][0]['def'], before['playerMonsters'][0]['level']) == (2650, 1700, 4)
                assert (before['opponentMonsters'][0]['atk'], before['opponentMonsters'][0]['def'], before['opponentMonsters'][0]['level']) == (2200, 200, 3)
                assert next(event for event in page.evaluate('window.__terrainAudit.events') if event['type'] == 'summon')['tributeCount'] == 0
                path = output / f'terrain-rules-ocean-desktop-{DATE}.png'
                page.screenshot(path=str(path), full_page=True); report['captures'].append(path.name)
            elif key == 'saber-vault':
                for side in ['player', 'opponent']:
                    assert (before[side+'Monsters'][0]['atk'], before[side+'Monsters'][0]['def']) == (2200, 700)
            elif key == 'jurassic':
                for side in ['player', 'opponent']:
                    assert (before[side+'Monsters'][0]['atk'], before[side+'Monsters'][0]['def']) == (2300, 300)
            elif key == 'acidic-downpour':
                assert (before['playerMonsters'][0]['atk'], before['playerMonsters'][0]['def']) == (1200, 1550)
                assert (before['opponentMonsters'][0]['atk'], before['opponentMonsters'][0]['def']) == (900, 1600)
            elif key == 'sorcerous-wall':
                assert (before['playerMonsters'][0]['atk'], before['playerMonsters'][0]['def']) == (1700, 1200)
                assert (before['opponentMonsters'][0]['atk'], before['opponentMonsters'][0]['def']) == (1400, 1200)
                page.locator('#btn-end-turn').click()
                page.wait_for_function("()=>window.__terrainAudit.turnSamples.some(s=>s.atk===1400&&s.def===1500)", timeout=25000)
                record['opponentTurnSamples'] = page.evaluate('window.__terrainAudit.turnSamples')
            elif key == 'zombie-world':
                assert all(card is None or card['race'] == 'Zombie' for side in ['player','opponent'] for card in before[side+'Monsters'])
                assert all(card['race'] == 'Zombie' for side in ['player','opponent'] for card in before[side+'Graveyard'])
                assert len([card for card in before['playerMonsters'] if card]) == 3
            elif key == 'secret-village':
                assert own_hand(before, '22702055')['canActivate'] is True
                record['opponentSpellPermitted'] = page.evaluate("async()=>{const {CardState}=await import('/src/core/CardState.js');const {STARTER_CARDS}=await import('/src/cards.js');return window.__YGO_QA__.getGame().canActivateSpell(new CardState(STARTER_CARDS.find(c=>c.id==='22702055')),'opponent')}")
                assert record['opponentSpellPermitted'] is False
                hand_action(page, '14087893', '.player-s-zone[data-index="0"]', 'ACTIVER FACE RECTO')
                page.locator('#decision-options').get_by_role('button', name=re.compile('Saggi', re.I)).click()
                wait_idle(page)
                record['withoutOwnSpellcaster'] = page.evaluate(SNAPSHOT_JS)
                assert record['withoutOwnSpellcaster']['playerMonsters'][0]['faceUp'] is False
                assert own_hand(record['withoutOwnSpellcaster'], '22702055')['canActivate'] is False
                record['rejectionControl'] = reject_field_activation(page, '22702055')
                record['rejectedSpellActivation'] = page.evaluate(SNAPSHOT_JS)
                assert record['rejectedSpellActivation']['field']['id'] == field_id
                assert own_hand(record['rejectedSpellActivation'], '22702055')
                if args.check_activation_controls:
                    assert record['rejectionControl']['activationControlDisabled']
                    assert record['rejectionControl']['setControlEnabled']
                    record['restrictedControlsAndLegalSet'] = check_restricted_pendulum_and_set(page)
            elif key == 'village-with-zombie':
                assert before['playerMonsters'][0]['race'] == 'Zombie'
                assert own_hand(before, '22702055')['canActivate'] is False
                record['rejectionControl'] = reject_field_activation(page, '22702055')
                assert page.evaluate(SNAPSHOT_JS)['field']['id'] == field_id
                if args.check_activation_controls:
                    assert record['rejectionControl']['activationControlDisabled']
                    assert record['rejectionControl']['setControlEnabled']
                    record['restrictedControlsAndLegalSet'] = check_restricted_pendulum_and_set(page)
            elif key == 'closed-forest':
                assert before['playerMonsters'][0]['atk'] == 1700
                assert before['opponentMonsters'][0]['atk'] == 1500
                assert own_hand(before, '22702055')['canActivate'] is False
                record['whileActiveRejectionControl'] = reject_field_activation(page, '22702055')
                assert page.evaluate(SNAPSHOT_JS)['field']['id'] == field_id
                page.locator('.player-m-zone[data-index="1"]').click()
                page.locator('#decision-options').get_by_role('button', name=re.compile('ACTIVER L.EFFET')).click()
                # Removing a Spell Counter is an activation cost. Choose
                # its source in the real dialog before choosing a target.
                page.locator('#decision-options').get_by_role('button', name=re.compile('Magicien des Arcanes')).click()
                page.locator('#decision-options').get_by_role('button', name=re.compile('Forêt Interdite')).click()
                wait_idle(page)
                record['afterEffectDestruction'] = page.evaluate(SNAPSHOT_JS)
                assert record['afterEffectDestruction']['field'] is None
                assert record['afterEffectDestruction']['closedForestTurnLocked'] is True
                assert record['afterEffectDestruction']['playerMonsters'][0]['atk'] == 1500
                assert own_hand(record['afterEffectDestruction'], '22702055')['canActivate'] is False
                record['afterDestructionRejectionControl'] = reject_field_activation(page, '22702055')
                assert page.evaluate(SNAPSHOT_JS)['field'] is None
                if args.check_activation_controls:
                    for name in ['whileActiveRejectionControl', 'afterDestructionRejectionControl']:
                        assert record[name]['activationControlDisabled']
                        assert record[name]['setControlEnabled']
                    hand_action(page, '22702055', '#player-field-zone', 'POSER FACE CACHÉE')
                    wait_idle(page)
                    record['legalSetDespiteTurnRestriction'] = page.evaluate(SNAPSHOT_JS)
                    assert record['legalSetDespiteTurnRestriction']['field'] == {'faceUp': False}
                    assert record['legalSetDespiteTurnRestriction']['closedForestTurnLocked']
                    page.locator('#player-field-zone').click()
                    record['restrictedSetActivationMenuShown'] = page.locator('#decision-modal').is_visible()
                    assert not record['restrictedSetActivationMenuShown']
                    assert page.evaluate(SNAPSHOT_JS)['field'] == {'faceUp': False}
            else:
                attack(page)
                after = page.evaluate(SNAPSHOT_JS); record['afterAttack'] = after
                if key == 'temple':
                    assert after['opponentLP'] == 7000 and after['playerLP'] == 8000
                    assert any(card['id'] == '91152256' for card in after['opponentGraveyard'])
                elif key == 'canyon':
                    assert after['playerLP'] == 7400 and after['opponentLP'] == 8000
                    assert after['opponentMonsters'][0]['id'] == '13039848'
                    page.set_viewport_size({'width': 390, 'height': 844})
                    page.wait_for_timeout(300)
                    mobile = page.evaluate(SNAPSHOT_JS); record['mobile'] = mobile
                    for property in ['generation','playerLP','opponentLP','playerMonsters','opponentMonsters','field']:
                        assert mobile[property] == after[property], property
                    assert mobile['sameGame'] and mobile['canvasCount'] == 1 and mobile['bodyWidth'] == 390
                    path = output / f'terrain-rules-canyon-mobile-{DATE}.png'
                    page.screenshot(path=str(path), full_page=False); report['captures'].append(path.name)
                elif key == 'shien':
                    assert after['playerLP'] == 7200 and after['playerMonsters'][0]['atk'] == 1700
                    assert after['opponentMonsters'][0]['id'] == '44430454'
                elif key == 'dark-city':
                    assert after['playerLP'] == 7900 and after['playerMonsters'][0] is None
                    assert not any(event['type'] == 'dark-city-boost-cinematic' for event in page.evaluate('window.__terrainAudit.events'))
                    record['positiveArchetypeCase'] = 'No Destiny HERO exists in the current supported pool; positive case covered by combat-field-spell-rules.test.js, not this UI fixture.'
                elif key == 'temple-with-canyon':
                    assert after['playerLP'] == 7000 and after['opponentLP'] == 8000
            record['events'] = page.evaluate('window.__terrainAudit.events')
            record['visuals'] = page.evaluate('window.__terrainAudit.visuals')
            effect_checks = {
                'temple': [('temple-minds-eye-cinematic', 'temple-minds-eye', {'originalDamage': 300, 'modifiedDamage': 1000})],
                'canyon': [('canyon-damage-cinematic', 'canyon-damage', {'originalDamage': 300, 'modifiedDamage': 600})],
                'shien': [('shien-mist-reduction-cinematic', 'shien-mist-reduction', {'reduction': 500, 'calculatedAtk': 1200})],
                'temple-with-canyon': [
                    ('canyon-damage-cinematic', 'canyon-damage', {'originalDamage': 300, 'modifiedDamage': 600}),
                    ('temple-minds-eye-cinematic', 'temple-minds-eye', {'originalDamage': 600, 'modifiedDamage': 1000})]
            }
            for event_type, profile, expected in effect_checks.get(key, []):
                emitted = [event for event in record['events'] if event['type'] == event_type]
                assert len(emitted) == 1, (key, event_type, 'One cinematic per rule change', emitted)
                event = emitted[0]
                assert event['damageStep'] == 'calc'
                for property, value in expected.items():
                    assert event[property] == value, (key, property, event)
                rendered = [event for event in record['visuals'] if event['profile'] == profile]
                assert len(rendered) == 1, (key, profile, 'One real visual per rule change', rendered)
                visual = rendered[0]
                assert visual['played'] is True
                kind, value = {'temple-minds-eye': ('damage-fixed', 1000),
                               'canyon-damage': ('damage-double', 2),
                               'shien-mist-reduction': ('atk-decrease', 500)}[profile]
                assert visual['ruleChange']['kind'] == kind and visual['ruleChange']['value'] == value
                assert visual['ruleChange']['sourceCount'] == 1
                for property, value in expected.items():
                    if property != 'reduction':
                        assert visual['ruleChange'][property] == value
                assert visual['sourceRef'] == {'owner': 'opponent' if key == 'temple-with-canyon' and profile == 'canyon-damage' else 'player',
                                               'zoneType': 'field', 'zoneIndex': 0}
                assert visual['targetRef'] == {'owner': 'player' if key != 'temple' else 'opponent', 'zoneType': 'main', 'zoneIndex': 0}
            record['elapsedSeconds'] = round(time.monotonic() - started, 3)
            record['passed'] = True
            print(json.dumps({'scenario': key, 'passed': True}), flush=True)
        assert not report['pageErrors'], report['pageErrors']
        assert not report['consoleErrors'], report['consoleErrors']
        assert not report['failedRequests'], report['failedRequests']
        report['implementedFieldIdsExercised'] = sorted({field for _, field in cases})
        report['finishedAt'] = datetime.now(timezone.utc).isoformat()
        report['passed'] = True
        (output/f'terrain-rules-failure-{DATE}.png').unlink(missing_ok=True)
    except Exception as error:
        report['passed'] = False; report['failure'] = str(error)
        if page:
            try:
                report['failureContext'] = {
                    'state': page.evaluate(SNAPSHOT_JS),
                    'decisionOptions': page.locator('#decision-options button').all_text_contents()
                }
                page.screenshot(path=str(output/f'terrain-rules-failure-{DATE}.png'), full_page=True)
            except Exception:
                pass
        raise
    finally:
        if browser:
            browser.close()
        if driver:
            driver.stop()
        (output/args.report_name).write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')


if __name__ == '__main__':
    main()
