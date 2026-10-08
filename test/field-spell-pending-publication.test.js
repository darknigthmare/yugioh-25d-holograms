import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { STARTER_CARDS } from '../src/cards.js';
import { markFieldSpellResolved, markFieldSpellSet } from '../src/core/FieldSpellRules.js';
import { DuelGameNetworkAdapter } from '../src/network/duel-game-network-adapter.js';
import { resolveFieldEnvironmentSelection } from '../src/ui/FieldEnvironmentRegistry.js';

function spell(id, side, uid = `${side}-field-${id}`) {
  const template = STARTER_CARDS.find(value => value.id === id);
  assert.ok(template, `registered Field Spell ${id}`);
  const card = new CardState({ ...template, uid });
  card.ownerId = card.controllerId = side;
  return card;
}

function monster(side, attribute) {
  const card = new CardState({ uid: `${side}-stat-fixture`, id: '89631139', name: 'Stat fixture',
    card_type: 'monster', type: 'Normal Monster', race: 'Dragon', attribute,
    atk: 1000, def: 800, level: 4 });
  card.ownerId = card.controllerId = side;
  card.position = 'defense';
  return card;
}

function main(game, side) {
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.delay = async () => true;
  game.scheduleAction = () => 0;
  game.startPhaseFlow = () => {};
}

const replacements = [
  { old: '50913601', next: '81777047', attribute: 'LIGHT', before: [1200, 1000], after: [1500, 400], label: 'Mountain → Luminous Spark' },
  { old: '56594520', next: '81380218', attribute: 'EARTH', before: [1500, 400], after: [1000, 1300], label: 'Gaia Power → Chorus of Sanctuary' }
];

for (const side of ['player', 'opponent']) {
  for (const config of replacements) {
    test(`${config.label} publishes fresh pending statistics before response decisions (${side})`, async () => {
      const publications = [];
      const responses = [];
      let adapter;
      let replacement;
      let old;
      let candidate;
      const game = new DuelGame({
        onStateChange: state => {
          if (state.getFieldSpellForSide(side) !== replacement || replacement?.fieldActivationState !== 'pending') return;
          const snapshot = adapter.buildPublicSnapshot(side);
          publications.push({
            source: state.getFieldSpellForSide(side),
            linkSource: state.chain.getLastLink().sourceCard,
            locked: state.isResolvingAction,
            stats: [candidate.getAtk(), candidate.getDef()],
            oldInGY: state.getSideState(side).graveyard.includes(old),
            environment: resolveFieldEnvironmentSelection(state),
            snapshot
          });
        },
        onChainOpportunity: request => {
          responses.push(request);
          assert.ok(publications.length > 0, 'the renderer must receive the pending state before the decision');
          assert.equal(game.getFieldSpellForSide(side), replacement);
          assert.equal(replacement.fieldActivationState, 'pending');
          assert.deepEqual([candidate.getAtk(), candidate.getDef()], [1000, 800]);
          return null;
        }
      });
      main(game, side);
      adapter = new DuelGameNetworkAdapter(game);
      old = spell(config.old, side);
      game.field.placeFieldSpell(side, old);
      markFieldSpellResolved(old, 1);
      candidate = monster(side, config.attribute);
      game.field.setMonsterZone(side, 0, candidate);
      candidate.position = 'defense';

      const other = game.getOpponentSide(side);
      const privateField = spell('22702055', other, 'private-field-instance');
      privateField.name = 'Private field identity';
      game.field.placeFieldSpell(other, privateField);
      privateField.isSetFaceDown = true;
      markFieldSpellSet(privateField);
      game.stabilizer.stabilize(game);
      assert.deepEqual([candidate.getAtk(), candidate.getDef()], config.before);

      replacement = spell(config.next, side);
      replacement.location = 'hand';
      game.getSideState(side).hand.push(replacement);
      assert.equal(await game.activateFieldSpellFromHand(replacement.uid, side), true);
      assert.equal(publications.length, 1);
      assert.ok(responses.length > 0);
      const pending = publications[0];
      assert.equal(pending.source, replacement);
      assert.equal(pending.linkSource, replacement);
      assert.equal(pending.locked, true);
      assert.equal(pending.oldInGY, true);
      assert.deepEqual(pending.stats, [1000, 800]);
      assert.equal(pending.environment.sourceCardId, null, 'neither the removed nor pending Field Spell supplies the scenery');
      assert.equal(pending.snapshot.sides[side].fieldSpell.uid, replacement.uid);
      assert.equal(pending.snapshot.sides[side].fieldSpell.fieldActivationState, 'pending');
      assert.equal(pending.snapshot.sides[other].fieldSpell.hidden, true);
      const publicText = JSON.stringify(pending.snapshot);
      for (const privateValue of [privateField.uid, privateField.name, privateField.id]) {
        assert.equal(publicText.includes(privateValue), false, 'the new publication retains face-down privacy');
      }
      assert.equal(replacement.fieldActivationState, 'resolved');
      assert.deepEqual([candidate.getAtk(), candidate.getDef()], config.after);
    });
  }

  test(`a reset from the pending Field Spell publication aborts before opening responses (${side})`, async () => {
    let replacement;
    let resetOnce = false;
    let responses = 0;
    const game = new DuelGame({
      onStateChange: state => {
        if (!resetOnce && state.getFieldSpellForSide(side) === replacement
          && replacement?.fieldActivationState === 'pending') {
          assert.equal(state.isResolvingAction, true);
          resetOnce = true;
          state.reset();
        }
      },
      onChainOpportunity: () => { responses += 1; return null; }
    });
    main(game, side);
    const old = spell('50913601', side);
    game.field.placeFieldSpell(side, old);
    markFieldSpellResolved(old, 1);
    replacement = spell('81777047', side);
    replacement.location = 'hand';
    game.getSideState(side).hand.push(replacement);
    assert.equal(await game.activateFieldSpellFromHand(replacement.uid, side), false);
    assert.equal(resetOnce, true);
    assert.equal(responses, 0);
    assert.equal(game.getFieldSpellForSide(side), null);
    assert.equal(game.chain.chainStack.length, 0);
    assert.equal(game.isResolvingAction, false);

    main(game, side);
    const fresh = spell('56594520', side, 'fresh-post-reset');
    fresh.location = 'hand';
    game.getSideState(side).hand.push(fresh);
    assert.equal(await game.activateFieldSpellFromHand(fresh.uid, side), true);
    assert.equal(game.getFieldSpellForSide(side), fresh);
    assert.equal(fresh.fieldActivationState, 'resolved');
  });
}
