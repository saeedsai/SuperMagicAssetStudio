"""Chromium regression checks. Each TC ID corresponds to docs/REQUIREMENTS.md."""
import os
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[2]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

class BrowserRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.play = sync_playwright().start()
        chrome=os.environ.get('CHROME_BIN')
        launch={'headless':True}
        if chrome:launch['executable_path']=chrome
        cls.browser=cls.play.chromium.launch(**launch)
        cls.url=f'http://127.0.0.1:{cls.server.server_port}/'
    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.play.stop()
        cls.server.shutdown();cls.server.server_close()

    def setUp(self):
        self.page=self.browser.new_page(viewport={'width':1530,'height':1000})
        self.errors=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.goto(self.url,wait_until='load')
        self.page.wait_for_function('Boolean(window.SuperMagicAssetStudioAPI)',timeout=12000)
    def tearDown(self):
        self.assertEqual(self.errors,[],f'Browser errors: {self.errors}')
        self.page.close()

    def _present(self,*selectors):
        for s in selectors:self.assertGreater(self.page.locator(s).count(),0,s)
    def _menu(self,name):
        if name=='paint':
            self.page.locator('#properties-tab-paint').click()
        else:
            self.page.locator(f'.menu-btn[data-menu="{name}"]').click()
    def _project(self):
        return self.page.evaluate('window.SuperMagicAssetStudioAPI.getProject()')
    def _mode(self,name):
        self.page.locator('#assetMode').select_option(name)

# One independently reported UI test case for each browser requirement.
def check_014(t):
    t._mode('custom');t._present('#customPartId','#customPartName','#customPartGroup','#addCustomPart','#customPartsList')
    t.page.locator('#customPartId').fill('cape');t.page.locator('#customPartName').fill('Cape');t.page.locator('#addCustomPart').click()
    t.assertIn('cape',[p['id'] for p in t._project()['partDefinitions']['parts']])
def check_015(t):
    t._mode('custom');t._present('#customPartDefault','#customPartsList')
    t.page.locator('#customPartId').fill('testCape');t.page.locator('#customPartName').fill('Test Cape');t.page.locator('#addCustomPart').click()
    t._present('[data-part-action="up"]')
def check_016(t):
    t._mode('custom');t._present('#customBaseTemplate','#applyCustomBase','#mergeCustomBase','#exportCustomParts','#loadPartsSchema')
    t.page.locator('#customBaseTemplate').select_option('standard');t.page.locator('#applyCustomBase').click()
    t.assertGreater(len(t._project()['partDefinitions']['parts']),20)
def check_019(t):t._present('#prevView','#nextView','#canvasViewLabel')
def check_020(t):
    t.page.locator('#nextView').click(); t.assertIn('3/4',t.page.locator('#canvasViewLabel').inner_text())
def check_021(t):t._present('#viewButtons','#spinView')
def check_026(t):t._present('#fps','#playBtn','#frameButtons')
def check_034(t):
    t._present('#layersList','#undoBtn');t.assertIn('ctrlKey', (ROOT/'src/editor/app.js').read_text())
def check_035(t):t._present('#stage','#overlay','#autoResizeStats')
def check_037(t):t._present('#cropTool','#cropDialog','#cropCanvas')
def check_049(t):t._present('#imageInput','#importQueue','#applyQueue')
def check_051(t):
    t._menu('edit');t.page.locator('#menuManualSplit').click()
    t.assertTrue(t.page.locator('#spriteToolsDialog').evaluate('(e)=>e.open'))
    t._present('#spriteSelectionShape','#spriteToolsCanvas')
def check_054(t):
    t._menu('edit');t.page.locator('#menuManualSplit').click();t._present('#spriteSelectionShape','#spriteFinishPolygon')
def check_056(t):
    t._menu('edit');t.page.locator('#menuManualSplit').click();t._present('#spriteEditPoints','#spriteDeletePoint')
def check_066(t):
    for m in ['file','edit','view','animation','help']:t._present(f'[data-menu="{m}"]')
def check_067(t):t._present('.sidebar .section.collapsed','.inspector .section')
def check_068(t):
    t._mode('fullBody');a=t.page.locator('#importCategory option').all_text_contents();t.assertFalse(any('forearm' in x.lower() for x in a))
    t._mode('standard');a=t.page.locator('#importCategory option').all_text_contents();t.assertTrue(any('forearm' in x.lower() for x in a))
def check_069(t):
    t._menu('edit');t.page.locator('#menuAI').click();t.assertTrue(t.page.locator('#aiDialog').evaluate('(e)=>e.open'))
    t.page.locator('#aiCommandInput').fill('{"commands":[{"op":"setProjectName","name":"Browser AI"}]}')
    t.page.locator('#runAICommands').click();t.page.wait_for_function('window.SuperMagicAssetStudioAPI.getProject().projectName === "Browser AI"')
def check_070(t):
    api=t.page.evaluate('Object.keys(window.SuperMagicAssetStudioAPI)');t.assertIn('getProject',api);t.assertIn('runCommands',api)

# Explicit tests for each UI acceptance criterion, plus independent smoke cases.
CASES={14:check_014,15:check_015,16:check_016,19:check_019,20:check_020,21:check_021,
       26:check_026,34:check_034,35:check_035,37:check_037,49:check_049,51:check_051,
       54:check_054,56:check_056,66:check_066,67:check_067,68:check_068,69:check_069,70:check_070}
for number,verify in CASES.items():
    def run_case(self,fn=verify):fn(self)
    setattr(BrowserRegression,f'test_TC_{number:03}',run_case)


# Main-canvas painting regression: geometry, persistence and tool wiring.
def paint_canvas_point(t,x,y):
    box=t.page.locator('#paintCanvas').bounding_box()
    return box['x']+box['width']*x/768,box['y']+box['height']*y/768

def paint_choose(t,mode):
    t.page.wait_for_function('Boolean(window.SuperMagicPaintAPI)')
    t.page.evaluate('(mode)=>{SuperMagicPaintAPI.setTool(mode);SuperMagicStudioUI.openPaintProperties()}',mode)

def paint_drag(t,x0=160,y0=160,x1=220,y1=220):
    p0=paint_canvas_point(t,x0,y0);p1=paint_canvas_point(t,x1,y1)
    t.page.mouse.move(*p0);t.page.mouse.down();t.page.mouse.move(*p1,steps=6);t.page.mouse.up()

def paint_click(t,x=180,y=180):
    t.page.mouse.click(*paint_canvas_point(t,x,y))

def paint_assets(t):
    p=t._project()
    return (len(p['assets']),[l for l in p['scenes']['front']['stand']['stand_1'] if l.get('paintLayer')])

def check_085(t):
    paint_choose(t,'select-rect');paint_drag(t,100,100,180,190)
    t.assertGreater(t.page.evaluate('SuperMagicPaintAPI.getSelectionCount()'),2000)

def check_086(t):
    paint_choose(t,'select-freeform')
    for x,y in [(100,100),(230,100),(210,220),(100,220)]:paint_click(t,x,y)
    t.page.locator('#paintFinishFreeform').click()
    t.assertGreater(t.page.evaluate('SuperMagicPaintAPI.getSelectionCount()'),3000)

def check_087(t):
    paint_choose(t,'brush')
    paint_drag(t,180,180,220,180)
    t.page.wait_for_function('Object.keys(SuperMagicAssetStudioAPI.getProject().assets).length>=1')
    t.page.wait_for_function('document.getElementById("artCanvas").getContext("2d").getImageData(190,180,1,1).data[3]>0')
    paint_choose(t,'select-wand');paint_click(t,190,180)
    t.assertGreater(t.page.evaluate('SuperMagicPaintAPI.getSelectionCount()'),0)

def check_088(t):
    paint_choose(t,'brush')
    t.page.locator('#paintSize').fill('35')
    t.page.locator('#paintBrushShape').select_option('square')
    t.page.locator('#paintColor').fill('#ff4400')
    paint_drag(t)
    count,layers=paint_assets(t);t.assertEqual(count,1);t.assertEqual(len(layers),1)

def check_089(t):
    paint_choose(t,'brush')
    t.page.locator('#paintTexture').select_option('stripes')
    paint_drag(t);t.assertEqual(paint_assets(t)[0],1)

def check_090(t):
    paint_choose(t,'brush');paint_drag(t)
    before=paint_assets(t)[1][0]['assetId']
    paint_choose(t,'eraser')
    t.page.locator('#paintEraseMode').select_option('paint')
    paint_drag(t)
    t.page.wait_for_function('Object.keys(SuperMagicAssetStudioAPI.getProject().assets).length===2')
    after=paint_assets(t)[1][0]['assetId'];t.assertNotEqual(before,after)

def check_091(t):
    paint_choose(t,'brush');paint_drag(t)
    before=paint_assets(t)[1][0]['assetId']
    t.page.evaluate('(id)=>SuperMagicAssetStudioAPI.selectLayers([id])',paint_assets(t)[1][0]['id'])
    paint_choose(t,'eraser')
    t.page.locator('#paintEraseMode').select_option('original')
    paint_drag(t)
    t.page.wait_for_function('Object.keys(SuperMagicAssetStudioAPI.getProject().assets).length===2')
    after=paint_assets(t)[1][0]['assetId'];t.assertNotEqual(before,after)
    t.assertIn(before,t._project()['assets'])

def check_092(t):
    paint_choose(t,'brush');paint_drag(t)
    paint_choose(t,'clone')
    t.page.keyboard.down('Alt')
    paint_click(t,190,190)
    t.page.keyboard.up('Alt')
    paint_drag(t,300,300,350,310)
    t.assertGreaterEqual(paint_assets(t)[0],2)

def check_093(t):
    paint_choose(t,'select-rect');paint_drag(t,100,100,200,200)
    paint_choose(t,'fill');t.page.locator('#paintFillMode').select_option('color')
    paint_click(t,140,150);t.assertEqual(paint_assets(t)[0],1)

def check_094(t):
    paint_choose(t,'brush')
    import base64
    png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==')
    t.page.locator('#paintTextureFile').set_input_files({'name':'pattern.png','mimeType':'image/png','buffer':png})
    t.page.wait_for_function('document.getElementById("paintTexture").value === "imported"',timeout=12000)
    t.assertEqual(t.page.locator('#paintTexture').input_value(),'imported')

def check_095(t):
    paint_choose(t,'select-rect');paint_drag(t,100,100,200,200)
    paint_choose(t,'fill')
    t.page.locator('#paintFillMode').select_option('gradient')
    paint_click(t);t.assertEqual(paint_assets(t)[0],1)

def check_096(t):
    paint_choose(t,'brush')
    t.page.locator('#paintColor').fill('#aa6611')
    paint_drag(t)
    t.page.wait_for_function('document.getElementById("artCanvas").getContext("2d").getImageData(180,180,1,1).data[3]>0')
    paint_choose(t,'picker');paint_click(t,180,180)
    t.assertEqual(t.page.locator('#paintColor').input_value(),'#aa6611')

def check_097(t):
    paint_choose(t,'text')
    t.page.locator('#paintText').fill('GOAL!')
    t.page.locator('#paintFont').select_option('Georgia')
    t.page.locator('#paintFontSize').fill('52')
    paint_click(t)
    t.assertIn('Text: GOAL!',paint_assets(t)[1][0]['name'])

def check_098(t):
    paint_choose(t,'shape-poly')
    t.page.locator('#paintSides').fill('8')
    paint_drag(t)
    t.assertEqual(paint_assets(t)[0],1)
    paint_choose(t,'shape-rect');paint_drag(t,260,260,320,330)
    t.assertEqual(paint_assets(t)[0],2)

def check_099(t):
    for mode in ['shape-oval','shape-circle']:
        paint_choose(t,mode);paint_drag(t)
    t.assertEqual(paint_assets(t)[0],2)

def check_100(t):
    for mode in ['shape-line','shape-curve']:
        paint_choose(t,mode);paint_drag(t)
    t.assertEqual(paint_assets(t)[0],2)

def check_101(t):
    paint_choose(t,'brush');paint_drag(t)
    project=t.page.evaluate('SuperMagicAssetStudioAPI.exportProjectObject({assetStorage:"bundled"})')
    t.assertTrue(next(iter(project['assets'].values()))['src'].startswith('data:image/png;base64,'))
    t.page.locator('#undoBtn').click()
    t.assertEqual(paint_assets(t)[0],0)

def check_102(t):
    t._menu('paint');t._present('[data-paint-menu="brush"]','[data-paint-menu="select-wand"]')
    t.page.locator('[data-paint-menu="brush"]').click()
    t.assertEqual(t.page.locator('#paintTool').input_value(),'brush')

PAINT_CASES={85:check_085,86:check_086,87:check_087,88:check_088,89:check_089,
 90:check_090,91:check_091,92:check_092,93:check_093,94:check_094,
 95:check_095,96:check_096,97:check_097,98:check_098,99:check_099,
 100:check_100,101:check_101,102:check_102}
for number,verify in PAINT_CASES.items():
    def run_paint(self,fn=verify):fn(self)
    setattr(BrowserRegression,'test_TC_%03d'%number,run_paint)


# Modular UI regression: original nodes remain single-instance and executable.
def ui_ready(t):
    t.page.wait_for_function('Boolean(window.SuperMagicStudioUI)')
def check_103(t):
    ui_ready(t)
    t.assertEqual(t.page.locator('.sidebar').get_attribute('data-active-workspace'),'project')
    t.page.locator('#studio-tab-assets').click()
    t.assertTrue(t.page.locator('#dropzone').is_visible())
    t.assertFalse(t.page.locator('#projectName').is_visible())
    t.page.locator('#studio-tab-project').click()
    t.assertTrue(t.page.locator('#projectName').is_visible())

def check_104(t):
    ui_ready(t)
    t._menu('paint')
    t.page.locator('[data-paint-menu="brush"]').click()
    t.assertTrue(t.page.locator('#paintPropertiesPopover').is_visible())
    t.assertTrue(t.page.locator('#paintSize').is_visible())
    t.assertFalse(t.page.locator('#paintSides').is_visible())
    t.page.locator('#paintPropertiesClose').click()
    t.assertFalse(t.page.locator('#paintPropertiesPopover').is_visible())

def check_105(t):
    ui_ready(t)
    t.assertEqual(t.page.evaluate('SuperMagicStudioUI.getVisibleActionAliases()'),[])
    t.assertFalse(t.page.locator('#saveProject').is_visible())
    t._menu('file')
    t.assertTrue(t.page.locator('#menuSaveProject').is_visible())
    t.assertEqual(t.page.locator('[id="paintSize"]').count(),1)

def check_106(t):
    ui_ready(t)
    paint_choose(t,'shape-poly')
    t.assertTrue(t.page.locator('#paintSides').is_visible())
    t.assertFalse(t.page.locator('#paintFont').is_visible())
    paint_choose(t,'text')
    t.assertTrue(t.page.locator('#paintFontSize').is_visible())
    t.assertFalse(t.page.locator('#paintSides').is_visible())
    paint_choose(t,'fill')
    t.page.locator('#paintFillMode').select_option('gradient')
    t.assertTrue(t.page.locator('#paintGradientEnd').is_visible())

def check_107(t):
    ui_ready(t)
    t._menu('edit');t.page.locator('#menuAutoSplit').click()
    t.page.locator('#spriteDetectMethod').select_option('grid')
    t.assertTrue(t.page.locator('#spriteGridRows').is_visible())
    t.assertFalse(t.page.locator('#spriteMinArea').is_visible())
    t.page.locator('#spriteDetectMethod').select_option('alpha')
    t.assertTrue(t.page.locator('#spriteMinArea').is_visible())
    t.page.locator('#spriteToolsDialog .studio-dialog-group').nth(1).evaluate('(e)=>e.open=true')
    t.page.locator('#spriteSelectionShape').select_option('wand')
    t.assertTrue(t.page.locator('#spriteWandMode').is_visible())
    t.assertFalse(t.page.locator('#spriteCurveSmooth').is_visible())

def check_108(t):
    ui_ready(t)
    t.page.locator('#studio-tab-assets').click()
    t.assertTrue(t.page.locator('#dropzone').is_visible())
    t.assertFalse(t.page.locator('#sequentialImport').is_visible())
    t.page.locator('#dropzone + details summary').click()
    t.assertTrue(t.page.locator('#sequentialImport').is_visible())

def check_109(t):
    ui_ready(t)
    t.page.locator('#studio-tab-animate').click()
    t.assertTrue(t.page.locator('#fps').is_visible())
    t.assertFalse(t.page.locator('#clipSource').is_visible())
    t.page.locator('details.studio-inline-advanced summary').last.click()
    t.assertTrue(t.page.locator('#clipSource').is_visible())

def check_110(t):
    ui_ready(t)
    t.assertTrue(t.page.locator('#inspectorContent').is_visible())
    t.page.locator('#properties-tab-canvas').click()
    t.assertTrue(t.page.locator('#canvasWidth').is_visible())
    t.assertFalse(t.page.locator('#inspectorContent').is_visible())
    t.page.locator('#properties-tab-canvas').focus()
    t.page.keyboard.press('ArrowRight')
    t.assertEqual(t.page.locator('.inspector').get_attribute('data-active-workspace'),'shortcuts')

def check_111(t):
    ui_ready(t)
    t.page.set_viewport_size({'width':760,'height':950})
    t.assertTrue(t.page.locator('#stage').is_visible())
    t.assertTrue(t.page.locator('#studio-tab-layers').is_visible())
    t.page.locator('#studio-tab-layers').click()
    t.assertTrue(t.page.locator('#layersList').is_visible())
    t.assertLessEqual(t.page.evaluate('document.documentElement.scrollWidth-window.innerWidth'),3)

UI_CASES={103:check_103,104:check_104,105:check_105,106:check_106,
107:check_107,108:check_108,109:check_109,110:check_110,111:check_111}
for number,verify in UI_CASES.items():
    def run_workspace(self,fn=verify):fn(self)
    setattr(BrowserRegression,'test_TC_%03d'%number,run_workspace)


# API/CLI parity contract: controls, settings and raster operation access.
def check_112(t):
    t.page.wait_for_function('Boolean(window.SuperMagicCapabilities)')
    result=t.page.evaluate('()=>SuperMagicAssetStudioAPI.listCapabilities()')
    t.assertGreaterEqual(len(result['controls']),200)
    t.assertIn('paintSize',[x['id'] for x in result['controls']])
    t.assertTrue(t.page.evaluate("""controls=>controls.every(x=>Boolean(document.getElementById(x.id)))""",result['controls']))

def check_113(t):
    t.page.wait_for_function('Boolean(window.SuperMagicCapabilities)')
    t.page.evaluate("()=>SuperMagicAssetStudioAPI.setUISettings({paintSize:27,paintColor:'#dd3344',paintBrushShape:'diamond'})")
    value=t.page.evaluate("()=>SuperMagicAssetStudioAPI.getUIControl('paintSize')")
    t.assertEqual(value['value'],27)
    t.assertEqual(t.page.locator('#paintColor').input_value(),'#dd3344')
    t.assertTrue(t.page.evaluate("()=>SuperMagicAssetStudioAPI.getAllUISettings().paintBrushShape==='diamond'"))

def check_114(t):
    t.page.wait_for_function('Boolean(window.SuperMagicCapabilities)')
    result=t.page.evaluate("()=>SuperMagicAssetStudioAPI.invokeUIAction('menuAI')")
    t.assertTrue(result['triggered'])
    t.assertTrue(t.page.locator('#aiDialog').evaluate('(x)=>x.open'))

def check_115(t):
    t.page.wait_for_function('Boolean(window.SuperMagicPaintAPI?.performPaintOperation)')
    value=t.page.evaluate("""async()=>{
      const selected=await SuperMagicPaintAPI.performPaintOperation({tool:'selection',selection:{type:'rect',x:30,y:35,w:80,h:75}});
      const painted=await SuperMagicPaintAPI.performPaintOperation({
        tool:'brush',points:[{x:40,y:50},{x:80,y:55}],properties:{paintColor:'#ff4455',paintSize:14}});
      return {selected,painted};
    }""")
    t.assertEqual(value['selected']['selectedPixels'],80*75)
    t.assertIn('layerId',value['painted'])
    t.assertEqual(len(t._project()['assets']),1)

def check_116(t):
    t.page.wait_for_function('Boolean(window.SuperMagicPaintAPI?.performPaintOperation)')
    value=t.page.evaluate("""async()=>{
      const poly=await SuperMagicPaintAPI.performPaintOperation({tool:'selection',selection:{type:'poly',points:[{x:12,y:12},{x:70,y:12},{x:70,y:70}]}});
      const fill=await SuperMagicPaintAPI.performPaintOperation({tool:'fill',properties:{paintFillMode:'gradient',paintGradientEnd:'#112233'}});
      return {poly,fill};
    }""")
    t.assertGreater(value['poly']['selectedPixels'],0)
    t.assertIn('layerId',value['fill'])

API_CASES={112:check_112,113:check_113,114:check_114,115:check_115,116:check_116}
for number,verify in API_CASES.items():
    def run_api(self,fn=verify):fn(self)
    setattr(BrowserRegression,'test_TC_%03d'%number,run_api)


def check_120(t):
    t.page.wait_for_function('Boolean(window.SuperMagicAssetStudioAPI?.listCapabilities)')
    result=t.page.evaluate("""async()=>{
      await SuperMagicAssetStudioAPI.runCommands({commands:[
        {op:'setControlValue',id:'paintSize',value:9},
        {op:'paint',tool:'brush',points:[{x:80,y:100},{x:130,y:102}],color:'#44cc88',size:9},
        {op:'getControlValue',id:'paintSize'}
      ]});
      return {paintSize:SuperMagicAssetStudioAPI.getUIControl('paintSize').value,
        assets:Object.keys(SuperMagicAssetStudioAPI.getProject().assets).length};
    }""")
    t.assertEqual(result['paintSize'],9)
    t.assertEqual(result['assets'],1)

def run_command_parity(self):check_120(self)
setattr(BrowserRegression,'test_TC_120',run_command_parity)


# Image editing discoverability after modularization (v5.9.1).
def image_edit_fixture(t):
    t.page.wait_for_function('Boolean(window.SuperMagicImageEditor)')
    return t.page.evaluate("""async()=>{
      const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
      canvas.getContext('2d').fillStyle='#ff8844';
      canvas.getContext('2d').fillRect(0,0,32,32);
      await SuperMagicAssetStudioAPI.runCommands({commands:[
        {op:'addAsset',id:'image_edit_fixture',name:'Fixture.png',width:32,height:32,src:canvas.toDataURL('image/png')},
        {op:'addLayer',id:'image_fixture_layer',assetId:'image_edit_fixture',category:'head'}
      ]});
      const selected=SuperMagicAssetStudioAPI.selectLayers(['image_fixture_layer']);
      if(selected.length!==1)throw Error('Fixture layer selection failed: '+JSON.stringify(selected));
      return 'image_fixture_layer';
    }""")

def check_122(t):
    t.page.wait_for_function('Boolean(window.SuperMagicImageEditor)')
    t.assertTrue(t.page.locator('#imageEditorToggle').is_visible())
    t.assertEqual(t.page.locator('#imageEditorToggle').count(),1)
    t.page.locator('#properties-tab-canvas').click()
    t.page.locator('#imageEditorToggle').click()
    t.assertEqual(t.page.locator('.inspector').get_attribute('data-active-workspace'),'inspector')
    t.assertEqual(t.page.locator('.sidebar').get_attribute('data-active-workspace'),'layers')
    t.assertTrue(t.page.locator('#inspectorContent').is_visible())
    t.assertIn('select',t.page.locator('#inspectorContent').inner_text().lower())

def check_123(t):
    image_edit_fixture(t)
    t.page.wait_for_selector('.image-edit-group[data-image-group="color"]')
    t.assertTrue(t.page.locator('#flipX').is_visible())
    t.assertTrue(t.page.locator('[data-prop="colorBrightness"]').is_visible())
    t.assertEqual(t.page.locator('#flipX').count(),1)
    t.assertEqual(t.page.locator('[data-prop="colorBrightness"]').count(),1)
    for item in ['image','transform','color','crop','fit']:
        t.assertEqual(t.page.locator('.image-edit-group[data-image-group="'+item+'"]').count(),1)
    t.page.locator('.image-edit-group[data-image-group="crop"] summary').click()
    t.assertTrue(t.page.locator('[data-prop="cropW"]').is_visible())
    t.page.locator('.image-edit-group[data-image-group="fit"] summary').click()
    t.assertTrue(t.page.locator('#autoFitLayer').is_visible())

def check_124(t):
    image_edit_fixture(t)
    t.page.wait_for_selector('.image-edit-group[data-image-group="transform"]')
    t.page.locator('#flipX').click()
    t.assertTrue(t._project()['scenes']['front']['stand']['stand_1'][0]['transform']['flipX'])
    t.page.locator('[data-prop="colorBrightness"]').fill('135')
    t.page.locator('[data-prop="colorBrightness"]').press('Tab')
    t.assertEqual(t._project()['scenes']['front']['stand']['stand_1'][0]['color']['brightness'],135)
    t.page.locator('#properties-tab-canvas').click()
    t.page.evaluate("()=>SuperMagicAssetStudioAPI.selectLayers([])")
    t.page.evaluate("()=>SuperMagicAssetStudioAPI.selectLayers(['image_fixture_layer'])")
    t.page.wait_for_function("document.querySelector('.inspector').dataset.activeWorkspace==='inspector'")
    t.assertTrue(t.page.locator('#flipY').is_visible())

def check_125(t):
    t.page.set_viewport_size({'width':760,'height':950})
    image_edit_fixture(t)
    t.page.locator('#imageEditorToggle').click()
    t.assertTrue(t.page.locator('.image-edit-group[data-image-group="color"] summary').is_visible())
    t.page.locator('[data-prop="colorHue"]').fill('30')
    t.page.locator('[data-prop="colorHue"]').press('Tab')
    t.assertEqual(t._project()['scenes']['front']['stand']['stand_1'][0]['color']['hue'],30)

IMAGE_EDIT_CASES={122:check_122,123:check_123,124:check_124,125:check_125}
for number,verify in IMAGE_EDIT_CASES.items():
    def run_image_edit(self,fn=verify):fn(self)
    setattr(BrowserRegression,'test_TC_%03d'%number,run_image_edit)


# Inspector visibility after editing a layer: keep properties open and editable.
def check_126(t):
    image_edit_fixture(t)
    t.page.locator('#properties-tab-canvas').click()
    t.page.evaluate("()=>document.querySelector('#inspectorContent').closest('.section').classList.add('collapsed')")
    t.page.locator('#studio-tab-layers').click()
    t.page.locator('#layersList [data-layer="image_fixture_layer"]').click()
    t.assertEqual(t.page.locator('.inspector').get_attribute('data-active-workspace'),'inspector')
    t.assertFalse(t.page.locator('#inspectorContent').evaluate('(e)=>e.closest(".section").classList.contains("collapsed")'))
    t.assertTrue(t.page.locator('[data-prop="scaleX"]').is_visible())
    t.assertTrue(t.page.locator('[data-prop="colorBrightness"]').is_visible())
    t.page.locator('[data-prop="scaleX"]').fill('2.5')
    t.page.locator('[data-prop="scaleX"]').press('Tab')
    layer=t._project()['scenes']['front']['stand']['stand_1'][0]
    t.assertEqual(layer['transform']['scaleX'],2.5)

def check_127(t):
    image_edit_fixture(t)
    t.page.locator('#properties-tab-canvas').click()
    t.page.evaluate("""()=>{SuperMagicAssetStudioAPI.selectLayers([]);
       document.querySelector('#inspectorContent').closest('.section').classList.add('collapsed')}""")
    p=t._project();layer=p['scenes']['front']['stand']['stand_1'][0]
    t.page.wait_for_function("""() => {
      const p=SuperMagicAssetStudioAPI.getProject(),layer=p.scenes.front.stand.stand_1[0];
      const c=document.getElementById('artCanvas');
      const x=Math.round(layer.transform.x),y=Math.round(layer.transform.y);
      return c.getContext('2d').getImageData(x,y,1,1).data[3]>0;
    }""")
    bb=t.page.locator('#overlay').bounding_box()
    x=bb['x']+layer['transform']['x']*bb['width']/p['canvas']['width']
    y=bb['y']+layer['transform']['y']*bb['height']/p['canvas']['height']
    t.page.mouse.click(x,y)
    t.assertEqual(t.page.locator('.inspector').get_attribute('data-active-workspace'),'inspector')
    t.assertTrue(t.page.locator('[data-prop="rotationDeg"]').is_visible())
    t.assertIn('image_fixture_layer',t.page.evaluate('SuperMagicAssetStudioAPI.getSelectedLayerIds()'))

def check_128(t):
    image_edit_fixture(t)
    t.page.evaluate("()=>document.querySelector('#inspectorContent').closest('.section').classList.add('collapsed')")
    t.page.locator('#properties-tab-shortcuts').click()
    t.page.locator('#imageEditorToggle').click()
    t.assertTrue(t.page.locator('[data-prop="colorHue"]').is_visible())
    t.assertEqual(t.page.locator('.inspector').get_attribute('data-active-workspace'),'inspector')
    t.assertFalse(t.page.locator('#inspectorContent').evaluate('(e)=>e.closest(".section").classList.contains("collapsed")'))

def check_129(t):
    image_edit_fixture(t)
    t.page.evaluate("""async()=>await SuperMagicAssetStudioAPI.runCommands({commands:[
      {op:'addLayer',id:'image_fixture_second',assetId:'image_edit_fixture',category:'head',
       transform:{x:460,y:200}}
    ]})""")
    t.page.evaluate("()=>SuperMagicAssetStudioAPI.selectLayers(['image_fixture_layer','image_fixture_second'])")
    t.assertEqual(t.page.locator('.inspector').get_attribute('data-active-workspace'),'inspector')
    t.assertTrue(t.page.locator('#inspectorContent [data-group-prop="dx"]').is_visible())
    t.assertIn('2 parts selected',t.page.locator('#inspectorContent').inner_text())

INSPECTOR_CASES={126:check_126,127:check_127,128:check_128,129:check_129}
for number,verify in INSPECTOR_CASES.items():
    def run_inspector(self,fn=verify):fn(self)
    setattr(BrowserRegression,'test_TC_%03d'%number,run_inspector)


# Exhaustive control reachability after contextual UI modularization.
# Counts a control only when the real browser layout makes it visible; static
# catalog membership alone is NOT sufficient evidence that users can reach it.
def check_130(t):
    import json
    contract=json.loads((ROOT/'src/shared/ui-reachability.json').read_text())
    t.page.wait_for_function('Boolean(window.SuperMagicStudioUI&&window.SuperMagicCapabilities&&window.SuperMagicImageEditor)')
    catalog=t.page.evaluate('SuperMagicAssetStudioAPI.listCapabilities()')['controls']
    expected={x['id'] for x in catalog}
    visible=set()
    stages={}
    select_options={}
    def capture(stage):
        controls=t.page.evaluate("""()=>{
          return [...document.querySelectorAll('button[id],input[id],select[id],textarea[id],#dropzone')]
            .filter(el=>el.getClientRects().length>0 && getComputedStyle(el).visibility!=='hidden' &&
              !el.closest('[inert],[aria-hidden="true"]'))
            .map(el=>({id:el.id,options:el.tagName==='SELECT'?[...el.options].map(o=>o.value):null}))
            .filter(el=>el.id);
        }""")
        ids=[x['id'] for x in controls]
        visible.update(ids)
        for item in controls:
            if item['options'] is not None:
                select_options.setdefault(item['id'],set()).update(item['options'])
        stages[stage]=len(ids)
    def tab(side,name):
        t.page.locator('#'+('studio' if side=='left' else 'properties')+'-tab-'+name).click()
        root='studio' if side=='left' else 'properties'
        pane=t.page.locator('#'+root+'-pane-'+name)
        for heading in pane.locator(':scope > .section.collapsed > h3').all():
            heading.click()
        capture(side+':'+name)
    def menu(name):
        t._menu(name)
        capture('menu:'+name)
    capture('initial')
    # Entire left/right workspace tree, including old collapsible sections.
    for name in ['project','assets','animate','layers','camera']:tab('left',name)
    for name in ['inspector','canvas','shortcuts']:tab('right',name)
    # Main menu action routes, including the separate standalone background tool.
    for name in ['file','edit','view','animation','paint','help']:
        if name=='paint' or t.page.locator('.menu-btn[data-menu="'+name+'"]').is_visible():
            menu(name)
        else:
            # Menus whose commands all have canonical workspace/toolbar actions
            # are intentionally suppressed; the canonical routes are audited below.
            stages['menu:'+name+':suppressed']=0
    menu('edit')
    t.assertTrue(t.page.locator('#menuStandaloneBackground').is_visible(),
        'Standalone background cleanup was incorrectly hidden as a duplicate')
    t.page.locator('#menuStandaloneBackground').click()
    t.assertTrue(t.page.locator('#bgStandaloneDialog').evaluate('(el)=>el.open'))
    capture('dialog:standalone-background')
    t.page.locator('#bgStandaloneClose').click()
    # Context-specific structural options and advanced import settings.
    tab('left','project')
    t._mode('custom')
    capture('mode:custom')
    tab('left','assets')
    advanced=t.page.locator('#studio-pane-assets .studio-inline-advanced')
    for details in advanced.all():
        if not details.evaluate('(d)=>d.open'):details.locator('summary').click()
    capture('import:advanced')
    tab('left','animate')
    for details in t.page.locator('#studio-pane-animate details.studio-inline-advanced').all():
        if not details.evaluate('(d)=>d.open'):details.locator('summary').click()
    capture('animation:linked-clip')
    # Every paint menu tool and context-specific property, including selection
    # clear and fill's distinct gradient / imported-pattern settings.
    tool_names=t.page.locator('[data-paint-menu]').evaluate_all(
        '(nodes)=>[...new Set(nodes.map(n=>n.dataset.paintMenu))]')
    for tool in tool_names:
        menu('paint')
        t.page.locator('[data-paint-menu="'+tool+'"]').click()
        capture('paint:'+tool)
        if tool=='fill':
            t.page.locator('#paintFillMode').select_option('gradient')
            capture('paint:fill-gradient')
            t.page.locator('#paintFillMode').select_option('texture')
            capture('paint:fill-texture')
        t.page.evaluate('SuperMagicStudioUI.closePaintProperties()')
    t.page.evaluate("""()=>{
      const p=SuperMagicAssetStudioAPI.getPaintContext();
      const mask=new Uint8Array(p.width*p.height);mask[0]=1;
      SuperMagicPaintAPI.setSelectionMask(mask);
      SuperMagicPaintAPI.setTool('select-rect');
      SuperMagicStudioUI.openPaintProperties();
      SuperMagicStudioUI.updatePaintProperties();
    }""")
    capture('paint:clear-selection')
    t.page.evaluate('SuperMagicStudioUI.closePaintProperties()')
    # Bulk import queue actions appear only after an image is staged.
    import base64
    tab('left','assets')
    image_data=t.page.evaluate("""()=>{
      const c=document.createElement('canvas');c.width=8;c.height=8;
      c.getContext('2d').fillRect(0,0,8,8);
      return c.toDataURL('image/png').split(',')[1];
    }""")
    t.page.locator('#imageInput').set_input_files({'name':'reachability.png',
      'mimeType':'image/png','buffer':base64.b64decode(image_data)})
    t.page.wait_for_selector('#importQueue .queue-row')
    capture('import:queue-items-staged')
    t.assertTrue(t.page.locator('#applyQueue').is_visible())
    t.assertTrue(t.page.locator('#clearQueue').is_visible())
    for field in ['view','category','animation','frame','mirror']:
        t.assertTrue(t.page.locator('#importQueue [data-q="'+field+'"]').is_visible(),field)
    t.page.locator('#clearQueue').click()
    # Camera's image-reference context actions are reached by right-clicking
    # a view thumbnail; the direct Reference controls are available elsewhere.
    tab('left','camera')
    t.page.locator('#viewButtons [data-view]').first.click(button='right')
    capture('camera:reference-context-menu')
    t.assertTrue(t.page.locator('#useCameraAsReference').is_visible())
    t.assertTrue(t.page.locator('#clearCameraReference').is_visible())
    t.page.locator('#clearCameraReference').click()
    # Real layer: each image editing property module, plus multi-selection.
    image_edit_fixture(t)
    t.page.wait_for_selector('.image-edit-group[data-image-group="color"]')
    capture('image:selected')
    for group in contract['requiredContextGroups']:
        details=t.page.locator('.image-edit-group[data-image-group="'+group+'"]')
        t.assertEqual(details.count(),1,group)
        if not details.evaluate('(x)=>x.open'):details.locator('summary').click()
        capture('image:group:'+group)
    t.page.evaluate("""async()=>await SuperMagicAssetStudioAPI.runCommands({commands:[
      {op:'addLayer',id:'reachability_second',assetId:'image_edit_fixture',category:'head',
       transform:{x:500,y:270}}
    ]})""")
    t.page.evaluate("()=>SuperMagicAssetStudioAPI.selectLayers(['image_fixture_layer','reachability_second'])")
    capture('image:multi-selection')
    t.page.evaluate("()=>SuperMagicAssetStudioAPI.selectLayers(['image_fixture_layer'])")
    capture('image:single-restored')
    # Sprite tools auto/grid, manual polygon/bezier/wand and background modes.
    menu('edit');t.page.locator('#menuManualSplit').click()
    capture('sprite:manual')
    for d in t.page.locator('#splitControlPanel details.studio-dialog-group').all():
        if not d.evaluate('(x)=>x.open'):d.locator('summary').click()
    capture('sprite:expanded')
    t.page.locator('#spriteDetectMethod').select_option('grid')
    capture('sprite:regular-grid')
    t.page.locator('#spriteDetectMethod').select_option('alpha')
    capture('sprite:transparent-islands')
    for shape in ['rect','poly','bezier','wand']:
        t.page.locator('#spriteSelectionShape').select_option(shape)
        capture('sprite:boundary-'+shape)
    t.page.locator('#spriteToolsClose').click()
    menu('edit');t.page.locator('#menuAutoSplit').click()
    capture('sprite:auto')
    t.page.locator('#spriteToolsClose').click()
    menu('edit');t.page.locator('#menuRemoveBackground').click()
    capture('sprite:background-removal')
    t.page.locator('#spriteToolsClose').click()
    # Editor tools and documentation dialogs.
    menu('edit');t.page.locator('#menuAI').click()
    capture('dialog:ai')
    t.page.locator('#closeAIDialog').click()
    menu('help');t.page.locator('#menuHelp').click()
    capture('dialog:help')
    t.page.locator('#closeHelp').click()
    menu('edit');t.page.locator('#menuAutoResize').click()
    capture('dialog:auto-resize')
    t.page.locator('#closeAutoResize').click()
    tab('right','inspector')
    if not t.page.locator('#cropLayer').is_visible():
        t.page.locator('.image-edit-group[data-image-group="image"] summary').click()
    t.page.locator('#cropLayer').click()
    capture('dialog:crop')
    t.page.locator('#closeCrop').click()
    # External image resolver must become reachable when a reference is absent.
    t.page.evaluate("""()=>{
      const p=SuperMagicAssetStudioAPI.getProject();
      p.assets.reachability_missing={name:'missing.png',fileRef:'missing.png',
        width:16,height:16,mime:'image/png'};
      SuperMagicAssetStudioAPI.importProjectObject(p);
    }""")
    tab('left','project')
    capture('project:resolve-missing-images')
    t.assertTrue(t.page.locator('#resolveImagesBtn').is_visible())
    # Every hidden relay must have an actually visible canonical route.
    aliases=contract['hiddenAliases']
    for old,new in aliases.items():
        t.assertTrue(t.page.locator('#'+old).evaluate('(e)=>e.hidden'),old+' should be a hidden duplicate')
        t.assertIn(new,visible,old+' has no visible replacement '+new)
    for fileid,trigger in contract['fileInputTriggers'].items():
        t.assertIn(trigger,visible,'File picker '+fileid+' has no reachable trigger '+trigger)
    for old,new in contract['hiddenHostAliases'].items():
        t.assertIn(new,visible,'Hidden export relay '+old+' has no discoverable '+new)
        t.assertFalse(t.page.locator('#'+old).is_visible(),
          'Redundant legacy export relay should not create a duplicate button')
    exempt=set(aliases)|set(contract['hiddenHostAliases'])|set(contract['fileInputTriggers'])|set(contract['alternativeControls'])
    not_reached=sorted(expected-exempt-visible)
    t.assertFalse(not_reached,
      'Static controls never visible in any of the '+str(len(stages))+
      ' user-reachable states: '+repr(not_reached)+'; stages='+repr(stages))
    t.assertEqual(len(expected),len(set(expected)))
    for setting in (x for x in catalog if x['kind']=='select' and x.get('values') and x['id']!='paintTool'):
        missing=set(setting['values'])-select_options.get(setting['id'],set())
        t.assertFalse(missing,'Selectable choices never appeared for '+setting['id']+': '+repr(sorted(missing)))
    print('UI AUDIT: '+str(len(expected))+' static controls; '+str(len(contract['hiddenAliases']))+
      ' intentional aliases with replacements; '+str(len(contract['fileInputTriggers']))+
      ' hidden file inputs with triggers; '+str(len(stages))+' interaction states; '+
      str(len(visible))+' reachable element IDs; no inaccessible control')
def test_all_ui_control_reachability(self):check_130(self)
setattr(BrowserRegression,'test_TC_130',test_all_ui_control_reachability)


# Existing layers must remain editable when the project changes modular structures.
def check_131(t):
    image_edit_fixture(t)
    t.page.locator('#studio-tab-project').click()
    t._mode('custom')
    t.page.evaluate("()=>SuperMagicAssetStudioAPI.selectLayers(['image_fixture_layer'])")
    t.assertTrue(t.page.locator('#inspectorContent [data-prop="scaleX"]').is_visible())
    category=t.page.locator('#inspectorContent [data-prop="category"]')
    t.assertEqual(category.input_value(),'head')
    t.assertTrue(category.locator('option[value="head"]').count()==1)
    t.assertIn('head',t.page.locator('#inspectorContent').inner_text().lower())
    t.page.locator('#inspectorContent [data-prop="scaleX"]').fill('1.75')
    t.page.locator('#inspectorContent [data-prop="scaleX"]').press('Tab')
    t.assertEqual(t._project()['scenes']['front']['stand']['stand_1'][0]['transform']['scaleX'],1.75)

def check_132(t):
    t.page.set_viewport_size({'width':390,'height':844})
    t.page.wait_for_function('Boolean(window.SuperMagicStudioUI&&window.SuperMagicImageEditor)')
    t.page.locator('#studio-tab-assets').click()
    t.assertTrue(t.page.locator('#dropzone').is_visible())
    t.page.locator('#studio-tab-project').click()
    t.assertTrue(t.page.locator('#assetMode').is_visible())
    t._menu('paint')
    t.page.locator('[data-paint-menu="brush"]').click()
    t.assertTrue(t.page.locator('#paintSize').is_visible())
    t.page.evaluate('SuperMagicStudioUI.closePaintProperties()')
    t._menu('edit')
    t.assertTrue(t.page.locator('#menuStandaloneBackground').is_visible())
    t.page.locator('#menuStandaloneBackground').click()
    t.assertTrue(t.page.locator('#bgStandaloneColor').is_visible())
    t.page.locator('#bgStandaloneClose').click()
    image_edit_fixture(t)
    t.page.locator('#imageEditorToggle').click()
    t.assertTrue(t.page.locator('[data-prop="colorHue"]').is_visible())

for number,fn in {131:check_131,132:check_132}.items():
    def run_mobile_and_legacy(self,case=fn):case(self)
    setattr(BrowserRegression,'test_TC_%03d'%number,run_mobile_and_legacy)


# v5.9.4 consolidated menus and icon-based right Paint toolbox.
def check_133(t):
    menus=t.page.locator('.menubar > .menu > .menu-btn').all_text_contents()
    t.assertIn('Edit',menus)
    t.assertIn('File',menus)
    t.assertNotIn('Import',menus)
    t.assertNotIn('Tools',menus)
    t.assertNotIn('Paint',menus)
    t._menu('edit')
    for name in ['menuImportImages','menuImportParts','menuDownloadParts','menuResolveImages',
                 'menuManualSplit','menuAutoSplit','menuRemoveBackground',
                 'menuAutoFit','menuAutoResize','menuStandaloneBackground','menuAI']:
        t.assertTrue(t.page.locator('#'+name).is_visible(),name)
    t.page.locator('#menuManualSplit').click()
    t.assertTrue(t.page.locator('#spriteToolsDialog').evaluate('(el)=>el.open'))
    t.page.locator('#spriteToolsClose').click()
    t._menu('edit');t.page.locator('#menuStandaloneBackground').click()
    t.assertTrue(t.page.locator('#bgStandaloneDialog').evaluate('(el)=>el.open'))
    t.page.locator('#bgStandaloneClose').click()
    t._menu('edit');t.page.locator('#menuAI').click()
    t.assertTrue(t.page.locator('#aiDialog').evaluate('(el)=>el.open'))
    t.page.locator('#closeAIDialog').click()

def check_134(t):
    t._menu('file')
    t.assertTrue(t.page.locator('#menuFileImportImage').is_visible())
    with t.page.expect_file_chooser() as picker:
        t.page.locator('#menuFileImportImage').click()
    t.assertEqual(picker.value.element.get_attribute('id'),'imageInput')
    t._menu('edit')
    with t.page.expect_file_chooser() as picker2:
        t.page.locator('#menuImportImages').click()
    t.assertEqual(picker2.value.element.get_attribute('id'),'imageInput')
    t.assertEqual(t.page.locator('#imageInput').count(),1)
    t.assertTrue(t.page.locator('#studio-tab-assets').is_visible())

def check_135(t):
    t.assertEqual(t.page.locator('.menubar [data-menu="paint"]').count(),0)
    t._menu('paint')
    t.assertEqual(t.page.locator('.inspector').get_attribute('data-active-workspace'),'paint')
    options=t.page.locator('#paintToolboxCommands [data-paint-menu]')
    t.assertEqual(options.count(),16)
    all_actions=t.page.locator('#paintToolboxCommands [data-paint-menu],#paintToolboxCommands #paintClearMenu')
    t.assertEqual(all_actions.count(),17)
    for action in all_actions.all():
        t.assertTrue(action.is_visible())
        t.assertEqual(action.locator('svg.studio-paint-icon[aria-hidden="true"]').count(),1)
        t.assertGreater(action.locator('svg.studio-paint-icon path,svg.studio-paint-icon rect,svg.studio-paint-icon ellipse,svg.studio-paint-icon circle').count(),0)
    tools=options.evaluate_all('(els)=>els.map(e=>e.dataset.paintMenu)')
    for tool in tools:
        t._menu('paint')
        element=t.page.locator('#paintToolboxCommands [data-paint-menu="'+tool+'"]')
        element.click()
        t.assertEqual(t.page.evaluate('SuperMagicPaintAPI.getTool()'),tool)
        t.assertEqual(element.get_attribute('aria-pressed'),'true')
        t.assertEqual(t.page.locator('.inspector').get_attribute('data-active-workspace'),'paint')
        t.assertTrue(t.page.locator('#paintPropertiesPopover').is_visible())
        t.page.evaluate('SuperMagicStudioUI.closePaintProperties()')
    # Context action keeps the existing paint-mask behavior, not a dummy button.
    t.page.evaluate("""()=>{
      const p=SuperMagicAssetStudioAPI.getPaintContext();
      const mask=new Uint8Array(p.width*p.height);
      mask[42]=1;
      SuperMagicPaintAPI.setSelectionMask(mask);
      SuperMagicStudioUI.updatePaintProperties();
    }""")
    clear=t.page.locator('#paintClearMenu')
    t.assertFalse(clear.is_disabled())
    clear.click()
    t.assertEqual(t.page.evaluate('SuperMagicPaintAPI.getSelectionCount()'),0)
    t.assertTrue(t.page.locator('#properties-tab-inspector').is_visible())
    t.assertTrue(t.page.locator('#properties-tab-canvas').is_visible())

for number,fn in {133:check_133,134:check_134,135:check_135}.items():
    def run_menu_reorganization(self,check=fn):check(self)
    setattr(BrowserRegression,'test_TC_%03d'%number,run_menu_reorganization)

if __name__=='__main__':unittest.main()