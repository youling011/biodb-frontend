// frontend/src/stores/dataSource.js
// Recommended (Phase 3 follow-up): global data-source state for UI banners.
//
// This file intentionally does NOT require Pinia.
// It wraps the minimal reactive state exported from src/api/index.js so the UI
// can consume a stable store-like interface without refactoring the API layer.
//
// source values:
//   - "backend": normal mode (backend reachable)
//   - "demo_mode": VITE_DEMO_MODE=true
//   - "demo_fallback": backend unreachable, using deterministic demo fallback

import { computed } from "vue";
import { dataSourceState } from "../api";

export function useDataSourceStore() {
  const state = dataSourceState;

  const isBackend = computed(() => state.source === "backend");
  const isDemoMode = computed(() => state.source === "demo_mode");
  const isFallback = computed(() => state.source === "demo_fallback");

  const banner = computed(() => {
    if (isDemoMode.value) {
      return {
        show: true,
        type: "info",
        title: "DEMO 模式",
        message: state.message || "当前使用离线演示数据（未请求后端）",
      };
    }
    if (isFallback.value) {
      return {
        show: true,
        type: "warning",
        title: "后端不可用，已切换离线数据",
        message:
          state.message ||
          "无法连接后端服务，当前页面展示的是确定性离线演示数据。",
      };
    }
    return { show: false };
  });

  return {
    state,
    isBackend,
    isDemoMode,
    isFallback,
    banner,
  };
}
