#!/usr/bin/env python3
"""Archive missing canonical Field Spell card frames, with bounded HTTPS requests.

Requires Pillow for decoding validation. Existing local images are never replaced.
HTTP uses the inherited proxy and verified TLS; downloaded JPEG bytes are unchanged.
"""
import concurrent.futures
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import urllib.request

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public/cards/small"
AUDIT = ROOT / "docs/audits/artifacts/native-field-small-assets-2026-10-07.json"
FIELDS = json.loads(subprocess.check_output([
    "node", "--input-type=module", "-e",
    "import {FIELD_SPELL_ENVIRONMENT_CATALOG as c} from './src/ui/FieldSpellEnvironmentCatalog.js'; console.log(JSON.stringify(c));"
], cwd=ROOT))


def validate(raw):
    if not raw.startswith(b"\xff\xd8") or not raw.endswith(b"\xff\xd9"):
        raise ValueError("Response is not a complete JPEG")
    image = Image.open(io.BytesIO(raw))
    image.verify()
    image = Image.open(io.BytesIO(raw))
    image.load()
    if image.format != "JPEG" or image.width < 150 or image.height < 200 or image.width >= image.height:
        raise ValueError(f"Unexpected card frame dimensions/format: {image.format} {image.size}")
    return image.size


def archive(field, previous):
    code = field["cardId"]
    target = ASSETS / f"{code}.jpg"
    source = f"https://images.ygoprodeck.com/images/cards_small/{code}.jpg"
    downloaded, status, content_type = False, None, None
    if target.exists():
        raw = target.read_bytes()
    else:
        request = urllib.request.Request(source, headers={"User-Agent": "yugioh-local-resource-audit/1.0"})
        with urllib.request.urlopen(request, timeout=40) as response:
            status = response.status
            if status != 200:
                raise ValueError(f"{code}: HTTP {status}")
            if response.url != source:
                raise ValueError(f"{code}: Unexpected redirect to {response.url}")
            content_type = response.headers.get_content_type()
            if content_type != "image/jpeg":
                raise ValueError(f"{code}: Unexpected Content-Type {content_type}")
            raw = response.read()
        validate(raw)
        with tempfile.NamedTemporaryFile(dir=ASSETS, prefix=f".{code}.", suffix=".tmp", delete=False) as temporary:
            temporary.write(raw)
            temporary_path = Path(temporary.name)
        try:
            os.replace(temporary_path, target)
        finally:
            temporary_path.unlink(missing_ok=True)
        downloaded = True
    width, height = validate(raw)
    sha = hashlib.sha256(raw).hexdigest()
    prior = previous.get(code)
    if not downloaded and prior and prior["sha256"] == sha:
        return prior
    return {
        "cardId": code, "name": field["name"], "assetPath": f"/cards/small/{code}.jpg",
        "sourceUrl": source, "sha256": sha, "bytes": len(raw), "width": width, "height": height,
        "freshDownload": downloaded, "httpStatus": status, "contentType": content_type,
        "downloadedBytesPreserved": downloaded,
        "evidence": "Fresh HTTP 200 response; original bytes saved atomically" if downloaded else
                    "Existing local JPEG validated; no fresh source comparison during this run"
    }


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    previous = {row["cardId"]: row for row in json.loads(AUDIT.read_text())["entries"]} if AUDIT.exists() else {}
    entries, failures = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(archive, field, previous): field for field in FIELDS}
        for future in concurrent.futures.as_completed(futures):
            field = futures[future]
            try:
                entries.append(future.result())
                if len(entries) % 25 == 0:
                    print(f"Validated {len(entries)}/{len(FIELDS)} card frames", flush=True)
            except Exception as error:
                failures.append({"cardId": field["cardId"], "name": field["name"], "error": str(error)})
                print(f"FAILED {field['cardId']}: {error}", flush=True)
    entries.sort(key=lambda row: int(row["cardId"]))
    output = {
        "retrievedOn": "2026-10-07", "scope": "Canonical local Field Spell small card-frame JPEGs",
        "source": "https://images.ygoprodeck.com/images/cards_small/<canonical-passcode>.jpg",
        "requestConcurrency": 4, "tlsVerification": True, "proxy": "Inherited session HTTPS proxy",
        "expectedCount": len(FIELDS), "validatedCount": len(entries),
        "freshDownloadCount": sum(row["freshDownload"] for row in entries),
        "existingLocalCount": sum(not row["freshDownload"] for row in entries),
        "totalBytes": sum(row["bytes"] for row in entries), "entries": entries, "failures": failures,
        "imageEditing": "None; source JPEG bytes retained; no crop, resize, filter or substitution",
        "provisionalIdentityHandling": "Only catalogue canonical passcodes appear in asset names and source URLs"
    }
    AUDIT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: output[key] for key in ["validatedCount", "freshDownloadCount", "existingLocalCount", "totalBytes"]}), flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
