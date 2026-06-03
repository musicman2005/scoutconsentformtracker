import { useState } from "react";
import PortalLayout from "./PortalLayout";
import PortalLogin from "./PortalLogin";
import PortalForms from "./PortalForms";

const SESSION_KEY = "scout_portal_session";

export default function PortalApp() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  });

  const handleLogin = (tokenData) => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokenData));
    setSession(tokenData);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return (
    <PortalLayout>
      {session ? (
        <PortalForms session={session} onLogout={handleLogout} />
      ) : (
        <PortalLogin onLogin={handleLogin} />
      )}
    </PortalLayout>
  );
}
