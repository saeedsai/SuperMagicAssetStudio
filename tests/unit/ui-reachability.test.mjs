import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HIDDEN_ACTION_ALIASES,PAINT_PROPERTY_GROUPS} from '../../src/editor/ui/workspace-config.mjs';

const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../../src/shared/ui-capabilities.json',import.meta.url),'utf8'));
const routes=JSON.parse(readFileSync(new URL('../../src/shared/ui-reachability.json',import.meta.url),'utf8'));
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const actionIds=new Set([...html.matchAll(/<(?:button|input|select|textarea)\b[^>]*?\bid="([^"]+)"/g)].map(m=>m[1]));

test('Every hidden duplicate maps to an explicit existing, distinct canonical affordance',()=>{
 const aliases=Object.keys(routes.hiddenAliases);
 assert.deepEqual(aliases.slice().sort(),[...HIDDEN_ACTION_ALIASES].sort());
 for(const [id,canonical] of Object.entries(routes.hiddenAliases)){
  assert(ids.has(id),'Missing legacy compatibility alias '+id);
  assert(ids.has(canonical),'Hidden '+id+' lacks canonical '+canonical);
  assert.notEqual(id,canonical,'Self-hidden alias '+id);
 }
 assert(!HIDDEN_ACTION_ALIASES.includes('menuStandaloneBackground'),
  'Standalone cleanup is distinct from sprite splitter background removal; must be visible');
});

test('Hidden export relay buttons are backed by visible File menu export commands',()=>{
 for(const [id,canonical] of Object.entries(routes.hiddenHostAliases)){
  assert(actionIds.has(id),'Missing hidden export relay '+id);
  assert(actionIds.has(canonical),'Missing visible export command '+canonical);
 }
 assert.equal(Object.keys(routes.hiddenHostAliases).length,3);
});

test('Every invisible file input retains a discoverable trigger and appropriate MIME acceptance',()=>{
 const fileInputs=[...html.matchAll(/<input\b[^>]*\btype="file"[^>]*>/g)]
  .map(m=>m[0].match(/\bid="([^"]+)"/)?.[1]).filter(Boolean);
 assert.deepEqual(fileInputs.sort(),Object.keys(routes.fileInputTriggers).sort());
 for(const [id,trigger] of Object.entries(routes.fileInputTriggers)){
  assert(ids.has(trigger)||readFileSync(new URL('../../src/editor/app.js',import.meta.url),'utf8').includes('id="'+trigger+'"'),'Unreachable file picker '+id+' through '+trigger);
  assert.notEqual(id,trigger);
 }
});

test('Machine-readable capability list matches all static inputs and buttons and known alternatives',()=>{
 assert.equal(catalog.controls.length,actionIds.size);
 assert.deepEqual(catalog.controls.map(c=>c.id).sort(),[...actionIds].sort());
 for(const id of Object.keys(routes.alternativeControls)){
  assert(ids.has(id),'Missing intentional alternative '+id);
  assert(typeof routes.alternativeControls[id]==='string');
 }
 for(const id of ['imageEditorToggle','menuManualSplit','menuAutoSplit','menuRemoveBackground','menuStandaloneBackground','menuAI','menuHelp'])assert(actionIds.has(id),id);
});

test('Every contextual painting property has an assigned tool and a real source control',()=>{
 const settings=new Set(Object.values(PAINT_PROPERTY_GROUPS).flat());
 for(const c of catalog.controls.filter(x=>x.id.startsWith('paint'))){
  if(['paintTool','paintClearMenu','paintTextureFile','paintFinishFreeform','paintClearSelection','paintCopySelection','paintCutSelection','paintStop'].includes(c.id))continue;
  if(c.kind==='action'&&['paintImportTexture','paintCopySelection','paintCutSelection'].includes(c.id))continue;
  assert(settings.has(c.id),'Paint property never shown by any tool: '+c.id);
 }
 for(const id of settings)assert(actionIds.has(id),'Missing contextual paint field '+id);
});

test('Selection copy and cut remain contextual Paint commands after workspace relocation',()=>{
 for(const id of ['paintCopySelection','paintCutSelection']){
  assert(actionIds.has(id),'Missing '+id);
  assert(readFileSync(new URL('../../src/editor/ui/ui-shell.js',import.meta.url),'utf8').includes("get('"+id+"')"),
    'Paint contextual UI does not account for '+id);
 }
});

test('All image editor, sprite, and dialog controls are present and wired into the runtime',()=>{
 const scripts=['src/editor/app.js','src/editor/ui/ui-shell.js','src/editor/ui/image-edit-panel.js','src/editor/paint-tools.js'];
 const code=scripts.map(path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8')).join('\n');
 for(const id of routes.requiredDialogs)assert(ids.has(id),'Missing dialog '+id);
 for(const id of ['inspectorContent','paintPropertiesToggle','paintPropertiesPopover','splitControlPanel','customPartsPanel','importQueue']){
  assert(ids.has(id)||code.includes("id='"+id+"'"),'Missing editor landmark '+id);
 }
 for(const route of routes.requiredContextGroups)assert(code.includes("id:'"+route+"'"),'Image edit group missing: '+route);
});
