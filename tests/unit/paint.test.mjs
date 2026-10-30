import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rectangleMask,polygonMask,floodMask,regularPolygon,applyMaskAlpha} from '../../src/editor/paint-core.mjs';

test('rectangle selection clips to the canvas',()=>{
 const mask=rectangleMask(6,4,{x:-1,y:1},{x:3,y:3});
 assert.equal(mask.reduce((a,b)=>a+b,0),6);
 assert.equal(mask[0],0);assert.equal(mask[6],1);
});
test('rectangle works for reverse-direction dragging',()=>{
 assert.deepEqual(rectangleMask(8,8,{x:5,y:6},{x:2,y:2}),rectangleMask(8,8,{x:2,y:2},{x:5,y:6}));
});
test('freeform polygon selects only the interior',()=>{
 const m=polygonMask(10,10,[{x:1,y:1},{x:8,y:1},{x:8,y:8},{x:1,y:8}]);
 assert.equal(m.reduce((a,b)=>a+b,0),49);assert.equal(m[0],0);assert.equal(m[2*10+2],1);
});
test('unfinished freeform does not select anything',()=>{
 assert.equal(polygonMask(5,5,[{x:0,y:0},{x:4,y:0}]).reduce((a,b)=>a+b,0),0);
});
test('magic wand is four-way connected, not global color replacement',()=>{
 const w=4,h=3,d=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<w*h;i++){d[i*4]=0;d[i*4+3]=255;}
 for(const i of [0,1,4,8,11])d[i*4]=255;
 const m=floodMask(d,w,h,0,0,0);
 assert.equal(m.reduce((a,b)=>a+b,0),4);assert.equal(m[11],0);
});
test('magic wand tolerance includes nearby but excludes distinct colors',()=>{
 const d=new Uint8ClampedArray([100,100,100,255,110,105,100,255,200,200,200,255]);
 assert.deepEqual([...floodMask(d,3,1,0,0,12)],[1,1,0]);
});
test('magic wand rejects unsafe dimensions',()=>{
 assert.throws(()=>floodMask(new Uint8Array(4),4000,4000,0,0),/safe/);
});
test('regular polygons honor configurable side count limits',()=>{
 assert.equal(regularPolygon(0,0,10,0,7).length,7);
 assert.equal(regularPolygon(0,0,10,0,2).length,3);
 assert.equal(regularPolygon(0,0,10,0,500).length,64);
});
test('mask clipping preserves in-selection alpha only',()=>{
 const pixels=new Uint8ClampedArray([1,2,3,255,4,5,6,128]);
 applyMaskAlpha(pixels,new Uint8Array([1,0]));assert.equal(pixels[3],255);assert.equal(pixels[7],0);
 assert.throws(()=>applyMaskAlpha(pixels,new Uint8Array(3)),/dimensions/);
});
