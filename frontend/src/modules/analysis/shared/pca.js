/**
 * Lightweight PCA implementation for browser-side exploratory visualizations.
 *
 * Notes:
 * - This is NOT intended for large-scale computation (use backend derived for large datasets).
 * - For ~4000x80 matrices it may be heavy; prefer server-side PCA for production.
 * - Deterministic power-iteration with deflation for top-k components.
 */

import { zscoreMatrix, toNumber } from "./stats";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(a) {
  return Math.sqrt(dot(a, a));
}

function matVecMul(A, v) {
  const out = new Array(A.length).fill(0);
  for (let i = 0; i < A.length; i++) {
    out[i] = dot(A[i], v);
  }
  return out;
}

function outer(v) {
  const n = v.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = v[i] * v[j];
    out[i] = row;
  }
  return out;
}

function matSub(A, B, scale = 1) {
  const n = A.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = new Array(n);
    for (let j = 0; j < n; j++) row[j] = A[i][j] - scale * B[i][j];
    out[i] = row;
  }
  return out;
}

function covarianceMatrix(X) {
  // X: m x n (already standardized/centered)
  const m = X.length;
  const n = X[0]?.length || 0;
  const C = new Array(n);
  for (let i = 0; i < n; i++) {
    C[i] = new Array(n).fill(0);
  }

  // Compute X^T X / (m-1)
  const denom = Math.max(1, m - 1);
  for (let r = 0; r < m; r++) {
    const row = X[r];
    for (let i = 0; i < n; i++) {
      const xi = toNumber(row[i], 0);
      for (let j = i; j < n; j++) {
        const xj = toNumber(row[j], 0);
        C[i][j] += xi * xj;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const v = C[i][j] / denom;
      C[i][j] = v;
      C[j][i] = v;
    }
  }
  return C;
}

function powerIteration(A, { maxIter = 200, tol = 1e-8, seed = 0 } = {}) {
  const n = A.length;
  const rand = mulberry32(seed);
  let v = new Array(n);
  for (let i = 0; i < n; i++) v[i] = rand() - 0.5;
  let vnorm = norm(v);
  if (vnorm === 0) v[0] = 1;
  else v = v.map((x) => x / vnorm);

  let lambda = 0;
  for (let it = 0; it < maxIter; it++) {
    const Av = matVecMul(A, v);
    const nrm = norm(Av);
    if (nrm === 0) break;
    const vNew = Av.map((x) => x / nrm);
    const lambdaNew = dot(vNew, matVecMul(A, vNew));

    const diff = Math.abs(lambdaNew - lambda);
    v = vNew;
    lambda = lambdaNew;
    if (diff < tol) break;
  }

  return { vector: v, eigenvalue: lambda };
}

function projectScores(X, components) {
  // X: m x n, components: k x n (row vectors)
  const m = X.length;
  const k = components.length;
  const scores = new Array(m);
  for (let i = 0; i < m; i++) {
    const row = X[i];
    const s = new Array(k).fill(0);
    for (let c = 0; c < k; c++) {
      s[c] = dot(row, components[c]);
    }
    scores[i] = s;
  }
  return scores;
}

/**
 * PCA
 * @param {number[][]} matrix rows x cols
 * @param {object} opts
 * @returns {{scores:number[][], components:number[][], eigenvalues:number[], explainedVarianceRatio:number[]}}
 */
export function pca(matrix, opts = {}) {
  const {
    k = 2,
    standardize = true,
    maxIter = 300,
    tol = 1e-8,
    seed = 0,
  } = opts;

  if (!Array.isArray(matrix) || matrix.length === 0) {
    return { scores: [], components: [], eigenvalues: [], explainedVarianceRatio: [] };
  }

  const { X } = standardize ? zscoreMatrix(matrix) : { X: matrix };
  if (X.length === 0) {
    return { scores: [], components: [], eigenvalues: [], explainedVarianceRatio: [] };
  }

  let C = covarianceMatrix(X);
  const components = [];
  const eigenvalues = [];

  // Total variance = trace(C)
  let totalVar = 0;
  for (let i = 0; i < C.length; i++) totalVar += C[i][i];
  totalVar = totalVar || 1;

  for (let i = 0; i < k; i++) {
    const { vector, eigenvalue } = powerIteration(C, { maxIter, tol, seed: seed + i * 97 });
    components.push(vector);
    eigenvalues.push(eigenvalue);

    // Deflate: C = C - eigenvalue * v v^T
    C = matSub(C, outer(vector), eigenvalue);
  }

  const scores = projectScores(X, components);
  const explainedVarianceRatio = eigenvalues.map((ev) => ev / totalVar);

  return { scores, components, eigenvalues, explainedVarianceRatio };
}
