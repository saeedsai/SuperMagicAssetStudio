'use strict';
/* Offline ZIP (STORE) project package codec. No CDN or remote dependency. */
(function(root){
 const encoder=new TextEncoder(),decoder=new TextDecoder();
 const bytes=v=>v instanceof Uint8Array?v:encoder.encode(v);
 const u16=(b,p)=>b[p]|b[p+1]<<8;
 const u32=(b,p)=>(b[p]|b[p+1]<<8|b[p+2]<<16|b[p+3]<<24)>>>0;
 const put16=(b,p,v)=>{b[p]=v&255;b[p+1]=v>>>8&255;};
 const put32=(b,p,v)=>{put16(b,p,v);put16(b,p+2,v>>>16);};
 const table=Array.from({length:256},(_,i)=>{let c=i;for(let n=0;n<8;n++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
 const crc32=b=>{let c=-1;for(let i=0;i<b.length;i++)c=table[(c^b[i])&255]^(c>>>8);return(c^-1)>>>0;};
 const safe=name=>typeof name==='string'&&name.length>0&&!name.startsWith('/')&&!name.includes('\\')&&!name.split('/').some(x=>x==='..')&&!/^[A-Za-z]:/.test(name);
 function pack(entries){
  const chunks=[],directory=[];let position=0;
  for(const {name,data} of entries){
   if(!safe(name))throw new Error('Unsafe ZIP filename');
   const filename=encoder.encode(name),content=bytes(data);
   if(content.length>250000000)throw new Error('ZIP entry exceeds size limit');
   const local=new Uint8Array(30+filename.length);
   put32(local,0,0x04034b50);put16(local,4,20);put16(local,6,0x800);put16(local,8,0);
   put32(local,14,crc32(content));put32(local,18,content.length);put32(local,22,content.length);put16(local,26,filename.length);
   local.set(filename,30);chunks.push(local,content);
   const central=new Uint8Array(46+filename.length);put32(central,0,0x02014b50);
   put16(central,4,20);put16(central,6,20);put16(central,8,0x800);
   put32(central,16,crc32(content));put32(central,20,content.length);put32(central,24,content.length);
   put16(central,28,filename.length);put32(central,42,position);central.set(filename,46);
   directory.push(central);position+=local.length+content.length;
  }
  const directorySize=directory.reduce((n,b)=>n+b.length,0),end=new Uint8Array(22);
  put32(end,0,0x06054b50);put16(end,8,entries.length);put16(end,10,entries.length);
  put32(end,12,directorySize);put32(end,16,position);
  return new Blob([...chunks,...directory,end],{type:'application/zip'});
 }
 async function unpack(file){
  const all=new Uint8Array(await file.arrayBuffer());
  if(all.length>300000000)throw new Error('ZIP exceeds 300 MB limit');
  let end=-1;for(let i=all.length-22;i>=Math.max(0,all.length-65557);i--)if(u32(all,i)===0x06054b50){end=i;break;}
  if(end<0)throw new Error('Invalid ZIP archive');
  const count=u16(all,end+10),offset=u32(all,end+16),result=new Map();
  if(count>10000)throw new Error('Too many ZIP entries');
  let p=offset,total=0;
  for(let i=0;i<count;i++){
   if(p+46>all.length||u32(all,p)!==0x02014b50)throw new Error('Corrupt ZIP directory');
   const method=u16(all,p+10),flags=u16(all,p+8),crc=u32(all,p+16),size=u32(all,p+20),original=u32(all,p+24);
   const namelen=u16(all,p+28),extra=u16(all,p+30),comment=u16(all,p+32),start=u32(all,p+42);
   const name=decoder.decode(all.subarray(p+46,p+46+namelen));
   p+=46+namelen+extra+comment;
   if(!safe(name)||result.has(name))throw new Error('Duplicate or unsafe ZIP entry');
   if(flags&1)throw new Error('Encrypted ZIP is not supported');
   if(method!==0)throw new Error('Unsupported ZIP compression; use a package exported by the studio');
   if(original!==size||size>250000000||(total+=size)>300000000)throw new Error('Invalid ZIP entry size');
   if(start+30>all.length||u32(all,start)!==0x04034b50)throw new Error('Corrupt ZIP entry');
   const begin=start+30+u16(all,start+26)+u16(all,start+28);
   if(begin+size>all.length)throw new Error('Truncated ZIP entry');
   const data=all.slice(begin,begin+size);
   if(crc32(data)!==crc)throw new Error('ZIP checksum mismatch: '+name);
   result.set(name,data);
  }
  return result;
 }
 root.SuperMagicProjectArchive={pack,unpack};
})(window);
