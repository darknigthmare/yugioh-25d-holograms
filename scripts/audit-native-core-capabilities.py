#!/usr/bin/env python3
"""Offline Field/helper effect-code comparison; requires Python 3.12 and g++."""
import ast
import collections
import json
import pathlib
import re
import subprocess
import tarfile
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
_TMP_CONTEXT = tempfile.TemporaryDirectory(prefix='native-capability-audit-')
TMP = pathlib.Path(_TMP_CONTEXT.name)

def extract_source(filename):
    with tarfile.open(ROOT / 'public/native/sources' / filename) as archive:
        archive.extractall(TMP, filter='data')
        return TMP / archive.getnames()[0].split('/')[0]

OLD = extract_source('ygopro-core-8e5f4e4f.tar.gz')
NEW = extract_source('ygopro-core-38d04c9f.tar.gz')
LUA = extract_source('lua-75ea9ccb.tar.gz')


def mask_lua(text):
    out = list(text)
    i = 0
    while i < len(text):
        start = i
        if text.startswith('--', i):
            i += 2
            long = re.match(r'\[(=*)\[', text[i:])
            if long:
                close = ']' + long[1] + ']'
                end = text.find(close, i + len(long[0]))
                i = len(text) if end < 0 else end + len(close)
            else:
                end = text.find('\n', i)
                i = len(text) if end < 0 else end
        elif text[i] in ('\"', "'"):
            quote = text[i]
            i += 1
            while i < len(text):
                if text[i] == '\\':
                    i += 2
                elif text[i] == quote:
                    i += 1
                    break
                else:
                    i += 1
        else:
            long = re.match(r'\[(=*)\[', text[i:])
            if not long:
                i += 1
                continue
            close = ']' + long[1] + ']'
            end = text.find(close, i + len(long[0]))
            i = len(text) if end < 0 else end + len(close)
        for n in range(start, min(i, len(text))):
            if text[n] != '\n':
                out[n] = ' '
    return ''.join(out)


def native_maps(path):
    files = list(path.glob('*.cpp')) + list(path.glob('*.h'))
    sources = '\n'.join(p.read_text() for p in files)
    sources = re.sub(r'/\*.*?\*/|//[^\n]*|\"(?:\\.|[^\"\\])*\"', ' ', sources, flags=re.S)
    tokens = set(re.findall(r'\b(?:EFFECT_\w+|LOCATION_REASON_\w+)\b', sources))
    cpp = '\n'.join(p.read_text() for p in path.glob('*.cpp'))
    cpp = re.sub(r'/\*.*?\*/|//[^\n]*|\"(?:\\.|[^\"\\])*\"', ' ', cpp, flags=re.S)
    consumers = set(re.findall(r'\b(?:EFFECT_\w+|LOCATION_REASON_\w+)\b', cpp))
    cmd = ['g++', '-E', '-dM', '-std=c++17', '-x', 'c++', '-I', str(path), '-I', str(LUA), '-include', 'effect_constants.h', '-include', 'ocgapi_constants.h', '-include', 'field.h', '/dev/null']
    macro_text = subprocess.check_output(cmd, text=True, cwd=path)
    expressions = dict(re.findall(r'^#define[ \t]+([A-Za-z_]\w*)[ \t]+(.+)$', macro_text, re.M))
    expressions.update(dict(re.findall(r'^[ \t]*((?:EFFECT_|LOCATION_REASON_)\w+)[ \t]*=(?!=)[ \t]*([^,\n]+)', sources, re.M)))
    enum = re.search(r'enum class LOCATION_REASON\s*\{([^}]*)\}', sources)
    if enum:
        expressions.update({'LOCATION_REASON_' + m[1]: m[2] for m in re.finditer(r'(\w+)\s*=\s*([^,]+)', enum[1])})
    return tokens, consumers, expressions


def value(name, expressions, seen=None):
    seen = set() if seen is None else set(seen)
    if name in seen or name not in expressions:
        return None
    seen.add(name)
    expr = expressions[name].strip()
    expr = re.sub(r'(?<=\d)[uUlL]+\b', '', expr)
    try:
        tree = ast.parse(expr, mode='eval')
        def visit(node):
            if isinstance(node, ast.Constant) and isinstance(node.value, int):
                return node.value
            if isinstance(node, ast.Name):
                got = value(node.id, expressions, seen)
                if got is None:
                    raise ValueError(node.id)
                return got
            if isinstance(node, ast.BinOp):
                a, b = visit(node.left), visit(node.right)
                ops = {ast.Add: lambda: a+b, ast.Sub: lambda: a-b, ast.Mult: lambda: a*b, ast.BitOr: lambda: a|b, ast.BitAnd: lambda: a&b, ast.BitXor: lambda: a^b, ast.LShift: lambda: a<<b, ast.RShift: lambda: a>>b}
                if type(node.op) in ops:
                    return ops[type(node.op)]()
            if isinstance(node, ast.UnaryOp):
                a = visit(node.operand)
                if isinstance(node.op, ast.Invert): return ~a
                if isinstance(node.op, ast.USub): return -a
                if isinstance(node.op, ast.UAdd): return a
            raise ValueError(type(node).__name__)
        return visit(tree.body)
    except (ValueError, SyntaxError):
        return None


bundle = json.loads((ROOT / 'public/native/scripts.json').read_text())
scripts = bundle['scripts']
matrix = json.loads((ROOT / 'docs/audits/artifacts/native-field-runtime-2026-10-07.json').read_text())['matrix']
field_keys = ['c' + str(row['sourceCode']) + '.lua' for row in matrix]
helper_keys = [key for key in bundle['files'] if not re.fullmatch(r'c\d+\.lua', key)]
assert len(field_keys) == 339 and len(helper_keys) == 26
keys = field_keys + helper_keys
lua_expressions = {}
used = collections.defaultdict(list)
definitions = collections.defaultdict(list)
for key in keys:
    text = mask_lua(scripts[key])
    for m in re.finditer(r'^\s*([A-Za-z_]\w*)\s*=\s*(.+)$', text, re.M):
        lua_expressions[m[1]] = m[2].strip()
    for m in re.finditer(r'\b(?:EFFECT_\w+|LOCATION_REASON_\w+)\b', text):
        line = text.count('\n', 0, m.start()) + 1
        dest = definitions if re.match(r'\s*=(?!=)', text[m.end():]) else used
        dest[m[0]].append({'script': key, 'line': line})

report = {'fieldScripts': 339, 'helpers': helper_keys, 'referenceIdentifierCount': len(used), 'referenceOccurrenceCount': sum(map(len, used.values())), 'limits': ['Presence and equal constant values do not prove every effect branch; native cpp usage can use aliases or generic numeric code paths.', 'Definitions are reported separately from executable references.', 'New location-reason enums are normalized to their shipped Lua LOCATION_REASON_ names.'], 'identifiers': [], 'versions': {}}
native = {'old': native_maps(OLD), 'new': native_maps(NEW)}
for name in sorted(used):
    lv = value(name, lua_expressions)
    row = {'identifier': name, 'luaValue': lv, 'references': used[name], 'native': {}}
    for version, (tokens, consumers, expressions) in native.items():
        nv = value(name, expressions)
        same = name in tokens
        status = 'exact-token' if same else 'normalized-enum' if name in expressions else 'absent'
        aliases = [n for n in expressions if n.startswith('LOCATION_REASON_' if name.startswith('LOCATION_REASON_') else 'EFFECT_') and lv is not None and value(n, expressions) == lv]
        row['native'][version] = {'status': status, 'value': nv, 'valueMatches': nv == lv if nv is not None and lv is not None else None, 'cppToken': name in consumers, 'equalValueIdentifiers': aliases}
    report['identifiers'].append(row)
for version in native:
    missing = [r['identifier'] for r in report['identifiers'] if r['native'][version]['status'] == 'absent']
    mismatched = [r['identifier'] for r in report['identifiers'] if r['native'][version]['valueMatches'] is False]
    report['versions'][version] = {'missingReferenceIdentifiers': missing, 'valueMismatches': mismatched}
report['definitionOnlyIdentifiers'] = sorted(set(definitions) - set(used))
report['luaEffectSupportMechanism'] = {
    'explanation': 'Script-owned numeric effect tags are stored and queried through generic native methods; they do not require a dedicated C++ symbolic constant or engine processor.',
    'nativeQueries': ['libcard.cpp:1116 Card.IsHasEffect', 'libcard.cpp:1140 Card.GetCardEffect', 'libduel.cpp:3578 Duel.IsPlayerAffectedByEffect', 'libduel.cpp:3590 Duel.GetPlayerEffect'],
}
for row in report['identifiers']:
    name = row['identifier']
    for version in native:
        state = row['native'][version]
        if state['status'] != 'absent':
            state['classification'] = 'native'
        elif state['equalValueIdentifiers']:
            state['classification'] = 'native-value-alias'
        elif name in ('EFFECT_OPPO_CHOOSES_SPSUMMON_ZONE', 'LOCATION_REASON_SPSUMMON'):
            state['classification'] = 'unsupported-core-capability'
        elif name.startswith('EFFECT_MARKER_'):
            state['classification'] = 'lua-flag-alias'
        else:
            state['classification'] = 'lua-managed-effect'
    if row['native']['new']['classification'] in ('lua-managed-effect', 'lua-flag-alias'):
        witnesses = []
        for ref in row['references']:
            line = scripts[ref['script']].splitlines()[ref['line']-1].strip()
            if row['native']['new']['classification'] == 'lua-flag-alias' or re.search(r'(?:IsHasEffect|GetCardEffect|GetPlayerEffect|IsPlayerAffectedByEffect)', line):
                witnesses.append({**ref, 'sourceLine': line})
        assert witnesses, 'No Lua consumer witness for ' + name
        row['luaConsumerWitnesses'] = witnesses
for version in native:
    counts = collections.Counter(row['native'][version]['classification'] for row in report['identifiers'])
    report['versions'][version]['classifications'] = dict(counts)
    report['versions'][version]['unsupportedCoreCapabilities'] = [row['identifier'] for row in report['identifiers'] if row['native'][version]['classification'] == 'unsupported-core-capability']
    report['versions'][version]['unresolvedValueIdentifiers'] = [row['identifier'] for row in report['identifiers'] if row['luaValue'] is None or (row['native'][version]['status'] != 'absent' and row['native'][version]['value'] is None)]
report['methodCompatibilityNotes'] = {
    'Duel.GetMasterRule': 'Absent in both native registries; utility.lua:2074 calls it inside Auxiliary.MainAndExtraSpSummonLoop, but the complete 13,702-script corpus has no call to that helper.',
    'Group.NewGroup': 'Absent in both native registries; c60921537.lua:25-26 (Dogmatikamacabre) calls it only when Duel.IsPlayerAffectedByEffect(tp,CARD_SPIRIT_ELIMINATION) returns an effect. This is an upstream card-script branch defect outside the Field subset.',
}
out = ROOT / 'docs/audits/artifacts/effect-location-identifier-audit-2026-10-07.json'
out.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: report[k] for k in ('fieldScripts','referenceIdentifierCount','referenceOccurrenceCount','versions')}, indent=2))
print(out)
if any(report['versions']['new'][key] for key in ('unsupportedCoreCapabilities', 'valueMismatches', 'unresolvedValueIdentifiers')):
    raise SystemExit(1)
