import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/apiClient";

type UpsellItem = {
  id: string;
  sku: string;
  title: string;
  soldPriceRub: string;
  soldAt: string;
  customer: { legalName: string; inn: string | null };
};

type ListResponse = {
  items: UpsellItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

type StatsResponse = {
  totalCount: number;
  revenueRub: string;
};

export function UpsellSalesListPage() {
  const [items, setItems] = useState<UpsellItem[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [listData, statsData] = await Promise.all([
          apiRequest<ListResponse>("/upsell-sales"),
          apiRequest<StatsResponse>("/upsell-sales/stats")
        ]);
        setItems(listData.items);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load upsell sales");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontFamily: "Ubuntu, sans-serif", color: "#243954", marginTop: 0 }}>
          Upsell sales
        </h1>
        <Link
          to="/sales/upsells/new"
          style={{
            background: "#243954",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 8,
            textDecoration: "none"
          }}
        >
          New upsell
        </Link>
      </div>

      {stats ? (
        <p>
          Total: {stats.totalCount} · Revenue: {stats.revenueRub} RUB
        </p>
      ) : null}

      {loading ? <p>Loading...</p> : null}
      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}

      {!loading && !error && items.length === 0 ? <p>No upsell sales yet.</p> : null}

      {!loading && items.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                Date
              </th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                Customer
              </th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                SKU
              </th>
              <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #ddd" }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{item.soldAt}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {item.customer.legalName}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {item.sku} — {item.title}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee", textAlign: "right" }}>
                  {item.soldPriceRub}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
