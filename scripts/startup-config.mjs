#!/usr/bin/env node
// Import the actual server configuration, including .env precedence and TLS checks.
// Do not start listeners, access the database or change HTTPS settings here.
try {
  const { activeTransport, loadedEnvFiles } = await import('../src/config/index.js');
  console.log(`[start] Configuration valid: ${activeTransport.protocol.toUpperCase()}; .env=${loadedEnvFiles[0] || '(environment/defaults)'}`);
} catch (error) {
  console.error(`[start] Configuration check failed: ${error.message}`);
  if (error.code === 'AIDOT_HTTPS_CONFIG') {
    console.error('[start] HTTPS files and .env are installation data. Restore the original certs directory when moving to a new Full ZIP.');
    console.error('[start] Check: npm run https:check (add -- --env <file> for a different configuration file)');
    console.error('[start] If the original certificates cannot be recovered, explicitly generate replacements for local development:');
    console.error('[start]   npm run https:cert -- --hosts localhost,127.0.0.1,::1 --apply');
    console.error('[start] This creates a new CA. Include other connection names in --hosts and trust the new CA on clients.');
    console.error('[start] HTTPS settings were not changed automatically. Repair the configuration, then run npm start again.');
  }
  process.exitCode = 1;
}
