import test from 'node:test';import assert from 'node:assert/strict';import {makeProject,execute} from '../../src/cli/agent-engine.mjs';
test('rig commands survive JSON save/load and never mutate original layer',()=>{
 const p=makeProject('rig test','standard');const run=c=>execute(p,{commands:[c]},{projectPath:'/tmp/rig-project.json'}).at(-1);
 run({op:'createRig',view:'front',joints:[{id:'root',parent:null,position:{x:100,y:100}},{id:'hand',parent:'root',position:{x:120,y:100}}],bindings:[{category:'handLeft',joint:'hand',anchor:{x:0,y:0}}]});
 p.assets.sprite={width:20,height:20,name:'sprite.png',src:'data:image/png;base64,AA=='};
 p.scenes.front.stand={stand_1:[{id:'layer1',assetId:'sprite',category:'handLeft',visible:true,transform:{x:120,y:100,rotationDeg:0},crop:{x:0,y:0,w:20,h:20}}]};
 run({op:'setPose',view:'front',animation:'stand',frame:'stand_1',pose:{root:{rotationDeg:90}}});
 const changed=run({op:'listPosedLayers',view:'front',animation:'stand',frame:'stand_1'}).value[0];
 assert.ok(Math.abs(changed.transform.x-100)<1e-8);assert.ok(Math.abs(changed.transform.y-120)<1e-8);
 assert.equal(p.scenes.front.stand.stand_1[0].transform.x,120);
 run({op:'setMotion',view:'front',animation:'stand',keyframes:[{timeMs:0,pose:{hand:{rotationDeg:0}}},{timeMs:100,pose:{hand:{rotationDeg:90}}}]});
 assert.equal(run({op:'samplePose',view:'front',animation:'stand',timeMs:50}).value.hand.rotationDeg,45);
 const q=JSON.parse(JSON.stringify(p));assert.equal(q.rigs.front.joints.length,2);assert.equal(q.poses.front.stand.stand_1.root.rotationDeg,90);
});
