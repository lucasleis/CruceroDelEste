import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import LoginPage from "@/pages/LoginPage";
import AdminLayout from "@/components/AdminLayout";
import TripsPage from "@/pages/TripsPage"
import ConfiguracionPage from "@/pages/ConfiguracionPage";
import TripDetailPage from "@/pages/TripDetailPage";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const token = localStorage.getItem("admin_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RootRedirect() {
  const token = localStorage.getItem("admin_token");
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <div className="p-8 text-2xl font-semibold">Dashboard</div>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/viajes"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <TripsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/viajes/:tripId"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <TripDetailPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservas"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <div className="p-8 text-2xl font-semibold">Reservas</div>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reembolsos"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <div className="p-8 text-2xl font-semibold">Reembolsos</div>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracargos"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <div className="p-8 text-2xl font-semibold">Contracargos</div>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracion"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <ConfiguracionPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
