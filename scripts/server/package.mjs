import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import AdmZip from 'adm-zip';
import { publicEntries, readPolicy, verifyPublicAssets, scanEntries, walkFiles, forbiddenLocalPath } from '../publish/policy.mjs';
import { installedDependenciesMatch, npmCommand } from '../startup-dependencies.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const runtime = name => ['package.json', 'package-lock.json', 'LICENSE', 'NOTICE', '.env.example'].includes(name)
  || /^(src|lib|public|mci-server)\//.test(name)
  || /^scripts\/server\/(?:config|run|health)\.mjs$/.test(name);
export function selectFiles(sourceRoot, edition) {
  const pkg = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'package.json'), 'utf8'));
  if (!['public','full'].includes(edition) || (edition === 'full' && pkg.aidotEdition === 'public')) throw new Error('The requested edition is unavailable');
  let files;
  if (edition === 'public') {
    const all = publicEntries(sourceRoot, readPolicy(sourceRoot)); scanEntries(sourceRoot, all);
    const assets = verifyPublicAssets(sourceRoot, pkg.version, pkg.aidotEdition === 'public' && !fs.existsSync(path.join(sourceRoot, 'admin-client/dist-public')) ? 'dist' : 'dist-public'); scanEntries(sourceRoot, assets);
    files = [...all.filter(e => runtime(e.destination)), ...assets];
  } else {
    files = walkFiles(sourceRoot).filter(n => runtime(n) && !forbiddenLocalPath(n)
      && !/^mci-server\/samples\//.test(n) && !/\.(?:ts|tsx|map)$/.test(n)).map(n => ({ source:n, destination:n }));
    const assets = path.join(sourceRoot, 'admin-client/dist');
    const marker = JSON.parse(fs.readFileSync(path.join(assets, 'aidot-edition.json'), 'utf8'));
    if (marker.edition !== edition || marker.version !== pkg.version) throw new Error('Build the Full console for this version first');
    files.push(...walkFiles(assets).map(n => ({source:'admin-client/dist/' + n, destination:'admin-client/dist/' + n})));
  }
  for (const f of files) if (fs.lstatSync(path.join(sourceRoot, f.source)).isSymbolicLink()) throw new Error('Linked source file: ' + f.source);
  return files;
}
function exec(command, args, cwd, env = process.env) {
  const r = spawnSync(command, args, { cwd, env, stdio:'inherit', shell:false });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(path.basename(command) + ' failed: ' + r.status);
}
function npm(args, cwd) { const c = npmCommand(args); exec(c.command, c.args, cwd); }
async function download(url, expected) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error('Download failed: HTTP ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== expected) throw new Error('Vendor SHA256 mismatch; no executable was run');
  return bytes;
}
function manifest(directory) {
  const result = [];
  function visit(dir, prefix='') {
    for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
      const rel = prefix + e.name, abs = path.join(dir,e.name);
      if (e.isSymbolicLink()) {
        // npm's command shims are unnecessary in an installed runtime.
        if (rel.includes('/.bin/')) { fs.unlinkSync(abs); continue; }
        throw new Error('Linked runtime input: ' + rel);
      }
      if(e.isDirectory()) visit(abs,rel+'/');
      else result.push({path:rel,sha256:hash(fs.readFileSync(abs))});
    }
  }
  visit(directory); return result.sort((a,b)=>a.path.localeCompare(b.path));
}
export async function main(args=process.argv.slice(2)) {
  const { values } = parseArgs({args,options:{
    full:{type:'boolean'},platform:{type:'string',default:process.platform},plan:{type:'boolean'},
    'skip-console-build':{type:'boolean'},'winsw-file':{type:'string'},installer:{type:'boolean'},'output':{type:'string'}
  }});
  const edition=values.full?'full':'public', platform=values.platform;
  if (!['win32','linux'].includes(platform)) throw new Error('Supported targets: win32 and linux');
  if (process.arch !== 'x64' && !values.plan) throw new Error('This release supports x64 builders only');
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  if (values.full && pkg.aidotEdition === 'public') throw new Error('Full sources are not present');
  if (values.plan) { console.log(JSON.stringify({edition,platform,version:pkg.version,files:selectFiles(root,edition).map(e=>e.destination),electron:false},null,2)); return; }
  if (platform !== process.platform) throw new Error('Build on the target OS so native modules match Node.js; use Windows for win32 and Linux/WSL for linux');
  if (values.installer && platform !== 'win32') throw new Error('--installer requires a Windows builder with standalone NSIS installed');
  if (!values['skip-console-build']) {
    const admin=path.join(root,'admin-client');
    if (!installedDependenciesMatch(admin,{includeDev:true})) npm(['ci','--include=dev','--no-audit','--no-fund'],admin);
    npm(['exec','--','vite','build','--config',edition==='full'?'vite.config.js':'vite.public.js'],admin);
  }
  const files=selectFiles(root,edition);
  const parent=values.output?path.resolve(values.output):path.join(root,'dist-server');
  const inside=path.relative(root,parent);
  if (parent===root || parent===path.parse(parent).root || (parent!==path.join(root,'dist-server') && inside!=='..' && !inside.startsWith('..'+path.sep) && !path.isAbsolute(inside))) throw new Error('Use dist-server or an output directory outside the source tree');
  fs.mkdirSync(parent,{recursive:true});
  const stage=fs.mkdtempSync(path.join(parent,'.build-'));
  const name='aidot-express-server-'+pkg.version+'-'+edition+'-'+platform+'-x64';
  const bundle=path.join(stage,name), app=path.join(bundle,'app');
  fs.mkdirSync(app,{recursive:true});
  try {
    for(const f of files) { const out=path.join(app,f.destination); fs.mkdirSync(path.dirname(out),{recursive:true}); fs.copyFileSync(path.join(root,f.source),out); }
    const runtimePkg=structuredClone(pkg);
    delete runtimePkg.main; delete runtimePkg.build; delete runtimePkg.devDependencies;
    runtimePkg.aidotEdition=edition;
    runtimePkg.scripts={ start:'node scripts/server/run.mjs', 'server:configure':'node scripts/server/config.mjs', 'server:health':'node scripts/server/health.mjs' };
    fs.writeFileSync(path.join(app,'package.json'),JSON.stringify(runtimePkg,null,2)+'\n');
    const lock=JSON.parse(fs.readFileSync(path.join(app,'package-lock.json'),'utf8')); delete lock.packages[''].devDependencies;
    fs.writeFileSync(path.join(app,'package-lock.json'),JSON.stringify(lock,null,2)+'\n');
    // Fresh runtime dependency tree: never prune/rebuild the source tree or reuse Electron ABI binaries.
    npm(['install','--package-lock-only','--ignore-scripts','--omit=dev','--no-audit','--no-fund'],app);
    npm(['ci','--omit=dev','--no-audit','--no-fund'],app);
    for (const n of ['electron','electron-builder','app-builder-lib']) if(fs.existsSync(path.join(app,'node_modules',n))) throw new Error('Desktop dependency in server bundle: '+n);
    exec(process.execPath,['--input-type=module','-e',"import Database from 'better-sqlite3'; import argon2 from 'argon2'; const d=new Database(':memory:'); if(d.prepare('select 1 as n').get().n!==1) throw Error('SQLite'); d.close(); const h=await argon2.hash('native-package-test'); if(!await argon2.verify(h,'native-package-test')) throw Error('Argon2');"],app);
    const runtimeDir=path.join(bundle,'runtime'); fs.mkdirSync(runtimeDir);
    const nodeName=platform==='win32'?'node.exe':'node';
    fs.copyFileSync(process.execPath,path.join(runtimeDir,nodeName)); fs.chmodSync(path.join(runtimeDir,nodeName),0o755);
    const license=await fetch('https://raw.githubusercontent.com/nodejs/node/'+process.version+'/LICENSE',{signal:AbortSignal.timeout(30000)});
    if(!license.ok) throw new Error('Cannot obtain the matching Node.js license');
    fs.writeFileSync(path.join(runtimeDir,'NODE-LICENSE.txt'),await license.text());
    const deploy=path.join(bundle,'service'); fs.mkdirSync(deploy);
    for(const n of platform==='win32'?['install.ps1','uninstall.ps1','common.ps1']:['install.sh','uninstall.sh','verify.py']) fs.copyFileSync(path.join(root,'scripts/server',n),path.join(deploy,n));
    if(platform==='win32') {
      const locked=JSON.parse(fs.readFileSync(path.join(root,'scripts/server/assets-lock.json'),'utf8')).winsw;
      const bytes=values['winsw-file']?fs.readFileSync(path.resolve(values['winsw-file'])):await download(locked.url,locked.sha256);
      if(hash(bytes)!==locked.sha256) throw new Error('WinSW SHA256 mismatch');
      fs.writeFileSync(path.join(deploy,'aidot-service.exe'),bytes);
      const lic=await fetch('https://raw.githubusercontent.com/winsw/winsw/v2.12.0/LICENSE.txt',{signal:AbortSignal.timeout(30000)});
      if(!lic.ok) throw new Error('Cannot obtain the WinSW license');
      fs.writeFileSync(path.join(deploy,'WINSW-LICENSE.txt'),await lic.text());
    }
    const guide=edition==='public'?publicEntries(root).find(e=>e.destination==='docs/SERVER_INSTALL.md')?.source:'docs/SERVER_INSTALL.md';
    if(!guide) throw new Error('Missing reviewed server installation guide');
    fs.copyFileSync(path.join(root,guide),path.join(bundle,'README.md'));
    const release={schema:1,version:pkg.version,edition,platform,arch:'x64',node:process.version,files:manifest(bundle)};
    fs.writeFileSync(path.join(bundle,'SERVER_MANIFEST.json'),JSON.stringify(release,null,2)+'\n');
    const finalDir=path.join(parent,name);
    if(fs.existsSync(finalDir)) throw new Error('This version already exists; choose a new --output directory. Prior builds are preserved.');
    fs.renameSync(bundle,finalDir);
    if(platform==='win32') {
      const zip=new AdmZip(); zip.addLocalFolder(finalDir,name); zip.writeZip(path.join(parent,name+'.zip'));
      if(values.installer) {
        const nsi=path.join(root,'scripts/server/installer.nsi');
        exec(process.env.MAKENSIS_EXE || 'makensis.exe',['/DRELEASE_DIR='+finalDir,'/DOUTPUT_FILE='+path.join(parent,name+'-Setup.exe'),'/DVERSION='+pkg.version,'/DEDITION='+edition,nsi],root);
      }
    } else exec('tar',['-czf',path.join(parent,name+'.tar.gz'),'-C',parent,name],parent);
    console.log(JSON.stringify({directory:finalDir,version:pkg.version,edition,node:process.version,electron:false},null,2));
  } finally { fs.rmSync(stage,{recursive:true,force:true}); }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(e=>{console.error('Server package: '+e.message);process.exitCode=1;});
