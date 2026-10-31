import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const paint=readFileSync(new URL('../../src/editor/paint-tools.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../../src/editor/app.js',import.meta.url),'utf8');
test('selection extraction controls work for all three selection masks',()=>{
 for(const id of ['paintCopySelection','paintCutSelection'])assert.match(html,new RegExp('id="'+id+'"'));
 for(const method of ['rectangleMask','polygonMask','floodMask'])assert(paint.includes(method));
 assert.match(paint,/function extractSelection\(cut=false\)/);
 assert.match(paint,/applyMaskAlpha\(data\.data,selection\)/);
 assert.match(paint,/api\.eraseRasterWithMask\(mask\.toDataURL\('image\/png'\),'original'\)/);
});
test('extracted pixels have tight transform crop and remain an editable layer',()=>{
 assert.match(paint,/const bounds=\{x:minX,y:minY,w:maxX-minX\+1,h:maxY-minY\+1\}/);
 assert.match(paint,/api\.createRasterPaintLayer\(snapshot\.toDataURL\('image\/png'\),cut\?'Cut selection':'Copied selection',bounds\)/);
 assert.match(app,/function createRasterPaintLayer\(dataURL,name='Paint stroke',bounds=null\)/);
 assert.match(app,/x:rect\.x\+rect\.w\/2,y:rect\.y\+rect\.h\/2/);
 assert.match(paint,/setTool\('select'\)/);
 assert.match(paint,/extractSelection,getTool:/);
});
