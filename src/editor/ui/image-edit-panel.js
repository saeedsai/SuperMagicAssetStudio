/** Image editing discoverability and contextual organization.
 * Reparents the existing Inspector controls: it never duplicates, deletes,
 * replaces event handlers, changes layer data or invents editing actions.
 */
const get=id=>document.getElementById(id);
const root=get('inspectorContent');
const entry=get('imageEditorToggle');
const api=()=>window.SuperMagicAssetStudioAPI;
const ui=()=>window.SuperMagicStudioUI;
if(!root||!entry)throw Error('Image editing requires the existing inspector and toolbar');

function imageSelection(){return api()?.getSelectedLayerIds?.()||[];}
function activateImageEditor({showLayersIfEmpty=false}={}){
 ui()?.closePaintProperties?.();
 if(window.SuperMagicPaintAPI?.getTool?.()!=='select')window.SuperMagicPaintAPI?.setTool('select');
 ui()?.showLayerInspector?.({focus:false})||ui()?.activateWorkspace?.('inspector','right');
 if(showLayersIfEmpty&&!imageSelection().length)ui()?.activateWorkspace?.('layers','left');
 const body=document.querySelector('.inspector .studio-workspace-body');
 if(body)body.scrollTop=0;
 entry.setAttribute('aria-expanded','true');
 return {selected:imageSelection().length,workspace:'inspector'};
}
entry.setAttribute('aria-expanded','false');
entry.addEventListener('click',()=>activateImageEditor({showLayersIfEmpty:true}));

function group(title,content,{open=true,id}={}){
 const details=document.createElement('details');
 details.className='image-edit-group';details.dataset.imageGroup=id;details.open=open;
 const summary=document.createElement('summary');
 summary.textContent=title;details.append(summary);
 const body=document.createElement('div');body.className='image-edit-group-body';
 for(const node of content){if(node.classList?.contains('separator')||node.tagName==='H4')continue;body.append(node);}
 details.append(body);return details;
}
function partitionImageControls(){
 if(root.querySelector(':scope > .image-editor-modules'))return;
 const children=[...root.children];
 const indexes={
  transform:children.findIndex(node=>node.querySelector?.('[data-prop="x"]')),
  color:children.findIndex(node=>node.tagName==='H4'&&/Color adjustments/.test(node.textContent)),
  crop:children.findIndex(node=>node.tagName==='H4'&&/Source crop/.test(node.textContent)),
  fit:children.findIndex(node=>node.id==='openAutoResize')
 };
 if(indexes.transform<1||indexes.color<=indexes.transform||indexes.crop<=indexes.color||indexes.fit<=indexes.crop)return;
 const modules=document.createElement('div');modules.className='image-editor-modules';
 const categories=[
  ['Image & layer',children.slice(0,indexes.transform),{open:true,id:'image'}],
  ['Transform & mirror',children.slice(indexes.transform,indexes.color),{open:true,id:'transform'}],
  ['Color & tint',children.slice(indexes.color,indexes.crop),{open:true,id:'color'}],
  ['Source crop',children.slice(indexes.crop,indexes.fit),{open:false,id:'crop'}],
  ['Auto-fit & defaults',children.slice(indexes.fit),{open:false,id:'fit'}]
 ];
 for(const [name,nodes,options] of categories)modules.append(group(name,nodes,options));
 root.append(modules);
}
function setHint(){
 if(root.querySelector(':scope > .image-editor-hint'))return;
 const hint=document.createElement('p');hint.className='image-editor-hint small-note';
 if(imageSelection().length>1)hint.textContent='Multiple layers selected: group move, resize and rotate are available. Select one layer to edit its color, mirror, crop or image pixels.';
 else hint.textContent='To edit an image, choose the Layers workspace on the left and select a layer or click an image on the canvas.';
 root.prepend(hint);
}
let previousSelection='';
function synchronize(){
 const ids=imageSelection(),key=ids.join('\u0000');
 if(key!==previousSelection){
  previousSelection=key;
  if(ids.length){ui()?.showLayerInspector?.()||ui()?.activateWorkspace?.('inspector','right');entry.setAttribute('aria-expanded','true');}
  else entry.setAttribute('aria-expanded','false');
 }
 if(root.querySelector('#flipX'))partitionImageControls();
 else setHint();
}
const observer=new MutationObserver(synchronize);
observer.observe(root,{childList:true});
synchronize();

const publicAPI=Object.freeze({
 open:activateImageEditor,
 getGroups:()=>[...root.querySelectorAll('.image-edit-group')].map(x=>({id:x.dataset.imageGroup,title:x.querySelector('summary')?.textContent,open:x.open})),
 expand:(id,open=true)=>{const element=[...root.querySelectorAll('.image-edit-group')].find(x=>x.dataset.imageGroup===id);if(!element)return false;element.open=!!open;return true;}
});
window.SuperMagicImageEditor=publicAPI;
Object.assign(api(),{
 openImageEditor:activateImageEditor,
 getImageEditorGroups:publicAPI.getGroups
});
