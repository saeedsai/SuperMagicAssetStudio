import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../../src/editor/app.js',import.meta.url),'utf8');
const extract=(name,next)=>source.slice(source.indexOf('function '+name+'('),source.indexOf('function '+next+'('));
const code=extract('preferredPartForMode','guessView');

test('asset menu uses one structure change listener',()=>{
  assert.equal((source.match(/\$\('#assetMode'\)\.addEventListener\('change'/g)||[]).length,1);
});
test('Only part and Default part match all four structure definitions',()=>{
  const cases=[
    {mode:'fullBody',parts:[['fullBody','Full body'],['accessory','Accessory']],expected:'fullBody'},
    {mode:'bodyHead',parts:[['body','Body without head'],['head','Head']],expected:'body'},
    {mode:'standard',parts:[['torso','Torso'],['head','Head']],expected:'torso'},
    {mode:'custom',parts:[['cape','Cape'],['glove','Glove']],expected:'glove',defaults:['glove']}
  ];
  for(const {mode,parts,expected,defaults=[]} of cases){
    const fields=Object.fromEntries(['importCategory','reuseCategory','reuseSource'].map(id=>[id,{value:'',innerHTML:''}]));
    const cats=Object.fromEntries(parts);
    const context={project:{mode},CATEGORIES:cats,partDefinitions:()=>parts.map(([id,name])=>({id,name,default:defaults.includes(id)})),
      $:selector=>fields[selector.slice(1)],VIEWS:[['front','Front'],['threeQuarterFrontRight','3/4 front right']],
      VIEW_IDS:['front','threeQuarterFrontRight'],esc:s=>s,queueOptions:(pairs,selected)=>pairs.map(([id,label])=>'<option value="'+id+'"'+(id===selected?' selected':'')+'>'+label+'</option>').join('')};
    vm.runInNewContext(code+';populateChoices();',context);
    assert.equal(fields.importCategory.value,expected,mode+' default');
    for(const [id,name] of parts){
      assert(fields.importCategory.innerHTML.includes('value="'+id+'"'),mode+' default part '+name);
      assert(fields.reuseCategory.innerHTML.includes('value="'+id+'"'),mode+' only part '+name);
    }
    assert(fields.reuseCategory.innerHTML.includes('value="all"'),mode+' all layers');
  }
});
test('switching parts preserves valid selection and rejects stale selection',()=>{
  const fields={importCategory:{value:'head'},reuseCategory:{value:'head'},reuseSource:{value:'front'}};
  const context={project:{mode:'bodyHead'},CATEGORIES:{body:'Body',head:'Head'},partDefinitions:()=>[],
    $:s=>fields[s.slice(1)],VIEWS:[['front','Front'],['threeQuarterFrontRight','Right']],
    VIEW_IDS:['front','threeQuarterFrontRight'],esc:s=>s,
    queueOptions:(p)=>p.map(([id,label])=>'<option value="'+id+'">'+label+'</option>').join('')};
  vm.runInNewContext(code+';populateChoices();',context);
  assert.equal(fields.importCategory.value,'head');
  assert.equal(fields.reuseCategory.value,'head');
  context.project.mode='fullBody';context.CATEGORIES={fullBody:'Full body',accessory:'Accessory'};
  vm.runInNewContext('populateChoices();',context);
  assert.equal(fields.importCategory.value,'fullBody');
  assert.equal(fields.reuseCategory.value,'all');
  assert.equal(fields.reuseSource.value,'front');
});
