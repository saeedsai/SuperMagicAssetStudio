/** Native-dependency-free headless paint operations on the shared PNG layer format. */
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {readPNG,encodePNG,renderFrame} from './agent-raster.mjs';
import {curveOutline} from './agent-image-tools.mjs';
import {rectangleMask,polygonMask,floodMask,regularPolygon} from '../editor/paint-core.mjs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const pt=v=>({x:Number(v?.x)||0,y:Number(v?.y)||0});
const hex=v=>{if(!/^#[a-f0-9]{6}$/i.test(v||''))throw Error('Color must be #RRGGBB');return [1,3,5].map(i=>parseInt(v.slice(i,i+2),16));};
const id=kind=>kind+'_'+randomUUID().slice(0,12);
const sample=(image,x,y)=>{x=Math.floor(x);y=Math.floor(y);return x<0||y<0||x>=image.width||y>=image.height?[0,0,0,0]:[...image.data.subarray((y*image.width+x)*4,(y*image.width+x)*4+4)];};
function over(image,x,y,rgba,mask=null){
 x=Math.floor(x);y=Math.floor(y);if(x<0||y<0||x>=image.width||y>=image.height)return;
 const pixel=y*image.width+x;if(mask&&!mask[pixel])return;const at=pixel*4,old=image.data[at+3]/255,src=rgba[3]/255,alpha=src+old*(1-src);if(!alpha)return;
 for(let c=0;c<3;c++)image.data[at+c]=Math.round((rgba[c]*src+image.data[at+c]*old*(1-src))/alpha);
 image.data[at+3]=Math.round(alpha*255);
}
function sceneAt(p,c){
 const state=p.editor?.cliCursor||{},animation=c.animation||state.animation||p.animations[0].id,a=p.animations.find(x=>x.id===animation);
 if(!a)throw Error('Unknown animation');const frame=c.frame||(animation===state.animation?state.frame:null)||a.frames[0].id,view=c.view||state.view||'front';
 if(!a.frames.some(f=>f.id===frame)||!p.scenes[view])throw Error('Unknown view/frame');return {animation,frame,view};
}
function maskFor(c,img){
 const s=c.selection,w=img.width,h=img.height;if(!s)return null;
 if(s.type==='rect')return rectangleMask(w,h,{x:s.x,y:s.y},{x:s.x+s.w,y:s.y+s.h});
 if(['poly','freeform','bezier'].includes(s.type))return polygonMask(w,h,s.type==='bezier'?curveOutline(s,16):s.points||[]);
 if(s.type==='wand')return floodMask(img.data,w,h,s.seed?.x,s.seed?.y,s.tolerance??35);
 throw Error('Unknown selection '+s.type);
}
function pigment(c,x,y,texture=null){
 let rgb=hex(c.color||'#f7c66d'),opacity=clamp(Number(c.opacity??1),0,1);
 if(c.fillMode==='gradient'){const second=hex(c.gradientEnd||'#714ce8'),t=clamp((x+y)/(c.width+c.height),0,1);rgb=rgb.map((v,i)=>Math.round(v*(1-t)+second[i]*t));}
 if(c.texture==='imported'){if(!texture)throw Error('textureFile PNG required');const px=sample(texture,(x%texture.width+texture.width)%texture.width,(y%texture.height+texture.height)%texture.height);return [...px.slice(0,3),Math.round(px[3]*opacity)];}
 if(c.texture==='dots'&&Math.hypot(((x%16)+16)%16-8,((y%16)+16)%16-8)>4)rgb=rgb.map(v=>v*.6);
 if(c.texture==='stripes'&&(((Math.floor(x-y)+1000000)%16)<7))rgb=rgb.map(v=>v*.6);
 if(c.texture==='checker'&&((Math.floor(x/16)+Math.floor(y/16))%2===0))rgb=rgb.map(v=>v*.7);
 return [...rgb.map(Math.round),Math.round(opacity*255)];
}
function dab(image,c,x,y,mask,texture,clone=null){
 const r=clamp((Number(c.size)||18)/2,.5,128),shape=c.brushShape||'round';
 for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++){
  const dx=xx+.5-x,dy=yy+.5-y,d=Math.hypot(dx,dy);
  if(!(shape==='square'?Math.max(Math.abs(dx),Math.abs(dy))<=r:shape==='diamond'?Math.abs(dx)+Math.abs(dy)<=r:d<=r))continue;
  let val=clone?sample(clone.image,xx+clone.dx,yy+clone.dy):pigment(c,xx,yy,texture);
  if(shape==='soft')val=[...val.slice(0,3),Math.round(val[3]*clamp(1-d/r,0,1))];
  over(image,xx,yy,val,mask);
 }
}
function trace(points,spacing,callback){
 for(let i=0;i<points.length;i++){const a=pt(points[Math.max(0,i-1)]),b=pt(points[i]),d=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(1,Math.ceil(d/Math.max(1,spacing)));
  for(let j=i?1:0;j<=n;j++){const u=j/n;callback(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u);}
 }
}
function outline(c){
 const a=pt(c.start||c.points?.[0]),b=pt(c.end||c.points?.at(-1)),tool=c.tool;
 if(tool==='shape-rect')return [a,{x:b.x,y:a.y},b,{x:a.x,y:b.y}];
 if(tool==='shape-poly')return regularPolygon(a.x,a.y,b.x,b.y,c.sides||6);
 if(tool==='shape-circle'||tool==='shape-oval'){const rad=tool==='shape-circle'?Math.hypot(b.x-a.x,b.y-a.y):null,cx=rad===null?(a.x+b.x)/2:a.x,cy=rad===null?(a.y+b.y)/2:a.y,rx=rad??Math.abs(b.x-a.x)/2,ry=rad??Math.abs(b.y-a.y)/2;return Array.from({length:96},(_,i)=>({x:cx+rx*Math.cos(i*Math.PI/48),y:cy+ry*Math.sin(i*Math.PI/48)}));}
 if(tool==='shape-curve'){const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy)),bend=clamp(Number(c.curveBend??35),-300,300),cp={x:(a.x+b.x)/2-dy*bend/len,y:(a.y+b.y)/2+dx*bend/len};return Array.from({length:65},(_,i)=>{const t=i/64,u=1-t;return {x:u*u*a.x+2*u*t*cp.x+t*t*b.x,y:u*u*a.y+2*u*t*cp.y+t*t*b.y};});}
 return [a,b];
}
const polygonContains=(x,y,points)=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;};
const font={
 A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['011','100','100','100','011'],D:['110','101','101','101','110'],E:['111','100','110','100','111'],F:['111','100','110','100','100'],G:['011','100','101','101','011'],H:['101','101','111','101','101'],I:['111','010','010','010','111'],J:['001','001','001','101','010'],K:['101','101','110','101','101'],L:['100','100','100','100','111'],M:['101','111','111','101','101'],N:['101','111','111','111','101'],O:['010','101','101','101','010'],P:['110','101','110','100','100'],Q:['010','101','101','011','001'],R:['110','101','110','101','101'],S:['011','100','010','001','110'],T:['111','010','010','010','010'],U:['101','101','101','101','111'],V:['101','101','101','101','010'],W:['101','101','111','111','101'],X:['101','101','010','101','101'],Y:['101','101','010','010','010'],Z:['111','001','010','100','111'],
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['110','001','111','100','111'],'3':['110','001','011','001','110'],'4':['101','101','111','001','001'],'5':['111','100','111','001','110'],'6':['011','100','111','101','111'],'7':['111','001','001','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','110'],'!':['010','010','010','000','010'],'.':['000','000','000','000','010'],'-':['000','000','111','000','000'],' ':['000','000','000','000','000'],'?':['110','001','010','000','010']};
function writeText(img,c,mask,texture){
 if(!c.text)throw Error('Text required');
 if(c.font&&c.font!=='bitmap')throw Error('Headless text supports font=bitmap; browser API supports installed fonts');
 const scale=clamp(Math.round((Number(c.fontSize)||48)/5),1,64),pos=pt(c.start||c.position);let px=pos.x;
 for(const character of String(c.text).toUpperCase().slice(0,160)){for(let y=0;y<5;y++)for(let x=0;x<3;x++)if((font[character]||font['?'])[y][x]==='1')for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)over(img,px+x*scale+xx,pos.y+y*scale+yy,pigment(c,px+x*scale+xx,pos.y+y*scale+yy,texture),mask);px+=scale*4;if(px>img.width)break;}
}
function imageForAsset(p,assetId,projectPath){
 const a=p.assets[assetId];if(!a)throw Error('Missing asset '+assetId);
 const bytes=a.src?Buffer.from(a.src.split(',')[1],'base64'):fs.readFileSync(path.resolve(path.dirname(projectPath),a.fileRef||a.name));return readPNG(bytes);
}
function eraseSource(img,eraser,layer,mask){
 const t=layer.transform,c=layer.crop,angle=(t.rotationDeg||0)*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle),sx=t.scaleX*(t.flipX?-1:1),sy=t.scaleY*(t.flipY?-1:1);
 for(let y=Math.max(0,Math.floor(c.y));y<Math.min(img.height,c.y+c.h);y++)for(let x=Math.max(0,Math.floor(c.x));x<Math.min(img.width,c.x+c.w);x++){
  const dx=(x+.5-c.x-c.w*(t.anchorX??.5))*sx,dy=(y+.5-c.y-c.h*(t.anchorY??.5))*sy,px=Math.floor(t.x+dx*co-dy*si),py=Math.floor(t.y+dx*si+dy*co);
  if(px<0||py<0||px>=eraser.width||py>=eraser.height)continue;if(mask&&!mask[py*eraser.width+px])continue;
  const a=eraser.data[(py*eraser.width+px)*4+3]/255;img.data[(y*img.width+x)*4+3]=Math.round(img.data[(y*img.width+x)*4+3]*(1-a));
 }
}
export function executePaint(p,cmd,{projectPath='project.json'}={}){
 const {width:w,height:h}=p.canvas;if(w*h>4194304)throw Error('Headless painting is limited to 4MP');
 const location=sceneAt(p,cmd),source=renderFrame(p,location,projectPath),mask=maskFor(cmd,source),tool=cmd.tool||'brush';
 if(tool==='picker')return {color:'#'+sample(source,pt(cmd.position||cmd.start).x,pt(cmd.position||cmd.start).y).slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('')};
 if(tool==='selection')return {selectedPixels:mask?.reduce((a,b)=>a+b,0)||0};
 const image={width:w,height:h,data:Buffer.alloc(w*h*4)},style={...cmd,width:w,height:h},texture=cmd.texture==='imported'?readPNG(fs.readFileSync(cmd.textureFile)):null,spacing=(Number(cmd.size)||18)/4;
 if(['brush','eraser','clone'].includes(tool)){
  const points=cmd.points||[pt(cmd.start||cmd.position)];if(tool==='clone'&&!cmd.cloneSource)throw Error('cloneSource coordinate required');const a=pt(points[0]),b=pt(cmd.cloneSource);
  trace(points,spacing,(x,y)=>dab(image,style,x,y,mask,texture,tool==='clone'?{image:source,dx:b.x-a.x,dy:b.y-a.y}:null));
 }else if(tool==='fill'){
  if(!mask)throw Error('Fill requires a region selection');
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x])over(image,x,y,pigment(style,x,y,texture));
 }else if(tool==='text')writeText(image,style,mask,texture);
 else if(tool.startsWith('shape-')){
  const points=outline(cmd),fill=cmd.shapeFill==='fill'&&!['shape-line','shape-curve'].includes(tool);
  if(fill){const minX=Math.max(0,Math.floor(Math.min(...points.map(v=>v.x)))),maxX=Math.min(w,Math.ceil(Math.max(...points.map(v=>v.x)))),minY=Math.max(0,Math.floor(Math.min(...points.map(v=>v.y)))),maxY=Math.min(h,Math.ceil(Math.max(...points.map(v=>v.y))));
   for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++)if(polygonContains(x+.5,y+.5,points))over(image,x,y,pigment(style,x,y,texture),mask);
  }else trace([...points,...(['shape-line','shape-curve'].includes(tool)?[]:[points[0]])],spacing,(x,y)=>dab(image,style,x,y,mask,texture));
 }else throw Error('Unsupported paint tool '+tool);
 if(!image.data.some((v,i)=>i%4===3&&v>0))return {affected:0};
 const list=(p.scenes[location.view][location.animation]||={})[location.frame]||=[];
 if(tool==='eraser'){
  if(cmd.eraseMode==='original'&&!cmd.layerId)throw Error('Original erase requires layerId');
  const targets=cmd.eraseMode==='original'?list.filter(l=>l.id===cmd.layerId):list.filter(l=>l.paintLayer);if(!targets.length)throw Error('No matching layers to erase');
  let affected=0;
  for(const layer of targets){if(layer.locked||layer.visible===false)continue;const orig=imageForAsset(p,layer.assetId,projectPath),next={...orig,data:Buffer.from(orig.data)};eraseSource(next,image,layer,mask);
   const newId=id('asset');p.assets[newId]={name:newId+'.png',fileRef:'assets/'+newId+'.png',mime:'image/png',width:orig.width,height:orig.height,src:'data:image/png;base64,'+encodePNG(next).toString('base64')};layer.assetId=newId;affected++;
  }return {tool,affected};
 }
 const assetId=id('asset'),layerId=id('layer');
 p.assets[assetId]={name:assetId+'.png',fileRef:'assets/'+assetId+'.png',mime:'image/png',width:w,height:h,src:'data:image/png;base64,'+encodePNG(image).toString('base64')};
 list.push({id:layerId,name:cmd.name||'Paint '+tool,category:'accessory',assetId,paintLayer:true,visible:true,locked:false,crop:{x:0,y:0,w,h},transform:{x:w/2,y:h/2,scaleX:1,scaleY:1,rotationDeg:0,opacity:1,flipX:false,flipY:false,anchorX:.5,anchorY:.5}});
 return {tool,affected:1,assetId,layerId};
}
