import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import { PlaceholderPage } from "./pages/PlaceholderPage";
function LoginStubPage() {
    return (_jsxs("main", { style: {
            fontFamily: "Times New Roman, serif",
            maxWidth: 480,
            margin: "40px auto",
            padding: "0 16px"
        }, children: [_jsx("h1", { style: { fontFamily: "Ubuntu, sans-serif", color: "#243954" }, children: "Login" }), _jsx("p", { children: "Chunk 0 stub. Real authentication UI is implemented in Chunk 2." })] }));
}
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(PlaceholderPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(LoginStubPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
