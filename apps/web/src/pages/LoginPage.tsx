import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";
import { apiRequest } from "../lib/apiClient";
import { type AuthUser } from "../features/auth/authStorage";
type LoginResponse = {
  token: string;
  expiresAt: string;
  user: AuthUser;
};

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading, setSession } = useAuth();
  const [email, setEmail] = useState("admin@vendor.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (sessionLoading) {
    return <main style={{ padding: 32 }}>Loading session...</main>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const data = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setSession(data.token, data.user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        fontFamily: "Times New Roman, serif",
        maxWidth: 420,
        margin: "80px auto",
        padding: "0 16px"
      }}
    >
      <h1 style={{ fontFamily: "Ubuntu, sans-serif", color: "#243954" }}>Login</h1>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>
        {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          style={{
            background: "#243954",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer"
          }}
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
