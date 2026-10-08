/** Reproduce the reviewed local wrapper from the exact published npm package. */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const WRAPPER_PATCHES = Object.freeze([
  ['WASM32 card data scales and link arrows',
    'e.setUint32(40,t.lscale??0,!0),e.setUint32(48,t.rscale??0,!0),e.setUint32(52,t.link_marker??0,!0)',
    'e.setUint32(40,t.lscale??0,!0),e.setUint32(44,t.rscale??0,!0),e.setUint32(48,t.link_marker??0,!0)'],
  ['Sort permutation has no length prefix',
    't.i8(e.order.length);for(let r of e.order)t.i8(r);',
    'for(let r of e.order)t.i8(r);'],
  ['Sum selection reads mandatory cards first and consumes full card locations',
    'case 23:return{type:t,player:e.u8(),select_max:e.u8(),amount:e.u32(),min:e.u32(),max:e.u32(),selects:Array.from({length:e.u32()},()=>({code:e.u32(),controller:e.u8(),location:e.u8(),sequence:e.u32(),amount:e.u32()})),selects_must:Array.from({length:e.u32()},()=>({code:e.u32(),controller:e.u8(),location:e.u8(),sequence:e.u32(),amount:e.u32()}))};',
    'case 23:return{type:t,player:e.u8(),select_max:e.u8(),amount:e.u32(),min:e.u32(),max:e.u32(),selects_must:Array.from({length:e.u32()},()=>({code:e.u32(),...p(e),amount:e.u32()})),selects:Array.from({length:e.u32()},()=>({code:e.u32(),...p(e),amount:e.u32()}))};'],
  ['Shuffle Set uses an 8-bit count followed by separate source and destination arrays',
    'case 36:return{type:t,location:e.u8(),cards:Array.from({length:e.u32()},()=>({from:p(e),to:p(e)}))};',
    'case 36:{const location=e.u8(),count=e.u8(),from=Array.from({length:count},()=>p(e)),to=Array.from({length:count},()=>p(e));return{type:t,location,cards:from.map((entry,index)=>({from:entry,to:to[index]}))}}'],
  ['Move preserves its native uint32 reason flags',
    'case 50:return{type:t,card:e.u32(),from:p(e),to:p(e)};',
    'case 50:return{type:t,card:e.u32(),from:p(e),to:p(e),reason:e.u32()};'],
  ['Query TYPE payload is consumed',
    'else if(s===u.LEVEL&&o===4)t.level=e.u32();',
    'else if(s===u.TYPE&&o===4)t.type=e.u32();else if(s===u.LEVEL&&o===4)t.level=e.u32();'],
  ['Counters are keyed by their type',
    'let c=e.u16(),a=e.u16();t.counters[a]=c',
    'let c=e.u16(),a=e.u16();t.counters[c]=a'],
  ['Signed attack', 't.attack=e.u32();', 't.attack=e.i32();'],
  ['Signed defense', 't.defense=e.u32();', 't.defense=e.i32();'],
  ['Signed base attack', 't.baseAttack=e.u32();', 't.baseAttack=e.i32();'],
  ['Signed base defense', 't.baseDefense=e.u32();', 't.baseDefense=e.i32();'],
  ['Unknown query payload is consumed',
    't.link={rating:r,marker:O}}}return t}function j(e)',
    't.link={rating:r,marker:O}}else e.sub(o)}return t}function j(e)'],
  ['Omit unused JSPI loader',
    'async function Ne(){return(await import("./ocgcore.jspi-ROQIC75H.js")).default}',
    'async function Ne(){throw new Error("This vendored build supports the synchronous OCG interface only")}'],
  ['Omit unused JSPI embedded binary',
    'async function me(){return(await import("./ocgcore.jspi-W7UMOWZG.js")).default.buffer}',
    'async function me(){throw new Error("Provide the local native WASM binary")}'],
  ['External synchronous WASM binary',
    'async function Le(){return(await import("./ocgcore.sync-ORIXRHXI.js")).default.buffer}',
    'async function Le(){throw new Error("Provide the local native WASM binary")}']
]);

export function patchPublishedWrapper(source) {
  for (const [name, before, after] of WRAPPER_PATCHES) {
    const occurrences = source.split(before).length - 1;
    if (occurrences !== 1) throw new Error(`${name}: expected exactly one match, found ${occurrences}`);
    source = source.replace(before, after);
  }
  source = source.replace('//# sourceMappingURL=index.js.map', '');
  return '/* ocgcore-wasm 0.1.2, MIT wrapper; pinned local ABI/protocol patches. See NOTICE.md. */\n'
    + source.trimEnd() + '\n'
    + 'export { ce as encodeNativeResponse, Q as readNativeQuery, te as readNativeMessage, F as NativeBufferReader };\n';
}

export function patchPublishedDeclarations(source) {
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const before = [
    'export declare interface OcgMessageMove {',
    '    type: OcgMessageType.MOVE;',
    '    card: number;',
    '    from: OcgLocPos;',
    '    to: OcgLocPos;',
    '}'
  ].join(newline);
  const after = before.replace('    to: OcgLocPos;',
    '    to: OcgLocPos;' + newline + '    /** Native uint32 reason flags, preserved from MSG_MOVE. */'
    + newline + '    reason: number;');
  const occurrences = source.split(before).length - 1;
  if (occurrences !== 1) throw new Error(`Move reason declaration: expected exactly one match, found ${occurrences}`);
  // Git stores this generated declaration file as text; keep regeneration
  // byte-identical after checkout as well as in the current workspace.
  return source.replace(before, after).replace(/\r\n/g, '\n');
}

export async function generateVendor(packageDirectory, outputDirectory = dirname(fileURLToPath(import.meta.url)), builtSyncLoader = null) {
  const packageInfo = JSON.parse(await readFile(resolve(packageDirectory, 'package.json'), 'utf8'));
  if (packageInfo.name !== 'ocgcore-wasm' || packageInfo.version !== '0.1.2') {
    throw new Error('Expected the exact published ocgcore-wasm@0.1.2 package');
  }
  const source = await readFile(resolve(packageDirectory, 'dist/index.js'), 'utf8');
  if (createHash('sha256').update(source).digest('hex') !== '5642dad500a7e801fa87190fe937b6efb4e8448a7cf6421836a60a039984379d') {
    throw new Error('Published wrapper SHA-256 does not match the pinned package');
  }
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, 'index.js'), patchPublishedWrapper(source));
  for (const name of ['chunk-6GYI7QPM.js', 'chunk-L5TW24SS.js', 'ocgcore.sync-MMMSWPBB.js']) {
    if (name === 'ocgcore.sync-MMMSWPBB.js' && builtSyncLoader) {
      await copyFile(builtSyncLoader, resolve(outputDirectory, name));
    } else {
      const contents = await readFile(resolve(packageDirectory, 'dist', name), 'utf8');
      await writeFile(resolve(outputDirectory, name), contents.split('\n').filter(line => !line.startsWith('//# sourceMappingURL=')).join('\n').trimEnd() + '\n');
    }
  }
  const declarations = await readFile(resolve(packageDirectory, 'dist/index.d.ts'), 'utf8');
  await writeFile(resolve(outputDirectory, 'index.d.ts'), patchPublishedDeclarations(declarations));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node apply-patches.mjs /path/to/extracted/npm/package [output-directory] [built-sync-loader]');
  await generateVendor(resolve(process.argv[2]), process.argv[3] ? resolve(process.argv[3]) : undefined,
    process.argv[4] ? resolve(process.argv[4]) : null);
}
