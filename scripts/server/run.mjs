import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { readServiceConfig, appRoot } from './config.mjs';

// Run the supervisor in this process so WinSW/systemd stop signals reach its handlers.
const { values } = parseArgs({ options: { 'data-dir': { type: 'string' } } });
const cfg = readServiceConfig(values['data-dir'] || process.env.AIDOT_DATA_DIR);
process.chdir(appRoot);
process.env.AIDOT_ENV_FILE = cfg.envFile;
process.env.AIDOT_DATA_DIR = cfg.dataDir;
process.env.AIDOT_SERVICE_MODE = '1';
process.env.NODE_ENV = 'production';
await import('../../src/loader/register.mjs');
await import(pathToFileURL(path.join(appRoot, 'src/supervisor.js')).href);
