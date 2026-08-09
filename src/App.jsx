import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  Database,
  Download,
  FilePlus2,
  FolderInput,
  Inbox,
  Info,
  Menu,
  Network,
  Redo2,
  Search,
  Settings,
  TableProperties,
  Undo2
} from "lucide-react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useQuasar } from "./store";
import GraphPage from "./components/GraphPage";
import GraphLayoutControl from "./components/GraphLayoutControl";
import { DocumentPage, DocumentsPage } from "./components/Documents";
import DocumentEditor from "./components/DocumentEditor";
import { ImportPage, SettingsPage } from "./components/ImportSettings";
import StatsPage from "./components/StatsPage";
import { AgentBubble, AgentSystemProvider } from "./components/AgentSystem";
import MobileGestureMenu from "./components/MobileGestureMenu";
import AutoDigActorsPage from "./auto-dig/components/AutoDigActorsPage";
import TiplinePage from "./auto-dig/tipline/TiplinePage";
import { autoDigBuildVersion } from "./auto-dig/version";

const navigation = [
  { to: "/", label: "Research", mobileLabel: "Research", Icon: Activity, end: true },
  { to: "/graph", label: "Graph", mobileLabel: "Graph", Icon: Network },
  { to: "/documents", label: "Documents", mobileLabel: "Docs", Icon: TableProperties },
  { to: "/documents/new", label: "Add document", Icon: FilePlus2 },
  { to: "/agents", label: "Actors", mobileLabel: "Actors", Icon: Bot },
  { to: "/tipline", label: "Tipline", mobileLabel: "Tips", Icon: Inbox },
  { to: "/import", label: "Import", Icon: FolderInput },
  { to: "/settings", label: "Settings", Icon: Settings },
  { to: "/about", label: "About", Icon: Info }
];

const mobileNavigation = navigation.filter(({ mobileLabel }) => mobileLabel);

function SyncBadge() {
  const { syncStatus, serverStatus, queueStatus } = useQuasar();
  return (
    <div className="connection-badges">
      <span
        className={`sync-badge sync-${syncStatus.state}`}
        style={
          syncStatus.state === "offline"
            ? {
                alignItems: "center",
                justifyContent: "center",
                color: "var(--danger)",
                textAlign: "center"
              }
            : undefined
        }
        title={`CouchDB: ${syncStatus.message}`}
      >
        db {syncStatus.state}
      </span>
      {serverStatus.state !== "offline" && <span className={`sync-badge sync-${serverStatus.state}`} title={serverStatus.message}>api {serverStatus.state}</span>}
      {queueStatus.state !== "offline" && <span className={`sync-badge sync-${queueStatus.state}`} title={queueStatus.message}>queue {queueStatus.state}</span>}
    </div>
  );
}

function InstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    function captureInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    function clearInstallPrompt() {
      setInstallPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", clearInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", clearInstallPrompt);
    };
  }, []);

  if (!installPrompt) return null;

  async function install() {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <button className="button install-button" type="button" onClick={install} title="Install Quasar">
      <Download size={17} />
      <span>Install</span>
    </button>
  );
}

function NavigationLinks({ mobile = false }) {
  const links = mobile ? mobileNavigation : navigation;
  return links.map(({ to, label, mobileLabel, Icon, end }) => (
    <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
      <Icon size={mobile ? 21 : 18} aria-hidden="true" />
      <span>{mobile ? mobileLabel : label}</span>
    </NavLink>
  ));
}

function WorkbenchShell({ children }) {
  const navigate = useNavigate();
  const { loading, notice, setNotice, canUndo, canRedo, undo, redo, documents } = useQuasar();
  const [query, setQuery] = useState("");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  function submitSearch(event) {
    event.preventDefault();
    navigate(`/documents?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">Q</div>
          <div>
            <strong>Quasar</strong>
            <span>Auto-Dig graph operator</span>
          </div>
        </div>
        <nav aria-label="Primary navigation"><NavigationLinks /></nav>
        <div className="sidebar-foot">
          <div><Database size={15} /> {documents.length} documents</div>
          <div><SyncBadge /></div>
          <small>Local first · schema {autoDigBuildVersion.starIntelSchema}</small>
          <small>fork {String(autoDigBuildVersion.quasarFork).slice(0, 12)} · upstream {String(autoDigBuildVersion.quasarUpstreamBase).slice(0, 12)}</small>
        </div>
      </aside>

      <section className="workbench">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileNavigationOpen}
            onClick={() => setMobileNavigationOpen(true)}
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <form className="global-search" onSubmit={submitSearch} role="search">
            <Search size={17} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search workspace" placeholder="Search IDs, titles, data, sources…" />
          </form>
          <div className="top-actions">
            <InstallButton />
            <button className="icon-button" disabled={!canUndo} onClick={() => undo().catch((error) => setNotice({ kind: "error", message: error.message }))} title="Undo" aria-label="Undo">
              <Undo2 size={18} />
            </button>
            <button className="icon-button" disabled={!canRedo} onClick={() => redo().catch((error) => setNotice({ kind: "error", message: error.message }))} title="Redo" aria-label="Redo">
              <Redo2 size={18} />
            </button>
          </div>
        </header>

        {notice && (
          <div className={`notice notice-${notice.kind || "info"}`} role="status">
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)} aria-label="Dismiss notification">×</button>
          </div>
        )}

        <main className="content">
          {loading ? <div className="loading-panel">Opening local workspace…</div> : children}
        </main>
      </section>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavigationLinks mobile />
      </nav>
      <MobileGestureMenu open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen} />
    </div>
  );
}

function VersionPage() {
  return (
    <section className="simple-page">
      <div className="page-heading"><div><span className="eyebrow">Build identity</span><h1>About</h1><p>Exact versions used by this Auto-Dig build.</p></div></div>
      <dl>
        <dt>Auto-Dig version</dt><dd><code>{autoDigBuildVersion.autoDig}</code></dd>
        <dt>Quasar fork version</dt><dd><code>{autoDigBuildVersion.quasarFork}</code></dd>
        <dt>Quasar upstream base commit</dt><dd><code>{autoDigBuildVersion.quasarUpstreamBase}</code></dd>
        <dt>StarIntel schema version</dt><dd><code>{autoDigBuildVersion.starIntelSchema}</code></dd>
      </dl>
    </section>
  );
}

function NotFound() {
  return (
    <section className="empty-state">
      <h1>Route not found</h1>
      <NavLink className="button primary" to="/">Open research</NavLink>
    </section>
  );
}

export default function App() {
  return (
    <AgentSystemProvider>
      <WorkbenchShell>
        <Routes>
          <Route path="/" element={<StatsPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/new" element={<DocumentEditor mode="create" />} />
          <Route path="/documents/:id" element={<DocumentPage />} />
          <Route path="/documents/:id/edit" element={<DocumentEditor mode="edit" />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/agents" element={<AutoDigActorsPage />} />
          <Route path="/tipline" element={<TiplinePage />} />
          <Route path="/stats" element={<Navigate to="/" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<VersionPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <GraphLayoutControl />
        <AgentBubble />
      </WorkbenchShell>
    </AgentSystemProvider>
  );
}
