import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveFieldEnvironment
} from '../src/ui/FieldEnvironmentRegistry.js';

function sparseFieldSpell(overrides = {}) {
  return {
    id: '59197169',
    card_type: 'spell',
    type: 'Field Spell',
    race: 'Field',
    isFieldSpell: true,
    location: 'field_zone',
    ...overrides
  };
}

test('occupying the Field Zone alone does not prove a Field Spell resolved', () => {
  assert.equal(
    resolveFieldEnvironment({
      playerFieldSpell: sparseFieldSpell()
    }).id,
    'clearing'
  );
  assert.equal(
    resolveFieldEnvironment({
      playerFieldSpell: sparseFieldSpell({ fieldActivationSequence: 0 })
    }).id,
    'clearing'
  );
});
test('explicit resolution or a positive resolution sequence selects the environment', () => {
  assert.equal(
    resolveFieldEnvironment({
      playerFieldSpell: sparseFieldSpell({ resolvedSuccessfully: true })
    }).id,
    'yami'
  );
  assert.equal(
    resolveFieldEnvironment({
      playerFieldSpell: sparseFieldSpell({ fieldActivationSequence: 1 })
    }).id,
    'yami'
  );
});
