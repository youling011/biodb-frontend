import * as v1 from "./v1";
import * as v2 from "./v2";

export function getAdapter(schemaVersion) {
  if (schemaVersion === "v2") return v2;
  return v1;
}
