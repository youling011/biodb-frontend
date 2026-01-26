<template>
  <ProteomeModule :sample-id="sampleId" />
</template>

<script setup>
import ProteomeModule from "./proteome/ProteomeModule.vue";

defineProps({
  sampleId: { type: [String, Number], required: true },
  active: { type: Boolean, default: false },
});
</script>
