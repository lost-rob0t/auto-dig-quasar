import { useState } from "react";
import { Play } from "lucide-react";
import { AgentConsole } from "../../components/AgentSystem";
import { useQuasar } from "../../store";
import { useAutoDig } from "../bridge/context";

export default function AutoDigActorsPage() {
  const { bridge, connected, datasetId, runId } = useAutoDig();
  const { selectedIds, bulkSaveDocuments, addDocumentsToActiveGraph, setNotice } = useQuasar();
  const [running, setRunning] = useState(false);

  async function run() {
    if (!bridge) return;
    setRunning(true);
    try {
      const result = await bridge.runActor({
        actorId: "auto-dig.local.investigation",
        datasetId,
        runId,
        targetIds: selectedIds
      });
      const documents = result.documents || [];
      if (documents.length) {
        await bulkSaveDocuments(documents, { replace: true, atomic: false });
        addDocumentsToActiveGraph(documents.map((document) => document._id).filter(Boolean));
      }
      setNotice({ kind: result.status === "failed" ? "error" : "success", message: result.error || `Auto-Dig actor ${result.status}.` });
    } catch (error) {
      setNotice({ kind: "error", message: error.message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <section className="auto-dig-actor-launcher">
        <div><span className="eyebrow">Auto-Dig bridge</span><h1>Actors</h1><p>Run local Quasar actors below or delegate the selected graph targets to Auto-Dig.</p></div>
        <button className="button primary" disabled={!connected || running} onClick={run}><Play size={15} /> {running ? "Running…" : "Run Auto-Dig on selection"}</button>
      </section>
      <AgentConsole />
    </>
  );
}
