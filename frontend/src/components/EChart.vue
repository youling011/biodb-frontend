<template>
  <div ref="elRef" :style="{ width: '100%', height }"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as echarts from "echarts";

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: "360px" },
  loading: { type: Boolean, default: false },
});

const elRef = ref(null);
let chart = null;
let ro = null;
let onWinResize = null;

function applyOption() {
  if (!chart || !props.option) return;
  chart.setOption(props.option, { notMerge: true, lazyUpdate: true });
  props.loading ? chart.showLoading() : chart.hideLoading();
}

onMounted(() => {
  chart = echarts.init(elRef.value);
  applyOption();

  ro = new ResizeObserver(() => chart && chart.resize());
  ro.observe(elRef.value);

  onWinResize = () => chart && chart.resize();
  window.addEventListener("resize", onWinResize);
});

onBeforeUnmount(() => {
  if (ro && elRef.value) ro.unobserve(elRef.value);
  ro = null;
  if (onWinResize) window.removeEventListener("resize", onWinResize);
  onWinResize = null;

  if (chart) chart.dispose();
  chart = null;
});

watch(() => props.option, applyOption, { deep: true });
watch(() => props.loading, applyOption);

function getInstance() {
  return chart;
}
defineExpose({ getInstance });
</script>
