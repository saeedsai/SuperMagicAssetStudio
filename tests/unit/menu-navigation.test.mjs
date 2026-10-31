import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SIDE_WORKSPACES,RIGHT_WORKSPACES,PAINT_PROPERTY_GROUPS} from '../../src/editor/ui/workspace-config.mjs';
import {PAINT_ICON_PATHS} from '../../src/editor/ui/paint-tool-icons.mjs';
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../../src/shared/ui-capabilities.json',import.meta.url),'utf8'));
const reachability=JSON.parse(readFileSync(new URL('../../src/shared/ui-reachability.json',import.meta.url),'utf8'));
test('Import and Tools are one Edit menu, and File includes the additional image import action',()=>{
 assert.match(html,/data-menu="file">File/);
 assert.match(html,/data-menu="edit">Edit/);
 assert.doesNotMatch(html,/data-menu="import"|data-menu="tools"/);
 const edit=html.split('data-menu="edit">Edit')[1].split('data-menu="view">View')[0];
 for(const id of ['menuImportImages','menuImportParts','menuDownloadParts','menuResolveImages','menuManualSplit','menuAutoSplit','menuRemoveBackground','menuImageTools','menuStandaloneBackground','menuAutoFit','menuAutoResize','menuAI','menuUndo','menuRedo']){
  assert(edit.includes('id="'+id+'"'),'Missing action under Edit: '+id);
 }
 assert(html.split('data-menu="file">File')[1].split('data-menu="edit">Edit')[0].includes('id="menuFileImportImage"'));
 assert.equal(catalog.controls.filter(c=>c.id==='menuFileImportImage').length,1);
 assert(!('menuImportImages' in reachability.hiddenAliases),'Edit image import must be visible');
});
test('Paint is a right-workspace with 17 individually iconified options and no top menu',()=>{
 assert(!html.includes('data-menu="paint"'));
 assert(RIGHT_WORKSPACES.some(p=>p.id==='paint'&&p.sectionIndexes.length===1));
 assert(html.includes('id="paintToolboxCommands"'));
 const keys=[...html.matchAll(/data-paint-menu="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(keys.length,16);
 assert.deepEqual([...keys].sort(),Object.keys(PAINT_PROPERTY_GROUPS).sort());
 assert.deepEqual([...new Set([...keys,'clear'])].sort(),Object.keys(PAINT_ICON_PATHS).sort());
 assert(html.includes('id="paintClearMenu"'));
 assert(!('paintClearMenu' in reachability.hiddenAliases),'Clear selection must be visible in Paint');
 assert(RIGHT_WORKSPACES.flatMap(x=>x.sectionIndexes).length===7);
 assert.equal(SIDE_WORKSPACES.length,5);
});
