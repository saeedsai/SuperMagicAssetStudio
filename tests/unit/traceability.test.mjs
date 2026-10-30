/** One individually visible regression contract TC-001 ... TC-084 for each requirement.
 * These tests check wiring and documented evidence, not browser visual correctness.
 * Behaviour is independently tested in domain.test.mjs, cli.test.mjs and test_ui.py.
 */
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const req=JSON.parse(fs.readFileSync(path.join(root,'tests/requirements.json'),'utf8'));
const unique=new Set(req.map(x=>x.id));
test('requirements traceability IDs unique',()=>assert.equal(unique.size,req.length));
test('requirements have a distinct TC for every feature',()=>assert.equal(new Set(req.map(r=>r.testId)).size,req.length));
for(const r of req){test(`${r.testId}: ${r.requirement}`,()=>{assert.match(r.id,/^REQ-\d{3}$/);assert.match(r.testId,/^TC-\d{3}$/);assert(['unit','integration','browser','contract'].includes(r.verification));const p=path.join(root,r.evidence.path);assert(fs.existsSync(p),`${r.id}: ${r.evidence.path} missing`);const content=fs.readFileSync(p,'utf8');assert(content.includes(r.evidence.contains),`${r.id}: expected implementation evidence '${r.evidence.contains}' in ${r.evidence.path}`);});}