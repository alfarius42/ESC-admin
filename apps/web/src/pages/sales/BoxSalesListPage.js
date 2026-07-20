import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/apiClient";
export function BoxSalesListPage() {
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const [listData, statsData] = await Promise.all([
                    apiRequest("/box-sales"),
                    apiRequest("/box-sales/stats")
                ]);
                setItems(listData.items);
                setStats(statsData);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load box sales");
            }
            finally {
                setLoading(false);
            }
        }
        void load();
    }, []);
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("h1", { style: { fontFamily: "Ubuntu, sans-serif", color: "#243954", marginTop: 0 }, children: "Box sales" }), _jsx(Link, { to: "/sales/boxes/new", style: {
                            background: "#243954",
                            color: "#fff",
                            padding: "8px 14px",
                            borderRadius: 8,
                            textDecoration: "none"
                        }, children: "New sale" })] }), stats ? (_jsxs("p", { children: ["Total: ", stats.totalCount, " \u00B7 Revenue: ", stats.revenueRub, " RUB \u00B7 Avg:", " ", stats.avgSoldPriceRub, " RUB"] })) : null, loading ? _jsx("p", { children: "Loading..." }) : null, error ? _jsx("p", { style: { color: "#b00020" }, children: error }) : null, !loading && !error && items.length === 0 ? _jsx("p", { children: "No box sales yet." }) : null, !loading && items.length > 0 ? (_jsxs("table", { style: { width: "100%", borderCollapse: "collapse", background: "#fff" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }, children: "Date" }), _jsx("th", { style: { textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }, children: "Customer" }), _jsx("th", { style: { textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }, children: "Package" }), _jsx("th", { style: { textAlign: "right", padding: 8, borderBottom: "1px solid #ddd" }, children: "Amount" })] }) }), _jsx("tbody", { children: items.map((item) => (_jsxs("tr", { children: [_jsx("td", { style: { padding: 8, borderBottom: "1px solid #eee" }, children: item.soldAt }), _jsxs("td", { style: { padding: 8, borderBottom: "1px solid #eee" }, children: [item.customer.legalName, item.customer.inn ? ` (${item.customer.inn})` : ""] }), _jsx("td", { style: { padding: 8, borderBottom: "1px solid #eee" }, children: item.packageSku }), _jsx("td", { style: { padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }, children: item.soldPriceRub })] }, item.id))) })] })) : null] }));
}
