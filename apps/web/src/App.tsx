import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { BoxSalesListPage } from "./pages/sales/BoxSalesListPage";
import { NewBoxSalePage } from "./pages/sales/NewBoxSalePage";
import { NewUpsellSalePage } from "./pages/sales/NewUpsellSalePage";
import { UpsellSalesListPage } from "./pages/sales/UpsellSalesListPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sales/boxes" element={<BoxSalesListPage />} />
          <Route path="/sales/boxes/new" element={<NewBoxSalePage />} />
          <Route path="/sales/upsells" element={<UpsellSalesListPage />} />
          <Route path="/sales/upsells/new" element={<NewUpsellSalePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
