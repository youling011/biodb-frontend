import { reactive } from "vue";

const selectionState = reactive({
  selectedSampleIds: [],
});

export function useAnalysisSelectionStore() {
  function setSelected(ids) {
    selectionState.selectedSampleIds = Array.isArray(ids) ? ids : [];
  }

  return {
    state: selectionState,
    setSelected,
  };
}
