import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};
vm.runInNewContext(fs.readFileSync('src/editor/project-archive.js','utf8'),{window,TextEncoder,TextDecoder,Uint8Array,Blob,Array,Map,Error});
const {pack,unpack}=window.SuperMagicProjectArchive;
test('ZIP package round trips project JSON and binary image',async()=>{
 const original=new Uint8Array([0,255,128,1,2,3,4]);
 const archive=pack([{name:'project.json',data:JSON.stringify({format:'FootballSpriteStudio'})},{name:'images/asset.png',data:original}]);
 const extracted=await unpack(archive);
 assert.deepEqual(JSON.parse(new TextDecoder().decode(extracted.get('project.json'))),{format:'FootballSpriteStudio'});
 assert.deepEqual(Array.from(extracted.get('images/asset.png')),Array.from(original));
});
test('ZIP rejects unsafe paths and corrupt archives',async()=>{
 assert.throws(()=>pack([{name:'../secret',data:'x'}]),/Unsafe/);
 const archive=pack([{name:'project.json',data:'hello'}]);
 const bad=new Uint8Array(await archive.arrayBuffer());
 bad[bad.indexOf(104)]=105;
 await assert.rejects(()=>unpack(new Blob([bad])),/checksum mismatch/);
});
