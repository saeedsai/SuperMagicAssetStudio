/** Pure hierarchical 2D skeletal animation. Angles are degrees; positions are canvas pixels. */
const finite=(v,label)=>{if(typeof v!=='number'||!Number.isFinite(v))throw new Error(label+' must be finite');return v;};
const point=(p,label)=>{if(!p||typeof p!=='object')throw new Error(label+' missing');return {x:finite(p.x,label+'.x'),y:finite(p.y,label+'.y')};};
const copy=x=>structuredClone(x);
export function validateRig(rig){
 if(!rig||!Array.isArray(rig.joints)||!Array.isArray(rig.bindings))throw new Error('Rig needs joints and bindings');
 const ids=new Set();
 for(const j of rig.joints){if(!/^[A-Za-z][\w-]*$/.test(j.id||'')||ids.has(j.id))throw new Error('Invalid or duplicate joint id');ids.add(j.id);point(j.position,'joint '+j.id);if(j.parent===j.id)throw new Error('Joint cannot parent itself');}
 for(const j of rig.joints){if(j.parent!=null&&!ids.has(j.parent))throw new Error('Unknown parent joint '+j.parent);const seen=new Set();let n=j;while(n){if(seen.has(n.id))throw new Error('Rig cycle');seen.add(n.id);n=rig.joints.find(q=>q.id===n.parent);}}
 const parts=new Set();for(const b of rig.bindings){if(!ids.has(b.joint))throw new Error('Unknown binding joint');if(!b.category||parts.has(b.category))throw new Error('Duplicate/invalid part binding');parts.add(b.category);point(b.anchor,'binding anchor');}
 return rig;
}
export function createRig(joints=[],bindings=[]){return validateRig({schemaVersion:1,joints:copy(joints),bindings:copy(bindings)});}
export function setJoint(rig,id,changes){const next=copy(rig),j=next.joints.find(x=>x.id===id);if(!j)throw new Error('Unknown joint '+id);Object.assign(j,copy(changes));return validateRig(next);}
export function bindPart(rig,category,joint,anchor={x:0,y:0}){const next=copy(rig);next.bindings=next.bindings.filter(b=>b.category!==category);next.bindings.push({category,joint,anchor:copy(anchor)});return validateRig(next);}
export function evaluateRig(rig,pose={}){
 validateRig(rig);const byId=new Map(rig.joints.map(j=>[j.id,j]));const result={};
 function compute(id){if(result[id])return result[id];const j=byId.get(id),parent=j.parent?compute(j.parent):null,delta=pose[id]||{};const rest=point(j.position,'joint position'),rotation=finite(delta.rotationDeg??0,'rotationDeg');const dx=finite(delta.x??0,'x'),dy=finite(delta.y??0,'y');
 let x=rest.x+dx,y=rest.y+dy;if(parent){const p=byId.get(j.parent).position,rad=parent.rotationDeg*Math.PI/180,rx=rest.x-p.x+dx,ry=rest.y-p.y+dy;x=parent.x+rx*Math.cos(rad)-ry*Math.sin(rad);y=parent.y+rx*Math.sin(rad)+ry*Math.cos(rad);}
 return result[id]={x,y,rotationDeg:(parent?.rotationDeg||0)+rotation};}
 for(const j of rig.joints)compute(j.id);return result;
}
export function applyPoseToLayers(layers,rig,pose={}){
 const world=evaluateRig(rig,pose),bindings=new Map(rig.bindings.map(b=>[b.category,b]));
 return layers.map(layer=>{const b=bindings.get(layer.category);if(!b||!layer.transform)return copy(layer);
 const j=world[b.joint],rest=rig.joints.find(q=>q.id===b.joint),angle=j.rotationDeg*Math.PI/180;
 // Preserve the layer's original placement relative to the joint's rest origin.
 const t=layer.transform,ax=b.anchor.x,ay=b.anchor.y,ox=t.x-rest.position.x-ax,oy=t.y-rest.position.y-ay;
 const x=j.x+ax+ox*Math.cos(angle)-oy*Math.sin(angle),y=j.y+ay+ox*Math.sin(angle)+oy*Math.cos(angle);
 return {...copy(layer),transform:{...t,x,y,rotationDeg:(t.rotationDeg||0)+j.rotationDeg}};});
}
export function interpolatePose(a={},b={},t=0){const u=Math.max(0,Math.min(1,finite(t,'time'))),out={};for(const id of new Set([...Object.keys(a),...Object.keys(b)])){const l=a[id]||{},r=b[id]||{};out[id]={};for(const prop of ['x','y','rotationDeg']){const v=l[prop]??0,w=r[prop]??0;finite(v,prop);finite(w,prop);out[id][prop]=v+(w-v)*u;}}return out;}
export function sampleMotion(motion,timeMs){if(!motion?.keyframes?.length)return {};const keys=[...motion.keyframes].sort((a,b)=>a.timeMs-b.timeMs);for(let i=0;i<keys.length;i++)finite(keys[i].timeMs,'timeMs');if(timeMs<=keys[0].timeMs)return copy(keys[0].pose||{});if(timeMs>=keys.at(-1).timeMs)return copy(keys.at(-1).pose||{});for(let i=1;i<keys.length;i++)if(timeMs<=keys[i].timeMs){const a=keys[i-1],b=keys[i];return interpolatePose(a.pose,b.pose,(timeMs-a.timeMs)/(b.timeMs-a.timeMs));}return {};}

/** Reusable football pose templates; missing joints are ignored by the evaluator. */
export const FOOTBALL_POSES=Object.freeze({
 idle: {},
 runLeft: {root:{y:-8,rotationDeg:-3},spine:{rotationDeg:4},shoulderLeft:{rotationDeg:30},elbowLeft:{rotationDeg:-45},shoulderRight:{rotationDeg:-35},elbowRight:{rotationDeg:50},hipLeft:{rotationDeg:-35},kneeLeft:{rotationDeg:55},hipRight:{rotationDeg:40},kneeRight:{rotationDeg:-35}},
 runRight: {root:{y:-12,rotationDeg:3},spine:{rotationDeg:-4},shoulderLeft:{rotationDeg:-35},elbowLeft:{rotationDeg:50},shoulderRight:{rotationDeg:30},elbowRight:{rotationDeg:-45},hipLeft:{rotationDeg:40},kneeLeft:{rotationDeg:-35},hipRight:{rotationDeg:-35},kneeRight:{rotationDeg:55}},
 jump: {root:{y:-45},spine:{rotationDeg:-5},shoulderLeft:{rotationDeg:-125},shoulderRight:{rotationDeg:125},hipLeft:{rotationDeg:20},kneeLeft:{rotationDeg:70},hipRight:{rotationDeg:-20},kneeRight:{rotationDeg:-70}},
 celebrate: {root:{y:-10},spine:{rotationDeg:-8},head:{rotationDeg:10},shoulderLeft:{rotationDeg:-135},elbowLeft:{rotationDeg:-20},shoulderRight:{rotationDeg:135},elbowRight:{rotationDeg:20},hipLeft:{rotationDeg:-8},hipRight:{rotationDeg:8}}
});
export function footballPose(name,rig){const pose=FOOTBALL_POSES[name];if(!pose)throw new Error('Unknown football pose '+name);const ids=new Set(validateRig(rig).joints.map(x=>x.id));return Object.fromEntries(Object.entries(pose).filter(([id])=>ids.has(id)).map(([id,v])=>[id,structuredClone(v)]));}
