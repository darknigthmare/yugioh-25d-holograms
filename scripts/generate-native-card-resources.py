#!/usr/bin/env python3
"""Export pinned, unmodified Project Ignis resources using Python's stdlib.

Usage: python3 scripts/generate-native-card-resources.py \
  --scripts-dir /path/to/CardScripts-37f270dc813a12d123707ae255f2bda7922999c4 \
  --database-dir /path/to/BabelCDB-fdf92aea31033cd6c44afa89987c5e00665205e2

This archives resources. It does not register cards as playable or prove effects.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import sqlite3
import subprocess

SCRIPTS_COMMIT = "37f270dc813a12d123707ae255f2bda7922999c4"
DATABASE_COMMIT = "fdf92aea31033cd6c44afa89987c5e00665205e2"
ROOT = Path(__file__).resolve().parents[1]
# Explicit identity bindings; upstream still uses prerelease IDs for these names.
# Their source code, text, setcodes and Lua contents remain unchanged in the archive.
CANONICAL_BINDINGS = {
    12845564: 101402095,
    46273941: 100458006,
    88288421: 100459016,
    33700664: 100458039,
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def dump(path, payload):
    encoded = (json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n").encode()
    path.write_bytes(encoded)
    return {"path": "/native/" + path.name, "sha256": digest(encoded), "bytes": len(encoded)}


def requested_cards():
    code = """
import {FIELD_SPELL_ENVIRONMENT_CATALOG as fields, FIELD_SPELL_CATALOGUE_ADDITIONS as publications} from './src/ui/FieldSpellEnvironmentCatalog.js';
import {STARTER_CARDS, EXTRA_DECK_CARDS} from './src/cards.js';
console.log(JSON.stringify({fields, publications, strict:[...STARTER_CARDS,...EXTRA_DECK_CARDS].map(c=>Number(c.id))}));
"""
    return json.loads(subprocess.check_output(["node", "--input-type=module", "-e", code], cwd=ROOT))


def require_pinned_revision(path, repository, commit):
    # GitHub tarballs retain the commit in their root directory name. Check a
    # checkout's actual HEAD instead when the generator receives a git clone.
    if (path / ".git").exists():
        observed = subprocess.check_output(["git", "-C", str(path), "rev-parse", "HEAD"], text=True).strip()
        if observed != commit:
            raise ValueError(f"Unpinned {repository} checkout: {observed}")
    elif path.name != f"{repository}-{commit}":
        raise ValueError(f"Expected pinned {repository} tarball root {repository}-{commit}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scripts-dir", type=Path, required=True)
    parser.add_argument("--database-dir", type=Path, required=True)
    parser.add_argument("--retrieved-on", default="2026-10-07")
    args = parser.parse_args()
    require_pinned_revision(args.scripts_dir, "CardScripts", SCRIPTS_COMMIT)
    require_pinned_revision(args.database_dir, "BabelCDB", DATABASE_COMMIT)
    output = ROOT / "public/native"
    output.mkdir(parents=True, exist_ok=True)
    requested = requested_cards()
    script_paths = sorted(args.scripts_dir.glob("*.lua"))
    script_paths += sorted((args.scripts_dir / "official").glob("*.lua"))
    script_paths += sorted((args.scripts_dir / "pre-release").glob("*.lua"))
    # utility.lua loads this helper unconditionally, including in official duels.
    script_paths.append(args.scripts_dir / "unofficial/proc_unofficial.lua")
    scripts, script_sources = {}, {}
    for path in script_paths:
        raw = path.read_bytes()
        relative = path.relative_to(args.scripts_dir).as_posix()
        if path.name in scripts and scripts[path.name] != raw.decode("utf-8"):
            raise ValueError("Conflicting script filename: " + path.name)
        scripts[path.name] = raw.decode("utf-8")
        script_sources[path.name] = {"path": relative, "sha256": digest(raw), "bytes": len(raw)}
    # Check static helper dependencies, without claiming that this proves Lua execution.
    for name, source in scripts.items():
        for dependency in re.findall(r'Duel\.LoadScript\(["\']([^"\']+)["\']', source):
            if dependency not in scripts:
                raise ValueError(f"Missing Lua dependency {dependency} referenced by {name}")

    database_paths = [args.database_dir / "cards.cdb"]
    database_paths += sorted(args.database_dir.glob("release-*.cdb"))
    database_paths += [p for p in sorted(args.database_dir.glob("prerelease-*.cdb")) if "rush" not in p.name]
    rows, database_sources = {}, []
    for path in database_paths:
        raw = path.read_bytes()
        database_sources.append({"path": path.name, "sha256": digest(raw), "bytes": len(raw)})
        connection = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        connection.row_factory = sqlite3.Row
        for source in connection.execute("SELECT datas.*,texts.* FROM datas JOIN texts USING(id) ORDER BY datas.id"):
            row = [source["id"], source["ot"], source["alias"], str(source["setcode"]), source["type"],
                   source["atk"], source["def"], source["level"], str(source["race"]), source["attribute"],
                   source["category"], source["name"], source["desc"],
                   [source[f"str{i}"] for i in range(1, 17)], path.name]
            if row[0] in rows and rows[row[0]][:-1] != row[:-1]:
                raise ValueError("Conflicting CDB card: " + str(row[0]))
            rows[row[0]] = row
        connection.close()

    bindings = []
    for entry in requested["fields"]:
        canonical = int(entry["cardId"])
        source_code = CANONICAL_BINDINGS.get(canonical, canonical)
        if source_code not in rows or f"c{source_code}.lua" not in scripts:
            raise ValueError(f"Missing source data/script for {canonical}: {entry['name']}")
        if source_code != canonical:
            if rows[source_code][11] != entry["name"]:
                raise ValueError("Canonical binding name differs from upstream: " + str(canonical))
            bindings.append({"canonicalCode": canonical, "sourceCode": source_code, "name": entry["name"],
                             "sourceDatabase": rows[source_code][-1], "sourceScript": f"c{source_code}.lua",
                             "reason": "Upstream snapshot retains a prerelease ID; catalogue has a canonical passcode."})
    for code in requested["strict"]:
        if code not in rows:
            raise ValueError("Missing existing strict-pool card data: " + str(code))
        # Vanilla Normal Monsters legitimately have no Lua script.
        if rows[code][4] & 0x20 and f"c{code}.lua" not in scripts:
            raise ValueError("Missing existing strict-pool effect script: " + str(code))

    source_info = {
        "retrievedOn": args.retrieved_on,
        "scripts": {"repository": "https://github.com/ProjectIgnis/CardScripts", "commit": SCRIPTS_COMMIT,
                    "license": "AGPL-3.0-or-later", "copyright": "Project Ignis contributors; individual Lua author lines retained"},
        "database": {"repository": "https://github.com/ProjectIgnis/BabelCDB", "commit": DATABASE_COMMIT,
                     "license": "No license declaration found in the pinned upstream repository", "files": database_sources},
    }
    data = {"format": "project-ignis-cdb-v1", "source": source_info["database"],
            "columns": ["id", "ot", "alias", "setcode", "type", "atk", "def", "level", "race", "attribute",
                        "category", "name", "desc", "strings", "sourceDatabase"],
            "rows": [rows[code] for code in sorted(rows)], "canonicalBindings": bindings}
    archive = {"format": "project-ignis-lua-v1", "source": source_info["scripts"],
               "scripts": scripts, "files": script_sources}
    banlist_path = ROOT / "docs/audits/artifacts/field-banlists-2026-10-07.json"
    banlists = json.loads(banlist_path.read_text())
    if {int(entry["id"]) for entry in banlists["entries"]} != {int(entry["cardId"]) for entry in requested["fields"]}:
        raise ValueError("Field banlist identities do not match the canonical catalogue")
    manifest = {"format": "project-ignis-resource-manifest-v1", "sources": source_info,
                "cardCount": len(rows), "scriptCount": len(scripts),
                "officialScriptCount": sum(p.parent.name == "official" for p in script_paths),
                "prereleaseScriptCount": sum(p.parent.name == "pre-release" for p in script_paths),
                "helperScriptCount": sum(p.parent == args.scripts_dir or p.name == "proc_unofficial.lua" for p in script_paths),
                "fieldCardCount": len(requested["fields"]), "canonicalBindings": bindings,
                "existingStrictPoolCount": len(set(requested["strict"])),
                "coverageMeaning": "Archived CDB rows and Lua sources only; no gameplay proof or playable registration.",
                "artifacts": {"cards": dump(output / "card-data.json", data),
                              "scripts": dump(output / "scripts.json", archive),
                              "fieldBanlists": dump(output / "field-banlists.json", banlists)}}
    dump(output / "manifest.json", manifest)
    shutil.copyfile(args.scripts_dir / "COPYING", output / "COPYING.CardScripts.txt")
    shutil.copyfile(args.scripts_dir / "README.md", output / "CardScripts.README.md")
    shutil.copyfile(args.database_dir / "README.md", output / "BabelCDB.README.md")
    # A small static index supports deck editing before the large Lua/CDB archives
    # are fetched. Publication evidence is kept distinct from CDB source OT.
    api_path = ROOT / "docs/audits/artifacts/field-catalogue-api-2026-10-07.json"
    api_cards = {card["id"]: card for card in json.loads(api_path.read_text())["data"]}
    limits = {int(entry["id"]): entry for entry in banlists["entries"]}
    index = {}
    for field in requested["fields"]:
        canonical = int(field["cardId"])
        source_code = CANONICAL_BINDINGS.get(canonical, canonical)
        row = rows[source_code]
        misc = api_cards[canonical].get("misc_info", [{}])[0]
        script_name = f"c{source_code}.lua"
        index[str(canonical)] = {
            "scriptCode": source_code, "nativeOT": row[1], "nativeAlias": row[2], "nativeType": row[4],
            "scriptStatus": "prerelease" if script_sources[script_name]["path"].startswith("pre-release/") else "official",
            "sourceDatabase": row[-1], "sourceScript": script_sources[script_name]["path"],
            "formats": [f for f in misc.get("formats", []) if f in ["TCG", "OCG"]],
            "tcgReleaseDate": misc.get("tcg_date"), "ocgReleaseDate": misc.get("ocg_date"),
            "primaryPublication": requested["publications"].get(str(canonical)),
            "fieldRestriction": limits[canonical]
        }
    registry_data_path = ROOT / "src/core/native/NativeCardRegistryData.js"
    registry_data_path.write_text(
        "/** Generated factual field metadata; dates/formats are a frozen 2026-10-07 snapshot. */\n"
        "export const NATIVE_FIELD_METADATA_DATE = '2026-10-07';\n"
        "export const NATIVE_FIELD_METADATA_SOURCE = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Spell%20Card&race=Field&misc=yes';\n"
        "export const NATIVE_FIELD_METADATA_INDEX = " + json.dumps(index, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    print(json.dumps({key: manifest[key] for key in ["cardCount", "scriptCount", "officialScriptCount",
                                                   "prereleaseScriptCount", "helperScriptCount", "fieldCardCount",
                                                   "existingStrictPoolCount"]}))


if __name__ == "__main__":
    main()
