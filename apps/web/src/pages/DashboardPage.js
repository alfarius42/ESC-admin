import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
export function DashboardPage() {
    return (_jsxs("div", { children: [_jsx("h1", { style: { fontFamily: "Ubuntu, sans-serif", color: "#243954", marginTop: 0 }, children: "Dashboard" }), _jsx("p", { children: "Operator workspace for Regpoint vendor admin." }), _jsxs("ul", { children: [_jsx("li", { children: _jsx(Link, { to: "/sales/boxes", children: "View box sales" }) }), _jsx("li", { children: _jsx(Link, { to: "/sales/boxes/new", children: "Create box sale" }) }), _jsx("li", { children: _jsx(Link, { to: "/sales/upsells", children: "View upsell sales" }) }), _jsx("li", { children: _jsx(Link, { to: "/sales/upsells/new", children: "Create upsell sale" }) })] })] }));
}
