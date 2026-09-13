// Public edition: standalone status only. No peer, replication, lease or failover logic.
export const disabledAgent = Object.freeze({
  isActive: () => true,
  status: () => ({ enabled: false, role: 'active', reason: 'ha-disabled', history: [] }),
  start() {},
  stop() {},
  stepDown() { return { changed: false }; },
  promote() { return { changed: false }; },
});

export class HaAgent {
  isActive() { return disabledAgent.isActive(); }
  status() { return disabledAgent.status(); }
  start() {}
  stop() {}
  stepDown() { return disabledAgent.stepDown(); }
  promote() { return disabledAgent.promote(); }
}

export default { disabledAgent, HaAgent };
