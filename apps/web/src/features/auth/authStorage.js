const TOKEN_KEY = "esc_admin_token";
const USER_KEY = "esc_admin_user";
export function getStoredToken() {
    return localStorage.getItem(TOKEN_KEY);
}
export function getStoredUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function saveAuthSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearAuthSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}
export function isAuthenticated() {
    return Boolean(getStoredToken());
}
