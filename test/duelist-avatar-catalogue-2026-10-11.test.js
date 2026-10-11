import test from 'node:test';
import assert from 'node:assert/strict';
import { DUELIST_AVATARS, getDuelistAvatar } from '../src/content/DuelistAvatarCatalog.js';

const look = id => getDuelistAvatar(id).visual;
const rgb = hex => [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
const isWhite = hex => rgb(hex).every(channel => channel > 210);

test('later heroes use their selected anime appearances rather than the wrong person or uniform', () => {
  assert.equal(look('playmaker').headdress, 'helmet');
  assert.equal(look('playmaker').outfitStyle, 'armor');
  const [red, green, blue] = rgb(look('playmaker').outfitColor);
  assert.ok(green > red && green > blue, 'Playmaker has green digital armour');
  assert.equal(look('yuga').outfitStyle, 'jacket');
  assert.equal(look('yuga').bottomStyle, 'shorts');
  assert.notEqual(look('yuga').hairColor, look('yuga').hairAccent);
  assert.equal(look('yudias').headdress, 'helmet');
  assert.equal(look('yudias').outfitStyle, 'long-coat');
  assert.ok(isWhite(look('yudias').outfitColor));
  assert.notEqual(look('yudias').hairColor, look('yudias').hairAccent);
  assert.equal(look('yudias').secondaryAccessory, 'cape');
  assert.notEqual(look('yudias').secondaryAccessoryColor, look('yudias').accessoryColor);
  const [yuyaRed, yuyaGreen] = rgb(look('yuya').hairColor);
  const [frontRed, frontGreen] = rgb(look('yuya').hairAccent);
  assert.ok(yuyaGreen > yuyaRed && frontRed > frontGreen, 'Yuya has a green rear and red fringe');
});

test('SEVENS separates school uniforms from the actual sport, shorts and stage costumes', () => {
  assert.equal(look('romin').outfitStyle, 'sport');
  assert.equal(look('romin').bottomStyle, 'shorts');
  assert.ok(look('romin').legwearColor);
  assert.notEqual(look('romin').outfitColor, look('romin').bottomColor);
  assert.equal(look('luke').outfitStyle, 'sport');
  assert.notEqual(look('luke').outfitColor, look('luke').bottomColor);
  assert.equal(look('gakuto').hairStyle, 'bob');
  assert.equal(look('mimi').outfitStyle, 'dress');
  assert.equal(look('tiger').hairStyle, 'long');
  assert.equal(look('asana').outfitStyle, 'long-coat');
  assert.ok(isWhite(look('asana').bottomColor));
});

test('the two selected animal appearances remain animals with explicit biped adaptation', () => {
  assert.equal(look('nyandestar').species, 'cat');
  assert.equal(look('bochi').species, 'dog');
  for (const id of ['nyandestar', 'bochi']) {
    assert.match(getDuelistAvatar(id).description, /bipède/);
    assert.ok(!getDuelistAvatar(id).aliases.some(alias => alias.includes('humanoïde')));
    assert.notEqual(look(id).outfitStyle, 'suit');
    assert.equal(look(id).hairColor, look(id).skinColor);
  }
  assert.equal(look('nyandestar').accessory, 'none');
  assert.equal(look('bochi').accessory, 'necklace');
  assert.equal(look('chupataro').species, 'human');
  assert.match(getDuelistAvatar('chupataro').description, /Apparence humaine/);
});

test('GO RUSH preserves separate hair accents, glasses, bows, hats and mixed bottoms', () => {
  assert.equal(look('yuamu').hairStyle, 'long');
  assert.equal(look('yuamu').accessory, 'glasses');
  assert.equal(look('yuamu').headdress, 'headband');
  assert.equal(look('yuamu').bottomStyle, 'shorts');
  assert.notEqual(look('yuamu').hairColor, look('yuamu').hairAccent);
  assert.equal(look('manya').accessory, 'hat');
  assert.ok(isWhite(look('manya').accessoryColor));
  assert.equal(look('yuhi').accessory, 'goggles');
  assert.notEqual(look('zwijo').hairColor, look('zwijo').hairAccent);
});

test('official localized identities remain searchable without changing saved IDs', () => {
  for (const [id, alias] of [
    ['silvio', 'Silvio Sawatari'], ['dennis', 'Dennis MacField'],
    ['luke', 'Lucidien Kallister'], ['romin', 'Romin Kassidy'],
    ['roa', 'Roa Kassidy'], ['mimi', 'Mimi Imimi'],
    ['tiger', 'Tiadosia Kallister'], ['manabu', 'Maddox Sogetsu'],
    ['manya', 'Immi Imimi'], ['zwijo', 'Zwijo Zir Velgear']
  ]) assert.equal(getDuelistAvatar(id).aliases.includes(alias), true, `${id} / ${alias}`);
  assert.equal(getDuelistAvatar('silvio').name, 'Sylvio Sawatari');
  assert.equal(getDuelistAvatar('dennis').name, 'Dennis McField');
  assert.equal(getDuelistAvatar('zwijo').name, 'Zuwijo Zwil Velgear');
});

test('second accessories retain recognisable key, glasses and masked Goha silhouettes', () => {
  assert.equal(look('yuma').secondaryAccessory, 'necklace');
  assert.equal(look('declan').secondaryAccessory, 'glasses');
  for (const id of ['yuro', 'yuo', 'yuka']) {
    assert.equal(look(id).accessory, 'mask');
    assert.equal(look(id).secondaryAccessory, 'cape');
  }
  assert.equal(look('lulu').hairStyle, 'ponytail');
  assert.equal(look('ghost-gal').hairStyle, 'ponytail');
  assert.equal(look('blair').hairStyle, 'long');
  assert.equal(look('axel').hairStyle, 'braided');
});

test('all new render inputs are immutable data in bounded vocabularies and hexadecimal palettes', () => {
  const species = new Set(['human', 'cat', 'dog', 'alien', 'robot', 'spirit']);
  const accessories = new Set(['none', 'puzzle', 'headband', 'goggles', 'cape', 'hat', 'glasses', 'necklace', 'mask', 'scarf', 'wings', 'earpiece', 'staff']);
  const allowed = new Set(['hairStyle', 'hairColor', 'hairAccent', 'skinColor', 'outfitStyle', 'outfitColor', 'accentColor', 'accessory', 'height', 'build', 'pose', 'variant', 'species', 'secondaryAccessory', 'headdress', 'bottomStyle', 'bottomColor', 'gloveColor', 'legwearColor', 'bootColor', 'accessoryColor', 'secondaryAccessoryColor', 'hairOutlineColor']);
  for (const { visual } of DUELIST_AVATARS) {
    assert.ok(Object.isFrozen(visual));
    assert.ok(species.has(visual.species));
    assert.ok(accessories.has(visual.secondaryAccessory));
    assert.ok(['none', 'helmet', 'headband', 'hat'].includes(visual.headdress));
    if (visual.bottomStyle !== undefined) assert.ok(['trousers', 'shorts', 'skirt'].includes(visual.bottomStyle));
    for (const [key, value] of Object.entries(visual)) {
      assert.ok(allowed.has(key), key);
      if (key.endsWith('Color') || key === 'hairAccent') assert.match(value, /^#[\da-f]{6}$/i);
      assert.ok(['string', 'number'].includes(typeof value));
    }
  }
});

test('unreviewed appearances retain the existing robe, skirt and trouser rendering fallbacks', () => {
  for (const id of ['rafael', 'yujin', 'yuran', 'tristan', 'zane', 'jack', 'vector', 'dr-faker', 'mai']) {
    assert.equal(look(id).bottomColor, undefined);
    assert.equal(look(id).bottomStyle, undefined);
  }
  for (const id of ['tea', 'alexis', 'zuzu']) {
    assert.equal(look(id).outfitStyle, 'dress');
    assert.equal(look(id).bottomStyle, undefined);
  }
  for (const id of ['yuma', 'luke', 'tiger', 'yuhi', 'bronk']) assert.equal(look(id).bottomStyle, 'trousers');
});
