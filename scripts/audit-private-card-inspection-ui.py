#!/usr/bin/env python3
"""Isolated production-panel browser proof using six genuine WASM descriptors.

This imports the actual panel and factual printed catalogue. It does not create
a duel, inject an identity into the application or claim a complete game flow.
"""
import hashlib
import json
import mimetypes
import re
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs/audits/artifacts/private-card-inspection-ui-2026-10-08'
TRACE = ROOT / 'docs/audits/artifacts/native-confirmation-privacy-2026-10-08.json'
FILES = ['main.js', 'style.css', 'src/ui/PrivateCardInspection.js',
         'src/core/native/NativeDuelVisualEvents.js', 'src/core/native/NativeCardCatalogue.js',
         'src/core/native/NativeCardData.js', 'src/core/native/NativeScriptArchive.js',
         'src/core/native/NativeCardScriptCorrections.js', 'src/core/native/NativeSourceIntegrity.js',
         'src/core/native/NativeCardRegistry.js', 'src/core/native/NativeCardReferenceArt.js', 'src/cards.js',
         'public/native/card-data.json', 'public/native/scripts.json', 'public/native/manifest.json',
         'public/native/field-banlists.json']
HTML = '''<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/style.css"><title>Inspection privée — audit du panneau réel</title>
<style>body{min-height:100vh}.audit-public-surface{padding:24px;max-width:600px;font:16px Inter, sans-serif;color:#eaf1ff}.audit-public-surface h1{font-size:22px}.audit-public-surface p{margin-top:15px}</style>
<main class="audit-public-surface"><h1>La partie continue</h1><p>Inspection locale nonmodale, sans modification des zones publiques.</p><p id="public-log">Journal public : aucune carte inspectée.</p></main>
<script type="module">
import {PrivateCardInspection} from '/src/ui/PrivateCardInspection.js';
import {loadNativeCardResources} from '/src/core/native/NativeCardData.js';
import {createNativeCardPresentationTemplate} from '/src/core/native/NativeCardCatalogue.js';
import {getCardImageUrl} from '/src/cards.js';
import {safeImageUrl} from '/src/security.js';
const trace=await (await fetch('/native-inspection-trace.json')).json();
const scenario=trace.cases.find(c=>c.id==='private-smartfon-defense-own-deck-controller-1');
if(scenario.status!=='passed')throw Error('The source native scenario did not pass');
const events=scenario.projections.find(p=>p.version==='after'&&p.playerController===1).events.filter(e=>e.type==='inspect');
if(events.length!==6)throw Error('Expected the genuine six-card confirmation');
const resources=await loadNativeCardResources(),game={playerController:1,winner:null,resources};
const panel=new PrivateCardInspection({documentRef:document,
 cardDetails:(card,current)=>createNativeCardPresentationTemplate(current.resources,card.id),
 imageUrl:card=>safeImageUrl(card.image_url,getCardImageUrl(card.id))});
window.inspectionAudit={events,
 show(){for(const event of events)panel.handle(event,game);},
 replace(){panel.handle({...events[0],inspectionGroupId:'native-private-inspection-2'},game);},
 clear(){panel.clear();},
 reject(){let reads=0;panel.handle({...events[0],audienceController:0,get card(){reads++;throw Error('wrong audience identity read');}},game);return reads;},
 metrics(){const section=document.querySelector('.private-card-inspection');const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
 return{panelCount:document.querySelectorAll('.private-card-inspection').length,panel:section?rect(section):null,
 modal:section?.getAttribute('aria-modal')??null,role:section?.getAttribute('role')??null,
 title:section?.querySelector('h2')?.textContent??null,
 names:[...document.querySelectorAll('.private-card-inspection-card span')].map(e=>e.textContent),
 images:[...document.querySelectorAll('.private-card-inspection-card img')].map(e=>({alt:e.alt,url:e.getAttribute('src'),loaded:e.complete&&e.naturalWidth>0,hidden:e.hidden})),
 buttons:[...document.querySelectorAll('.private-card-inspection button')].map(e=>({label:e.getAttribute('aria-label'),...rect(e)})),
 selectedName:section?.querySelector('h3')?.textContent??null,
 privateStateCardCount:panel.cards.length,publicLog:document.getElementById('public-log').textContent,
 viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth}};}
};
document.documentElement.dataset.auditReady='true';
</script></html>'''


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fingerprint(path):
    data = path.read_bytes()
    return {'bytes': len(data), 'sha256': digest(data)}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        route = urlsplit(self.path).path
        if route in ('/', '/panel.html'):
            data, mime = HTML.encode(), 'text/html'
        elif route == '/native-inspection-trace.json':
            data, mime = TRACE.read_bytes(), 'application/json'
        elif route == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return
        else:
            path = (ROOT / route.lstrip('/')).resolve()
            public = (ROOT / 'public' / route.lstrip('/')).resolve()
            if ROOT not in path.parents:
                self.send_error(404)
                return
            if not path.is_file():
                path = public
            if not path.is_file() or ROOT not in path.parents:
                self.send_error(404)
                return
            data = path.read_bytes()
            mime = mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_):
        pass


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index = ROOT / 'dist/index.html'
    entry_url = re.search(r'<script\b[^>]*\bsrc="([^"]+)"', index.read_text()).group(1)
    entry_path = ROOT / 'dist' / entry_url.lstrip('/')
    tracked = FILES + ['dist/index.html', str(entry_path.relative_to(ROOT))]
    before = {name: fingerprint(ROOT / name) for name in tracked}
    report = {'auditDate': '2026-10-08', 'scope': 'isolated production nonmodal panel; six recorded official-WASM CONFIRM_CARDS descriptors; factual local CDB descriptions and images; no new duel or application game injection',
              'nativeCase': 'private-smartfon-defense-own-deck-controller-1',
              'nativeTrace': {'path': str(TRACE.relative_to(ROOT)), **fingerprint(TRACE)},
              'buildProvenance': {'index': {'path': 'dist/index.html', **fingerprint(index)},
                  'entry': {'url': entry_url, **fingerprint(entry_path)},
                  'note': 'Root final build frozen before this isolated source-module audit; the runner does not build or run an application duel.'},
              'dependencies': before, 'runner': fingerprint(Path(__file__)),
              'sizes': [], 'errors': [], 'externalRequests': []}
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
            for width, height in [(1280, 900), (390, 844)]:
                page = browser.new_page(viewport={'width': width, 'height': height})
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                page.on('request', lambda request: report['externalRequests'].append(request.url)
                        if not request.url.startswith(origin) else None)
                page.goto(origin + '/panel.html')
                page.wait_for_selector('html[data-audit-ready="true"]')
                assert page.evaluate('inspectionAudit.reject()') == 0
                assert page.evaluate('inspectionAudit.metrics().panelCount') == 0
                page.evaluate('inspectionAudit.show()')
                page.wait_for_function('[...document.querySelectorAll(".private-card-inspection-card img")].every(e=>e.complete&&e.naturalWidth>0)')
                metrics = page.evaluate('inspectionAudit.metrics()')
                assert metrics['panelCount'] == 1 and metrics['role'] == 'region' and metrics['modal'] is None
                assert metrics['title'] == 'Inspection privée' and len(metrics['names']) == 6
                assert len(metrics['images']) == 6 and all(image['loaded'] and not image['hidden'] for image in metrics['images'])
                assert metrics['viewport']['scrollWidth'] <= width
                rect = metrics['panel']
                assert rect['x'] >= 0 and rect['y'] >= 0 and rect['x'] + rect['width'] <= width and rect['y'] + rect['height'] <= height
                assert all(button['height'] >= 44 and button['width'] >= 44 for button in metrics['buttons'])
                assert not any(name in metrics['publicLog'] for name in metrics['names'])
                capture = OUT / f'private-inspection-six-cards-{width}.png'
                page.screenshot(path=str(capture))
                last = page.locator('.private-card-inspection-card').last
                last.focus()
                page.keyboard.press('Enter')
                selected = page.evaluate('inspectionAudit.metrics()')
                assert selected['selectedName'] == selected['names'][-1]
                page.locator('.private-card-inspection-details').scroll_into_view_if_needed()
                selected_capture = OUT / f'private-inspection-keyboard-details-{width}.png'
                page.screenshot(path=str(selected_capture))
                assert page.evaluate('inspectionAudit.reject()') == 0
                assert page.evaluate('inspectionAudit.metrics().privateStateCardCount') == 6
                page.evaluate('inspectionAudit.replace()')
                assert page.evaluate('inspectionAudit.metrics().privateStateCardCount') == 1
                assert page.locator('.private-card-inspection').count() == 1
                page.get_by_role('button', name='Fermer l’inspection privée').click()
                assert page.locator('.private-card-inspection').count() == 0
                assert page.evaluate('inspectionAudit.metrics().privateStateCardCount') == 0
                page.evaluate('inspectionAudit.show()')
                page.locator('.private-card-inspection-card').first.focus()
                page.keyboard.press('Escape')
                assert page.locator('.private-card-inspection').count() == 0
                page.evaluate('inspectionAudit.show();inspectionAudit.clear()')
                assert page.evaluate('inspectionAudit.metrics().panelCount') == 0
                report['sizes'].append({'width': width, 'height': height, 'grouped': metrics,
                    'keyboardDetails': selected, 'recipientRejectedWithoutIdentityRead': True,
                    'differentGroupReplaced': True, 'closeEscapeAndLifecycleClearPassed': True,
                    'illustrationsAvailable': sum('native-unknown.png' not in image['url'] for image in metrics['images']),
                    'printedOnlyPlaceholders': sum('native-unknown.png' in image['url'] for image in metrics['images']),
                    'captures': [{'path': str(path.relative_to(ROOT)), **fingerprint(path)} for path in [capture, selected_capture]]})
                page.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    assets = sorted({urlsplit(image['url']).path for size in report['sizes'] for image in size['grouped']['images']})
    report['localArtwork'] = [{'assetPath': asset, **fingerprint(ROOT / 'public' / asset.lstrip('/'))} for asset in assets]
    report['dependenciesUnchangedDuringCapture'] = before == {name: fingerprint(ROOT / name) for name in tracked}
    report['ok'] = len(report['sizes']) == 2 and not report['errors'] and not report['externalRequests'] and report['dependenciesUnchangedDuringCapture']
    (OUT / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    assert report['ok']
    print(json.dumps({'ok': report['ok'], 'sizes': len(report['sizes']), 'captures': 4, 'nativeCards': 6}))


if __name__ == '__main__':
    main()
