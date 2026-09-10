import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { configure, readServiceConfig, absoluteDirectory } from '../scripts/server/config.mjs';
import { selectFiles } from '../scripts/server/package.mjs';
import { checkHealth } from '../scripts/server/health.mjs';
import transport from '../src/core/transport.cjs';
import settings from '../src/core/httpsConfig.cjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('both server editions exclude desktop code, authoring assets, local state and internal reports', () => {
  for(const edition of JSON.parse(fs.readFileSync(path.join(root,'package.json'))).aidotEdition==='public'?['public']:['public','full']) {
    const files=selectFiles(root,edition);
    assert.ok(files.some(e=>e.destination==='scripts/server/run.mjs'));
    assert.ok(files.some(e=>e.destination==='admin-client/dist/index.html'));
    assert.equal(files.some(e=>/^(electron|docs|tests)\//.test(e.destination)||/APPLY-PATCH|\.key$|\.env$/.test(e.destination)),false);
    if(edition==='public') {
      assert.equal(files.some(e=>/^mci-server\//.test(e.destination)),false);
      assert.ok(files.filter(e=>e.destination.startsWith('src/core/ha/')).every(e=>e.source.startsWith('stubs/')));
    }
  }
});
test('service initialization requires an isolated directory and preserves existing contents', async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aidot-service-config-'));
  try {
    fs.writeFileSync(path.join(dir,'sentinel'),'keep');
    await assert.rejects(configure({dataDir:dir}),/existing settings/);
    assert.equal(fs.readFileSync(path.join(dir,'sentinel'),'utf8'),'keep');
    for(const p of ['relative',path.parse(dir).root,dir+'\nunsafe',dir+'%TEMP%']) assert.throws(()=>absoluteDirectory(p));
    await assert.rejects(configure({dataDir:dir+'-bad',port:7901,controlPort:7901}),/distinct/);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
});
test('service configuration generates HTTPS credentials and the probe reads only the public CA', async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aidot-service-tls-'));
  let server;
  try {
    await configure({dataDir:dir});
    let cfg=readServiceConfig(dir);
    assert.ok(cfg.env.ALLOWED_HOSTS.split(',').includes('[::1]'));
    assert.ok(!cfg.env.ALLOWED_HOSTS.split(',').includes('::1'));
    const preflight=spawnSync(process.execPath,['--import','./src/loader/register.mjs','--input-type=module','-e',"await import('./src/config/index.js');"],{
      cwd:root,encoding:'utf8',env:{...process.env,AIDOT_SERVICE_MODE:'1',AIDOT_DATA_DIR:dir,AIDOT_ENV_FILE:path.join(dir,'.env')}
    });
    assert.equal(preflight.status,0,preflight.stderr);
    const tls=transport.prepareTls(transport.tlsFromEnv(cfg.env),dir);
    let responseStatus=200;
    server=transport.createListener((_req,res)=>{res.writeHead(responseStatus);res.end('{}');},tls);
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const envFile=path.join(dir,'.env');
    fs.writeFileSync(envFile,fs.readFileSync(envFile,'utf8').replace("PORT='7901'","PORT='"+server.address().port+"'"));
    const read=fs.readFileSync;
    fs.readFileSync=(name,...args)=>{
      assert.notEqual(String(name),tls.settings.keyFile,'health probe must not read the private key');
      return read(name,...args);
    };
    try { assert.equal((await checkHealth(dir)).ready,true); }
    finally { fs.readFileSync=read; }
    responseStatus=503; await assert.rejects(checkHealth(dir),/HTTP 503/);
    const before=fs.readFileSync(envFile);
    await assert.rejects(configure({dataDir:dir}),/existing settings/);
    assert.deepEqual(fs.readFileSync(envFile),before);
    settings.saveTlsSettings(envFile,{...transport.tlsFromEnv(cfg.env),enabled:false});
    assert.throws(()=>readServiceConfig(dir),/HTTPS_ENABLED/);
  } finally { if(server) await new Promise(r=>server.close(r)); fs.rmSync(dir,{recursive:true,force:true}); }
});
test('a service cannot silently fall back to defaults when its configuration is missing', () => {
  const r=spawnSync(process.execPath,['scripts/server/run.mjs','--data-dir',path.join(os.tmpdir(),'aidot-missing-'+Date.now())],{cwd:root,encoding:'utf8'});
  assert.notEqual(r.status,0); assert.match(r.stderr,/Configure the service first/);
});
