/** PNG/GIF renderer for the agent CLI. Node stdlib only; no browser, no npm packages. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {resolveLayers,VIEWS} from './agent-engine.mjs';
const SIGNATURE=Buffer.from('89504e470d0a1a0a','hex');
const clamp=(v,a=0,b=255)=>Math.max(a,Math.min(b,v));
export function readPNG(buf){
 if(!buf.subarray(0,8).equals(SIGNATURE))throw new Error('CLI renderer supports PNG assets only. Convert JPEG/WebP to PNG first.');
 let w=0,h=0,depth=0,type=0,interlace=0,palette=null,trns=null;const chunks=[];
 for(let i=8;i<buf.length;){const size=buf.readUInt32BE(i),name=buf.toString('ascii',i+4,i+8),bytes=buf.subarray(i+8,i+8+size);i+=12+size;
  if(name==='IHDR'){w=bytes.readUInt32BE(0);h=bytes.readUInt32BE(4);depth=bytes[8];type=bytes[9];interlace=bytes[12];}
  else if(name==='PLTE')palette=bytes;else if(name==='tRNS')trns=bytes;else if(name==='IDAT')chunks.push(bytes);else if(name==='IEND')break;}
 if(interlace!==0)throw new Error('Interlaced PNG is unsupported in headless mode; export a non-interlaced PNG.');
 if(![8,16,4,2,1].includes(depth))throw new Error('Unsupported PNG bit depth');
 const comp=({0:1,2:3,3:1,4:2,6:4})[type];if(!comp)throw new Error('Unsupported PNG color type '+type);
 const bitsPerPixel=comp*depth,stride=Math.ceil(w*bitsPerPixel/8),bpp=Math.max(1,Math.ceil(bitsPerPixel/8));const raw=zlib.inflateSync(Buffer.concat(chunks));
 const rgba=Buffer.alloc(w*h*4);let pos=0,prev=Buffer.alloc(stride);
 for(let y=0;y<h;y++){
  const filter=raw[pos++],row=Buffer.from(raw.subarray(pos,pos+stride));pos+=stride;
  for(let x=0;x<stride;x++){const a=x>=bpp?row[x-bpp]:0,b=prev[x],c=x>=bpp?prev[x-bpp]:0;let predict=0;
   if(filter===1)predict=a;else if(filter===2)predict=b;else if(filter===3)predict=Math.floor((a+b)/2);else if(filter===4){const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);predict=da<=db&&da<=dc?a:db<=dc?b:c;}else if(filter!==0)throw new Error('Unknown PNG scanline filter '+filter);
   row[x]=(row[x]+predict)&255;
  }
  const sample=(n)=>depth===8?row[n]:depth===16?row[n*2]:(row[Math.floor(n*depth/8)]>>>(8-depth-(n*depth)%8))&((1<<depth)-1);
  for(let x=0;x<w;x++){
   const at=4*(y*w+x);let r=0,g=0,b=0,a=255;
   if(type===6){r=sample(x*4);g=sample(x*4+1);b=sample(x*4+2);a=sample(x*4+3);}
   else if(type===2){r=sample(x*3);g=sample(x*3+1);b=sample(x*3+2);}
   else if(type===0){const v=sample(x);r=g=b=depth<8?Math.round(v*255/((1<<depth)-1)):v;}
   else if(type===4){r=g=b=sample(x*2);a=sample(x*2+1);}
   else if(type===3){const index=sample(x);r=palette?.[index*3]??0;g=palette?.[index*3+1]??0;b=palette?.[index*3+2]??0;a=trns?.[index]??255;}
   rgba[at]=r;rgba[at+1]=g;rgba[at+2]=b;rgba[at+3]=a;
  }prev=row;
 }
 return {width:w,height:h,data:rgba};
}
function crcTable(){const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;}
const CRC_TABLE=crcTable();
function chunk(type,data){const tag=Buffer.from(type),len=Buffer.alloc(4);len.writeUInt32BE(data.length);let crc=0xffffffff;for(const byte of Buffer.concat([tag,data]))crc=CRC_TABLE[(crc^byte)&255]^(crc>>>8);const ending=Buffer.alloc(4);ending.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([len,tag,data,ending]);}
export function encodePNG({width,height,data}){const hdr=Buffer.alloc(13);hdr.writeUInt32BE(width);hdr.writeUInt32BE(height,4);hdr[8]=8;hdr[9]=6;const stride=width*4,raw=Buffer.alloc((stride+1)*height);for(let y=0;y<height;y++)data.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride);return Buffer.concat([SIGNATURE,chunk('IHDR',hdr),chunk('IDAT',zlib.deflateSync(raw,{level:6})),chunk('IEND',Buffer.alloc(0))]);}
function readAsset(p,id,projectPath,cache){if(cache.has(id))return cache.get(id);const a=p.assets[id];if(!a)throw new Error('Unknown asset '+id);let data;
 if(a.src){const match=a.src.match(/^data:image\/png;base64,(.*)$/s);if(!match)throw new Error('CLI raster supports PNG data URLs only');data=Buffer.from(match[1],'base64');}
 else {const rel=a.__pendingFile||path.resolve(path.dirname(projectPath),a.fileRef||a.name);if(!fs.existsSync(rel))throw new Error('Missing image file '+rel);data=fs.readFileSync(rel);}
 const img=readPNG(data);cache.set(id,img);return img;
}
function tintColor(src,color){let [r,g,b,a]=src;const c=color||{};r=clamp(r*(c.red??100)/100);g=clamp(g*(c.green??100)/100);b=clamp(b*(c.blue??100)/100);
 // Match editor filters approximately: brightness / contrast / saturation / hue / sepia.
 const sat=(c.saturate??100)/100;let lum=.2126*r+.7152*g+.0722*b;r=lum+(r-lum)*sat;g=lum+(g-lum)*sat;b=lum+(b-lum)*sat;
 const sep=clamp((c.sepia??0)/100,0,1);if(sep){const rr=.393*r+.769*g+.189*b,gg=.349*r+.686*g+.168*b,bb=.272*r+.534*g+.131*b;r=r*(1-sep)+rr*sep;g=g*(1-sep)+gg*sep;b=b*(1-sep)+bb*sep;}
 const hue=((c.hue??0)%360)*Math.PI/180;if(hue){const cos=Math.cos(hue),sin=Math.sin(hue),rr=(.213+cos*.787-sin*.213)*r+(.715-cos*.715-sin*.715)*g+(.072-cos*.072+sin*.928)*b,gg=(.213-cos*.213+sin*.143)*r+(.715+cos*.285+sin*.140)*g+(.072-cos*.072-sin*.283)*b,bb=(.213-cos*.213-sin*.787)*r+(.715-cos*.715+sin*.715)*g+(.072+cos*.928+sin*.072)*b;r=rr;g=gg;b=bb;}
 const ct=(c.contrast??100)/100,bright=(c.brightness??100)/100;r=clamp((r-128)*ct+128)*bright;g=clamp((g-128)*ct+128)*bright;b=clamp((b-128)*ct+128)*bright;
 const m=clamp((c.tintAmount??0)/100,0,1),hex=/^#[0-9a-f]{6}$/i.test(c.tintHex||'')?c.tintHex:'#ffffff';if(m){const lum2=.2126*r+.7152*g+.0722*b,t=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));r=r*(1-m)+(lum2*t[0]/255)*m;g=g*(1-m)+(lum2*t[1]/255)*m;b=b*(1-m)+(lum2*t[2]/255)*m;}
 return [clamp(Math.round(r)),clamp(Math.round(g)),clamp(Math.round(b)),a];
}
function drawLayer(out,img,layer){const co=layer.crop,t=layer.transform;const sw=co.w,sh=co.h;if(sw<=0||sh<=0||!t.scaleX||!t.scaleY)return;const angle=(t.rotationDeg||0)*Math.PI/180,C=Math.cos(angle),S=Math.sin(angle),sx=t.scaleX*(t.flipX?-1:1),sy=t.scaleY*(t.flipY?-1:1),ax=t.anchorX??.5,ay=t.anchorY??.5;
 const corners=[[-sw*ax,-sh*ay],[sw*(1-ax),-sh*ay],[sw*(1-ax),sh*(1-ay)],[-sw*ax,sh*(1-ay)]].map(([u,v])=>[t.x+u*sx*C-v*sy*S,t.y+u*sx*S+v*sy*C]);
 const minX=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))),maxX=Math.min(out.width-1,Math.ceil(Math.max(...corners.map(p=>p[0]))));
 const minY=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1])))),maxY=Math.min(out.height-1,Math.ceil(Math.max(...corners.map(p=>p[1]))));
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  const dx=x+.5-t.x,dy=y+.5-t.y,u=(dx*C+dy*S)/sx+sw*ax,v=(-dx*S+dy*C)/sy+sh*ay;if(u<0||u>=sw||v<0||v>=sh)continue;
  const ix=Math.floor(co.x+u),iy=Math.floor(co.y+v),ia=(iy*img.width+ix)*4;if(ix<0||iy<0||ix>=img.width||iy>=img.height)continue;
  const srcA=img.data[ia+3]*(t.opacity??1)/255;if(srcA<=0)continue;const dest=(y*out.width+x)*4,old=out.data[dest+3]/255,outA=srcA+old*(1-srcA),k=srcA/Math.max(outA,1e-7);
  const rgb=tintColor([img.data[ia],img.data[ia+1],img.data[ia+2],img.data[ia+3]],layer.color);
  for(let c=0;c<3;c++)out.data[dest+c]=Math.round(rgb[c]*k+out.data[dest+c]*(1-k));out.data[dest+3]=Math.round(outA*255);
 }
}
export function renderFrame(p,{view='front',animation='stand',frame=null,scale=1,hiddenCategories=[]}={},projectPath,cache=new Map()){
 const a=p.animations.find(a=>a.id===animation);if(!a)throw new Error('Unknown animation '+animation);const f=a.frames.find(x=>x.id===frame)||a.frames[0];if(!VIEWS.includes(view))throw new Error('Unknown view '+view);
 const w=Math.round(p.canvas.width*scale),h=Math.round(p.canvas.height*scale);if(w*h>8000000)throw new Error('Image too large for CLI renderer (limit 8MP)');const out={width:w,height:h,data:Buffer.alloc(w*h*4)};
 for(const l of resolveLayers(p,view,animation,f.id))if(l.visible!==false&&!hiddenCategories.includes(l.category)){
  const image=readAsset(p,l.assetId,projectPath,cache);const tr={...l,transform:{...l.transform,x:l.transform.x*scale,y:l.transform.y*scale,scaleX:l.transform.scaleX*scale,scaleY:l.transform.scaleY*scale}};drawLayer(out,image,tr);
 }return out;
}
export function renderSpriteSheet(p,{view='front',animation='stand',columns=4,scale=1}={},projectPath){const a=p.animations.find(x=>x.id===animation);if(!a)throw new Error('Unknown animation');const cols=clamp(Math.round(columns),1,Math.max(1,a.frames.length)),rows=Math.ceil(a.frames.length/cols);const cellW=Math.round(p.canvas.width*scale),cellH=Math.round(p.canvas.height*scale);if(cols*cellW*rows*cellH>12000000)throw new Error('Sprite sheet too large (limit 12MP)');const out={width:cols*cellW,height:rows*cellH,data:Buffer.alloc(cols*cellW*rows*cellH*4)},cache=new Map();
 for(let i=0;i<a.frames.length;i++){const tile=renderFrame(p,{view,animation,frame:a.frames[i].id,scale},projectPath,cache),ox=(i%cols)*cellW,oy=Math.floor(i/cols)*cellH;for(let y=0;y<cellH;y++)tile.data.copy(out.data,((oy+y)*out.width+ox)*4,y*cellW*4,(y+1)*cellW*4);}return out;
}
function packGIF(frames,w,h,delayCs){const bytes=[],u8=n=>bytes.push(n&255),u16=n=>{u8(n);u8(n>>8);},ascii=s=>{for(const ch of s)u8(ch.charCodeAt(0));};ascii('GIF89a');u16(w);u16(h);u8(0xf7);u8(0);u8(0);
 for(let i=0;i<256;i++){const v=Math.max(0,i-1);u8(Math.round(((v>>5)&7)*255/7));u8(Math.round(((v>>2)&7)*255/7));u8(Math.round((v&3)*255/3));}
 u8(0x21);u8(0xff);u8(11);ascii('NETSCAPE2.0');u8(3);u8(1);u16(0);u8(0);
 for(const img of frames){u8(0x21);u8(0xf9);u8(4);u8(0x09);u16(delayCs);u8(0);u8(0);u8(0x2c);u16(0);u16(0);u16(w);u16(h);u8(0);u8(8);
  const px=new Uint8Array(w*h);for(let k=0,j=0;k<img.data.length;k+=4,j++){if(img.data[k+3]<128)px[j]=0;else px[j]=Math.min(255,1+((img.data[k]>>5)<<5)+((img.data[k+1]>>5)<<2)+(img.data[k+2]>>6));}
  const clear=256,end=257,dict=new Map();let next=258,bits=9,buffer=0,used=0;const encoded=[];const emit=code=>{buffer|=code<<used;used+=bits;while(used>=8){encoded.push(buffer&255);buffer>>>=8;used-=8;}};emit(clear);let prev=px[0]??0;for(let i=1;i<px.length;i++){const sym=px[i],key=prev*256+sym;if(dict.has(key)){prev=dict.get(key);continue;}emit(prev);if(next<4096){dict.set(key,next++);if(next>(1<<bits)&&bits<12)bits++;}else{emit(clear);dict.clear();next=258;bits=9;}prev=sym;}emit(prev);emit(end);if(used)encoded.push(buffer&255);
  for(let i=0;i<encoded.length;i+=255){u8(Math.min(255,encoded.length-i));for(const b of encoded.slice(i,i+255))u8(b);}u8(0);
 }u8(0x3b);return Buffer.from(bytes);
}
export function renderGIF(p,{view='front',animation='stand',scale=null,turntable=false}={},projectPath){const ratio=scale??Math.min(1,480/Math.max(p.canvas.width,p.canvas.height)),cache=new Map(),frames=[];
 const a=p.animations.find(x=>x.id===animation);if(!a)throw new Error('Unknown animation');if(turntable){for(const v of VIEWS)frames.push(renderFrame(p,{view:v,animation,frame:a.frames[0].id,scale:ratio},projectPath,cache));}
 else for(const f of a.frames)frames.push(renderFrame(p,{view,animation,frame:f.id,scale:ratio},projectPath,cache));
 return packGIF(frames,frames[0].width,frames[0].height,turntable?35:Math.round(100/a.fps));
}