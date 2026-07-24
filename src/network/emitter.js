/**
 * Tiny dependency-free event emitter shared by the browser transport, the
 * protocol session, and the deterministic mock transport used by tests.
 */
export class NetworkEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(type, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError(`Listener for "${type}" must be a function.`);
    }
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    return () => this.off(type, listener);
  }

  once(type, listener) {
    const unsubscribe = this.on(type, (...args) => {
      unsubscribe();
      listener(...args);
    });
    return unsubscribe;
  }

  off(type, listener) {
    const listeners = this.listeners.get(type);
    if (!listeners) return false;
    const removed = listeners.delete(listener);
    if (listeners.size === 0) this.listeners.delete(type);
    return removed;
  }

  emit(type, detail) {
    const listeners = [...(this.listeners.get(type) || [])];
    for (const listener of listeners) {
      try {
        listener(detail);
      } catch (error) {
        if (type !== 'error') {
          const errorListeners = [...(this.listeners.get('error') || [])];
          for (const errorListener of errorListeners) {
            try {
              errorListener({
                code: 'EVENT_LISTENER_ERROR',
                error,
                sourceEvent: type
              });
            } catch {
              // A consumer error must never break protocol processing.
            }
          }
        }
      }
    }
    return listeners.length;
  }

  removeAllListeners(type = null) {
    if (type === null) this.listeners.clear();
    else this.listeners.delete(type);
  }
}
