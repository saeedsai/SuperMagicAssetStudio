#!/usr/bin/env node
/** CLI for PowerShell, terminals and autonomous agents. No npm dependencies. */
import fs from 'node:fs';
import path from 'node:path';
import {makeProject,migrate,execute,saveProject,reviewProject} from './agent-engine.mjs';
import {renderFrame,renderSpriteSheet,renderGIF,encodePNG} from './agent-raster.mjs';
const RENDER=['renderPNG','renderSpriteSheet','renderGIF','renderTurntable'];
const HELP=`SuperMagic Asset Studio - Agent CLI (Node 20+, no npm dependencies)
Created by Saeed <saeedmsalehi1990@gmail.com>

Usage:
  node agent-cli.mjs --project player.json --command-file commands.json
  node agent-cli.mjs --project player.json --commands '{"commands":[{"op":"review"}]}'
  node agent-cli.mjs --project player.json --op review
  node agent-cli.mjs --project player.json --command-file commands.json --dry-run

Options:
  --project PATH           JSON project to open; creates a new one if absent
  --command-file PATH      JSON file: {"commands":[{...}, ...]}
  --commands JSON          Inline commands payload (PowerShell -CommandJson)
  --op OP                  One operation without arguments (summary/review/listAssets/...)
  --output PATH            Destination project JSON (default: --project)
  --dry-run                Validate and report, no project/file writes
  --help                   Show this help
  --list-ops               Print supported operation names as JSON

Output: JSON on stdout; exit code 0 success, 1 error.
File operations are local only. Images must be PNG for CLI rendering.
See CLI_API.md and cli-example-commands.json for full examples.
`;
const OPS=['createProject','setProjectName','setCanvas','setMode','setImageStorage','setView','rotateView','setAnimation','setFrame','setEditor','setGrid','setReference','clearReference','setDefault','setPartsDefinition','addCustomPart','updatePart','removePart','reorderPart','exportPartsDefinition','addAsset','replaceAsset','removeAsset','addLayer','setLayer','setColor','setCrop','setTransform','setVisibility','mirrorLayer','lockLayer','autoFit','autoResizeMatching','moveLayer','deleteLayer','cloneLayer','reuseView','createAnimation','renameAnimation','setFPS','deleteAnimation','addFrame','duplicateFrame','deleteFrame','linkFrame','unlinkFrame','appendClip','importManifest','undo','redo','summary','review','listAssets','listParts','listLayers','getProject',...RENDER];
function argumentsMap(args){const options={};for(let i=0;i<args.length;i++){const key=args[i];if(key.startsWith('--')){const name=key.substring(2);if(['dry-run','help','list-ops'].includes(name))options[name]=true;else{if(i+1===args.length)throw new Error('Missing argument for '+key);options[name]=args[++i];}}else throw new Error('Unknown argument '+key);}return options;}
function writeFile(where,buffer){const dest=path.resolve(where);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,buffer);return dest;}
function exportImage(p,c,projectPath){const a=p.editor?.cliCursor||{},view=c.view||a.view||'front',animation=c.animation||a.animation||'stand';let data,kind;
 if(c.op==='renderPNG'){data=encodePNG(renderFrame(p,{view,animation,frame:c.frame||a.frame,scale:Number(c.scale??1),hiddenCategories:c.hiddenCategories||[]},projectPath));kind='png';}
 else if(c.op==='renderSpriteSheet'){data=encodePNG(renderSpriteSheet(p,{view,animation,columns:Number(c.columns??4),scale:Number(c.scale??1)},projectPath));kind='png';}
 else {data=renderGIF(p,{view,animation,scale:c.scale==null?null:Number(c.scale),turntable:c.op==='renderTurntable'},projectPath);kind='gif';}
 const dest=writeFile(c.path||`out-${view}-${animation}.${kind}`,data);return {op:c.op,path:dest,bytes:data.length};
}
async function main(){const opt=argumentsMap(process.argv.slice(2));if(opt.help){process.stdout.write(HELP);return;}if(opt['list-ops']){process.stdout.write(JSON.stringify({ok:true,operations:OPS},null,2)+'\n');return;}
 if(!opt.project)throw new Error('Required --project PATH');
 const projectFile=path.resolve(opt.project),output=path.resolve(opt.output||opt.project);let project=fs.existsSync(projectFile)?migrate(JSON.parse(fs.readFileSync(projectFile,'utf8'))):makeProject();let payload;
 if(opt['command-file'])payload=JSON.parse(fs.readFileSync(path.resolve(opt['command-file']),'utf8'));
 else if(opt.commands)payload=JSON.parse(opt.commands);
 else if(opt.op)payload={commands:[{op:opt.op}]};
 else throw new Error('Use --command-file, --commands, or --op');
 const commands=Array.isArray(payload)?payload:payload.commands;
 if(!Array.isArray(commands))throw new Error('Expected {"commands":[...]}.');
 const outputs=[];let changed=false;const histFile=projectFile+'.history.json';const history=fs.existsSync(histFile)?JSON.parse(fs.readFileSync(histFile,'utf8')):{undo:[],redo:[]};let snapTaken=false;
 for(const command of commands){if(['undo','redo'].includes(command.op)){const source=history[command.op==='undo'?'undo':'redo'],dest=history[command.op==='undo'?'redo':'undo'];if(!source.length)throw new Error('No history to '+command.op);dest.push(structuredClone(project));project=migrate(source.pop());changed=true;snapTaken=true;outputs.push({op:command.op,ok:true});continue;}if(RENDER.includes(command.op)){if(opt['dry-run'])outputs.push({op:command.op,skipped:'dry-run'});else outputs.push(exportImage(project,command,projectFile));}
 else {const readOnly=['summary','review','listAssets','listParts','listLayers','getProject','exportPartsDefinition'].includes(command.op);if(!readOnly&&!snapTaken){history.undo.push(structuredClone(project));history.undo=history.undo.slice(-10);history.redo=[];snapTaken=true;}const cmd=opt['dry-run']&&command.op==='exportPartsDefinition'?{...command,path:undefined}:command;execute(project,{commands:[cmd]},{projectPath:projectFile,results:outputs});if(!readOnly)changed=true;}}
 if(changed&&!opt['dry-run']){saveProject(project,output,projectFile);fs.writeFileSync(output+'.history.json',JSON.stringify(history));}
 process.stdout.write(JSON.stringify({ok:true,project:output,saved:changed&&!opt['dry-run'],dryRun:!!opt['dry-run'],results:outputs,validation:reviewProject(project,output)},null,2)+'\n');
}
main().catch(e=>{process.stderr.write(JSON.stringify({ok:false,error:e.message})+'\n');process.exitCode=1;});