import {
 SIDE_WORKSPACES, RIGHT_WORKSPACES, HIDDEN_ACTION_ALIASES,
 PAINT_PROPERTY_GROUPS, PAINT_TOOL_LABELS
} from './workspace-config.mjs';
import {decoratePaintTools} from './paint-tool-icons.mjs';

const get=id=>document.getElementById(id);
const make=(tag,className,text)=>{
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=text;
 return el;
};
const visible=el=>el&&!el.hidden;
const sidebar=document.querySelector('.sidebar');
const inspector=document.querySelector('.inspector');
const paint=get('paintPanel');
if(!sidebar||!inspector||!paint)throw new Error('Studio workspace landmarks missing');

function buildWorkspaces(root,definitions,initial,groupName){
 const original=[...root.querySelectorAll(':scope > .section')].filter(el=>el!==paint);
 const top=make('div','studio-workspace-head');
 const heading=make('strong','studio-workspace-title',groupName);
 const tabs=make('div','studio-workspace-tabs');
 tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',groupName+' workspaces');
 top.append(heading,tabs);
 const body=make('div','studio-workspace-body');
 const panes=new Map(),buttons=new Map();
 for(const def of definitions){
  const tab=make('button','studio-workspace-tab');
  tab.type='button';tab.dataset.workspace=def.id;tab.id=groupName.toLowerCase()+'-tab-'+def.id;
  tab.textContent=(def.icon?def.icon+' ':'')+def.label;
  tab.setAttribute('role','tab');tab.setAttribute('aria-controls',groupName.toLowerCase()+'-pane-'+def.id);
  const pane=make('div','studio-workspace-pane');
  pane.id=groupName.toLowerCase()+'-pane-'+def.id;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',tab.id);
  pane.hidden=true;
  for(const index of def.sectionIndexes){
   const section=original[index];
   if(!section)throw new Error('Workspace '+def.id+' references missing section '+index);
   pane.appendChild(section);
  }
  tab.addEventListener('click',()=>activate(def.id));
  tabs.appendChild(tab);body.appendChild(pane);panes.set(def.id,pane);buttons.set(def.id,tab);
 }
 const bound=new Set(definitions.flatMap(d=>d.sectionIndexes));
 if(bound.size!==original.length)throw new Error('Unassigned or duplicated '+groupName+' section');
 root.prepend(top,body);
 function activate(id){
  if(!panes.has(id))return false;
  for(const [name,pane] of panes){const on=name===id;pane.hidden=!on;buttons.get(name).setAttribute('aria-selected',String(on));buttons.get(name).tabIndex=on?0:-1;
   if(on)for(const section of pane.children)section.classList.remove('collapsed');
  }
  root.dataset.activeWorkspace=id;
  return true;
 }
 tabs.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  const ids=[...panes.keys()],idx=ids.indexOf(root.dataset.activeWorkspace);
  const next=event.key==='Home'?0:event.key==='End'?ids.length-1:(idx+(event.key==='ArrowRight'?1:-1)+ids.length)%ids.length;
  activate(ids[next]);buttons.get(ids[next]).focus();
 });
 activate(initial);
 return {activate,panes,tabs};
}
const left=buildWorkspaces(sidebar,SIDE_WORKSPACES,'project','Studio');
const right=buildWorkspaces(inspector,RIGHT_WORKSPACES,'inspector','Properties');
const paintToolbox=get('paintToolboxCommands');
if(!paintToolbox)throw Error('Right-sidebar Paint toolbox missing');
decoratePaintTools(paintToolbox);
// Layer properties must stay discoverable even if a user previously collapsed
// the Inspector section or was looking at the Canvas/Shortcuts workspace.
const layerInspectorSection=get('inspectorContent').closest('.section');
function showLayerInspector({focus=false}={}){
 right.activate('inspector');
 layerInspectorSection.classList.remove('collapsed');
 layerInspectorSection.hidden=false;
 if(focus){
  right.panes.get('inspector')?.scrollIntoView({block:'nearest'});
  get('properties-tab-inspector')?.focus({preventScroll:true});
 }
 return Boolean(get('inspectorContent').isConnected);
}
// The Edit image button is wired by image-edit-panel.js, the sole owner of that action.


// Render each command just once. The original relay nodes remain for existing
// DOM listeners, keyboard shortcuts, browser APIs and backward-compatible tests.
for(const id of HIDDEN_ACTION_ALIASES){
 const el=get(id);
 if(!el)throw new Error('Canonical action alias missing: '+id);
 el.hidden=true;el.setAttribute('aria-hidden','true');el.tabIndex=-1;
}
const legacyShortcuts=document.querySelector('.shortcutbar');
if(legacyShortcuts)legacyShortcuts.hidden=true;
for(const section of document.querySelectorAll('.menu-section')){
 if(!section.querySelector('button:not([hidden])'))section.hidden=true;
}
// Remove empty top-level menus only when a canonical control is available elsewhere.
for(const menu of document.querySelectorAll('.menubar > .menu')){
 if(!menu.querySelector('.menu-item:not([hidden])'))menu.hidden=true;
}

// The Paint menu is the sole tool picker; settings belong in a compact
// context popover. Move existing live DOM nodes, never clone their IDs.
const toolbar=document.querySelector('.editor-toolbar .toolrow');
const propsButton=make('button','btn sm studio-properties-trigger','Tool options');
propsButton.type='button';propsButton.id='paintPropertiesToggle';
propsButton.setAttribute('aria-expanded','false');propsButton.setAttribute('aria-controls','paintPropertiesPopover');
propsButton.title='Open settings for the active selection, brush or drawing tool';
toolbar.prepend(propsButton);
const popover=make('div','studio-properties-popover');
popover.id='paintPropertiesPopover';popover.hidden=true;
popover.setAttribute('role','dialog');popover.setAttribute('aria-label','Active tool properties');
const popHead=make('div','studio-properties-head');
const popTitle=make('strong','', 'Tool properties');
const close=make('button','btn sm','✕');
close.type='button';close.id='paintPropertiesClose';close.setAttribute('aria-label','Close tool properties');
popHead.append(popTitle,close);
const popDescription=make('p','small-note studio-context-hint');
popDescription.id='paintPropertiesHint';
popover.append(popHead,popDescription,paint);
document.querySelector('.editor').appendChild(popover);
paint.classList.remove('collapsed');
paint.classList.add('studio-context-paint');
const originalHeading=paint.querySelector('h3');
if(originalHeading)originalHeading.hidden=true;
const toolPicker=get('paintTool');
const toolPickerLine=toolPicker.closest('.formline');
if(toolPickerLine)toolPickerLine.hidden=true;
// Group the original property labels as independent contextual items.
const propertyTargets=new Map();
for(const id of new Set(Object.values(PAINT_PROPERTY_GROUPS).flat())){
 const control=get(id);
 if(!control)throw new Error('Paint property missing: '+id);
 let wrapper;
 if(id==='paintImportTexture')wrapper=control.closest('.toolrow');
 else wrapper=control.closest('label')||control.closest('.formline')||control.parentElement;
 wrapper.classList.add('studio-property-item');
 wrapper.dataset.property=id;
 propertyTargets.set(id,wrapper);
}
const finish=get('paintFinishFreeform'),clear=get('paintClearSelection'),move=get('paintStop'),copy=get('paintCopySelection'),cut=get('paintCutSelection');
const footer=finish.closest('.toolrow');
footer.classList.add('studio-properties-footer');
paint.querySelectorAll('.paint-controls-grid').forEach(grid=>grid.classList.add('studio-property-grid'));
const descriptions={
 'select':'Choose a tool from Paint to start drawing, or select a layer on the canvas.',
 'select-rect':'Drag a rectangle. Then choose a drawing tool to paint only within it.',
 'select-freeform':'Click boundary points and finish the shape when ready.',
 'select-wand':'Click a connected region; tolerance controls which pixels are included.',
 'brush':'Draw strokes on an independent, movable raster layer.',
 'eraser':'Choose between added artwork and the selected source image.',
 'clone':'Alt-click a source point, then drag to stamp copied pixels.',
 'fill':'Make a selection first; select a solid, textured or gradient fill.',
 'picker':'Click artwork to sample its exact RGB color.',
 'text':'Type text, choose its font and size, then click the canvas.',
 'shape-rect':'Drag to create a rectangle.',
 'shape-poly':'Drag a polygon and adjust the number of sides.',
 'shape-oval':'Drag to create an oval.',
 'shape-circle':'Drag to create a circle.',
 'shape-line':'Drag to draw a straight line.',
 'shape-curve':'Drag to draw a curve; adjust its bend here.'
};
function context(){
 return window.SuperMagicPaintAPI?.getTool?.()||toolPicker.value||'select';
}
function paintContextUpdate(){
 const active=context(),applicable=new Set(PAINT_PROPERTY_GROUPS[active]||[]);
 for(const button of paintToolbox.querySelectorAll('[data-paint-menu]')){
  button.setAttribute('aria-pressed',String(button.dataset.paintMenu===active));
 }
 get('paintClearMenu').disabled=!(window.SuperMagicPaintAPI?.getSelectionCount?.()>0);
 const mode=get('paintFillMode').value;
 if(active==='fill'&&mode!=='gradient')applicable.delete('paintGradientEnd');
 if(active==='fill'&&mode!=='texture')applicable.delete('paintTexture');
 if(active==='fill'&&mode!=='texture')applicable.delete('paintImportTexture');
 // Import action remains visible in brush/shape mode to switch the brush pattern.
 for(const [id,wrapper] of propertyTargets)wrapper.hidden=!applicable.has(id);
 for(const grid of paint.querySelectorAll('.studio-property-grid')){
  grid.hidden=![...grid.children].some(child=>!child.hidden);
 }
 const selectionActive=(window.SuperMagicPaintAPI?.getSelectionCount?.()||0)>0;
 finish.hidden=active!=='select-freeform';
 clear.hidden=!selectionActive;
 if(copy)copy.hidden=!selectionActive;
 if(cut)cut.hidden=!selectionActive;
 move.hidden=active==='select';
 footer.hidden=![finish,clear,move,copy,cut].some(visible);
 const label=PAINT_TOOL_LABELS[active]||active;
 popTitle.textContent=label+' settings';
 propsButton.textContent='⚙ '+label+(applicable.has('paintSize')?' · '+get('paintSize').value+'px':'');
 propsButton.classList.toggle('active',active!=='select');
 popDescription.textContent=descriptions[active]||'Adjust this tool before using the canvas.';
}
function placePaintProperties(){
 const header=toolbar.closest('.editor-toolbar');
 popover.style.top=(header.offsetHeight+8)+'px';
}
if(window.ResizeObserver)new ResizeObserver(placePaintProperties).observe(toolbar.closest('.editor-toolbar'));
function openPaintProperties(){
 paintContextUpdate();placePaintProperties();popover.hidden=false;propsButton.setAttribute('aria-expanded','true');
 return true;
}
function closePaintProperties(){
 popover.hidden=true;propsButton.setAttribute('aria-expanded','false');
 propsButton.focus({preventScroll:true});
}
propsButton.addEventListener('click',()=>{
 if(popover.hidden)openPaintProperties();else closePaintProperties();
});
close.addEventListener('click',closePaintProperties);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!popover.hidden)closePaintProperties();
});
document.addEventListener('pointerdown',e=>{
 if(popover.hidden||popover.contains(e.target)||propsButton.contains(e.target))return;
 if(e.target.closest('.menubar'))return; // menu selections will refresh the popup
 if(e.target.closest('.editor-content'))return; // keep live settings available while drawing and finishing a freeform path
 closePaintProperties();
});
for(const item of document.querySelectorAll('[data-paint-menu]')){
 item.addEventListener('click',()=>queueMicrotask(()=>{paintContextUpdate();openPaintProperties();}));
}
toolPicker.addEventListener('change',()=>{paintContextUpdate();openPaintProperties();});
paint.addEventListener('change',paintContextUpdate);
paint.addEventListener('input',paintContextUpdate);
new MutationObserver(paintContextUpdate).observe(get('paintStatus'),{childList:true,subtree:true});
paintContextUpdate();

// Contextual dialogs: show only relevant algorithm and boundary settings.
const split=get('splitControlPanel');
const spriteRows=[...split.querySelectorAll(':scope > .sprite-tool-inputline')];
const detection=make('details','studio-dialog-group');
detection.open=true;
const detectionSummary=make('summary','','Automatic detection');
detection.appendChild(detectionSummary);
const boundary=make('details','studio-dialog-group');
boundary.open=true;
const boundarySummary=make('summary','','Manual boundary & wand');
boundary.appendChild(boundarySummary);
for(const row of spriteRows){
 const id=row.querySelector('input,select')?.id;
 (['spriteDetectMethod','spriteMinArea','spriteAlphaThreshold','spriteGridRows','spriteGridColumns','spritePadding'].includes(id)?detection:boundary).appendChild(row);
}
split.prepend(boundary);split.prepend(detection);
function updateSpriteControls(){
 const detect=get('spriteDetectMethod').value,shape=get('spriteSelectionShape').value;
 for(const id of ['spriteMinArea','spriteAlphaThreshold'])get(id).closest('.sprite-tool-inputline').hidden=detect!=='alpha';
 for(const id of ['spriteGridRows','spriteGridColumns'])get(id).closest('.sprite-tool-inputline').hidden=detect!=='grid';
 get('spriteCurveSmooth').closest('.sprite-tool-inputline').hidden=shape!=='bezier';
 for(const id of ['spriteWandMode','spriteWandTolerance'])get(id).closest('.sprite-tool-inputline').hidden=shape!=='wand';
 for(const id of ['spriteFinishPolygon','spriteEditPoints','spriteDeletePoint'])get(id).hidden=!['poly','bezier'].includes(shape);
}
get('spriteDetectMethod').addEventListener('change',updateSpriteControls);
get('spriteSelectionShape').addEventListener('change',updateSpriteControls);
updateSpriteControls();
// Keep sprite-dialog mode selections discoverable by expanding the relevant details.
const spriteDialog=get('spriteToolsDialog');
const spriteDialogObserver=new MutationObserver(()=>{
 if(!spriteDialog.open)return;
 const isManual=get('spriteToolsTitle').textContent.toLowerCase().includes('manual');
 boundary.open=isManual;detection.open=!isManual;updateSpriteControls();
});
spriteDialogObserver.observe(spriteDialog,{attributes:true,attributeFilter:['open']});

// Hide advanced import configuration until explicitly requested.
const importSection=get('dropzone')?.closest('.section');
if(importSection){
 const importOptions=make('details','studio-inline-advanced');
 importOptions.append(make('summary','','Import behavior'));
 const fields=['sequentialImport','replaceCategory','importMirror'];
 for(const id of fields){const el=get(id);const label=el?.closest('label');if(label)importOptions.appendChild(label);}
 get('dropzone').after(importOptions);
}
// Animation clip composition is a dedicated expandable module.
const clipSource=get('clipSource');
if(clipSource){
 const root=clipSource.closest('.section');
 const clipHeading=[...root.querySelectorAll('h3')].find(h=>/Reuse animation timeline/.test(h.textContent));
 if(clipHeading){
  const details=make('details','studio-inline-advanced');
  const summary=make('summary','','Reuse animation clips');
  details.append(summary);
  let next=clipHeading.nextSibling;
  while(next&&next.nodeType!==1&&next.nextSibling){const hold=next;next=next.nextSibling;details.appendChild(hold);}
  while(next){const hold=next;next=next.nextSibling;details.appendChild(hold);}
  clipHeading.replaceWith(details);
 }
}

// All existing command handlers remain attached to their original elements;
// this API only changes layout, not the project or drawing data model.
window.SuperMagicStudioUI=Object.freeze({
 activateWorkspace:(name,side='left')=>(side==='right'?right:left).activate(name),
 showLayerInspector,
 getWorkspace:side=>(side==='right'?inspector:sidebar).dataset.activeWorkspace,
 openPaintProperties, closePaintProperties, updatePaintProperties:paintContextUpdate,
 getVisibleActionAliases:()=>HIDDEN_ACTION_ALIASES.filter(id=>!get(id)?.hidden),
 getToolSettings:()=>[...propertyTargets].filter(([,el])=>!el.hidden).map(([id])=>id)
});
