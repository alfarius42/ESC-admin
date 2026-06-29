import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { apiRequest } from "../lib/apiClient";
export function LoginPage() {
    const navigate = useNavigate();
    const { user, loading: sessionLoading, setSession } = useAuth();
    const [email, setEmail] = useState("admin@vendor.local");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    if (sessionLoading) {
        return _jsx("main", { style: { padding: 32 }, children: "Loading session..." });
    }
    if (user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    async function handleSubmit(event) {
        event.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const data = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password })
            });
            setSession(data.token, data.user);
            navigate("/");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs("main", { style: {
            fontFamily: "Times New Roman, serif",
            maxWidth: 420,
            margin: "80px auto",
            padding: "0 16px"
        }, children: [_jsx("h1", { style: { fontFamily: "Ubuntu, sans-serif", color: "#243954" }, children: "Login" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["Email", _jsx("input", { type: "email", value: email, onChange: (event) => setEmail(event.target.value), required: true, style: { display: "block", width: "100%", marginTop: 4, padding: 8 } })] }), _jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["Password", _jsx("input", { type: "password", value: password, onChange: (event) => setPassword(event.target.value), required: true, style: { display: "block", width: "100%", marginTop: 4, padding: 8 } })] }), error ? _jsx("p", { style: { color: "#b00020" }, children: error }) : null, _jsx("button", { type: "submit", disabled: submitting, style: {
                            background: "#243954",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "10px 16px",
                            cursor: "pointer"
                        }, children: submitting ? "Signing in..." : "Sign in" })] })] }));
}
