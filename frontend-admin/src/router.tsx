import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import LoginPage from "@/pages/LoginPage";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const token = localStorage.getItem("admin_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function DashboardPlaceholder() {
  return <p className="p-8 text-2xl font-semibold">Dashboard</p>;
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
            <DashboardPlaceholder />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
