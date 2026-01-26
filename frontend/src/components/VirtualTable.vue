<template>
  <div class="virtual-table" :style="wrapperStyle">
    <el-auto-resizer v-if="autoResize">
      <template #default="{ width, height }">
        <el-table-v2
          :columns="resolvedColumns"
          :data="data"
          :width="width"
          :height="height"
          :row-key="rowKey"
          :row-event-handlers="rowHandlers"
          :sort-by="sortBy"
          :on-column-sort="handleSort"
        />
      </template>
    </el-auto-resizer>
    <el-table-v2
      v-else
      :columns="resolvedColumns"
      :data="data"
      :width="fixedWidth"
      :height="fixedHeight"
      :row-key="rowKey"
      :row-event-handlers="rowHandlers"
      :sort-by="sortBy"
      :on-column-sort="handleSort"
    />
    <div v-if="!data?.length" class="empty">
      <el-empty :description="emptyText" />
    </div>
  </div>
</template>

<script setup>
import { computed, h } from "vue";
import { ElCheckbox, ElAutoResizer, ElTableV2 } from "element-plus";

const props = defineProps({
  data: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  height: { type: [Number, String], default: 520 },
  width: { type: [Number, String], default: "100%" },
  rowKey: { type: String, default: "id" },
  selectable: { type: Boolean, default: false },
  selectedKeys: { type: Array, default: () => [] },
  emptyText: { type: String, default: "No data" },
  autoResize: { type: Boolean, default: true },
  sortBy: { type: Object, default: () => ({ key: "", order: "asc" }) },
});

const emit = defineEmits(["update:selectedKeys", "selection-change", "row-click", "row-dblclick", "sort-change"]);

const selectedSet = computed(() => new Set(props.selectedKeys || []));

const fixedHeight = computed(() => (typeof props.height === "number" ? props.height : Number.parseInt(props.height, 10) || 520));
const fixedWidth = computed(() => (typeof props.width === "number" ? props.width : Number.parseInt(props.width, 10) || 1200));

const wrapperStyle = computed(() => ({
  height: typeof props.height === "number" ? `${props.height}px` : props.height,
  width: typeof props.width === "number" ? `${props.width}px` : props.width,
}));

function toggleRowSelection(row) {
  const key = row?.[props.rowKey];
  if (key === undefined) return;
  const next = new Set(selectedSet.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  const keys = Array.from(next);
  emit("update:selectedKeys", keys);
  emit("selection-change", props.data.filter((r) => keys.includes(r?.[props.rowKey])));
}

function toggleAllSelection(checked) {
  const keys = checked ? props.data.map((r) => r?.[props.rowKey]).filter((k) => k !== undefined) : [];
  emit("update:selectedKeys", keys);
  emit("selection-change", checked ? props.data.slice() : []);
}

const resolvedColumns = computed(() => {
  const cols = props.columns.map((c) => ({
    key: c.key || c.dataKey,
    dataKey: c.dataKey || c.key,
    title: c.label || c.title,
    width: c.width || 160,
    fixed: c.fixed,
    sortable: Boolean(c.sortable),
    align: c.align || "left",
    cellRenderer: (args) => {
      if (typeof c.cellRenderer === "function") return c.cellRenderer(args);
      if (typeof c.formatter === "function") return c.formatter(args.rowData, args);
      const val = args.rowData?.[c.dataKey || c.key];
      return h("span", { class: "cell-text", title: val }, val ?? "-");
    },
  }));

  if (!props.selectable) return cols;

  return [
    {
      key: "__select__",
      dataKey: "__select__",
      title: "",
      width: 48,
      fixed: "left",
      cellRenderer: ({ rowData }) =>
        h(ElCheckbox, {
          modelValue: selectedSet.value.has(rowData?.[props.rowKey]),
          onChange: () => toggleRowSelection(rowData),
        }),
      headerCellRenderer: () =>
        h(ElCheckbox, {
          modelValue: props.data.length > 0 && props.data.every((r) => selectedSet.value.has(r?.[props.rowKey])),
          indeterminate:
            props.data.length > 0 &&
            props.data.some((r) => selectedSet.value.has(r?.[props.rowKey])) &&
            !props.data.every((r) => selectedSet.value.has(r?.[props.rowKey])),
          onChange: (val) => toggleAllSelection(Boolean(val)),
        }),
    },
    ...cols,
  ];
});

const rowHandlers = {
  onClick: ({ rowData }) => emit("row-click", rowData),
  onDblclick: ({ rowData }) => emit("row-dblclick", rowData),
};

function handleSort({ key, order }) {
  emit("sort-change", { key, order });
}
</script>

<style scoped>
.virtual-table {
  position: relative;
  width: 100%;
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 2;
}
.cell-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
