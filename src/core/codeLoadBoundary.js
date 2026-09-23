import { AsyncLocalStorage, createHook } from 'node:async_hooks';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { codeError } from './codeErrors.js';
import logger from '../util/logger.js';

const context = new AsyncLocalStorage();
const owners = new WeakMap();
let installed = false;
let fatalRejection = (error) => { queueMicrotask(() => { throw error; }); };

/** Current problems; successful retries clear the matching file's previous problem. */
export const bootProblems = [];

export function clearCodeProblem(kind, file) {
  for (let i = bootProblems.length - 1; i >= 0; i--) {
    if (bootProblems[i].kind === kind && bootProblems[i].file === file) bootProblems.splice(i, 1);
  }
}

export function reportCodeProblem(kind, file, reason, phase = 'load') {
  const error = codeError(reason);
  clearCodeProblem(kind, file);
  bootProblems.push({ kind, file, phase, message: error.message, at: new Date().toISOString() });
  logger.error(`[CodeLoad] ${kind} ${phase} failed: ${file}\n${error.stack || error.message}`);
  return error;
}

/** Called before createServer(). Unowned framework failures retain the fatal policy. */
export function installCodeRejectionHandler(onFatal) {
  if (onFatal) fatalRejection = onFatal;
  if (installed) return;
  installed = true;
  createHook({
    init(_id, type, _trigger, resource) {
      if (type === 'PROMISE') {
        const owner = context.getStore();
        if (owner) owners.set(resource, owner);
      }
    },
  }).enable();
  process.on('unhandledRejection', (reason, promise) => {
    const owner = owners.get(promise);
    if (!owner) return fatalRejection(codeError(reason));
    const error = codeError(reason);
    owner.error ||= error;
    reportCodeProblem(owner.kind, owner.file, error, 'async');
    owner.reject(error);
  });
}

/**
 * Catch awaited import/constructor errors and attribute detached Promise failures to
 * their load operation. This is not a sandbox: uncaught timer callbacks, process.exit,
 * CPU loops and native crashes still require process isolation.
 */
export async function runCodeLoad(kind, file, prepare) {
  installCodeRejectionHandler();
  const rawTimeout = Number(process.env.CODE_LOAD_TIMEOUT_MS || 30000);
  const timeoutMs = Number.isInteger(rawTimeout) && rawTimeout > 0 && rawTimeout <= 2147483647 ? rawTimeout : 30000;
  let reject;
  const failure = new Promise((_resolve, fail) => { reject = fail; });
  const owner = { kind, file, error: null, reject };
  const timer = setTimeout(() => reject(Object.assign(
    new Error(`Code loading timed out after ${timeoutMs} ms: ${file}`),
    { code: 'CODE_LOAD_TIMEOUT' },
  )), timeoutMs);
  // Keep the timer referenced: unresolved top-level await must produce a reported failure.
  try {
    const prepared = context.run(owner, async () => {
      const result = await prepare();
      // Node reports unhandled promises at the end of the turn, after import resolves.
      await nextTurn();
      if (owner.error) throw owner.error;
      return result;
    });
    const result = await Promise.race([prepared, failure]);
    clearCodeProblem(kind, file);
    return result;
  } catch (reason) {
    throw reportCodeProblem(kind, file, reason);
  } finally {
    clearTimeout(timer);
    // Late failures stay attributed/logged, but cannot reject an already completed load.
    owner.reject = () => {};
  }
}
