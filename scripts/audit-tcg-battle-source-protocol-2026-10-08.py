"""Reproduce the small protocol excerpts from the unmodified pinned core archive."""
from pathlib import Path
import datetime
import hashlib
import json
import tarfile

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / 'public/native/sources/ygopro-core-38d04c9f.tar.gz'
EXPECTED = 'eb2e32d213c58f23cb9efc3297abfce632d94dca40e4f388e0bb73fff26abc84'
raw = ARCHIVE.read_bytes()
assert hashlib.sha256(raw).hexdigest() == EXPECTED
references = []
ranges = {
    'processor.cpp': [
        (520, 560, 'Native six-card End Phase limit'),
        (1457, 1475, 'First-turn Battle Phase restriction'),
        (2098, 2143, 'Attack counted once; each replay target emits MSG_ATTACK'),
        (2167, 2228, 'Optional/forced replay and SELECT_YESNO description 30'),
        (2933, 2982, 'Attack/defense equality and zero ATK calculation'),
        (3379, 3391, 'First player mandatory Draw Phase exception'),
        (4372, 4432, 'LP/deck-out/effect victory and draw')],
    'card.cpp': [(3743, 3786, 'Native attack/position restrictions')]
}
with tarfile.open(ARCHIVE) as archive:
    for suffix, groups in ranges.items():
        member = next(member for member in archive.getmembers() if member.name.endswith('/' + suffix))
        source = archive.extractfile(member).read()
        lines = source.decode().splitlines()
        for first, last, purpose in groups:
            excerpt = '\n'.join(lines[first - 1:last]) + '\n'
            references.append({
                'sourceMember': member.name,
                'sourceSha256': hashlib.sha256(source).hexdigest(),
                'firstLine': first, 'lastLine': last, 'purpose': purpose,
                'excerptSha256': hashlib.sha256(excerpt.encode()).hexdigest(),
                'excerpt': excerpt
            })
report = {
    'format': 'tcg-battle-core-protocol-v1',
    'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'coreRevision': '38d04c9feb1a26617407091380634c87262fe3f8',
    'archivePath': str(ARCHIVE.relative_to(ROOT)), 'archiveSha256': EXPECTED,
    'coreSourceModified': False,
    'excerptPurpose': 'Protocol provenance; outcomes separately execute the pinned WASM',
    'references': references
}
target = ROOT / 'docs/audits/artifacts/tcg-battle-core-protocol-2026-10-08.json'
target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'ok': True, 'references': len(references), 'output': str(target)}))
