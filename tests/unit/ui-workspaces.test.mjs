import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SIDE_WORKSPACES,RIGHT_WORKSPACES,HIDDEN_ACTION_ALIASES,PAINT_PROPERTY_GROUPS,PAINT_TOOL_LABELS} from '../../src/editor/ui/workspace-config.mjs';

const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const idSet=new Set(ids);

test('Every interactive DOM control keeps one unique ID',()=>assert.equal(idSet.size,ids.length));
test('All workspace panels mapped exactly once',()=>{
 for(const [groups,n] of [[SIDE_WORKSPACES,6],[RIGHT_WORKSPACES,7]]){
  const assigned=groups.flatMap(x=>x.sectionIndexes);
  assert.deepEqual([...assigned].sort((a,b)=>a-b),Array.from({length:n},(_,i)=>i));
  assert.equal(new Set(groups.map(x=>x.id)).size,groups.length);
 }
});
test('No duplicate command aliases, and every alias has a real action in HTML',()=>{
 assert.equal(new Set(HIDDEN_ACTION_ALIASES).size,HIDDEN_ACTION_ALIASES.length);
 for(const id of HIDDEN_ACTION_ALIASES)assert(idSet.has(id),'Missing compatibility control '+id);
});
test('Every selection and paint tool has exactly one contextual property definition',()=>{
 const menuTools=[...html.matchAll(/data-paint-menu="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(new Set(menuTools).size,menuTools.length);
 for(const tool of menuTools){assert(tool in PAINT_PROPERTY_GROUPS,tool);assert(tool in PAINT_TOOL_LABELS,tool);}
 for(const tool of Object.keys(PAINT_PROPERTY_GROUPS))assert(tool in PAINT_TOOL_LABELS,tool);
});
test('All paint properties reference real original inputs, without cloning IDs',()=>{
 for(const [tool,props] of Object.entries(PAINT_PROPERTY_GROUPS)){
  assert.equal(new Set(props).size,props.length,'Duplicate setting for '+tool);
  for(const id of props)assert(idSet.has(id),'Missing property '+id);
 }
});
test('Tab shell and editor scripts are separate modules, with order preserved',()=>{
 const app=html.indexOf('./src/editor/app.js');
 const paint=html.indexOf('./src/editor/paint-tools.js');
 const shell=html.indexOf('./src/editor/ui/ui-shell.js');
 assert(app>0&&paint>app&&shell>paint);
});
test('Key legacy functionality remains addressable',()=>{
 for(const id of ['saveProject','menuExportPNG','menuExportGIF','menuExportTurntable','menuExportSheet',
 'spriteToolsDialog','bgStandaloneDialog','aiDialog','autoResizeDialog','cropDialog','customPartEditorGrid',
 'viewButtons','animationSelect','frameButtons','layersList','inspectorContent','referenceView',
 'paintColor','paintBrushShape','paintTextureFile','paintGradientEnd','paintFont','paintSides']){
  assert(idSet.has(id),'Feature inaccessible: '+id);
 }
});
