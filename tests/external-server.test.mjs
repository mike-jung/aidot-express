import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import certificates from '../src/core/certificates.cjs';
import transport from '../src/core/transport.cjs';
import external from '../electron/external-server.cjs';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aidot-client-tls-'));
let generated, other, server, port, ca, status = 200, requestCount = 0;
before(async () => {
  generated = await certificates.generateCertificate({ baseDir: path.join(directory, 'service'), hosts: 'localhost,127.0.0.1', days: 2 });
  other = await certificates.generateCertificate({ baseDir: path.join(directory, 'other-service'), days: 2 });
  const client = path.join(directory, 'client'); fs.mkdirSync(client);
  ca = path.join(client, 'ca.crt'); fs.copyFileSync(generated.settings.caFile, ca);
  const tls = transport.prepareTls(generated.settings);
  server = transport.createListener((_req,res) => { requestCount++; res.writeHead(status, { Location: 'https://attacker.invalid' }); res.end('healthy'); }, tls);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); port = server.address().port;
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive:true,force:true }); });
const env = () => ({ AIDOT_SERVER_URL:`https://127.0.0.1:${port}`, AIDOT_SERVER_CA_FILE:ca });

test('a client with only a public CA verifies HTTPS and learns a verified leaf without opening service key/config files', async () => {
  const read = fs.readFileSync; const opened = [];
  fs.readFileSync = (file,...args) => {
    opened.push(String(file));
    if (String(file).includes('service-private') || String(file).includes('server.key')) throw Object.assign(new Error('Permission denied'), {code:'EACCES'});
    return read(file,...args);
  };
  let verified;
  try {
    const connection = external.loadConnection({env:{...env(),HTTPS_KEY_FILE:'service-private/server.key',HTTPS_CERT_FILE:'service-private/server.crt'},envFile:'service-private/.env'});
    assert.equal(connection.certificate,null);
    verified = await external.probeConnection(connection);
    assert.deepEqual(opened,[ca]);
  } finally { fs.readFileSync = read; }
  assert.equal(verified.enabled,true); assert.equal(verified.certificate.fingerprint256,transport.prepareTls(generated.settings).certificate.fingerprint256);
  assert.equal(verified.options,undefined); assert.equal(verified.settings,undefined);
  const pem=fs.readFileSync(generated.settings.certFile);
  assert.equal(transport.acceptsConfiguredCertificate(verified,'127.0.0.1',pem),true);
  assert.equal(transport.acceptsConfiguredCertificate(verified,'attacker.invalid',pem),false);
  assert.equal(transport.acceptsConfiguredCertificate(verified,'127.0.0.1',fs.readFileSync(other.settings.certFile)),false);
});
test('legacy local HTTPS attachment also needs only CA and server identity, never the private key',async()=>{
  const connection=external.prepareConnection({AIDOT_SERVER_PORT:port,HTTPS_ENABLED:'true',HTTPS_SERVER_NAME:'localhost',HTTPS_CA_FILE:ca,HTTPS_KEY_FILE:'missing.key',HTTPS_CERT_FILE:'missing.crt'});
  assert.equal((await external.probeConnection(connection)).certificate.subjectAltName.includes('localhost'),true);
});
test('missing trust, a wrong CA and a wrong hostname fail; no HTTP downgrade is attempted',async()=>{
  for(const connection of [external.prepareConnection({AIDOT_SERVER_URL:env().AIDOT_SERVER_URL}),external.prepareConnection({...env(),AIDOT_SERVER_CA_FILE:other.settings.caFile}),external.prepareConnection({AIDOT_SERVER_PORT:port,HTTPS_ENABLED:'true',HTTPS_SERVER_NAME:'wrong.example',HTTPS_CA_FILE:ca})]) {
    await assert.rejects(external.probeConnection(connection)); assert.equal(connection.protocol,'https'); assert.equal(connection.certificate,null);
  }
});
test('redirecting health endpoints cannot move the trusted service identity',async()=>{
  const before=requestCount; status=302;
  try{await assert.rejects(external.probeConnection(external.prepareConnection(env())),/redirects are not followed/);assert.equal(requestCount,before+1);}finally{status=200;}
});
test('insecure URLs, embedded credentials, paths and contradictory ports fail before connecting',()=>{
  for(const url of ['http://localhost:7901','https://u:p@localhost','https://localhost/api','https://localhost?q=1','https://localhost/#fragment','https://localhost:0','https://local host','https://*.example']) assert.throws(()=>external.prepareConnection({AIDOT_SERVER_URL:url}));
  assert.throws(()=>external.prepareConnection({...env(),AIDOT_SERVER_PORT:port+1}),/disagree/);
  assert.equal(external.prepareConnection({}),null);
  const local=external.prepareConnection({AIDOT_SERVER_PORT:'7901'});assert.equal(local.protocol,'http');assert.equal(local.connectHost,'127.0.0.1');
});
test('a private key cannot be supplied as public CA material',()=>{
  assert.throws(()=>external.prepareConnection({...env(),AIDOT_SERVER_CA_FILE:generated.settings.keyFile}),/public certificates only/);
  assert.throws(()=>external.prepareConnection({...env(),AIDOT_SERVER_CA_FILE:directory}),/PEM certificate bundle/);
});
test('client-only environment files resolve relative CA paths and remain unchanged',async()=>{
  const file=path.join(directory,'client','client.env');const contents=`AIDOT_SERVER_URL=https://127.0.0.1:${port}\nAIDOT_SERVER_CA_FILE=ca.crt\n`;fs.writeFileSync(file,contents);
  const connection=external.loadConnection({env:{AIDOT_CLIENT_ENV_FILE:file}});
  assert.equal((await external.probeConnection(connection)).enabled,true);assert.equal(fs.readFileSync(file,'utf8'),contents);
  assert.deepEqual(fs.readdirSync(path.dirname(file)).sort(),['ca.crt','client.env']);
  fs.writeFileSync(file,'');assert.throws(()=>external.loadConnection({env:{AIDOT_CLIENT_ENV_FILE:file}}),/must specify/);
  assert.throws(()=>external.loadConnection({env:{AIDOT_CLIENT_ENV_FILE:file+'.missing'}}),/does not exist/);
});
