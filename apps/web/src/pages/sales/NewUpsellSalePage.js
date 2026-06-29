import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, ApiError } from "../../lib/apiClient";
const UPSELL_OPTIONS = [
    { sku: "BOX-DEP-02", title: "Turnkey деплой" },
    { sku: "BOX-SSL-01", title: "HTTPS Let's Encrypt" },
    { sku: "SUP-TRAIN-2", title: "Обучение 2ч" },
    { sku: "DEV-WL", title: "White-label" },
    { sku: "LEGAL-TPL", title: "Шаблоны согласий" }
];
export function NewUpsellSalePage() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [customerId, setCustomerId] = useState("");
    const [sku, setSku] = useState(UPSELL_OPTIONS[0].sku);
    const [soldPriceRub, setSoldPriceRub] = useState("45000.00");
    const [soldAt, setSoldAt] = useState(new Date().toISOString().slice(0, 10));
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        async function loadCustomers() {
            try {
                const data = await apiRequest("/customers?limit=100");
                setCustomers(data.items);
                if (data.items[0]) {
                    setCustomerId(data.items[0].id);
                }
            }
            catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load customers");
            }
        }
        void loadCustomers();
    }, []);
    async function handleSubmit(event) {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await apiRequest("/upsell-sales", {
                method: "POST",
                body: JSON.stringify({
                    customerId,
                    sku,
                    soldPriceRub,
                    soldAt
                })
            });
            navigate("/sales/upsells");
        }
        catch (err) {
            if (err instanceof ApiError && err.details) {
                setError(Object.values(err.details).join("; "));
            }
            else {
                setError(err instanceof Error ? err.message : "Failed to create upsell");
            }
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { children: [_jsx("h1", { style: { fontFamily: "Ubuntu, sans-serif", color: "#243954", marginTop: 0 }, children: "New upsell sale" }), _jsxs("form", { onSubmit: handleSubmit, style: { maxWidth: 480 }, children: [_jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["Customer", _jsx("select", { value: customerId, onChange: (event) => setCustomerId(event.target.value), required: true, style: { display: "block", width: "100%", marginTop: 4, padding: 8 }, children: customers.map((customer) => (_jsx("option", { value: customer.id, children: customer.legalName }, customer.id))) })] }), _jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["SKU", _jsx("select", { value: sku, onChange: (event) => setSku(event.target.value), style: { display: "block", width: "100%", marginTop: 4, padding: 8 }, children: UPSELL_OPTIONS.map((option) => (_jsxs("option", { value: option.sku, children: [option.sku, " \u2014 ", option.title] }, option.sku))) })] }), _jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["Sold price (RUB)", _jsx("input", { value: soldPriceRub, onChange: (event) => setSoldPriceRub(event.target.value), required: true, pattern: "^\\d+\\.\\d{2}$", style: { display: "block", width: "100%", marginTop: 4, padding: 8 } })] }), _jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["Sold at", _jsx("input", { type: "date", value: soldAt, onChange: (event) => setSoldAt(event.target.value), required: true, style: { display: "block", width: "100%", marginTop: 4, padding: 8 } })] }), error ? _jsx("p", { style: { color: "#b00020" }, children: error }) : null, _jsx("button", { type: "submit", disabled: loading || !customerId, style: {
                            background: "#243954",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "10px 16px",
                            cursor: "pointer"
                        }, children: loading ? "Saving..." : "Create upsell" })] })] }));
}
