// Preserve the standalone interface used by readiness checks in the shared server.
import { disabledAgent } from './agent.js';

export function initHa() { return disabledAgent; }
export function getAgent() { return disabledAgent; }
export function isActive() { return disabledAgent.isActive(); }

export default { initHa, getAgent, isActive };
