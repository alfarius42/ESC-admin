import { clearAuthSession } from "../features/auth/authStorage";
export class ApiError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}
const API_BASE = import.meta.env.VITE_API_URL ?? "/api/v1";
export async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");
    const token = localStorage.getItem("esc_admin_token");
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });
    const body = (await response.json());
    if (response.status === 401) {
        clearAuthSession();
    }
    if (!response.ok || !body.success || body.data === null) {
        throw new ApiError(body.error?.code ?? "REQUEST_FAILED", body.error?.message ?? "Request failed", body.error?.details);
    }
    return body.data;
}
