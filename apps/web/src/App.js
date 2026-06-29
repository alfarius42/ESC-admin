import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { BoxSalesListPage } from "./pages/sales/BoxSalesListPage";
import { NewBoxSalePage } from "./pages/sales/NewBoxSalePage";
import { NewUpsellSalePage } from "./pages/sales/NewUpsellSalePage";
import { UpsellSalesListPage } from "./pages/sales/UpsellSalesListPage";
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { element: _jsx(ProtectedRoute, {}), children: _jsxs(Route, { element: _jsx(AppLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/sales/boxes", element: _jsx(BoxSalesListPage, {}) }), _jsx(Route, { path: "/sales/boxes/new", element: _jsx(NewBoxSalePage, {}) }), _jsx(Route, { path: "/sales/upsells", element: _jsx(UpsellSalesListPage, {}) }), _jsx(Route, { path: "/sales/upsells/new", element: _jsx(NewUpsellSalePage, {}) })] }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
