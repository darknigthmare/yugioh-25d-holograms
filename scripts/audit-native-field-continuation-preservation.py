#!/usr/bin/env python3
"""Compare complete archived native evidence against the repository HEAD bytes.

This script is read-only for game/source files and does not run a duel. The
native collector separately runs all 406 scenarios and requires exact JSON
equality of the original 377 scenarios and the 339 initialization records.
"""
import collections
import datetime
import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASELINE = 'docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json'
CURRENT = 'docs/audits/artifacts/native-field-runtime-continuation-2026-10-08.json'
OUTPUT = 'docs/audits/artifacts/native-field-continuation-preservation-2026-10-08.json'
COMPONENTS = ['messages', 'decisions', 'queries', 'fixtureCards', 'fixtureSeed', 'fixtureTeams']


def sha256(value):
    return hashlib.sha256(value).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'),
                      ensure_ascii=False, allow_nan=False).encode('utf-8')


def digest(value):
    return sha256(canonical(value))


def duplicate_ids(records, key):
    return sorted(value for value, count in collections.Counter(row[key] for row in records).items() if count > 1)


def main():
    baseline_head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    baseline_bytes = subprocess.check_output(['git', 'show', f'{baseline_head}:{BASELINE}'], cwd=ROOT)
    archived_bytes = (ROOT / BASELINE).read_bytes()
    current_bytes = (ROOT / CURRENT).read_bytes()
    baseline, current = json.loads(baseline_bytes), json.loads(current_bytes)
    old, new = baseline['scenarios'], current['scenarios']
    old_by_id, new_by_id = {row['id']: row for row in old}, {row['id']: row for row in new}
    added = [row for row in new if row['id'] not in old_by_id]
    historical = [new_by_id[row['id']] for row in old if row['id'] in new_by_id]
    old_fields = sorted({code for row in old for code in row['fields']})
    new_fields = sorted({code for row in new for code in row['fields']})
    added_fields = sorted({code for row in added for code in row['fields']})
    missing = sorted(set(old_by_id) - set(new_by_id))
    mismatch_ids = [row['id'] for row in old
                    if row['id'] in new_by_id and canonical(row) != canonical(new_by_id[row['id']])]
    component_mismatches = [
        {'id': row['id'], 'component': key}
        for row in old if row['id'] in new_by_id
        for key in COMPONENTS
        if canonical(row.get(key)) != canonical(new_by_id[row['id']].get(key))
    ]
    checks = {
        'baselineHeadBytesEqualArchivedReport': baseline_bytes == archived_bytes,
        'baseline377Current406': len(old) == 377 and len(new) == 406,
        'exactly29AdditionalScenariosOn13Fields': len(added) == 29 and len(added_fields) == 13,
        'allAddedFieldsPreviouslyCovered': set(added_fields).issubset(old_fields),
        'uniqueBaselineScenarioIds': not duplicate_ids(old, 'id'),
        'uniqueCurrentScenarioIds': not duplicate_ids(new, 'id'),
        'allHistoricalIdsRetained': not missing,
        'entireHistoricalScenariosExact': not mismatch_ids and len(historical) == 377,
        'historicalScenarioOrderExact': canonical(new[:377]) == canonical(old),
        'allSixRequestedComponentsExact': not component_mismatches,
        'all339MatrixRowsExact': canonical(current['matrix']) == canonical(baseline['matrix']),
        'unique339MatrixCanonicalIds': len(current['matrix']) == 339 and not duplicate_ids(current['matrix'], 'canonicalCode'),
        'baselineAndCurrent339Fields': len(old_fields) == 339 and old_fields == new_fields,
        'matrixCoverageEqualsScenarioFields': sorted(row['canonicalCode'] for row in current['matrix']) == new_fields,
        'all339MatrixRowsBundledInitializedEffectTested': all(
            row['bundled'] is True and row['initialized'] is True and row['effectTested'] is True
            and row['integrationTested'] is False and not row['errors'] for row in current['matrix']),
        'allHistoricalAndCurrentScenariosPassed': all(row['status'] == 'passed' and not row['errors'] for row in old + new),
        'noRetryInAnyScenario': not any(message['type'] == 1 for row in old + new for message in row['messages']),
        'summaryCountsMatchIndividualRecords': current['summary']['scenarios'] == len(new)
            and current['summary']['passedScenarios'] == sum(row['status'] == 'passed' for row in new)
            and current['summary']['catalogue'] == len(current['matrix']),
        'collectorPreservationDigestMatchesHeadArchive': current['preservation']['previousReportSha256'] == sha256(baseline_bytes),
    }
    record_digests = []
    for row in old:
        matching = new_by_id.get(row['id'])
        record_digests.append({
            'id': row['id'], 'fields': row['fields'],
            'baselineEntireScenarioSha256': digest(row),
            'currentEntireScenarioSha256': digest(matching) if matching else None,
            'entireObjectExact': matching is not None and canonical(row) == canonical(matching),
            'components': {key: {'baselineSha256': digest(row.get(key)),
                                 'currentSha256': digest(matching.get(key)) if matching else None}
                           for key in COMPONENTS},
        })
    report = {
        'date': '2026-10-08', 'executedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'scope': 'Read-only comparison of complete historical 377-scenario HEAD evidence against the newly executed 406-scenario continuation. No duel is rerun by this comparison.',
        'ok': all(checks.values()),
        'method': {
            'baseline': 'git show of the recorded HEAD commit; exact archived file bytes must match that repository object.',
            'scenarioDigests': 'SHA-256 of UTF-8 JSON with sorted object keys, no insignificant whitespace, ensure_ascii=False, allow_nan=False. Arrays and every primitive value/type are preserved.',
            'comparisonUnit': 'Whole scenario object by unique scenario id, plus all six named components and original array order.',
            'requestedComponents': COMPONENTS,
            'scopeLimit': 'Does not certify every card branch, browser rendering, all TCG interactions, or that subsequent source edits have not changed execution dependencies.',
        },
        'inputs': {
            'baseline': {'path': BASELINE, 'gitCommit': baseline_head, 'bytes': len(baseline_bytes), 'sha256': sha256(baseline_bytes)},
            'archivedFile': {'path': BASELINE, 'bytes': len(archived_bytes), 'sha256': sha256(archived_bytes)},
            'current': {'path': CURRENT, 'bytes': len(current_bytes), 'sha256': sha256(current_bytes)},
        },
        'summary': {'baselineCount': len(old), 'currentCount': len(new),
                    'preservedHistoricalScenarios': len(historical), 'additionalScenarioCount': len(added),
                    'baselineFieldCount': len(old_fields), 'currentFieldCount': len(new_fields),
                    'additionalDistinctFieldCount': len(added_fields),
                    'missingHistoricalIds': missing, 'mismatchedWholeHistoricalObjects': mismatch_ids,
                    'mismatchedRequestedComponents': component_mismatches,
                    'duplicateBaselineIds': duplicate_ids(old, 'id'), 'duplicateCurrentIds': duplicate_ids(new, 'id')},
        'checks': checks,
        'scenarioOnlyDigests': {
            'baselineHistoricalScenarioSetSha256': digest(old), 'currentHistoricalScenarioSetSha256': digest(historical),
            'currentAllScenarioSetSha256': digest(new), 'currentAdditionalScenarioSetSha256': digest(added),
            'baselineMatrixSha256': digest(baseline['matrix']), 'currentMatrixSha256': digest(current['matrix']),
        },
        'coverage': {'baselineCanonicalFieldIds': old_fields, 'currentCanonicalFieldIds': new_fields,
                     'additionalCanonicalFieldIds': added_fields},
        'historicalScenarioDigests': record_digests,
        'additionalScenarios': [{'id': row['id'], 'fields': row['fields'], 'status': row['status'],
                                 'entireScenarioSha256': digest(row)} for row in added],
    }
    (ROOT / OUTPUT).write_text(json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False) + '\n', encoding='utf-8')
    print(json.dumps({'ok': report['ok'], 'summary': report['summary'], 'failedChecks': [key for key, value in checks.items() if not value]}))
    if not report['ok']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
