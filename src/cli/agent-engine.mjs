/** SuperMagic headless project API; Node.js >=20, no npm dependencies. */
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {executePaint} from './agent-paint.mjs';
const UI_CATALOG=JSON.parse(fs.readFileSync(new URL('../shared/ui-capabilities.json',import.meta.url),'utf8'));
const controlById=new Map(UI_CATALOG.controls.map(x=>[x.id,x]));

export const VIEWS=['front','threeQuarterFrontLeft','left','threeQuarterBackLeft','back','threeQuarterBackRight','right','threeQuarterFrontRight'];
export const MODES=['fullBody','bodyHead','standard','custom'];
export const DEFAULT_COLORS={brightness:100,contrast:100,saturate:100,hue:0,sepia:0,red:100,green:100,blue:100,tintHex:'#ffffff',tintAmount:0};
export const BASE_PARTS=[
 ['head','Head base, ears and neck attachment','Head'],['hairFront','Front hair','Head'],['hairBack','Back hair','Head'],
 ['eyebrows','Eyebrows','Face'],['eyes','Eyes','Face'],['nose','Nose','Face'],['mouth','Mouth and expressions','Face'],['beard','Mustache and beard','Face'],
 ['torso','Torso and jersey','Upper body'],['shirt','Jersey overlay','Upper body'],['sleeveLeft','Left jersey sleeve','Upper body'],['sleeveRight','Right jersey sleeve','Upper body'],
 ['upperArmLeft','Left upper arm','Upper body'],['forearmLeft','Left forearm','Upper body'],['handLeft','Left hand','Upper body'],
 ['upperArmRight','Right upper arm','Upper body'],['forearmRight','Right forearm','Upper body'],['handRight','Right hand','Upper body'],
 ['pelvis','Pelvis','Lower body'],['shorts','Shorts','Lower body'],
 ['upperLegLeft','Left thigh','Lower body'],['lowerLegLeft','Left lower leg','Lower body'],['sockLeft','Left sock','Lower body'],['bootLeft','Left boot','Lower body'],
 ['upperLegRight','Right thigh','Lower body'],['lowerLegRight','Right lower leg','Lower body'],['sockRight','Right sock','Lower body'],['bootRight','Right boot','Lower body'],
 ['accessory','Accessory','Accessories'],['bodyPart','Other body part','Other']
].map(([id,name,group],order)=>({id,name,group,order,default:false}));
export const BODY_HEAD_PARTS=['body','head','hairBack','hairFront','face','eyes','eyebrows','nose','mouth','beard','shirt','shorts','sockLeft','sockRight','bootLeft','bootRight','accessory'].map((id,i)=>({...(BASE_PARTS.find(p=>p.id===id)||{id,name:id,group:'Base'}),order:i}));
export const FULL_PARTS=[{id:'fullBody',name:'Full body',group:'Whole',order:0},{id:'accessory',name:'Accessory',group:'Accessories',order:1}];
const uid=(p)=>`${p}_${randomUUID().slice(0,12)}`;
const cp=x=>structuredClone(x);
const number=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
function check(v,msg){if(!v)throw new Error(msg);}
function restrictId(id){check(/^[A-Za-z][A-Za-z0-9_]{0,60}$/.test(String(id)),`Invalid part id: ${id}`);}
function bounds(n,a,b){return Math.min(b,Math.max(a,n));}
export function makeProject(name='New Football Player',mode='bodyHead'){
 check(MODES.includes(mode),'Unknown mode '+mode);
 return {format:'FootballSpriteStudio',schemaVersion:4,projectName:name,mode,assetStorage:'external',partDefinitions:null,canvas:{width:768,height:768},
 viewOrder:VIEWS.slice(),animations:[{id:'stand',name:'Stand',fps:6,frames:[{id:'stand_1',name:'Stand 1'}]},{id:'run',name:'Run',fps:8,frames:[{id:'run_1',name:'Run 1'},{id:'run_2',name:'Run 2'}]}],assets:{},
 scenes:Object.fromEntries(VIEWS.map(v=>[v,{}])),defaults:{},editor:{grid:false,rulers:false,gridSize:32,snap:false,reference:null,cliCursor:{view:'front',animation:'stand',frame:'stand_1'}}};
}
export function modeParts(p,mode=p.mode){return mode==='fullBody'?cp(FULL_PARTS):mode==='bodyHead'?cp(BODY_HEAD_PARTS):mode==='standard'?cp(BASE_PARTS):cp(p.partDefinitions?.parts||[]);}
export function makeParts(parts,base='custom'){
 check(Array.isArray(parts),'parts must be an array');const ids=new Set();
 return {format:'SuperMagicParts',schemaVersion:1,base,parts:parts.map((q,i)=>{const v={id:q.id,name:q.name,group:q.group||'Custom',default:!!q.default,order:i,...(q.defaultPlacement?{defaultPlacement:q.defaultPlacement}:{})};restrictId(v.id);check(typeof v.name==='string'&&v.name.trim(),'Every part must have a name');check(!ids.has(v.id),'Duplicate part id '+v.id);ids.add(v.id);return v;})};
}
export function migrate(p){check(p?.format==='FootballSpriteStudio','Not a FootballSpriteStudio JSON');p.scenes||={};for(const v of VIEWS)p.scenes[v]||={};p.assets||={};p.defaults||={};p.editor||={};p.editor.cliCursor||={view:'front',animation:p.animations?.[0]?.id||'stand',frame:p.animations?.[0]?.frames?.[0]?.id||'stand_1'};p.assetStorage||='bundled';p.mode||='bodyHead';p.viewOrder=VIEWS.slice();p.schemaVersion=Math.max(4,p.schemaVersion||1);return p;}
function sourceScene(p,view,animation,frame){check(VIEWS.includes(view),'Unknown view: '+view);const a=p.animations.find(x=>x.id===animation);check(a,'Unknown animation: '+animation);check(a.frames.some(x=>x.id===frame),'Unknown frame: '+frame);return ((p.scenes[view]||={})[animation]||={})[frame]||= [];}
function sourceAnimation(p,id){const a=p.animations.find(x=>x.id===id);check(a,'Unknown animation: '+id);return a;}
function cursor(p,c={}){const ec=p.editor.cliCursor||{};const animation=c.animation||ec.animation||p.animations[0].id;const a=sourceAnimation(p,animation);return {view:c.view||ec.view||'front',animation,frame:c.frame||((animation===ec.animation)?ec.frame:null)||a.frames[0].id};}
function selectBuckets(p,c={}){
 const cur=cursor(p,c),scope=c.scope||'currentFrame',o=[];
 const views=scope==='all'?VIEWS:(scope==='allCurrentView'||scope==='currentAnimationCurrentView'||scope==='currentFrame')?[cur.view]:Array.isArray(c.views)?c.views:[cur.view];
 const animations=scope==='all'||scope==='allCurrentView'?p.animations:[sourceAnimation(p,cur.animation)];
 for(const v of views)for(const a of animations)for(const f of a.frames){if(scope==='currentFrame'&&f.id!==cur.frame)continue;o.push({view:v,animation:a.id,frame:f.id,layers:sourceScene(p,v,a.id,f.id)});}return o;
}
function matchedLayers(p,c){const selector=c.match||{};return selectBuckets(p,c).flatMap(b=>b.layers.map((layer,index)=>({...b,layer,index})).filter(x=>(!selector.id||selector.id===x.layer.id)&&(!selector.name||selector.name===x.layer.name)&&(!selector.category||selector.category===x.layer.category)&&(!selector.nameContains||x.layer.name.toLowerCase().includes(String(selector.nameContains).toLowerCase()))));}
function assetDimensions(p,id){const a=p.assets[id];check(a,'Unknown asset: '+id);return {width:a.width,height:a.height};}
function validateCrop(c,a){check(c.w>0&&c.h>0&&c.x>=0&&c.y>=0&&c.x+c.w<=a.width&&c.y+c.h<=a.height,'Crop outside image bounds');}
function transformDefault(p,category,c){const base=category==='head'?[.5,.235,.26]:category==='fullBody'?[.5,.5,.85]:category==='body'?[.5,.56,.72]:category==='shirt'?[.5,.42,.42]:category==='shorts'?[.5,.67,.34]:[.5,.5,.25];const height=p.canvas.height*base[2];const s=height/Math.max(c.h,1);return {x:p.canvas.width*base[0],y:p.canvas.height*base[1],scaleX:s,scaleY:s,rotationDeg:0,opacity:1,flipX:false,flipY:false,anchorX:.5,anchorY:.5};}
function relativeSource(p,ref,projectPath){const base=path.dirname(path.resolve(projectPath));const f=path.resolve(base,ref);return f;}
function importedAsset(p,c,projectPath){const id=c.id||uid('asset');check(!p.assets[id],'Asset already exists '+id);
 const a={name:c.name||path.basename(c.file||c.fileRef||`${id}.png`),fileRef:c.fileRef||undefined,mime:c.mime||'image/png',width:number(c.width),height:number(c.height)};
 if(c.file){const fp=path.resolve(c.file);check(fs.existsSync(fp),'Missing asset file: '+fp);const data=fs.readFileSync(fp);const dimensions=pngSize(data);a.width||=dimensions.width;a.height||=dimensions.height;if(p.assetStorage==='bundled')a.src=`data:image/png;base64,${data.toString('base64')}`;else {const basename=`assets/${id}${path.extname(c.file).toLowerCase()||'.png'}`;a.fileRef=basename;a.__pendingFile=fp;}}
 else if(c.src){check(/^data:image\/(png|webp|jpeg);base64,/.test(c.src),'src must be base64 image data URL');a.src=c.src;const buf=Buffer.from(c.src.split(',')[1],'base64');if(!a.width||!a.height){const d=pngSize(buf);a.width=d.width;a.height=d.height;}}
 else {a.fileRef||=a.name;}
 check(a.width>0&&a.height>0,'Asset dimensions are required');p.assets[id]=a;return {id,width:a.width,height:a.height};
}
function pngSize(b){check(b.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')),'Only PNG imports supported for image-file operations');return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};}
export function resolveLayers(p,view,animation,frame,seen=new Set()){
 const key=animation+':'+frame;if(seen.has(key))return [];seen.add(key);const f=p.animations.find(a=>a.id===animation)?.frames.find(x=>x.id===frame);const inherited=f?.reuse?resolveLayers(p,view,f.reuse.animation,f.reuse.frame,seen):[];return inherited.concat(p.scenes[view]?.[animation]?.[frame]||[]);
}
export function reviewProject(p,projectPath){const warnings=[];let total=0;for(const [id,a] of Object.entries(p.assets)){const exists=!!a.src||!!a.__pendingFile||fs.existsSync(relativeSource(p,a.fileRef||a.name||'',projectPath));if(!exists)warnings.push(`Missing asset ${id}: ${a.fileRef||a.name}`);}
 for(const view of VIEWS)for(const anim of p.animations)for(const f of anim.frames){const l=p.scenes[view]?.[anim.id]?.[f.id]||[];total+=l.length;for(const q of l){if(!p.assets[q.assetId])warnings.push(`Missing assetId ${q.assetId} on ${view}/${anim.id}/${f.id}`);else if(q.crop){const a=p.assets[q.assetId];if(q.crop.x<0||q.crop.y<0||q.crop.x+q.crop.w>a.width||q.crop.y+q.crop.h>a.height)warnings.push(`Invalid crop for ${q.name}`);}}
 if(f.reuse&&!p.animations.find(a=>a.id===f.reuse.animation)?.frames.find(g=>g.id===f.reuse.frame))warnings.push(`Broken frame link ${anim.id}/${f.id}`);
 }
 return {valid:warnings.length===0,warnings,assetCount:Object.keys(p.assets).length,layerCount:total,views:VIEWS.length,animations:p.animations.map(a=>({id:a.id,frames:a.frames.length,fps:a.fps}))};
}
function summarize(p){return {format:p.format,projectName:p.projectName,mode:p.mode,assetStorage:p.assetStorage,canvas:p.canvas,partCount:modeParts(p).length,assetCount:Object.keys(p.assets).length,views:VIEWS,animations:p.animations.map(a=>({id:a.id,frames:a.frames.length,fps:a.fps})),active:p.editor.cliCursor};}
function copyView(p,c){const src=c.source||c.from, dest=c.view||c.to||cursor(p).view;check(VIEWS.includes(src)&&VIEWS.includes(dest),'Unknown source or destination view');let copied=0;for(const a of (c.animation?[sourceAnimation(p,c.animation)]:p.animations))for(const f of a.frames){const target=sourceScene(p,dest,a.id,f.id),source=sourceScene(p,src,a.id,f.id).filter(l=>!c.category||l.category===c.category);if(c.replace!==false){for(let i=target.length-1;i>=0;i--)if(!c.category||target[i].category===c.category)target.splice(i,1);}for(const l of source){const n=cp(l);n.id=uid('layer');if(c.mirror){n.transform.x=p.canvas.width-n.transform.x;n.transform.rotationDeg=-n.transform.rotationDeg;n.transform.flipX=!n.transform.flipX;}target.push(n);copied++;}}return {copied};}
function reverseActions(p,c){const items=matchedLayers(p,c);for(const x of items){const arr=x.layers,index=arr.indexOf(x.layer);if(index<0)continue;arr.splice(index,1);let next=c.direction==='front'?arr.length:c.direction==='back'?0:c.direction==='up'?Math.min(arr.length,index+1):Math.max(0,index-1);arr.splice(next,0,x.layer);}return items.length;}
function copyFrame(p,c){const src=c.sourceFrame||cursor(p,c).frame;const a=sourceAnimation(p,c.animation||cursor(p).animation),from=a.frames.find(f=>f.id===src);check(from,'Missing source frame');const targetId=c.id||uid('frame');check(!a.frames.some(f=>f.id===targetId),'Target frame exists');const dest={id:targetId,name:c.name||from.name+' copy'};if(c.link)dest.reuse={animation:a.id,frame:from.id};a.frames.push(dest);if(!c.link)for(const v of VIEWS)sourceScene(p,v,a.id,targetId).push(...cp(sourceScene(p,v,a.id,from.id)).map(l=>({...l,id:uid('layer')})));return dest;}

/** Executes structured commands in memory. Node CLI saves atomically after execution. */
export function execute(p,payload,{projectPath,results=[]}={}){
 check(Array.isArray(payload?.commands),'Provide {"commands":[...]}');const root=path.dirname(path.resolve(projectPath));
 for(const [pos,c] of payload.commands.entries()){
  check(c?.op,`Command #${pos+1} missing op`);let out={op:c.op};const active=()=>cursor(p,c);
  switch(c.op){
   case 'createProject':{const other=makeProject(c.name||'New player',c.mode||'bodyHead');Object.keys(p).forEach(k=>delete p[k]);Object.assign(p,other);if(c.assetStorage)p.assetStorage=c.assetStorage;break;}
   case 'setProjectName':p.projectName=String(c.name||'New player');break;
   case 'setCanvas':check(number(c.width)>0&&number(c.height)>0&&number(c.width)<=4096&&number(c.height)<=4096,'Canvas must be between 1 and 4096');p.canvas={width:Math.round(c.width),height:Math.round(c.height)};break;
   case 'setMode':check(MODES.includes(c.mode),'Unknown mode');p.mode=c.mode;break;
   case 'setImageStorage':check(['external','bundled'].includes(c.mode),'Unknown storage mode');p.assetStorage=c.mode;break;
   case 'setView':check(VIEWS.includes(c.view),'Unknown view');p.editor.cliCursor={...active(),view:c.view};break;
   case 'rotateView':p.editor.cliCursor={...active(),view:VIEWS[(VIEWS.indexOf(active().view)+(number(c.steps,1)%8)+8)%8]};break;
   case 'setAnimation':sourceAnimation(p,c.animation);p.editor.cliCursor={...active(),animation:c.animation,frame:sourceAnimation(p,c.animation).frames[0].id};break;
   case 'setFrame':check(sourceAnimation(p,active().animation).frames.some(f=>f.id===c.frame),'Unknown frame');p.editor.cliCursor={...active(),frame:c.frame};break;
   case 'setEditor':p.editor={...p.editor,...c.changes,cliCursor:p.editor.cliCursor};break;
   case 'setGrid':p.editor={...p.editor,grid:!!c.enabled,rulers:c.rulers??p.editor.rulers,snap:c.snap??p.editor.snap,gridSize:c.size??p.editor.gridSize};break;
   case 'setReference':p.editor.reference={enabled:c.enabled!==false,view:c.view||active().view,animation:c.animation||active().animation,frame:c.frame||active().frame,alpha:bounds(number(c.alpha,.3),.05,.9)};break;
   case 'clearReference':p.editor.reference=null;break;
   case 'setDefault':{const view=c.view||active().view;check(VIEWS.includes(view),'Unknown view');(p.defaults[view]||={})[c.category]=cp(c.transform||{});break;}
   case 'setPartsDefinition':{
    if(c.parts)p.partDefinitions=makeParts(c.parts,c.base||'custom');else {const base=c.base||'standard';const src=base==='current'?p.partDefinitions?.parts||[]:modeParts(p,base);p.partDefinitions=makeParts(src,base);}p.mode='custom';out.count=p.partDefinitions.parts.length;break;
   }
   case 'addCustomPart':case 'updatePart':{const parts=cp(p.partDefinitions?.parts||[]),id=c.id||`custom_${String(c.name||'part').replace(/\W/g,'_')}`;restrictId(id);const index=parts.findIndex(q=>q.id===id);if(c.op==='updatePart')check(index>=0,'Unknown part '+id);const item={id,name:c.name||id,group:c.group||'Custom',default:!!c.default,order:index>=0?index:parts.length};if(index>=0)parts[index]={...parts[index],...c,id};else parts.push(item);p.partDefinitions=makeParts(parts,p.partDefinitions?.base||'custom');p.mode='custom';out.id=id;break;}
   case 'removePart':{const parts=cp(p.partDefinitions?.parts||[]).filter(x=>x.id!==c.id);p.partDefinitions=makeParts(parts,p.partDefinitions?.base||'custom');break;}
   case 'reorderPart':{const parts=cp(p.partDefinitions?.parts||[]),i=parts.findIndex(x=>x.id===c.id);check(i>=0,'Unknown part');const [part]=parts.splice(i,1);parts.splice(bounds(Math.round(number(c.toIndex)),0,parts.length),0,part);p.partDefinitions=makeParts(parts,p.partDefinitions?.base||'custom');break;}
   case 'exportPartsDefinition':out.parts=makeParts(modeParts(p,c.mode||'custom'),c.mode||'custom');if(c.path){fs.mkdirSync(path.dirname(path.resolve(c.path)),{recursive:true});fs.writeFileSync(path.resolve(c.path),JSON.stringify(out.parts,null,2));}break;
   case 'addAsset':out.asset=importedAsset(p,c,projectPath);break;
   case 'replaceAsset':{check(p.assets[c.id],'Unknown asset '+c.id);const keep=p.assets[c.id];delete p.assets[c.id];try{out.asset=importedAsset(p,c,projectPath);}catch(e){p.assets[c.id]=keep;throw e;}break;}
   case 'removeAsset':{check(p.assets[c.id],'Unknown asset');for(const v of VIEWS)for(const a of p.animations)for(const f of a.frames)check(!sourceScene(p,v,a.id,f.id).some(l=>l.assetId===c.id),'Asset still used by layers');delete p.assets[c.id];break;}
   case 'addLayer':{
    const where=active(),a=p.assets[c.assetId];check(a,'Unknown assetId '+c.assetId);const co={x:0,y:0,w:a.width,h:a.height,...c.crop};validateCrop(co,a);
    const layer={id:c.id||uid('layer'),name:c.name||a.name,category:c.category||'accessory',assetId:c.assetId,visible:c.visible!==false,locked:!!c.locked,crop:co,transform:{...transformDefault(p,c.category,co),...(p.defaults[where.view]?.[c.category]||{}),...(c.transform||{})},color:{...DEFAULT_COLORS,...(c.color||{})}};
    const items=sourceScene(p,where.view,where.animation,where.frame);check(!items.some(x=>x.id===layer.id),'Duplicate layer ID');const index=Number.isFinite(Number(c.order))?bounds(Math.round(c.order),0,items.length):items.length;items.splice(index,0,layer);out.layerId=layer.id;break;
   }
   case 'autoResizeMatching':{
     // Source-image relative scale can be copied across camera directions and animation frames.
     const current=active();
     const sourceSel=c.sourceMatch||c.match||{};
     const source=matchedLayers(p,{...current,scope:'currentFrame',match:sourceSel})[0]?.layer;
     check(source,'No source layer matched for autoResizeMatching');
     const compare=c.matchBy||'category';const method=c.method||'sourceScale',scope=c.scope||'all';
     check(['category','name','assetId'].includes(compare),'Unknown matchBy');
     check(['sourceScale','renderedHeight','renderedWidth'].includes(method),'Unknown resize method');
     check(['currentFrame','currentAnimation','currentView','all'].includes(scope),'Unknown resize scope');
     const views=['currentFrame','currentView'].includes(scope)?[current.view]:VIEWS;
     const animations=['currentFrame','currentAnimation'].includes(scope)?[sourceAnimation(p,current.animation)]:p.animations;
     let count=0;
     for(const view of views)for(const a of animations)for(const f of a.frames){
       if(scope==='currentFrame'&&f.id!==current.frame)continue;
       const layers=sourceScene(p,view,a.id,f.id);
       for(const l of layers){if(l[compare]!==source[compare])continue;
         let sx,sy;
         if(method==='sourceScale'){sx=source.transform.scaleX;sy=source.transform.scaleY;}
         else if(method==='renderedHeight'){const scale=source.crop.h*source.transform.scaleY/Math.max(1,l.crop.h);sx=sy=scale;}
         else{const scale=source.crop.w*source.transform.scaleX/Math.max(1,l.crop.w);sx=sy=scale;}
         l.transform.scaleX=bounds(sx,.001,30);l.transform.scaleY=bounds(sy,.001,30);count++;
       }
     }
     out.count=count;break;
   }
   case 'setLayer':case 'setColor':case 'setCrop':case 'setTransform':case 'setVisibility':case 'mirrorLayer':case 'lockLayer':case 'autoFit':{
    const found=matchedLayers(p,c);check(found.length>0,'No matching layers');for(const {layer:l} of found){const v=c.changes||{};
     if(c.op==='setLayer'){if(v.transform)Object.assign(l.transform,v.transform);if(v.crop){const next={...l.crop,...v.crop};validateCrop(next,p.assets[l.assetId]);l.crop=next;}if(v.color)Object.assign(l.color||=(cp(DEFAULT_COLORS)),v.color);for(const k of ['visible','locked','name','category'])if(k in v)l[k]=v[k];}
     else if(c.op==='setColor')Object.assign(l.color||=(cp(DEFAULT_COLORS)),c.color||c.changes||{});
     else if(c.op==='setCrop'){const co={...l.crop,...(c.crop||{})};validateCrop(co,p.assets[l.assetId]);l.crop=co;}
     else if(c.op==='setTransform')Object.assign(l.transform,c.transform||{});
     else if(c.op==='setVisibility')l.visible=c.visible!==false;
     else if(c.op==='mirrorLayer'){l.transform.flipX=!l.transform.flipX;if(c.reflectPosition)l.transform.x=p.canvas.width-l.transform.x;}
     else if(c.op==='lockLayer')l.locked=c.locked!==false;
     else if(c.op==='autoFit'){const cat=l.category;const bounds=(cat==='head'?[.5,.20,.27]:cat==='shirt'?[.5,.43,.32]:cat==='shorts'?[.5,.62,.23]:cat==='accessory'?[.5,.36,.15]:[.5,.5,.3]);const sc=p.canvas.height*bounds[2]/l.crop.h;l.transform={...l.transform,x:p.canvas.width*bounds[0],y:p.canvas.height*bounds[1],scaleX:sc,scaleY:sc};}
    }out.count=found.length;break;
   }
   case 'moveLayer':out.count=reverseActions(p,c);break;
   case 'deleteLayer':{const items=matchedLayers(p,c);for(const x of items.slice().reverse()){const idx=x.layers.indexOf(x.layer);if(idx>=0)x.layers.splice(idx,1);}out.count=items.length;break;}
   case 'cloneLayer':{const items=matchedLayers(p,c);for(const x of items){const to=sourceScene(p,c.toView||x.view,c.toAnimation||x.animation,c.toFrame||x.frame),n={...cp(x.layer),id:uid('layer')};if(c.mirror){n.transform.flipX=!n.transform.flipX;n.transform.x=p.canvas.width-n.transform.x;n.transform.rotationDeg=-n.transform.rotationDeg;}to.push(n);}out.count=items.length;break;}
   case 'reuseView':out= {...out,...copyView(p,c)};break;
   case 'createAnimation':{const id=c.id||uid('animation');check(!p.animations.some(x=>x.id===id),'Animation exists');const a={id,name:c.name||id,fps:number(c.fps,8),frames:(c.frames||[`${id} 1`]).map((name,i)=>typeof name==='string'?{id:`${id}_${i+1}`,name}:{id:name.id||uid('frame'),name:name.name||name.id,reuse:name.reuse})};check(a.frames.length>0,'Animation needs a frame');p.animations.push(a);out.id=id;break;}
   case 'renameAnimation':{const a=sourceAnimation(p,c.animation||active().animation);a.name=String(c.name);break;}
   case 'setFPS':{const a=sourceAnimation(p,c.animation||active().animation);a.fps=bounds(number(c.fps,8),1,120);break;}
   case 'deleteAnimation':{check(p.animations.length>1,'Cannot delete last animation');const id=c.animation||active().animation;sourceAnimation(p,id);p.animations=p.animations.filter(a=>a.id!==id);for(const v of VIEWS)delete p.scenes[v][id];if(p.editor.cliCursor.animation===id)p.editor.cliCursor={view:'front',animation:p.animations[0].id,frame:p.animations[0].frames[0].id};break;}
   case 'addFrame':{const a=sourceAnimation(p,c.animation||active().animation);const id=c.id||uid('frame');check(!a.frames.some(f=>f.id===id),'Duplicate frame');if(c.reuse)check(p.animations.find(x=>x.id===c.reuse.animation)?.frames.find(f=>f.id===c.reuse.frame),'Invalid frame reuse');a.frames.push({id,name:c.name||id,...(c.reuse?{reuse:c.reuse}:{})});out.id=id;break;}
   case 'duplicateFrame':out.frame=copyFrame(p,c);break;
   case 'deleteFrame':{const a=sourceAnimation(p,c.animation||active().animation),id=c.frame||active().frame;check(a.frames.length>1,'Cannot delete last frame');check(a.frames.some(f=>f.id===id),'Missing frame');a.frames=a.frames.filter(f=>f.id!==id);for(const v of VIEWS)delete p.scenes[v]?.[a.id]?.[id];if(p.editor.cliCursor.frame===id)p.editor.cliCursor.frame=a.frames[0].id;break;}
   case 'linkFrame':{const a=sourceAnimation(p,c.animation||active().animation),f=a.frames.find(x=>x.id===(c.frame||active().frame));check(f,'Frame not found');const reuse=c.reuse||{animation:c.sourceAnimation,frame:c.sourceFrame};check(p.animations.find(x=>x.id===reuse.animation)?.frames.find(x=>x.id===reuse.frame),'Linked frame not found');f.reuse=reuse;break;}
   case 'unlinkFrame':{const a=sourceAnimation(p,c.animation||active().animation),f=a.frames.find(x=>x.id===(c.frame||active().frame));check(f,'Frame not found');if(f.reuse){for(const v of VIEWS)sourceScene(p,v,a.id,f.id).unshift(...cp(resolveLayers(p,v,f.reuse.animation,f.reuse.frame)).map(l=>({...l,id:uid('layer')})));delete f.reuse;}break;}
   case 'appendClip':{const a=sourceAnimation(p,c.animation||active().animation),source=sourceAnimation(p,c.sourceAnimation);check(a!==source,'Cannot append clip to same animation');const frames=c.frames||source.frames.map(f=>f.id);const n=bounds(number(c.repeats,1),1,100);for(let i=0;i<n;i++)for(const id of frames){check(source.frames.find(f=>f.id===id),'Source frame not found');a.frames.push({id:uid('frame'),name:`↪ ${source.name} ${id}`,reuse:{animation:source.id,frame:id}});}out.added=frames.length*n;break;}
   case 'importManifest':{const m=typeof c.manifest==='string'?JSON.parse(fs.readFileSync(path.resolve(c.manifest),'utf8')):c.manifest;check(Array.isArray(m.items),'Manifest requires items');for(const it of m.items){const a=importedAsset(p,{id:it.id||uid('asset'),file:it.file||it.path,name:it.name,width:it.width,height:it.height,src:it.src,fileRef:it.fileRef},projectPath);const line={op:'addLayer',assetId:a.id,category:it.category,view:it.view,animation:it.animation,frame:it.frame,transform:it.transform,crop:it.crop,color:it.color,visible:it.visible};execute(p,{commands:[line]},{projectPath,results});}out.imported=m.items.length;break;}
   case 'listCapabilities':out.value={...UI_CATALOG,operations:['paint','getControlValue','setControlValue','invokeControl','listCapabilities']};break;
   case 'getControlValue':{
     const spec=controlById.get(c.id);check(spec,'Unknown control '+c.id);
     if(spec.kind==='action'||spec.kind==='file')throw Error('Control is an action/file, not an editable setting');
     const values=p.editor.uiOptions||{},fallback=spec.defaultValue??(spec.kind==='checkbox'?false:null);
     const prop=spec.projectPath||'';
     if(prop==='projectName')out.value=p.projectName;
     else if(prop==='mode')out.value=p.mode;
     else if(prop==='assetStorage')out.value=p.assetStorage;
     else if(prop==='canvas.width')out.value=p.canvas.width;
     else if(prop==='canvas.height')out.value=p.canvas.height;
     else if(prop==='editor.gridSize')out.value=p.editor.gridSize;
     else if(prop==='editor.snap')out.value=p.editor.snap;
     else if(prop==='animation.fps')out.value=sourceAnimation(p,active().animation).fps;
     else out.value=Object.hasOwn(values,c.id)?values[c.id]:fallback;
     break;
   }
   case 'setControlValue':{
     const spec=controlById.get(c.id);check(spec,'Unknown control '+c.id);
     check(spec.kind!=='action'&&spec.kind!=='file','Cannot set a button or file picker; use a command or upload file');
     let value=c.value;
     if(spec.values){check(spec.values.includes(String(value)),'Unsupported option for '+c.id);}
     if(spec.kind==='checkbox')check(typeof value==='boolean','Checkbox value must be boolean');
     if(['number','range'].includes(spec.kind)){check(Number.isFinite(Number(value)),'Number must be finite');value=Number(value);}
     if(spec.kind==='color')check(/^#[0-9a-f]{6}$/i.test(String(value)),'Invalid color');
     check(typeof value!=='object'||value===null,'Controls accept scalar values only');
     const prop=spec.projectPath||'';
     if(prop==='projectName')p.projectName=String(value);
     else if(prop==='mode'){check(MODES.includes(value),'Unsupported mode');p.mode=value;}
     else if(prop==='assetStorage'){check(['bundled','external'].includes(value),'Unknown storage mode');p.assetStorage=value;}
     else if(prop==='canvas.width'||prop==='canvas.height'){check(value>=1&&value<=4096,'Canvas dimension 1–4096');p.canvas[prop.split('.')[1]]=Math.round(value);}
     else if(prop==='editor.gridSize')p.editor.gridSize=bounds(value,8,256);
     else if(prop==='editor.snap')p.editor.snap=value;
     else if(prop==='animation.fps')sourceAnimation(p,active().animation).fps=bounds(value,1,120);
     else (p.editor.uiOptions||={})[c.id]=value;
     out.value=value;break;
   }
   case 'invokeControl':{
     const spec=controlById.get(c.id);check(spec,'Unknown control '+c.id);check(spec.kind==='action','Only action buttons can be invoked');
     check(spec.operation,'Control '+c.id+' requires a graphical browser; use its documented headless operation instead');
     check(!['invokeControl','listCapabilities'].includes(spec.operation),'Recursive control invocation is not allowed');
     const args={...(c.params||{}),op:spec.operation};
     if(['prevView','menuPrevView'].includes(c.id))args.steps=-1;
     if(['nextView','menuNextView'].includes(c.id))args.steps=1;
     if(['layerUp','layerTop'].includes(c.id))args.direction=c.id==='layerTop'?'front':'up';
     if(['layerDown','layerBottom'].includes(c.id))args.direction=c.id==='layerBottom'?'back':'down';
     execute(p,{commands:[args]},{projectPath,results});
     out.invoked=args.op;break;
   }
   case 'paint':{
     const settings=p.editor.uiOptions||{};
     const defaults={size:settings.paintSize,brushShape:settings.paintBrushShape,color:settings.paintColor,
       opacity:settings.paintOpacity===undefined?undefined:Number(settings.paintOpacity)/100,
       texture:settings.paintTexture,fillMode:settings.paintFillMode,gradientEnd:settings.paintGradientEnd,
       eraseMode:settings.paintEraseMode,sides:settings.paintSides,curveBend:settings.paintCurveBend,
       fontSize:settings.paintFontSize,shapeFill:settings.paintShapeFill,text:settings.paintText};
     for(const key of Object.keys(defaults))if(defaults[key]===undefined)delete defaults[key];
     out.value=executePaint(p,{...defaults,...c},{projectPath});break;
   }
   case 'summary':out.value=summarize(p);break;
   case 'review':out.value=reviewProject(p,projectPath);break;
   case 'listAssets':out.value=p.assets;break;
   case 'listParts':out.value=modeParts(p);break;
   case 'listLayers':out.value=selectBuckets(p,c).map(b=>({view:b.view,animation:b.animation,frame:b.frame,layers:b.layers}));break;
   case 'getProject':out.value=cp(p);break;
   default:throw new Error(`Unsupported operation: ${c.op}`);
  }
  results.push(out);
 }
 return results;
}
export function saveProject(p,outputFile,originalFile=outputFile){
 const out=path.resolve(outputFile),outDir=path.dirname(out);fs.mkdirSync(outDir,{recursive:true});
 for(const [id,a] of Object.entries(p.assets)){
  if(a.__pendingFile){const abs=path.resolve(outDir,a.fileRef||`assets/${id}.png`);fs.mkdirSync(path.dirname(abs),{recursive:true});if(path.resolve(a.__pendingFile)!==abs)fs.copyFileSync(a.__pendingFile,abs);delete a.__pendingFile;}
  if(p.assetStorage==='external'&&!a.src&&!a.__pendingFile&&path.dirname(path.resolve(originalFile))!==outDir){const src=path.resolve(path.dirname(path.resolve(originalFile)),a.fileRef||a.name);const dst=path.resolve(outDir,a.fileRef||a.name);if(fs.existsSync(src)){fs.mkdirSync(path.dirname(dst),{recursive:true});if(src!==dst)fs.copyFileSync(src,dst);}}
  if(p.assetStorage==='external'&&a.src){const m=/^data:image\/(png|webp|jpeg);base64,(.*)$/.exec(a.src);check(m,`Cannot externalize unknown source for ${id}`);const fn=a.fileRef||`assets/${id}.png`;const abs=path.resolve(outDir,fn);fs.mkdirSync(path.dirname(abs),{recursive:true});fs.writeFileSync(abs,Buffer.from(m[2],'base64'));a.fileRef=fn;delete a.src;}
  if(p.assetStorage==='bundled'&&!a.src){const base=a.__pendingFile||path.resolve(path.dirname(path.resolve(originalFile)),a.fileRef||a.name);check(fs.existsSync(base),`Missing source file: ${base}`);const bytes=fs.readFileSync(base);a.src=`data:image/png;base64,${bytes.toString('base64')}`;}
 }
 const tmp=out+'.tmp-'+process.pid;fs.writeFileSync(tmp,JSON.stringify(p,null,2)+'\n');fs.renameSync(tmp,out);return out;
}