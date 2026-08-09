import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Home } from "./pages/Home";
import { Schedule } from "./pages/Schedule";
import { FieldMapPage } from "./pages/FieldMapPage";
import { Standings } from "./pages/Standings";
import { Moments } from "./pages/Moments";
import { Game } from "./pages/Game";
import { Team } from "./pages/Team";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { ReportIssuePage } from "./pages/dashboard/ReportIssuePage";
import { RefereeGameConsole } from "./pages/dashboard/referee/RefereeGameConsole";
import { Hunt } from "./pages/Hunt";
import { Experiences } from "./pages/Experiences";
import { Privacy } from "./pages/Privacy";
import { Pods } from "./pages/Pods";
import { Uat } from "./pages/uat/Uat";
import { Stage } from "./pages/Stage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/schedule/map" element={<FieldMapPage />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/moments" element={<Moments />} />
            <Route path="/hunt" element={<Hunt />} />
            <Route path="/experiences" element={<Experiences />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* Info merged into Experiences — keep old bookmarks/links working. */}
            <Route path="/info" element={<Navigate to="/experiences" replace />} />
            <Route path="/game/:gameId" element={<Game />} />
            <Route path="/team/:teamId" element={<Team />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/report-issue"
              element={
                <ProtectedRoute>
                  <ReportIssuePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pods"
              element={
                <ProtectedRoute>
                  <Pods />
                </ProtectedRoute>
              }
            />
            <Route
              path="/uat"
              element={
                <ProtectedRoute>
                  <Uat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/referee/game/:gameId"
              element={
                <ProtectedRoute requireRole={["referee"]}>
                  <RefereeGameConsole />
                </ProtectedRoute>
              }
            />
            {/* Award-ceremony presenter screen — deliberately not linked anywhere in the nav; staff bring it up by typing the URL directly. */}
            <Route
              path="/stage"
              element={
                <ProtectedRoute requireRole={["admin", "commissioner"]}>
                  <Stage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
