#!/usr/bin/env python3
"""Offline Lua API-name audit against the exact bundled core source archive.

This is a lexical audit, not a Lua type checker or a gameplay branch test.
Python 3 and the standard C preprocessor (`cpp`) are the only requirements.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
NAMESPACES = ('Duel', 'Card', 'Group', 'Effect')
BUILD = json.loads((ROOT / 'public/native/core-build.json').read_text())
CORE_ARCHIVE = ROOT / 'public' / BUILD['sources']['core']['path'].lstrip('/')
KNOWN_DEFECTS = {
    ('Duel.GetMasterRule', 'utility.lua'): 'Unused Auxiliary.MainAndExtraSpSummonLoop helper; no caller in the shipped Lua archive.',
    ('Group.NewGroup', 'c60921537.lua'): 'Upstream Dogmatikamacabre branch under Spirit Elimination; outside the Field Spell subset.'
}


def lua_tokens(source):
    """Preserve lines, discard comments; strings remain opaque literal tokens."""
    tokens = []
    index = 0
    line = 1
    while index < len(source):
        char = source[index]
        if char.isspace():
            line += char == '\n'
            index += 1
            continue
        comment = source.startswith('--', index)
        start = index + 2 if comment else index
        bracket = re.match(r'\[(=*)\[', source[start:])
        if bracket:
            ending = ']' + bracket[1] + ']'
            end = source.find(ending, start + len(bracket[0]))
            if end < 0:
                raise ValueError(f'Unterminated long Lua string/comment at line {line}')
            end += len(ending)
            if not comment:
                tokens.append(('string', source[start + len(bracket[0]):end - len(ending)], line))
            line += source[index:end].count('\n')
            index = end
            continue
        if comment:
            end = source.find('\n', index)
            index = len(source) if end < 0 else end
            continue
        if char in '\"\'':
            start = index
            index += 1
            while index < len(source):
                if source[index] == '\\':
                    index += 2
                elif source[index] == char:
                    index += 1
                    break
                else:
                    index += 1
            else:
                raise ValueError(f'Unterminated Lua quoted string at line {line}')
            tokens.append(('string', source[start + 1:index - 1], line))
            line += source[start:index].count('\n')
            continue
        identifier = re.match(r'[A-Za-z_][A-Za-z_0-9]*', source[index:])
        if identifier:
            tokens.append(('identifier', identifier[0], line))
            index += len(identifier[0])
        else:
            # Equality must remain distinct from assignment.
            operator = next((op for op in ('==', '~=', '<=', '>=', '::', '..') if source.startswith(op, index)), char)
            tokens.append(('symbol', operator, line))
            index += len(operator)
    return tokens


def registrations():
    result = {}
    sources = {}
    with tarfile.open(CORE_ARCHIVE) as archive:
        for namespace in NAMESPACES:
            member = next(m for m in archive.getmembers() if m.name.endswith(f'/lib{namespace.lower()}.cpp'))
            source = archive.extractfile(member).read().decode('utf-8')
            sources[namespace] = {'path': member.name, 'sha256': hashlib.sha256(source.encode()).hexdigest()}
            # Keep local macro definitions: cpp expands CARD_INFO_FUNC and
            # INFO_FUNC_FROM_CODE token-pasted names, without needing headers.
            source = re.sub(r'^\s*#\s*include[^\n]*', '', source, flags=re.M)
            expanded = subprocess.run(['cpp', '-P', '-x', 'c++', '-'], input=source,
                                      text=True, capture_output=True, check=True).stdout
            names = re.findall(r'\bLUA_(?:STATIC_FUNCTION|FUNCTION|FUNCTION_ALIAS)\s*\(\s*([A-Za-z_]\w*)\s*\)', expanded)
            names += re.findall(r'\bLUA_FUNCTION_EXISTING\s*\(\s*([A-Za-z_]\w*)\s*,', expanded)
            result[namespace] = sorted(set(names))
            if len(result[namespace]) < 30:
                raise ValueError(f'Suspiciously incomplete registration extraction: {namespace}')
    return result, sources


def inspect_lua(name, source):
    tokens = lua_tokens(source)
    definitions, references, loads, member_names = [], [], [], []
    for index, (kind, value, line) in enumerate(tokens):
        if value == ':' and index + 2 < len(tokens) and tokens[index + 1][0] == 'identifier' and tokens[index + 2][1] == '(':
            member_names.append({'name': tokens[index + 1][1], 'script': name, 'line': line})
        if kind != 'identifier' or value not in NAMESPACES or index + 2 >= len(tokens):
            continue
        separator, method = tokens[index + 1], tokens[index + 2]
        if separator[1] not in ('.', ':') or method[0] != 'identifier':
            continue
        previous = tokens[index - 1][1] if index else None
        following = tokens[index + 3][1] if index + 3 < len(tokens) else None
        item = {'api': value + '.' + method[1], 'script': name, 'line': line}
        if previous == 'function' or following == '=':
            item['kind'] = 'function-definition' if previous == 'function' else 'assignment'
            definitions.append(item)
        else:
            item['kind'] = 'call' if following == '(' else 'function-reference'
            references.append(item)
        if item['api'] == 'Duel.LoadScript' and following == '(' and index + 4 < len(tokens):
            argument = tokens[index + 4]
            if argument[0] == 'string' and re.fullmatch(r'[A-Za-z_0-9]+\.lua', argument[1]):
                loads.append(argument[1])
    return {'definitions': definitions, 'references': references,
            'literalScriptLoads': sorted(set(loads)), 'untypedMemberCalls': member_names}


def report():
    scripts_path = ROOT / 'public/native/scripts.json'
    scripts_payload = json.loads(scripts_path.read_text())
    scripts = scripts_payload['scripts']
    field_data = (ROOT / 'src/core/native/NativeCardRegistryData.js').read_text()
    fields = json.loads(re.search(r'export const NATIVE_FIELD_METADATA_INDEX = (\{.*\});', field_data, re.S).group(1))
    field_scripts = {f"c{metadata['scriptCode']}.lua" for metadata in fields.values()}
    helpers = {name for name in scripts if not re.fullmatch(r'c\d+\.lua', name)}
    core, source_files = registrations()
    core_names = {f'{namespace}.{method}' for namespace, methods in core.items() for method in methods}
    inspected = {name: inspect_lua(name, source) for name, source in scripts.items()}
    compatibility_path = ROOT / 'src/core/native/NativeLuaCompatibility.js'
    compatibility_source = re.search(r'NATIVE_LUA_COMPATIBILITY_SOURCE = `(.*?)`;', compatibility_path.read_text(), re.S).group(1)
    compatibility_name = 'native_compatibility.lua'
    inspected[compatibility_name] = inspect_lua(compatibility_name, compatibility_source)
    definitions = collections.defaultdict(list)
    for item in inspected.values():
        for definition in item['definitions']:
            definitions[definition['api']].append(definition)
    helper_names = {api for api, providers in definitions.items() if any(p['script'] in helpers | {compatibility_name} for p in providers)}
    compatibility_names = {api for api, providers in definitions.items() if any(p['script'] == compatibility_name for p in providers)}
    loaded = {'constant.lua', 'utility.lua'}
    pending = list(loaded)
    while pending:
        for name in inspected[pending.pop()]['literalScriptLoads']:
            if name in scripts and name not in loaded:
                loaded.add(name)
                pending.append(name)
    loaded_names = {api for api, providers in definitions.items() if any(p['script'] in loaded for p in providers)}

    def scope(names):
        references = [reference for name in sorted(names) for reference in inspected[name]['references']]
        unique = sorted({reference['api'] for reference in references})
        missing = [reference for reference in references if reference['api'] not in core_names and reference['api'] not in definitions]
        card_provided = {api: definitions[api] for api in unique if api not in core_names and api not in helper_names and api in definitions}
        return {'scriptCount': len(names), 'referenceCount': len(references), 'uniqueApis': unique,
                'coreProvidedCount': sum(api in core_names for api in unique),
                'helperProvidedCount': sum(api not in core_names and api in helper_names for api in unique),
                'cardScriptProvidedApis': card_provided, 'undefinedReferences': missing}

    # These are exact global names, not receiver-type guesses from c:Foo().
    result = {
        'date': '2026-10-07', 'coreRevision': source_files['Duel']['path'].split('/')[0].removeprefix('ygopro-core-'),
        'coreApi': [11, 0], 'coreArchiveSha256': hashlib.sha256(CORE_ARCHIVE.read_bytes()).hexdigest(),
        'scriptsRevision': scripts_payload['source']['commit'],
        'scriptsArchiveSha256': hashlib.sha256(scripts_path.read_bytes()).hexdigest(),
        'method': 'Lua lexical tokens excluding comments and string contents; C++ registration macros expanded with cpp; all archived Lua namespace assignments inventoried',
        'limitations': ['API names do not prove argument compatibility, effect-code handling, rulings or execution of branches.',
                        'Assignments are potential Lua providers; actual callable presence is checked separately in the bundled WASM.',
                        'Untyped receiver calls such as c:Foo() cannot be assigned reliably to Card/Group/Effect by this lexical audit.',
                        'Dynamic namespace indexing and computed script loads are outside the exact-name scan.'],
        'coreSourceFiles': source_files, 'coreRegistrations': core,
        'knownUpstreamDefects': [{'api': api, 'script': script, 'context': context}
                                 for (api, script), context in KNOWN_DEFECTS.items()],
        'localCompatibilityBridge': {'script': compatibility_name, 'source': str(compatibility_path.relative_to(ROOT)),
                                     'sha256': hashlib.sha256(compatibility_path.read_bytes()).hexdigest(),
                                     'providedApis': sorted(compatibility_names), 'officialLuaBytesModified': False},
        'startupHelperClosure': sorted(loaded), 'helperScripts': sorted(helpers),
        'luaNamespaceProviders': dict(sorted(definitions.items())),
        'scopes': {'fields': scope(field_scripts), 'helpers': scope(helpers),
                   'fieldsAndHelpers': scope(field_scripts | helpers), 'allArchivedScripts': scope(set(scripts))},
        'runtimeProbeApis': sorted(core_names | compatibility_names | ({api for name in field_scripts | loaded for api in
                                                 (reference['api'] for reference in inspected[name]['references'])} - set(scope(field_scripts)['cardScriptProvidedApis'])))
    }
    return result


def probe_wasm(result):
    """Confirm registry and startup-helper function presence in the actual WASM."""
    javascript = f'''
import {{ readFileSync }} from 'node:fs';
const {{ createNativeDuelRuntime }} = await import({json.dumps((ROOT / 'src/core/native/NativeDuelRuntime.js').as_uri())});
const {{ loadNativeCardResources }} = await import({json.dumps((ROOT / 'src/core/native/NativeCardData.js').as_uri())});
const resources = await loadNativeCardResources({{fetch: async path => new Response(readFileSync({json.dumps(str(ROOT / 'public'))} + path))}});
const runtime = await createNativeDuelRuntime({{...resources, seed: [1n,2n,3n,4n]}});
const apis = {json.dumps(result['runtimeProbeApis'])};
const checks = apis.map(api => `if type(${{api}}) ~= "function" then missing[#missing+1]="${{api}}" end`);
const lua = 'local missing={{}}\\n' + checks.join('\\n') + '\\nif #missing>0 then error("NATIVE_API_MISSING:"..table.concat(missing,",")) end';
const loaded = runtime.core.loadScript(runtime.handle, 'native_api_compatibility_probe.lua', lua);
const diagnostic = runtime.errors.find(item => item.text.includes('NATIVE_API_MISSING:'));
const missingApis = diagnostic?.text.match(/NATIVE_API_MISSING:([^\\n]+)/)?.[1]?.split(',').sort() ?? [];
const expectedMissingApis = ['Duel.GetMasterRule'];
const matchesStaticAudit = JSON.stringify(missingApis) === JSON.stringify(expectedMissingApis);
console.log(JSON.stringify({{coreApi:runtime.core.getVersion(),checkedApis:apis.length,loaded,missingApis,expectedMissingApis,matchesStaticAudit,diagnostics:runtime.errors}}));
runtime.close();
if(!matchesStaticAudit) process.exitCode=1;
'''
    process = subprocess.run(['node', '--input-type=module'], input=javascript, text=True,
                             capture_output=True, cwd=ROOT, check=True)
    return json.loads(process.stdout)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'docs/audits/artifacts/native-core-api-compatibility-2026-10-07.json')
    parser.add_argument('--core-archive', type=Path, help='Compare a different pinned core source archive')
    parser.add_argument('--probe-wasm', action='store_true', help='Also verify callable globals in the bundled real WASM')
    parser.add_argument('--strict-corpus', action='store_true', help='Fail even for the two recorded unrelated upstream defects')
    args = parser.parse_args()
    global CORE_ARCHIVE
    if args.core_archive:
        CORE_ARCHIVE = args.core_archive.resolve()
    result = report()
    if args.probe_wasm:
        result['wasmProbe'] = probe_wasm(result)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    summary = {name: {key: value for key, value in data.items() if key not in ('uniqueApis', 'cardScriptProvidedApis')}
               for name, data in result['scopes'].items()}
    print(json.dumps({'coreRegistrationCounts': {ns: len(names) for ns, names in result['coreRegistrations'].items()},
                      'scopes': summary}, indent=2))
    unresolved = result['scopes']['allArchivedScripts']['undefinedReferences']
    if result['scopes']['fields']['undefinedReferences'] or any(
        args.strict_corpus or (item['api'], item['script']) not in KNOWN_DEFECTS for item in unresolved
    ):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
