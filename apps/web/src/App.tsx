import { Navigate, Route, Routes } from "react-router-dom";
import { PlaceholderPage } from "./pages/PlaceholderPage";

function LoginStubPage() {
  return (
    <main
      style={{
        fontFamily: "Times New Roman, serif",
        maxWidth: 480,
        margin: "40px auto",
        padding: "0 16px"
      }}
    >
      <h1 style={{ fontFamily: "Ubuntu, sans-serif", color: "#243954" }}>Login</h1>
      <p>Chunk 0 stub. Real authentication UI is implemented in Chunk 2.</p>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlaceholderPage />} />
      <Route path="/login" element={<LoginStubPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
