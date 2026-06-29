import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, ApiError } from "../../lib/apiClient";

type Customer = { id: string; legalName: string };

type CustomersResponse = {
  items: Customer[];
};

const UPSELL_OPTIONS = [
  { sku: "BOX-DEP-02", title: "Turnkey деплой" },
  { sku: "BOX-SSL-01", title: "HTTPS Let's Encrypt" },
  { sku: "SUP-TRAIN-2", title: "Обучение 2ч" },
  { sku: "DEV-WL", title: "White-label" },
  { sku: "LEGAL-TPL", title: "Шаблоны согласий" }
];

export function NewUpsellSalePage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [sku, setSku] = useState(UPSELL_OPTIONS[0].sku);
  const [soldPriceRub, setSoldPriceRub] = useState("45000.00");
  const [soldAt, setSoldAt] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const data = await apiRequest<CustomersResponse>("/customers?limit=100");
        setCustomers(data.items);
        if (data.items[0]) {
          setCustomerId(data.items[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load customers");
      }
    }

    void loadCustomers();
  }, []);

  async function handleSubmit(event: FormEvent) {
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
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setError(Object.values(err.details).join("; "));
      } else {
        setError(err instanceof Error ? err.message : "Failed to create upsell");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: "Ubuntu, sans-serif", color: "#243954", marginTop: 0 }}>
        New upsell sale
      </h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Customer
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          >
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.legalName}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          SKU
          <select
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          >
            {UPSELL_OPTIONS.map((option) => (
              <option key={option.sku} value={option.sku}>
                {option.sku} — {option.title}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Sold price (RUB)
          <input
            value={soldPriceRub}
            onChange={(event) => setSoldPriceRub(event.target.value)}
            required
            pattern="^\d+\.\d{2}$"
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Sold at
          <input
            type="date"
            value={soldAt}
            onChange={(event) => setSoldAt(event.target.value)}
            required
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>
        {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !customerId}
          style={{
            background: "#243954",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer"
          }}
        >
          {loading ? "Saving..." : "Create upsell"}
        </button>
      </form>
    </div>
  );
}
