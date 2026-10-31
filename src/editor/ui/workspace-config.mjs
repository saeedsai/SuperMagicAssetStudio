/** Canonical UI action locations and contextual editor workspaces.
 * Every legacy element keeps its original ID for backwards-compatible controllers.
 */
export const SIDE_WORKSPACES = Object.freeze([
 {id:'project',label:'Project',icon:'◈',sectionIndexes:[0]},
 {id:'assets',label:'Assets',icon:'▧',sectionIndexes:[2,4]},
 {id:'animate',label:'Animation',icon:'▶',sectionIndexes:[3]},
 {id:'layers',label:'Layers',icon:'▤',sectionIndexes:[5]},
 {id:'camera',label:'Camera',icon:'◉',sectionIndexes:[1]}
]);
export const RIGHT_WORKSPACES = Object.freeze([
 {id:'inspector',label:'Edit image',sectionIndexes:[0,1]},
 {id:'canvas',label:'Canvas',sectionIndexes:[2,3,4]},
 {id:'shortcuts',label:'Shortcuts',sectionIndexes:[5]}
]);

// Legacy command aliases intentionally remain in DOM for API/event-relay compatibility.
// Their visible primary controls live in a toolbar, the workspace tab or a single menu.
export const HIDDEN_ACTION_ALIASES = Object.freeze([
 'newProject','loadProject','saveProject','exportPNG',
 'menuImportImages','menuImportParts','menuDownloadParts','menuResolveImages',
 'menuPrevView','menuNextView','menuSpinView','menuZoomFit',
 'menuToggleGrid','menuToggleRulers','menuToggleGuides','menuToggleCropHandles',
 'menuAddAnimation','menuDeleteAnimation','menuAddFrame','menuDuplicateFrame',
 'menuDeleteFrame','menuPlayAnimation','menuAppendClip','menuUnlinkFrame',
 'menuUndo','menuRedo','menuImageTools',
 'paintClearMenu','closeHelpFooter','closeAIDialogFooter','spriteToolsCloseFooter',
 'bgStandaloneCloseFooter'
]);

export const PAINT_PROPERTY_GROUPS = Object.freeze({
 'select':[],
 'select-rect':[],
 'select-freeform':[],
 'select-wand':['paintTolerance'],
 'brush':['paintColor','paintSize','paintBrushShape','paintTexture','paintOpacity','paintImportTexture'],
 'eraser':['paintSize','paintBrushShape','paintOpacity','paintEraseMode'],
 'clone':['paintSize','paintBrushShape','paintOpacity'],
 'fill':['paintColor','paintFillMode','paintGradientEnd','paintTexture','paintImportTexture','paintOpacity'],
 'picker':[],
 'text':['paintText','paintFont','paintFontSize','paintColor','paintOpacity'],
 'shape-rect':['paintColor','paintSize','paintTexture','paintImportTexture','paintOpacity','paintShapeFill'],
 'shape-poly':['paintColor','paintSize','paintTexture','paintImportTexture','paintOpacity','paintSides','paintShapeFill'],
 'shape-oval':['paintColor','paintSize','paintTexture','paintImportTexture','paintOpacity','paintShapeFill'],
 'shape-circle':['paintColor','paintSize','paintTexture','paintImportTexture','paintOpacity','paintShapeFill'],
 'shape-line':['paintColor','paintSize','paintTexture','paintImportTexture','paintOpacity'],
 'shape-curve':['paintColor','paintSize','paintTexture','paintImportTexture','paintOpacity','paintCurveBend']
});

export const PAINT_TOOL_LABELS = Object.freeze({
 'select':'Move layers','select-rect':'Rectangle select','select-freeform':'Freeform select',
 'select-wand':'Magic wand','brush':'Brush','eraser':'Eraser','clone':'Clone stamp',
 'fill':'Fill','picker':'Color picker','text':'Text','shape-rect':'Rectangle',
 'shape-poly':'Polygon','shape-oval':'Oval','shape-circle':'Circle',
 'shape-line':'Line','shape-curve':'Curve'
});
