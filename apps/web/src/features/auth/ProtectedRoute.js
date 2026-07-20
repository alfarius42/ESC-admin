import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";
export function ProtectedRoute() {
    const { user, loading } = useAuth();
    if (loading) {
        return _jsx("main", { style: { padding: 32 }, children: "Loading session..." });
    }
    if (!user) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(Outlet, {});
}
