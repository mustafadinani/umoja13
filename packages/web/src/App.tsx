import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { Home } from "./pages/Home";
import { Schedule } from "./pages/Schedule";
import { Standings } from "./pages/Standings";
import { Moments } from "./pages/Moments";
import { Game } from "./pages/Game";
import { Team } from "./pages/Team";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { ReportIssuePage } from "./pages/dashboard/ReportIssuePage";
import { RefereeGameConsole } from "./pages/dashboard/referee/RefereeGameConsole";
import { Hunt } from "./pages/Hunt";
import { Info } from "./pages/Info";
import { Uat } from "./pages/uat/Uat";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/moments" element={<Moments />} />
            <Route path="/hunt" element={<Hunt />} />
            <Route path="/info" element={<Info />} />
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
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
