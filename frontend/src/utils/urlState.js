function getSearchParams() {
  return new URLSearchParams(window.location.search);
}

function updateUrl(params) {
  const search = params.toString();
  const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", next);
}

export function getQueryString(key, fallback = "") {
  const params = getSearchParams();
  return params.get(key) ?? fallback;
}

export function getQueryNumber(key, fallback = 0) {
  const raw = getQueryString(key, "");
  const val = Number(raw);
  return Number.isFinite(val) ? val : fallback;
}

export function getQueryList(key) {
  const raw = getQueryString(key, "");
  return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

export function setQueryValues(values) {
  const params = getSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "" || value === false) {
      params.delete(key);
      return;
    }
    params.set(key, String(value));
  });
  updateUrl(params);
}

export function setQueryList(key, list) {
  const params = getSearchParams();
  if (!list || !list.length) {
    params.delete(key);
  } else {
    params.set(key, list.join(","));
  }
  updateUrl(params);
}
