const KEY = "biostoich_cohorts";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function saveCohort(name, ids, filters = {}) {
  const list = read();
  list.push({
    id: Date.now(),
    name,
    ids,
    filters,
    createdAt: new Date().toISOString(),
  });
  write(list);
  return list;
}

export function listCohorts() {
  return read();
}

export function getCohort(id) {
  return read().find((c) => String(c.id) === String(id));
}
