import { runPCA } from "../modules/analysis/shared/pca";

self.onmessage = (event) => {
  const { id, payload } = event.data || {};
  if (!id) return;
  try {
    self.postMessage({ id, type: "progress", progress: 0.1 });
    const result = runPCA(payload.matrix, payload.options || {});
    self.postMessage({ id, type: "progress", progress: 0.9 });
    self.postMessage({ id, type: "result", result });
  } catch (e) {
    self.postMessage({ id, type: "error", error: e?.message || String(e) });
  }
};
