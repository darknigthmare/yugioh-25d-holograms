#!/usr/bin/env node
/** Byte-level geometry preservation against the committed pre-wave factory. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createFieldEnvironmentGeometry as current, disposeFieldEnvironmentGeometry as dispose } from '../src/ui/FieldEnvironmentGeometry.js';
import { createFieldEnvironmentGeometry as baseline } from '../docs/audits/artifacts/continuation-terrain-details-2026-10-08/baseline-5971495/FieldEnvironmentGeometry.js';
import { FIELD_GEOMETRY_THREE } from '../src/ui/FieldGeometryThree.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { FIELD_SPELL_REFERENCE_ART_SNAPSHOT as sources } from '../src/ui/FieldSpellReferenceArtSnapshot.js';
import { FIELD_CONTINUATION_DETAIL_IDS as changedIds } from '../src/ui/FieldContinuationStageDetails.js';
const sha = value => createHash('sha256').update(value).digest('hex');
const root = new URL('../', import.meta.url);
const destination = new URL('docs/audits/artifacts/continuation-terrain-details-2026-10-08/preservation.json', root);
const signature = group => {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(group.userData));
  for (const mesh of group.children) {
    hash.update(JSON.stringify({ name: mesh.name, userData: mesh.userData, geometryUserData: mesh.geometry.userData, instanceCount: mesh.count,
      material: { color: mesh.material.color.getHex(), emissive: mesh.material.emissive.getHex(), roughness: mesh.material.roughness,
        metalness: mesh.material.metalness, side: mesh.material.side, transparent: mesh.material.transparent, opacity: mesh.material.opacity,
        depthWrite: mesh.material.depthWrite, vertexColors: mesh.material.vertexColors } }));
    for (const key of Object.keys(mesh.geometry.attributes).sort()) {
      const attribute = mesh.geometry.attributes[key]; hash.update(key); hash.update(JSON.stringify({ itemSize: attribute.itemSize, normalized: attribute.normalized }));
      hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
    for (const attribute of [mesh.geometry.index, mesh.instanceMatrix].filter(Boolean)) hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
  }
  return hash.digest('hex');
};
const entries = [];
for (const source of sources.entries) {
  const environment = getFieldEnvironmentForCardId(source.cardId);
  const before = baseline(FIELD_GEOMETRY_THREE, environment), after = current(FIELD_GEOMETRY_THREE, environment);
  const beforeSha256 = signature(before), afterSha256 = signature(after), equal = beforeSha256 === afterSha256;
  const bytes = readFileSync(new URL('public' + source.assetPath, root));
  const sourceIntact = bytes.length === source.bytes && sha(bytes) === source.sha256;
  entries.push({ cardId: source.cardId, name: environment.displayName, intentionallyDetailed: changedIds.includes(source.cardId), beforeSha256, afterSha256, geometryIdentical: equal,
    jpegBytes: bytes.length, jpegSha256: sha(bytes), sourceIntact });
  dispose(before); dispose(after);
  if (!sourceIntact || equal === changedIds.includes(source.cardId)) throw Error('unexpected preservation difference ' + source.cardId);
}
const report = { baselineCommit: '5971495fb9425b96416b5e07bfeb6d28ec9bd43c', method: 'compare every public geometry attribute, index, instance transform, material and descriptor; UUIDs excluded',
  rendererOrGameInstantiated: false, sourceJpegsIntact: entries.every(e => e.sourceIntact), sourceCount: entries.length,
  unchangedGeometryCount: entries.filter(e => e.geometryIdentical).length, intentionallyDetailedCount: entries.filter(e => e.intentionallyDetailed).length,
  expectedDetailedIds: changedIds, entries, ok: true };
writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ok: true, sourceCount: report.sourceCount, unchangedGeometryCount: report.unchangedGeometryCount, intentionallyDetailedCount: report.intentionallyDetailedCount, sourceJpegsIntact: report.sourceJpegsIntact }));
