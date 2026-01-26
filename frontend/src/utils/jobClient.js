const workerMap = new Map();

function getWorker(type) {
  if (workerMap.has(type)) return workerMap.get(type);
  let worker = null;
  if (type === "pca") {
    worker = new Worker(new URL("../workers/pca.worker.js", import.meta.url), { type: "module" });
  } else if (type === "corr") {
    worker = new Worker(new URL("../workers/corr.worker.js", import.meta.url), { type: "module" });
  } else {
    throw new Error(`Unknown worker type: ${type}`);
  }
  workerMap.set(type, worker);
  return worker;
}

export function runWorkerJob(type, payload, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const worker = getWorker(type);
    const id = `${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    function cleanup() {
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (signal) signal.removeEventListener("abort", onAbort);
    }

    function onAbort() {
      cleanup();
      reject(new Error("Job cancelled"));
    }

    function onMessage(event) {
      const msg = event.data || {};
      if (msg.id !== id) return;
      if (msg.type === "progress") {
        onProgress?.(msg.progress || 0);
        return;
      }
      if (msg.type === "result") {
        cleanup();
        resolve(msg.result);
      }
      if (msg.type === "error") {
        cleanup();
        reject(new Error(msg.error || "Worker error"));
      }
    }

    function onError(err) {
      cleanup();
      reject(err);
    }

    if (signal?.aborted) {
      reject(new Error("Job cancelled"));
      return;
    }

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    if (signal) signal.addEventListener("abort", onAbort);

    worker.postMessage({ id, payload });
  });
}
