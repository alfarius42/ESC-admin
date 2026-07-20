import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
const navLinkStyle = ({ isActive }) => ({ display: "block",
    padding: "10px 16px",
    color: isActive ? "#243954" : "#333",
    background: isActive ? "#e1eff2" : "transparent",
    textDecoration: "none",
    borderRadius: 8,
    marginBottom: 4
});
export function AppLayout() {
    const { user, logout } = useAuth();
    return (_jsxs("div", { style: { display: "flex", minHeight: "100vh", fontFamily: "Times New Roman, serif" }, children: [_jsxs("aside", { style: {
                    width: 240,
                    background: "#243954",
                    color: "#fff",
                    padding: "24px 12px",
                    boxSizing: "border-box"
                }, children: [_jsx("h1", { style: {
                            fontFamily: "Ubuntu, sans-serif",
                            fontSize: 18,
                            margin: "0 0 24px",
                            padding: "0 8px"
                        }, children: "Regpoint Admin" }), _jsxs("nav", { children: [_jsx(NavLink, { to: "/", end: true, style: navLinkStyle, children: "Dashboard" }), _jsx(NavLink, { to: "/sales/boxes", style: navLinkStyle, children: "Box sales" }), _jsx(NavLink, { to: "/sales/upsells", style: navLinkStyle, children: "Upsell sales" })] }), _jsxs("div", { style: { marginTop: 32, padding: "0 8px", fontSize: 14 }, children: [_jsx("div", { children: user?.displayName ?? "Operator" }), _jsx("button", { type: "button", onClick: () => {
                                    logout();
                                    window.location.href = "/login";
                                }, style: {
                                    marginTop: 12,
                                    background: "transparent",
                                    border: "1px solid #e1eff2",
                                    color: "#e1eff2",
                                    borderRadius: 8,
                                    padding: "6px 10px",
                                    cursor: "pointer"
                                }, children: "Logout" })] })] }), _jsx("main", { style: { flex: 1, padding: 32, background: "#fafafa" }, children: _jsx(Outlet, {}) })] }));
}
