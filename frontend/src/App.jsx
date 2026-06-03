import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import Scouts from "./pages/Scouts";
import Forms from "./pages/Forms";
import SigningRequests from "./pages/SigningRequests";
import PortalApp from "./pages/portal/PortalApp";

export default function App() {
  const { pathname } = useLocation();

  // Portal is a standalone page — no admin layout
  if (pathname.startsWith("/portal")) {
    return (
      <Routes>
        <Route path="/portal" element={<PortalApp />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/scouts" element={<Scouts />} />
        <Route path="/forms" element={<Forms />} />
        <Route path="/signing-requests" element={<SigningRequests />} />
      </Routes>
    </Layout>
  );
}
