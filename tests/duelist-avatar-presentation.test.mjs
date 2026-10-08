import test from 'node:test';
import assert from 'node:assert/strict';
import { DUELIST_AVATARS, DUELIST_SERIES, getDuelistAvatar } from '../src/content/DuelistAvatarCatalog.js';
import { getDuelistAvatarUnlockState } from '../src/content/DuelistAvatarProgress.js';
import { filterDuelistAvatars, normalizeDuelistAvatarSearch } from '../src/ui/DuelistAvatarPicker.js';
import { renderDuelistAvatarPortrait } from '../src/ui/DuelistAvatarPortrait.js';

test('human silhouette markup is complete, deterministic and contains no active or external content', () => {
  for (const avatar of DUELIST_AVATARS) {
    const svg = renderDuelistAvatarPortrait(avatar);
    assert.match(svg, /^<svg\s/);
    assert.match(svg, /viewBox="0 0 240 288"/);
    assert.match(svg, /<path\s/);
    assert.match(svg, /role="img" aria-label="/);
    assert.match(svg, /<\/svg>$/);
    assert.doesNotMatch(svg, /<(?:script|foreignObject|image|use)\b|\son\w+\s*=|\shref\s*=|\bNaN\b|\bundefined\b|javascript:/i);
    assert.equal(renderDuelistAvatarPortrait(avatar), svg);
    assert.match(renderDuelistAvatarPortrait(avatar, { decorative: true }), /aria-hidden="true" focusable="false"/);
  }
});

test('saved avatar metadata cannot replace the canonical portrait or introduce markup', () => {
  assert.equal(renderDuelistAvatarPortrait({
    id: 'yugi',
    name: '<script>stolen()</script>',
    visual: { hairColor: '" onload="stolen()', accessory: '<image href="javascript:stolen()">' }
  }), renderDuelistAvatarPortrait('yugi'));
  const svg = renderDuelistAvatarPortrait('yugi', {
    label: '<img src=x onerror="stolen()">', className: 'x" onload="stolen()'
  });
  assert.match(svg, /&lt;img src=x onerror=&quot;stolen\(\)&quot;&gt;/);
  assert.doesNotMatch(svg, /<img|\sonload="stolen|\sonerror="stolen/);
});

test('emblematic protagonists have different visible silhouettes across the eight series', () => {
  const portraits = DUELIST_SERIES.map(series => {
    const avatar = DUELIST_AVATARS.find(entry => entry.seriesId === series.id && entry.unlock.type === 'starter');
    assert.ok(avatar, `${series.id} has an available protagonist`);
    return renderDuelistAvatarPortrait(avatar, { decorative: true })
      .replace(/data-avatar-portrait="[^"]+"/, '');
  });
  assert.equal(new Set(portraits).size, DUELIST_SERIES.length);
  assert.notEqual(renderDuelistAvatarPortrait('yugi'), renderDuelistAvatarPortrait('kaiba'));
});

test('search ignores accents and includes the original names and localized aliases', () => {
  assert.equal(normalizeDuelistAvatarSearch('  NÉOS À é  '), 'neos a e');
  for (const id of ['yugi', 'kaiba', 'joey', 'jaden', 'yusei', 'yuma', 'yuya', 'playmaker', 'yuga', 'yudias']) {
    const avatar = getDuelistAvatar(id);
    assert.ok(avatar);
    for (const alias of [avatar.name, ...(avatar.aliases || [])]) {
      assert.ok(filterDuelistAvatars({ query: alias.toUpperCase() }).some(entry => entry.id === id), `${id}: ${alias}`);
    }
  }
  assert.equal(filterDuelistAvatars({ query: '<script>not-a-duellist</script>' }).length, 0);
});

test('series and availability filters partition the actual unlock state', () => {
  const context = { statistics: { duels: 12, wins: 3, losses: 8, draws: 1 }, campaignProgress: { missions: {} }, earnedAvatarIds: [] };
  const available = filterDuelistAvatars({ status: 'available', context });
  const locked = filterDuelistAvatars({ status: 'locked', context });
  assert.equal(available.length + locked.length, DUELIST_AVATARS.length);
  assert.ok(available.length > 0 && locked.length > 0);
  assert.ok(available.every(avatar => getDuelistAvatarUnlockState(avatar, context).unlocked));
  assert.ok(locked.every(avatar => !getDuelistAvatarUnlockState(avatar, context).unlocked));
  for (const series of DUELIST_SERIES) {
    const entries = filterDuelistAvatars({ seriesId: series.id, context });
    assert.ok(entries.length > 0);
    assert.ok(entries.every(avatar => avatar.seriesId === series.id));
  }
});
