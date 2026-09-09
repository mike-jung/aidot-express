import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export default function editionPlugin() {
  let edition;
  const pkg = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
  return {
    name: 'aidot-edition',
    configResolved(config) { edition = config.define.__AIDOT_EDITION__ === '"open"' ? 'public' : 'full'; },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'aidot-edition.json', source: JSON.stringify({ edition, version: pkg.version }) });
    },
  };
}
