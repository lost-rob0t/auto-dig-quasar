import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Flag, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { putState } from "../../lib/db";
import { useQuasar } from "../../store";
import { useAutoDig } from "../bridge/context";
import { buildCorrectionReport, CORRECTION_TYPES, githubIssueUrl } from "./report";

const CorrectionContext = createContext(null);
const DEFAULT_REPOSITORY = import.meta.env.VITE_AUTODIG_CORRECTION_REPO || "lost-rob0t/starintel-gpt-auto-dig";

export function CorrectionReportProvider({ children }) {
  const [draft, setDraft] = useState(null);
  const value = useMemo(() => ({
    draft,
    openCorrection: (target, reportType = "incorrect-data") => setDraft({ target, reportType }),
    closeCorrection: () => setDraft(null)
  }), [draft]);
  return (
    <CorrectionContext.Provider value={value}>
      {children}
      <CorrectionReportDialog />
    </CorrectionContext.Provider>
  );
}

export function useCorrectionReports() {
  const value = useContext(CorrectionContext);
  if (!value) throw new Error("useCorrectionReports must be used inside CorrectionReportProvider");
  return value;
}

function CorrectionReportDialog() {
  const { draft, closeCorrection } = useCorrectionReports();
  const { bridge, datasetId, runId } = useAutoDig();
  const { setNotice } = useQuasar();
  const [notes, setNotes] = useState("");
  const [reportType, setReportType] = useState("incorrect-data");

  useEffect(() => {
    setNotes("");
    setReportType(draft?.reportType || "incorrect-data");
  }, [draft]);

  if (!draft) return null;
  const report = buildCorrectionReport({ reportType, target: draft.target, datasetId, runId, notes });

  async function saveLocal() {
    await putState(`auto-dig:${report.id}`, report);
    await bridge?.reportIncorrectData({
      kind: draft.target.kind || "document",
      targetId: draft.target.targetId || null,
      reportType,
      payload: report
    });
    setNotice({ kind: "success", message: "Correction report saved locally." });
  }

  async function openIssue() {
    await saveLocal();
    const confirmed = { ...report, handling: { ...report.handling, public_submission_confirmed: true } };
    window.open(githubIssueUrl(DEFAULT_REPOSITORY, confirmed), "_blank", "noopener,noreferrer");
    closeCorrection();
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeCorrection()}>
      <div className="modal auto-dig-correction-modal">
        <header><h2>Report incorrect data</h2><button className="icon-button" onClick={closeCorrection} aria-label="Close"><X size={18} /></button></header>
        <div className="modal-form">
          <label className="field"><span>Report type</span><select value={reportType} onChange={(event) => setReportType(event.target.value)}>{CORRECTION_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What is wrong?" /></label>
          <label className="field"><span>Exact public payload</span><textarea className="correction-payload" readOnly value={JSON.stringify(report, null, 2)} /></label>
          <p className="muted">Private and local-only fields are removed by default. GitHub is not opened until you confirm below.</p>
          <div className="form-actions"><button className="button" type="button" onClick={saveLocal}>Save locally</button><button className="button primary" type="button" onClick={openIssue}>Open prefilled GitHub issue</button></div>
        </div>
      </div>
    </div>
  );
}

export function CorrectionActionSurface() {
  const location = useLocation();
  const { documents, selectedDocuments } = useQuasar();
  const { openCorrection } = useCorrectionReports();
  const routeMatch = location.pathname.match(/^\/documents\/([^/]+)(?:\/edit)?$/);
  const routeId = routeMatch && routeMatch[1] !== "new" ? decodeURIComponent(routeMatch[1]) : null;
  const routed = routeId ? documents.find((document) => document._id === routeId) : null;
  const selected = selectedDocuments?.[0] || null;
  const target = routed || selected;
  const editorVisible = /^\/documents\/(new|[^/]+\/edit)$/.test(location.pathname);
  const detailVisible = /^\/documents\/[^/]+$/.test(location.pathname);
  if (!target || (!editorVisible && !detailVisible)) return null;
  const kind = target.dtype === "relation" ? "relation" : target.dtype === "finding" ? "finding" : "document";
  const reportType = kind === "relation" ? "bad-relation" : "incorrect-data";
  const label = kind === "relation" ? "Report bad relation" : "Report incorrect data";
  return <button className="auto-dig-correction-dock button" type="button" onClick={() => openCorrection({ kind, targetId: target._id, document: target }, reportType)}><Flag size={15} /> {label}</button>;
}
