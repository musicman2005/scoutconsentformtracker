export default function PortalLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-purple-800 text-white shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⚜️</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Scout Consent Forms</h1>
            <p className="text-xs text-purple-300">Guardian Signing Portal</p>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">{children}</main>
      <footer className="text-center text-xs text-gray-400 py-4">
        ScoutGroupDocMgr · Consent Form Portal
      </footer>
    </div>
  );
}
