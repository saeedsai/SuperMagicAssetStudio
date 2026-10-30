/** Complete browser control discovery and interaction facade.
 * The control inventory is shared with the headless CLI. DOM elements are used
 * in place so existing listeners, validation, keyboard shortcuts and history work.
 */
const api=window.SuperMagicAssetStudioAPI;
if(!api)throw Error('Editor controller not loaded');
const inventory=await fetch('./src/shared/ui-capabilities.json').then(r=>{if(!r.ok)throw Error('Could not load capability catalog');return r.json();});
const table=new Map(inventory.controls.map(x=>[x.id,x]));
function entry(id){const item=table.get(id),el=document.getElementById(id);if(!item||!el)throw Error('Unknown editor control: '+id);return {item,el};}
function valueOf(el,item){if(item.kind==='checkbox')return el.checked;if(['button','action','file'].includes(item.kind))return null;if(item.kind==='number'||item.kind==='range')return Number(el.value);return el.value;}
function validate(item,value,el){
 if(item.kind==='action'||item.kind==='file')throw Error('Use invokeUIAction or a File upload for '+item.id);
 if(item.kind==='checkbox'){if(typeof value!=='boolean')throw Error('Checkbox requires true/false');return value;}
 if(['number','range'].includes(item.kind)){const n=Number(value);if(!Number.isFinite(n))throw Error('Numeric input required');const min=el.min===''?-Infinity:Number(el.min),max=el.max===''?Infinity:Number(el.max);if(n<min||n>max)throw Error(item.id+' outside permitted range '+min+'–'+max);return String(n);}
 if(item.kind==='color'&&!/^#[a-f0-9]{6}$/i.test(String(value)))throw Error('Invalid hexadecimal color');
 if(item.values?.length&&!item.values.includes(String(value)))throw Error('Unknown option '+value+' for '+item.id);
 if(item.kind==='select'&&![...el.options].some(o=>o.value===String(value)))throw Error('Option is not currently available for '+item.id);
 if(typeof value!=='string')throw Error('Text/select controls require a string');return value;
}
function set(id,value,{notify=true}={}){
 const {item,el}=entry(id),v=validate(item,value,el);
 if(item.kind==='checkbox')el.checked=v;else el.value=v;
 if(notify){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
 return valueOf(el,item);
}
function get(id){const {item,el}=entry(id);return {id,kind:item.kind,value:valueOf(el,item),enabled:!el.disabled,visible:!!el.getClientRects().length,options:item.values||null,cli:item.cli,operation:item.operation||null};}
function invoke(id){
 const {item,el}=entry(id);if(item.kind!=='action')throw Error('Not a button: '+id);
 if(el.disabled)throw Error('Action is disabled: '+id);
 // Browser-only modal/file interactions can require a genuine user gesture.
 el.click();return {id,triggered:true};
}
function defaults(){return inventory.controls.filter(x=>x.kind!=='action'&&x.kind!=='file');}
Object.assign(api,{
 listCapabilities:()=>structuredClone(inventory),
 listUIControls:()=>inventory.controls.map(x=>get(x.id)),
 getUIControl:get,
 setUIControl:set,
 invokeUIAction:invoke,
 getAllUISettings:()=>Object.fromEntries(defaults().map(x=>[x.id,get(x.id).value])),
 setUISettings:(values)=>{if(!values||typeof values!=='object'||Array.isArray(values))throw Error('Settings must be a plain object');const result={};for(const [id,val] of Object.entries(values))result[id]=set(id,val);return result;},
});
window.SuperMagicCapabilities=Object.freeze({count:inventory.controls.length,version:inventory.schemaVersion});
