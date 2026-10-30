import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const expected=['index.html','src/editor/app.js','src/editor/styles.css','src/editor/sprite-geometry.js','src/cli/agent-cli.mjs','src/cli/agent-engine.mjs','src/cli/agent-raster.mjs','src/cli/agent-image-tools.mjs','src/runtime/runtime.js','AGENTS.md','README.md','LICENSE','docs/REQUIREMENTS.md','tests/requirements.json','.github/workflows/ci.yml'];
for(const p of expected)assert(fs.existsSync(path.join(root,p)),`Required file missing: ${p}`);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('./src/editor/app.js')&&html.includes('./src/editor/styles.css')&&html.includes('./src/editor/sprite-geometry.js'));
assert(!html.includes('<style>')&&!html.includes('<script>'),'Browser CSS and JS must be externalized');
for(const p of fs.readdirSync(root))assert(!/^((studio_v|test-|v5[345]_).+\.(png|jpe?g|gif|zip)|_check\.js)$/i.test(p),`Generated test output in repository root: ${p}`);
console.log('Repository layout validated');