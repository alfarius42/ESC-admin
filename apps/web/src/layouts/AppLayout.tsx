import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({  display: "block",
  padding: "10px 16px",
  color: isActive ? "#243954" : "#333",
  background: isActive ? "#e1eff2" : "transparent",
  textDecoration: "none",
  borderRadius: 8,
  marginBottom: 4
});

export function AppLayout() {
  const { user, logout } = useAuth();
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Times New Roman, serif" }}>
      <aside
        style={{
          width: 240,
          background: "#243954",
          color: "#fff",
          padding: "24px 12px",
          boxSizing: "border-box"
        }}
      >
        <h1
          style={{
            fontFamily: "Ubuntu, sans-serif",
            fontSize: 18,
            margin: "0 0 24px",
            padding: "0 8px"
          }}
        >
          Regpoint Admin
        </h1>
        <nav>
          <NavLink to="/" end style={navLinkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/sales/boxes" style={navLinkStyle}>
            Box sales
          </NavLink>
          <NavLink to="/sales/upsells" style={navLinkStyle}>
            Upsell sales
          </NavLink>
        </nav>
        <div style={{ marginTop: 32, padding: "0 8px", fontSize: 14 }}>
          <div>{user?.displayName ?? "Operator"}</div>
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}            style={{
              marginTop: 12,
              background: "transparent",
              border: "1px solid #e1eff2",
              color: "#e1eff2",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, background: "#fafafa" }}>
        <Outlet />
      </main>
    </div>
  );
}
