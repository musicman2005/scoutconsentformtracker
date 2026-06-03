import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/groups", label: "Groups", icon: "🏕️" },
  { to: "/scouts", label: "Scouts", icon: "👦" },
  { to: "/forms", label: "Form Templates", icon: "📋" },
  { to: "/signing-requests", label: "Signing Requests", icon: "✍️" },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-purple-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⚜️</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">ScoutGroupDocMgr</h1>
            <p className="text-xs text-purple-300">Consent Form Tracking</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-6 gap-6">
        {/* Sidebar */}
        <nav className="w-52 shrink-0">
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-purple-100 text-purple-800"
                        : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                >
                  <span>{icon}</span>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <a
              href="/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
            >
              <span>🔗</span> Guardian Portal
            </a>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
