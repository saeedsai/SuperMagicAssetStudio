import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {makeProject,execute} from '../../src/cli/agent-engine.mjs';
import {readPNG,encodePNG,renderFrame} from '../../src/cli/agent-raster.mjs';
import {executePaint} from '../../src/cli/agent-paint.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const catalog=JSON.parse(fs.readFileSync(path.join(repo,'src/shared/ui-capabilities.json')));
const html=fs.readFileSync(path.join(repo,'index.html'),'utf8');
const make=()=>{const p=makeProject('Paint test');p.canvas={width:40,height:40};p.assetStorage='bundled';return p;};
const run=(p,cmd)=>execute(p,{commands:[cmd]},{projectPath:'/tmp/supermagic-test-project.json',results:[]});
test('Complete catalog has one entry for every live HTML form and action ID',()=>{
 const controls=[...html.matchAll(/<(?:button|input|select|textarea)\b[^>]*\bid="([^"]+)"/g)].map(x=>x[1]);
 const manifest=catalog.controls.map(x=>x.id);
 assert.equal(new Set(manifest).size,manifest.length);
 assert.deepEqual([...manifest].sort(),[...controls].sort());
 assert(controls.length>=200);
 assert(catalog.controls.some(x=>x.id==='paintSize'&&x.cli==='setting'));
 assert(catalog.controls.some(x=>x.id==='menuManualSplit'&&x.operation==='splitImageManual'));
});
test('CLI project properties and paint settings are writable, inspectable and verified',()=>{
 const p=make();
 run(p,{op:'setControlValue',id:'paintSize',value:12});
 run(p,{op:'setControlValue',id:'paintColor',value:'#ff3300'});
 run(p,{op:'setControlValue',id:'canvasWidth',value:40});
 const o=run(p,{op:'getControlValue',id:'paintSize'});
 assert.equal(o.at(-1).value,12);
 assert.equal(p.editor.uiOptions.paintColor,'#ff3300');
 assert.throws(()=>run(p,{op:'setControlValue',id:'paintColor',value:'bad'}),/color/);
 assert.throws(()=>run(p,{op:'setControlValue',id:'paintTool',value:'not-a-tool'}),/Unsupported option/);
 assert.throws(()=>run(p,{op:'setControlValue',id:'menuHelp',value:1}),/button/);
 const list=run(p,{op:'listCapabilities'}).at(-1).value;
 assert.equal(list.controls.length,catalog.controls.length);
});
test('Brush layers render, preserve project schema and consume configured defaults',()=>{
 const p=make();
 run(p,{op:'setControlValue',id:'paintSize',value:6});
 run(p,{op:'setControlValue',id:'paintColor',value:'#ff0000'});
 const result=run(p,{op:'paint',tool:'brush',points:[{x:7,y:8},{x:28,y:8}]}).at(-1).value;
 assert(result.layerId);
 const rgba=renderFrame(p,{view:'front',animation:'stand',frame:'stand_1'},'/tmp/supermagic-test-project.json');
 const ix=(8*40+15)*4;assert(rgba.data[ix]>200);assert.equal(rgba.data[ix+3],255);
 assert(p.scenes.front.stand.stand_1[0].paintLayer);
});
test('Selection masks, gradients and all fundamental shape variants work',()=>{
 const p=make();
 assert.equal(run(p,{op:'paint',tool:'selection',selection:{type:'rect',x:2,y:2,w:3,h:4}}).at(-1).value.selectedPixels,12);
 const tools=['shape-rect','shape-poly','shape-oval','shape-circle','shape-line','shape-curve'];
 for(const tool of tools){const r=run(p,{op:'paint',tool,start:{x:10,y:10},end:{x:22,y:23},size:2,shapeFill:'fill',sides:7,color:'#00ff00'}).at(-1).value;assert.equal(r.affected,1,tool);}
 const fill=run(p,{op:'paint',tool:'fill',selection:{type:'rect',x:0,y:0,w:4,h:4},color:'#112233',fillMode:'gradient',gradientEnd:'#8899aa'}).at(-1).value;
 assert.equal(fill.affected,1);assert.equal(p.scenes.front.stand.stand_1.length,7);
 assert.throws(()=>run(p,{op:'paint',tool:'fill'}),/selection/);
});
test('Wand selection, color picking, clone and original eraser are headless',()=>{
 const p=make();run(p,{op:'paint',tool:'brush',points:[{x:10,y:10},{x:20,y:10}],size:5,color:'#aa1133'});
 const layers=p.scenes.front.stand.stand_1,old=layers[0].assetId;
 const picked=run(p,{op:'paint',tool:'picker',position:{x:14,y:10}}).at(-1).value.color;
 assert.equal(picked,'#aa1133');
 assert(run(p,{op:'paint',tool:'selection',selection:{type:'wand',seed:{x:14,y:10},tolerance:0}}).at(-1).value.selectedPixels>0);
 assert.equal(run(p,{op:'paint',tool:'clone',points:[{x:25,y:20},{x:28,y:20}],cloneSource:{x:12,y:10},size:4}).at(-1).value.affected,1);
 const erased=run(p,{op:'paint',tool:'eraser',eraseMode:'original',layerId:layers[0].id,points:[{x:13,y:10},{x:18,y:10}],size:12}).at(-1).value;
 assert.equal(erased.affected,1);assert.notEqual(layers[0].assetId,old);assert(p.assets[old]);
});
test('Bitmap text, imported texture and bad font validation',()=>{
 const p=make();
 assert.equal(run(p,{op:'paint',tool:'text',text:'GO!',font:'bitmap',fontSize:8,start:{x:1,y:1}}).at(-1).value.affected,1);
 assert.throws(()=>run(p,{op:'paint',tool:'text',text:'A',font:'Arial'}),/bitmap/);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'studio-paint-'));try{
  const tile={width:2,height:2,data:Buffer.from([20,40,60,255,20,40,60,255,20,40,60,255,20,40,60,255])};
  const source=path.join(temp,'texture.png');fs.writeFileSync(source,encodePNG(tile));
  assert.equal(run(p,{op:'paint',tool:'brush',points:[{x:20,y:20}],size:6,texture:'imported',textureFile:source}).at(-1).value.affected,1);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('Node CLI supports catalog, persisted settings, headless painting and output PNG',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-api-e2e-'));
 const cli=path.join(repo,'src/cli/agent-cli.mjs');
 const invoke=args=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:20000});
 try{
  const list=invoke(['--list-controls']);assert.equal(list.status,0,list.stderr);
  assert.equal(JSON.parse(list.stdout).controls.length,catalog.controls.length);
  const project=path.join(dir,'test.json'),payload={commands:[
   {op:'createProject',name:'CLI paint test'},
   {op:'setCanvas',width:40,height:40},
   {op:'setControlValue',id:'paintColor',value:'#aa6600'},
   {op:'paint',tool:'brush',points:[{x:3,y:4},{x:16,y:4}],size:3},
   {op:'getControlValue',id:'paintColor'},
   {op:'renderPNG',path:path.join(dir,'out.png')}
  ]};
  const runResult=invoke(['--project',project,'--commands',JSON.stringify(payload)]);
  assert.equal(runResult.status,0,runResult.stderr);
  const result=JSON.parse(runResult.stdout);assert.equal(result.saved,true);
  assert.equal(result.results.find(x=>x.op==='getControlValue').value,'#aa6600');
  assert.equal(readPNG(fs.readFileSync(path.join(dir,'out.png'))).width,40);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
