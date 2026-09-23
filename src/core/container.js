/**
 * 아주 단순한 DI 컨테이너.
 * - register(name, instance): 인스턴스 등록
 * - registerFactory(name, factoryFn): lazy 인스턴스
 * - resolve(name): 꺼내기
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export class Container {
  constructor() {
    this.instances = new Map();
    this.factories = new Map();
    this.registrations = new AsyncLocalStorage();
    this.resolving = [];
  }
  register(name, instance) {
    const tx = this._transaction();
    (tx?.instances || this.instances).set(name, instance);
    tx?.registeredInstances.add(name);
  }
  registerFactory(name, factory) {
    const tx = this._transaction();
    if (tx) {
      tx.factories.set(name, factory);
      tx.instances.delete(name);
      return;
    }
    this.factories.set(name, factory);
    // 같은 이름의 캐시된 인스턴스가 있으면 제거 (hot-reload 시 다음 resolve 에서 새 인스턴스 생성)
    if (this.instances.has(name)) this.instances.delete(name);
  }
  has(name) {
    const tx = this._transaction(false);
    return !!(tx?.instances.has(name) || tx?.factories.has(name)) || this.instances.has(name) || this.factories.has(name);
  }
  resolve(name) {
    const tx = this._transaction(false);
    if (tx?.instances.has(name)) return tx.instances.get(name);
    const staged = tx?.factories.has(name);
    if (!staged && this.instances.has(name)) return this.instances.get(name);
    const factory = staged ? tx.factories.get(name) : this.factories.get(name);
    if (factory) {
      const chain = tx?.resolving || this.resolving;
      if (chain.includes(name)) throw new Error(`[DI] Circular dependency: ${[...chain, name].join(' -> ')}`);
      chain.push(name);
      try {
        const inst = factory();
        // Instances constructed during a candidate load must not leak on rollback.
        (tx?.instances || this.instances).set(name, inst);
        return inst;
      } finally {
        chain.pop();
      }
    }
    throw new Error(`[DI] '${name}' 빈을 찾을 수 없습니다. @Service 등록 여부를 확인하세요.`);
  }
  list() {
    const tx = this._transaction(false);
    return [...new Set([
      ...this.instances.keys(),
      ...[...this.factories.keys()].filter((k) => !this.instances.has(k)),
      ...(tx?.instances.keys() || []), ...(tx?.factories.keys() || []),
    ])];
  }

  _transaction(writing = true) {
    const tx = this.registrations.getStore();
    if (tx?.closed) {
      if (writing) throw new Error('[DI] Registration after code loading finished is not allowed');
      return null;
    }
    return tx;
  }

  /** Build replacements for already-used services before publishing a candidate. New beans stay lazy. */
  validateReplacements() {
    const tx = this._transaction();
    if (tx) for (const name of tx.factories.keys()) {
      if (this.instances.has(name)) this.resolve(name);
    }
  }

  pendingRegistrations() {
    const tx = this._transaction(false);
    return tx ? [...new Set([...tx.factories.keys(), ...tx.registeredInstances])] : [];
  }

  /** Stage only touched beans; concurrent requests keep seeing the last committed instance. */
  async transaction(work) {
    if (this._transaction(false)) return work();
    const tx = { instances: new Map(), factories: new Map(), registeredInstances: new Set(), resolving: [], closed: false };
    return this.registrations.run(tx, async () => {
      try {
        const result = await work();
        for (const [name, factory] of tx.factories) {
          this.factories.set(name, factory);
          this.instances.delete(name);
        }
        for (const [name, instance] of tx.instances) {
          if (tx.factories.has(name) || tx.registeredInstances.has(name) || !this.instances.has(name)) this.instances.set(name, instance);
        }
        return result;
      } finally {
        tx.closed = true;
        tx.instances.clear();
        tx.factories.clear();
        tx.registeredInstances.clear();
      }
    });
  }
}

const container = new Container();
export default container;
