import { CircleAlert } from "lucide-react";
import { Link, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { AgentBubble, AgentSystemProvider } from "./components/AgentSystem";
import AutoDigActorsPage from "./auto-dig/components/AutoDigActorsPage";
import TiplinePage from "./auto-dig/tipline/TiplinePage";
import { autoDigBuildVersion } from "./auto-dig/version";
import DatasetsPage from "./components/DatasetsPage";
import DocumentEditor from "./components/DocumentEditor";
import { DocumentPage, DocumentsPage } from "./components/Documents";
import GraphLayoutControl from "./components/GraphLayoutControl";
import GraphPage from "./components/GraphPage";
import GraphWorkspaceChrome from "./components/GraphWorkspaceChrome";
import { ImportPage, SettingsPage } from "./components/ImportSettings";
import StatsPage from "./components/StatsPage";
import QuasarShell from "./ui-core/QuasarShell";

function DocumentsRoute() {
  const [params] = useSearchParams();
  if (params.get("group") === "dataset") return <Navigate to="/datasets" replace />;
  return <DocumentsPage />;
}

function GraphWorkspace() {
  return (
    <div className="graph-workspace-host">
      <GraphPage />
      <GraphWorkspaceChrome />
      <GraphLayoutControl />
    </div>
  );
}

function VersionPage() {
  return (
    <section className="simple-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Build identity</span>
          <h1>About</h1>
          <p>Exact versions used by this Auto-Dig build.</p>
        </div>
      </div>
      <dl>
        <dt>Auto-Dig version</dt>
        <dd><code>{autoDigBuildVersion.autoDig}</code></dd>
        <dt>Quasar fork version</dt>
        <dd><code>{autoDigBuildVersion.quasarFork}</code></dd>
        <dt>Quasar upstream base commit</dt>
        <dd><code>{autoDigBuildVersion.quasarUpstreamBase}</code></dd>
        <dt>StarIntel schema version</dt>
        <dd><code>{autoDigBuildVersion.starIntelSchema}</code></dd>
      </dl>
    </section>
  );
}

function NotFound() {
  return (
    <section className="empty-state page-card">
      <CircleAlert size={30} />
      <h1>Route not found</h1>
      <p>The Auto-Dig workspace route does not exist.</p>
      <Link className="button primary" to="/">Open research</Link>
    </section>
  );
}

export default function App() {
  return (
    <AgentSystemProvider>
      <QuasarShell>
        <Routes>
          <Route path="/" element={<StatsPage />} />
          <Route path="/graph" element={<GraphWorkspace />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/documents" element={<DocumentsRoute />} />
          <Route path="/documents/new" element={<DocumentEditor mode="create" />} />
          <Route path="/documents/:id" element={<DocumentPage />} />
          <Route path="/documents/:id/edit" element={<DocumentEditor mode="edit" />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/agents" element={<Navigate to="/actors" replace />} />
          <Route path="/actors" element={<AutoDigActorsPage />} />
          <Route path="/tipline" element={<TiplinePage />} />
          <Route path="/stats" element={<Navigate to="/" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<VersionPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AgentBubble />
      </QuasarShell>
    </AgentSystemProvider>
  );
}
