import test from 'node:test';
import assert from 'node:assert/strict';
import { FIELD_SPELL_COVERAGE, filterFieldSpellCoverage, getFieldSpellCoverageSummary } from '../src/ui/FieldSpellCoverage.js';
import { IMPLEMENTED_FIELD_SPELLS } from '../src/core/ClassicFieldSpellEffects.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';

test('the complete atlas distinguishes exact sources, inspected models and fully registered effects', () => {
  const count = getFieldSpellCoverageSummary();
  assert.equal(count.total, 339);
  assert.equal(count.sourceArt, 339);
  assert.equal(count.implementedRules, 29);
  assert.equal(new Set(FIELD_SPELL_COVERAGE.map(card => card.cardId)).size, 339);
  assert.deepEqual(new Set(filterFieldSpellCoverage({ status: 'playable' }).map(card => card.cardId)),
    new Set(IMPLEMENTED_FIELD_SPELLS.map(card => card.id)));
  for (const card of FIELD_SPELL_COVERAGE) {
    assert.ok(Object.isFrozen(card));
    assert.equal(card.sourceArtUrl, `/environments/field-art/${card.cardId}.jpg`);
    assert.equal(card.hasInspectedGeometry, Boolean(getFieldEnvironmentForCardId(card.cardId).geometryProfile.inspectedArt));
    if (card.gameplayImplemented) assert.match(card.rulesSourceUrl, /^https:\/\/www\.db\.yugioh-card\.com\//);
  }
});

test('atlas search supports names, French local text and canonical passcodes independently from filters', () => {
  assert.equal(filterFieldSpellCoverage({ query: 'Canyon' })[0].cardId, '28120197');
  assert.equal(filterFieldSpellCoverage({ query: 'monde zombie', status: 'playable' })[0].cardId, '4064256');
  assert.equal(filterFieldSpellCoverage({ query: '4064256', status: 'playable' })[0].name, 'Zombie World');
  assert.equal(filterFieldSpellCoverage({ query: '02084239', status: 'playable' })[0].cardId, '2084239');
  assert.ok(filterFieldSpellCoverage({ query: 'magicien', status: 'playable' }).some(card => card.cardId === '68462976'));
  assert.equal(filterFieldSpellCoverage({ query: 'zzzz-terrain-absent' }).length, 0);
  assert.equal(filterFieldSpellCoverage({ status: 'pending-rules' }).length, 310);
  assert.equal(filterFieldSpellCoverage({ query: 'Canyon', status: 'pending-rules' }).length, 0);
});

test('announced cards are clearly dated and never become playable from their source art', () => {
  const announced = FIELD_SPELL_COVERAGE.find(card => card.cardId === '12845564');
  assert.equal(announced.publication.status, 'announced');
  assert.equal(announced.publication.releaseDate, '2026-10-09');
  assert.equal(announced.gameplayImplemented, false);
  for (const id of ['33700664', '88288421']) {
    const card = FIELD_SPELL_COVERAGE.find(card => card.cardId === id);
    assert.equal(card.publication.status, 'released');
    assert.deepEqual(card.publication.formats, ['OCG']);
    assert.equal(card.gameplayImplemented, false);
  }
  assert.equal(FIELD_SPELL_COVERAGE.some(card => card.cardId.startsWith('101403')), false);
});
