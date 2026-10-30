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
        self.page.locator(f'[data-menu="{name}"] .menu-btn').click()
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
    t._mode('custom');t._present('#customPartDefault','#customPartsList','[data-part-action="up"]')
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

if __name__=='__main__':unittest.main()