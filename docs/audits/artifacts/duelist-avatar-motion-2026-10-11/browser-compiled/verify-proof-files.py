#!/usr/bin/env python3
"""Independent file verification of the completed compiled browser audit."""
from pathlib import Path
import hashlib
import json

ROOT=Path('/workspace/yugioh-25d-holograms')
ORIGINAL=Path('/workspace/yugioh-avatar-motion-final-2026-10-11')
DESTINATION=ROOT/'docs/audits/artifacts/duelist-avatar-motion-2026-10-11/browser-compiled'
FREEZE=Path('/workspace/yugioh-avatar-build-freeze-2026-10-11.json')
LOG=Path('/workspace/yugioh-avatar-motion-final-2026-10-11-logs.txt')
EXPECTED_DRIVER='5f9f5dd25cbb51edaadbed3ea965091dadc1ed2073309fde043f4b62a417c49c'
EXPECTED_FREEZE='ac66a4463fc67f5590662b835318d0e8f34efc0b8871c539c7a66445b8921e92'
EXPECTED_ENTRY='3e73212c9b5dd12c7a3dc62746bc66e552bddaf908c208fed65f07178d1de57c'

def pin(path):
    return {'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

report=json.loads((ORIGINAL/'report.json').read_text())
freeze=json.loads(FREEZE.read_text())
assert report['ok'] is True and report['phase']=='compiled'
assert len(report['paths'])==8 and all(path['ok'] for path in report['paths'])
assert report['driver']==report['driverAfter']
assert report['driver']['sha256']==EXPECTED_DRIVER
assert pin(ROOT/'scripts/audit-duelist-avatar-motion-browser.py')=={key:report['driver'][key] for key in ('bytes','sha256')}
assert pin(FREEZE)['sha256']==EXPECTED_FREEZE==report['rootFreeze']['sha256']
assert report['expectedEntrySha256']==EXPECTED_ENTRY
assert report['driverDependenciesBefore']==report['driverDependenciesAfter']
for name,expected in report['driverDependenciesBefore'].items():assert pin(ROOT/name)==expected
assert len(freeze['source'])==161
assert report['allFrozenSourcesBefore']==report['allFrozenSourcesAfter']==freeze['source']
for name,expected in freeze['source'].items():assert pin(ROOT/name)==expected
assert len(report['compiledAssets'])==21
assert report['compiledAssets']==report['servedBefore']==report['servedAfter']
for name,expected in report['compiledAssets'].items():assert pin(ROOT/'dist'/name)==expected
assert {name:report['compiledAssets'][name] for name in freeze['compiled']}==freeze['compiled']
assert {name:report['compiledAssets'][name] for name in freeze['additionalStaticAssets']}==freeze['additionalStaticAssets']
assert report['allRootFrozenSourcesUnchanged'] and report['frozenCompiledAssetsUnchanged']
desktop,mobile=report['paths'][:2]
assert desktop['width']==1280 and mobile['width']==390
assert len(desktop['all192RenderedInOneStudioCanvas'])==len(set(desktop['all192RenderedInOneStudioCanvas']))==192
assert len(desktop['all192DrawingEvidence']['observedAvatarIds'])==192
assert desktop['all192DrawingEvidence']['originalPreferenceRestored']
assert set(desktop['all192DrawingEvidence']['observedAvatarIds'])==set(desktop['all192RenderedInOneStudioCanvas'])
assert {'summon','casting','attack','damage'}<=set(desktop['observedGestureKinds'])
for path in report['paths']:
    for key in ('unexpectedBrowserConsoleErrors','pageErrors','nativeRequestFailures','cspViolations','httpErrors'):assert not path.get(key),(path.get('kind'),key)
    if path.get('kind')!='genuine-browser-webgl-unavailable':assert not path['browserConsoleErrors']
fallback=report['paths'][-1]
assert fallback['browserCapabilityFixture']['chromiumFlags']==['--disable-webgl','--disable-3d-apis']
assert len(fallback['expectedWebglCapabilityConsoleErrors'])==len(fallback['browserConsoleErrors'])==3
assert fallback['noWebglFallback']['portraitVisible'] and fallback['noWebglFallback']['lockedStillRefused']
for width in (1280,390):
    assert (ORIGINAL/f'avatar-studio-reduced-static-a-{width}.png').read_bytes()==(ORIGINAL/f'avatar-studio-reduced-static-b-{width}.png').read_bytes()
for name,expected in report['captures'].items():assert pin(ORIGINAL/name)==expected
assert not any('failure' in path.name for path in ORIGINAL.iterdir())
files={path.name:pin(path) for path in sorted(ORIGINAL.iterdir()) if path.is_file()}
files['logs.txt']=pin(LOG)
assert set(files)<=set(path.name for path in DESTINATION.iterdir())
for name,expected in files.items():assert pin(DESTINATION/name)==expected,name
result={'ok':True,'date':'2026-10-11','scope':'Independent digest verification after completed compiled browser run; no application, browser, build, original proof, or source changes.',
    'report':pin(ORIGINAL/'report.json'),'rootFreeze':pin(FREEZE),'driver':report['driver'],
    'sourceFiles':161,'httpBodiesBeforeAndAfter':21,'paths':8,'actualStudioModels':192,'captures':len(report['captures']),
    'expectedDisabledWebglDiagnostics':3,'unexpectedErrors':0,
    'allCopiesPreserveOriginalBytes':True,'originalDirectory':str(ORIGINAL),'repositoryDirectory':str(DESTINATION),'files':files}
out=Path('/workspace/yugioh-avatar-motion-final-verification-2026-10-11.json')
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({key:value for key,value in result.items() if key!='files'},ensure_ascii=False,indent=2))
