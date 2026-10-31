import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
test('classic game runtime transforms attached layers with skeletal pose',()=>{
 const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../../src/runtime/runtime.js',import.meta.url),'utf8'),sandbox);
 const project={format:'FootballSpriteStudio',canvas:{width:100,height:100},assets:{img:{}},animations:[{id:'stand',name:'Stand',fps:10,frames:[{id:'f1',name:'Frame 1'}]}],scenes:{front:{stand:{f1:[{assetId:'img',category:'handLeft',visible:true,crop:{x:0,y:0,w:2,h:2},transform:{x:20,y:10,scaleX:1,scaleY:1,rotationDeg:0}}]}}},rigs:{front:{schemaVersion:1,joints:[{id:'root',parent:null,position:{x:10,y:10}}],bindings:[{category:'handLeft',joint:'root',anchor:{x:0,y:0}}]}},poses:{front:{stand:{f1:{root:{rotationDeg:90}}}}}};
 const c=new sandbox.FootballSpriteCharacter(project);c.images.set('img',{});
 const calls=[],ctx={globalAlpha:1,save(){},restore(){},translate(x,y){calls.push([x,y]);},rotate(){},scale(){},drawImage(){}};
 c.draw(ctx,{view:'front',animation:'stand',frame:0,origin:'topLeft'});
 assert.equal(calls.length,2);assert.ok(Math.abs(calls[1][0]-10)<1e-8);assert.ok(Math.abs(calls[1][1]-20)<1e-8);
 assert.equal(project.scenes.front.stand.f1[0].transform.x,20);
});
