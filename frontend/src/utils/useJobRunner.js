import { ref } from "vue";
import { createJob, getJobStatus, getJobResult } from "../api";

export function useJobRunner() {
  const jobId = ref("");
  const status = ref("");
  const progress = ref(0);
  const message = ref("");
  const loading = ref(false);
  const error = ref("");

  let timer = null;

  async function poll() {
    if (!jobId.value) return;
    const res = await getJobStatus(jobId.value);
    status.value = res.status;
    progress.value = res.progress ?? 0;
    message.value = res.message || "";
    if (res.status === "completed" || res.status === "failed") {
      clearTimer();
    }
    return res;
  }

  function clearTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  async function run(type, params = {}) {
    loading.value = true;
    error.value = "";
    try {
      const job = await createJob(type, params);
      jobId.value = String(job.id);
      status.value = job.status;
      progress.value = job.progress ?? 0;
      message.value = job.message || "";
      clearTimer();
      timer = setInterval(poll, 800);
    } catch (e) {
      error.value = String(e?.message || e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchResult() {
    if (!jobId.value) return null;
    return getJobResult(jobId.value);
  }

  function reset() {
    clearTimer();
    jobId.value = "";
    status.value = "";
    progress.value = 0;
    message.value = "";
    loading.value = false;
    error.value = "";
  }

  return {
    jobId,
    status,
    progress,
    message,
    loading,
    error,
    run,
    poll,
    fetchResult,
    reset,
  };
}
