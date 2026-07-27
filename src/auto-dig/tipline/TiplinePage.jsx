import { useEffect, useMemo, useState } from "react";
import { Download, Play, Plus, Target, Trash2 } from "lucide-react";
import { assertDocument, createDocument } from "starintel_doc";
import { operation } from "../../lib/operations";
import { useQuasar } from "../../store";
import { useAutoDig } from "../bridge/context";
import { createTip, deleteTip, exportTip, listTips, saveTip } from "./storage";

function downloadJson(filename, content) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function TiplinePage() {
  const { bridge, connected, datasetId, runId } = useAutoDig();
  const { documents, execute, addDocumentsToActiveGraph, setNotice } = useQuasar();
  const [tips, setTips] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({ title: "", body: "", source: "", priority: "normal" });
  const selected = tips.find((tip) => tip._id === selectedId) || null;

  async function refresh() {
    const next = await listTips();
    setTips(next);
    if (!selectedId && next.length) setSelectedId(next[0]._id);
  }

  useEffect(() => { refresh().catch((error) => setNotice({ kind: "error", message: error.message })); }, []);

  const linkedDocuments = useMemo(() => selected
    ? documents.filter((document) => selected.linked_document_ids?.includes(document._id))
    : [], [documents, selected]);

  async function create(event) {
    event.preventDefault();
    const tip = await saveTip(createTip(form));
    setForm({ title: "", body: "", source: "", priority: "normal" });
    await refresh();
    setSelectedId(tip._id);
  }

  async function patch(values) {
    if (!selected) return;
    await saveTip({ ...selected, ...values });
    await refresh();
  }

  async function convertToTarget() {
    if (!selected) return;
    const target = assertDocument(createDocument("target", {
      dataset: datasetId || "auto-dig-local",
      title: `Tip: ${selected.title}`,
      summary: selected.body.slice(0, 500),
      data: {
        actor: "auto-dig.local.investigation",
        target: selected.title,
        target_id: selected._id,
        target_type: "tip",
        recurring: false,
        delay: 0,
        options: []
      },
      extensions: { auto_dig: { tip_id: selected.tip_id } }
    }));
    await execute(operation.save(target), `Convert tip ${selected.tip_id} to target`);
    addDocumentsToActiveGraph([target._id]);
    await patch({ status: "converted", linked_document_ids: [...new Set([...(selected.linked_document_ids || []), target._id])] });
    setNotice({ kind: "success", message: "Tip converted to a local Auto-Dig target." });
  }

  async function startAutoDig() {
    if (!selected || !bridge || !connected) return;
    const run = await bridge.runActor({
      actorId: "auto-dig.local.investigation",
      datasetId,
      runId,
      targetIds: selected.linked_document_ids || [],
      tipId: selected.tip_id,
      input: { title: selected.title, body: selected.body, source: selected.source }
    });
    const findingIds = (run.documents || []).map((document) => document._id).filter(Boolean);
    await patch({ status: run.status === "completed" ? "researched" : "triage", generated_finding_ids: [...new Set([...(selected.generated_finding_ids || []), ...findingIds])] });
    setNotice({ kind: run.status === "failed" ? "error" : "success", message: run.error || `Auto-Dig run ${run.status}.` });
  }

  return (
    <section className="auto-dig-tipline">
      <div className="page-heading"><div><span className="eyebrow">Local-first intake</span><h1>Tipline</h1><p>Tips stay in this browser unless you explicitly export or choose a remote adapter.</p></div></div>
      <div className="tipline-grid">
        <aside className="tip-inbox">
          <form onSubmit={create} className="tip-create-form">
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Tip title" required />
            <textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Tip contents" required />
            <input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} placeholder="Source or contact label" />
            <button className="button primary" type="submit"><Plus size={15} /> Save local tip</button>
          </form>
          <div className="tip-list">{tips.map((tip) => <button key={tip._id} className={tip._id === selectedId ? "active" : ""} onClick={() => setSelectedId(tip._id)}><strong>{tip.title}</strong><small>{tip.status} · {tip.updated_at}</small></button>)}</div>
        </aside>
        <article className="tip-review">
          {!selected && <div className="empty-state"><h2>No tips</h2><p>Create a local tip to begin triage.</p></div>}
          {selected && <>
            <header><div><span className="eyebrow">{selected.tip_id}</span><h2>{selected.title}</h2></div><div className="button-row"><button className="button small" onClick={() => downloadJson(`${selected.tip_id}.json`, exportTip(selected))}><Download size={14} /> Export</button><button className="button small danger" onClick={async () => { await deleteTip(selected); setSelectedId(""); await refresh(); }}><Trash2 size={14} /> Delete</button></div></header>
            <p className="tip-body">{selected.body}</p>
            {selected.source && <p><strong>Source:</strong> {selected.source}</p>}
            <label className="field"><span>Triage status</span><select value={selected.status} onChange={(event) => patch({ status: event.target.value })}><option>new</option><option>reviewing</option><option>triage</option><option>converted</option><option>researched</option><option>closed</option></select></label>
            <label className="field"><span>Link graph document</span><select value="" onChange={(event) => event.target.value && patch({ linked_document_ids: [...new Set([...(selected.linked_document_ids || []), event.target.value])] })}><option value="">Select document…</option>{documents.slice(0, 500).map((document) => <option key={document._id} value={document._id}>{document.title || document._id}</option>)}</select></label>
            <div className="chips">{linkedDocuments.map((document) => <span key={document._id}>{document.title || document._id}</span>)}</div>
            <div className="button-row"><button className="button" onClick={convertToTarget}><Target size={15} /> Convert to target</button><button className="button primary" disabled={!connected} onClick={startAutoDig}><Play size={15} /> Start Auto-Dig</button></div>
            {!!selected.generated_finding_ids?.length && <section><h3>Generated findings</h3><ul>{selected.generated_finding_ids.map((id) => <li key={id}><code>{id}</code></li>)}</ul></section>}
          </>}
        </article>
      </div>
    </section>
  );
}
