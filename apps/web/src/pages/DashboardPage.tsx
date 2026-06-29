import { Link } from "react-router-dom";

export function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "Ubuntu, sans-serif", color: "#243954", marginTop: 0 }}>
        Dashboard
      </h1>
      <p>Operator workspace for Regpoint vendor admin.</p>
      <ul>
        <li>
          <Link to="/sales/boxes">View box sales</Link>
        </li>
        <li>
          <Link to="/sales/boxes/new">Create box sale</Link>
        </li>
        <li>
          <Link to="/sales/upsells">View upsell sales</Link>
        </li>
        <li>
          <Link to="/sales/upsells/new">Create upsell sale</Link>
        </li>
      </ul>
    </div>
  );
}
