import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import WorldMapPage from "./pages/WorldMap";
import LevelMapPage from "./pages/LevelMap";
import GamePage from "./pages/Game";
import ProfilePage from "./pages/Profile";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="phone flex items-center justify-center">
        <div className="text-zinc-400">Cargando…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/" element={<PrivateRoute><WorldMapPage /></PrivateRoute>} />
          <Route path="/world/:worldId" element={<PrivateRoute><LevelMapPage /></PrivateRoute>} />
          <Route path="/world/:worldId/level/:level" element={<PrivateRoute><GamePage /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
