import axios from "axios";
import { ElMessage } from "element-plus";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export const http = axios.create({
  baseURL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      "Request failed";
    ElMessage.error(msg);
    return Promise.reject(err);
  }
);
