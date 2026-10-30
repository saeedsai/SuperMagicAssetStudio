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
    t._menu('import');t.page.locator('#menuManualSplit').click()
    t.assertTrue(t.page.locator('#spriteToolsDialog').evaluate('(e)=>e.open'))
    t._present('#spriteSelectionShape','#spriteToolsCanvas')
def check_054(t):
    t._menu('import');t.page.locator('#menuManualSplit').click();t._present('#spriteSelectionShape','#spriteFinishPolygon')
def check_056(t):
    t._menu('import');t.page.locator('#menuManualSplit').click();t._present('#spriteEditPoints','#spriteDeletePoint')
def check_066(t):
    for m in ['file','import','view','animation','tools','help']:t._present(f'[data-menu="{m}"]')
def check_067(t):t._present('.sidebar .section.collapsed','.inspector .section')
def check_068(t):
    t._mode('fullBody');a=t.page.locator('#importCategory option').all_text_contents();t.assertFalse(any('forearm' in x.lower() for x in a))
    t._mode('standard');a=t.page.locator('#importCategory option').all_text_contents();t.assertTrue(any('forearm' in x.lower() for x in a))
def check_069(t):
    t._menu('tools');t.page.locator('#menuAI').click();t.assertTrue(t.page.locator('#aiDialog').evaluate('(e)=>e.open'))
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
    t.page.locator('#paintTool').select_option(mode)

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
    t.page.locator('#paintSize').fill('35')
    t.page.locator('#paintBrushShape').select_option('square')
    t.page.locator('#paintColor').fill('#ff4400')
    paint_choose(t,'brush');paint_drag(t)
    count,layers=paint_assets(t);t.assertEqual(count,1);t.assertEqual(len(layers),1)

def check_089(t):
    t.page.locator('#paintTexture').select_option('stripes')
    paint_choose(t,'brush');paint_drag(t);t.assertEqual(paint_assets(t)[0],1)

def check_090(t):
    paint_choose(t,'brush');paint_drag(t)
    before=paint_assets(t)[1][0]['assetId']
    t.page.locator('#paintEraseMode').select_option('paint')
    paint_choose(t,'eraser');paint_drag(t)
    t.page.wait_for_function('Object.keys(SuperMagicAssetStudioAPI.getProject().assets).length===2')
    after=paint_assets(t)[1][0]['assetId'];t.assertNotEqual(before,after)

def check_091(t):
    paint_choose(t,'brush');paint_drag(t)
    before=paint_assets(t)[1][0]['assetId']
    t.page.evaluate('(id)=>SuperMagicAssetStudioAPI.selectLayers([id])',paint_assets(t)[1][0]['id'])
    t.page.locator('#paintEraseMode').select_option('original')
    paint_choose(t,'eraser');paint_drag(t)
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
    import base64
    png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==')
    t.page.locator('#paintTextureFile').set_input_files({'name':'pattern.png','mimeType':'image/png','buffer':png})
    t.assertEqual(t.page.locator('#paintTexture').input_value(),'imported')

def check_095(t):
    paint_choose(t,'select-rect');paint_drag(t,100,100,200,200)
    t.page.locator('#paintFillMode').select_option('gradient')
    paint_choose(t,'fill');paint_click(t);t.assertEqual(paint_assets(t)[0],1)

def check_096(t):
    t.page.locator('#paintColor').fill('#aa6611')
    paint_choose(t,'brush');paint_drag(t)
    t.page.wait_for_function('document.getElementById("artCanvas").getContext("2d").getImageData(180,180,1,1).data[3]>0')
    paint_choose(t,'picker');paint_click(t,180,180)
    t.assertEqual(t.page.locator('#paintColor').input_value(),'#aa6611')

def check_097(t):
    t.page.locator('#paintText').fill('GOAL!')
    t.page.locator('#paintFont').select_option('Georgia')
    t.page.locator('#paintFontSize').fill('52')
    paint_choose(t,'text');paint_click(t)
    t.assertIn('Text: GOAL!',paint_assets(t)[1][0]['name'])

def check_098(t):
    t.page.locator('#paintSides').fill('8')
    paint_choose(t,'shape-poly');paint_drag(t)
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

if __name__=='__main__':unittest.main()