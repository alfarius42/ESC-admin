import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, ApiError } from "../../lib/apiClient";
const PACKAGE_OPTIONS = ["PKG-POINT", "PKG-PROMO", "PKG-PRO", "PKG-TICKET"];
export function NewBoxSalePage() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [customerId, setCustomerId] = useState("");
    const [packageSku, setPackageSku] = useState("PKG-PRO");
    const [soldPriceRub, setSoldPriceRub] = useState("180000.00");
    const [soldAt, setSoldAt] = useState(new Date().toISOString().slice(0, 10));
    const [contractRef, setContractRef] = useState("");
    const [createInstance, setCreateInstance] = useState(false);
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
            await apiRequest("/box-sales", {
                method: "POST",
                body: JSON.stringify({
                    customerId,
                    packageSku,
                    soldPriceRub,
                    soldAt,
                    contractRef: contractRef || null,
                    createInstance
                })
            });
            navigate("/sales/boxes");
        }
        catch (err) {
            if (err instanceof ApiError && err.details) {
                setError(Object.values(err.details).join("; "));
            }
            else {
                setError(err instanceof Error ? err.message : "Failed to create sale");
            }
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { children: [_jsx("h1", { style: { fontFamily: "Ubuntu, sans-serif", color: "#243954", marginTop: 0 }, children: "New box sale" }), _jsxs("form", { onSubmit: handleSubmit, style: { maxWidth: 480 }, children: [_jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["Customer", _jsx("select", { value: customerId, onChange: (event) => setCustomerId(event.target.value), required: true, style: { display: "block", width: "100%", marginTop: 4, padding: 8 }, children: customers.map((customer) => (_jsx("option", { value: customer.id, children: customer.legalName }, customer.id))) })] }), _jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["Package SKU", _jsx("select", { value: packageSku, onChange: (event) => setPackageSku(event.target.value), style: { display: "block", width: "100%", marginTop: 4, padding: 8 }, children: PACKAGE_OPTIONS.map((sku) => (_jsx("option", { value: sku, children: sku }, sku))) })] }), _jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["Sold price (RUB)", _jsx("input", { value: soldPriceRub, onChange: (event) => setSoldPriceRub(event.target.value), required: true, pattern: "^\\d+\\.\\d{2}$", style: { display: "block", width: "100%", marginTop: 4, padding: 8 } })] }), _jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["Sold at", _jsx("input", { type: "date", value: soldAt, onChange: (event) => setSoldAt(event.target.value), required: true, style: { display: "block", width: "100%", marginTop: 4, padding: 8 } })] }), _jsxs("label", { style: { display: "block", marginBottom: 12 }, children: ["Contract ref", _jsx("input", { value: contractRef, onChange: (event) => setContractRef(event.target.value), style: { display: "block", width: "100%", marginTop: 4, padding: 8 } })] }), _jsxs("label", { style: { display: "block", marginBottom: 16 }, children: [_jsx("input", { type: "checkbox", checked: createInstance, onChange: (event) => setCreateInstance(event.target.checked) }), " ", "Create instance"] }), error ? _jsx("p", { style: { color: "#b00020" }, children: error }) : null, _jsx("button", { type: "submit", disabled: loading || !customerId, style: {
                            background: "#243954",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "10px 16px",
                            cursor: "pointer"
                        }, children: loading ? "Saving..." : "Create sale" })] })] }));
}
