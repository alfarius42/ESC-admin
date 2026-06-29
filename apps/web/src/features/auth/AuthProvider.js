import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/apiClient";
import { clearAuthSession, getStoredToken, getStoredUser, saveAuthSession } from "./authStorage";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => getStoredUser());
    const [loading, setLoading] = useState(() => Boolean(getStoredToken()));
    useEffect(() => {
        const token = getStoredToken();
        if (!token) {
            setLoading(false);
            return;
        }
        apiRequest("/auth/me")
            .then((data) => {
            setUser(data.user);
            saveAuthSession(token, data.user);
        })
            .catch(() => {
            clearAuthSession();
            setUser(null);
        })
            .finally(() => setLoading(false));
    }, []);
    const value = useMemo(() => ({
        user,
        loading,
        setSession: (token, nextUser) => {
            saveAuthSession(token, nextUser);
            setUser(nextUser);
            setLoading(false);
        },
        logout: () => {
            clearAuthSession();
            setUser(null);
        }
    }), [user, loading]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
