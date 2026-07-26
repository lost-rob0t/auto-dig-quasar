import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Braces, Plus, Save, Search, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  assertDocument,
  createDocument,
  createRelation,
  documentLabel,
  schema,
  touchDocument
} from "starintel_doc";
import { connectedDocumentIds } from "../lib/document-delete";
import { operation } from "../lib/operations";
import {
  buildPredicateCatalog,
  recentPredicateIds,
  rememberPredicate,
  saveCustomPredicate,
  searchPredicates,
  similarPredicates,
  validateCustomPredicateId
} from "../lib/predicate-catalog";
import {
  dataFieldDescriptorsForDtype,
  dataSchemaForDtype,
  dtypeLabel,
  essentialDataFieldsForDtype,
  fieldTypeHint,
  formatSchemaValue,
  generateEmptyDocument,
  parseSchemaField
} from "../lib/schema-form";
import { useQuasar } from "../store";
import { SchemaField } from "./DocumentEditor";

const DRAFT_PREFIX = "quasar.editor-draft.v1:";

function parseJson(text, label, fallback) {
  if (!String(text || "").trim()) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function draftToken() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function saveEditorDraft(document) {
  const token = draftToken();
  sessionStorage.setItem(`${DRAFT_PREFIX}${token}`, JSON.stringify(document));
  return token;
}

function focusableElements(root) {
  return [...root.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
}

export function GraphModalShell({ title, position, onClose, dirty = false, children, className = "" }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const root = modalRef.current;
    if (!root) return undefined;
    focusableElements(root)[0]?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusableElements(root);
      if (!elements.length) return;
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", keydown);
    return () => root.removeEventListener("keydown", keydown);
  }, [onClose]);

  function requestClose() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onClose();
  }

  const style = position?.rendered && position?.bounds ? {
    "--graph-editor-left": `${Math.max(8, Math.min(position.rendered.x, position.bounds.width - 470))}px`,
    "--graph-editor-top": `${Math.max(8, Math.min(position.rendered.y, position.bounds.height - 560))}px`
  } : undefined;

  return (
    <div className="graph-editor-layer" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <section ref={modalRef} className={`graph-compact-editor ${className}`} style={style} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button className="icon-button" type="button" aria-label="Close" onClick={requestClose}><X size={17} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function DocumentSelect({ label, value, documents, objectTypes = [], required = false, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = documents.find((document) => document._id === value);
  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents
      .filter((document) => document.dtype !== "relation")
      .filter((document) => !objectTypes.length || objectTypes.includes(document.dtype))
      .filter((document) => !needle || `${document._id} ${documentLabel(document)} ${document.dtype}`.toLowerCase().includes(needle))
      .slice(0, 80);
  }, [documents, objectTypes, query]);

  return (
    <div className="field graph-document-select">
      <span>{label}</span>
      <small>document reference{objectTypes.length ? ` · ${objectTypes.join(" or ")}` : ""}{required ? " · required" : " · optional"}</small>
      <button type="button" className="graph-select-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span>{selected ? documentLabel(selected) : "Select document"}</span>
        <code>{selected?._id || ""}</code>
      </button>
      {open && (
        <div className="graph-select-popover">
          <label className="graph-picker-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents" autoFocus /></label>
          <div className="graph-picker-options" role="listbox">
            {matching.map((document) => (
              <button key={document._id} type="button" role="option" aria-selected={document._id === value} onClick={() => { onChange(document._id); setOpen(false); setQuery(""); }}>
                <strong>{documentLabel(document)}</strong>
                <small>{document.dtype} · {document._id}</small>
              </button>
            ))}
            {!matching.length && <span className="graph-picker-empty">No matching documents</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldPicker({ descriptors, added, onAdd }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const available = useMemo(() => descriptors.filter((descriptor) => !added.includes(descriptor.name)), [added, descriptors]);
  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return available.filter((descriptor) => !needle || `${descriptor.name} ${descriptor.label} ${descriptor.helpText}`.toLowerCase().includes(needle)).slice(0, 60);
  }, [available, query]);
  if (!available.length) return null;
  return (
    <div className="graph-field-picker">
      <button className="button small" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Plus size={14} /> Add field</button>
      {open && (
        <div className="graph-picker-popover">
          <label className="graph-picker-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fields" autoFocus /></label>
          <div className="graph-picker-options" role="listbox">
            {matching.map((descriptor) => (
              <button key={descriptor.name} type="button" onClick={() => { onAdd(descriptor.name); setOpen(false); setQuery(""); }}>
                <code>{descriptor.name}</code>
                <small>{fieldTypeHint(descriptor.schema, descriptor.required)}</small>
              </button>
            ))}
            {!matching.length && <span className="graph-picker-empty">No matching fields</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomPredicateForm({ catalog, sourceType, targetType, onCreated, onClose }) {
  const [idInput, setIdInput] = useState("");
  const [label, setLabel] = useState("");
  const validation = validateCustomPredicateId(idInput);
  const similar = similarPredicates(validation.id, catalog);

  function submit(event) {
    event.preventDefault();
    try {
      const created = saveCustomPredicate({
        id: idInput,
        label,
        sourceTypes: sourceType ? [sourceType] : ["*"],
        targetTypes: targetType ? [targetType] : ["*"]
      }, catalog);
      onCreated(created);
    } catch (error) {
      window.alert(error.message);
    }
  }

  return (
    <form className="custom-predicate-form" onSubmit={submit}>
      <header><strong>Add predicate</strong><button className="icon-button" type="button" aria-label="Close predicate form" onClick={onClose}><X size={14} /></button></header>
      <label className="field"><span>Predicate ID</span><small>lowercase snake_case</small><input value={idInput} onChange={(event) => setIdInput(event.target.value)} autoFocus /></label>
      <label className="field"><span>Label</span><small>string · optional</small><input value={label} onChange={(event) => setLabel(event.target.value)} /></label>
      {!validation.valid && idInput && <p className="validation-error">{validation.message}</p>}
      {similar[0] && <p className="validation-error">A similar predicate already exists: {similar[0].id}</p>}
      <div className="form-actions"><button className="button primary" disabled={!validation.valid || Boolean(similar[0])}>Add predicate</button></div>
    </form>
  );
}

function PredicateAutocomplete({ value, onChange, documents, sourceType, targetType }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const catalog = useMemo(() => buildPredicateCatalog({ activeSchema: schema, documents }), [catalogVersion, documents]);
  const results = useMemo(() => searchPredicates(catalog, {
    query: value,
    documents,
    sourceType,
    targetType,
    recentIds: recentPredicateIds(),
    limit: 80
  }), [catalog, documents, sourceType, targetType, value]);

  function selectPredicate(predicate) {
    onChange(predicate.id);
    rememberPredicate(predicate.id);
    setOpen(false);
    setActiveIndex(0);
  }

  return (
    <div className="field predicate-autocomplete">
      <span>Predicate</span>
      <small>predicate · {sourceType || "any"} → {targetType || "any"}</small>
      <input
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(0); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, results.length - 1)); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
          if (event.key === "Enter" && open && results[activeIndex]) { event.preventDefault(); selectPredicate(results[activeIndex]); }
          if (event.key === "Escape") setOpen(false);
        }}
        required
      />
      {open && (
        <div className="predicate-popover">
          <div className="graph-picker-options" role="listbox">
            {results.map((predicate, index) => (
              <button key={predicate.id} type="button" role="option" aria-selected={index === activeIndex} className={index === activeIndex ? "active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPredicate(predicate)}>
                <strong>{predicate.id}</strong>
                <small>{predicate.sourceTypes.join("|")} → {predicate.targetTypes.join("|")} · {predicate.source}</small>
                <span>{predicate.hint}</span>
              </button>
            ))}
            {!results.length && <span className="graph-picker-empty">No matching predicates</span>}
          </div>
          <button className="predicate-add-action" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setAdding(true)}><Plus size={14} /> Add predicate</button>
          {adding && <CustomPredicateForm catalog={catalog} sourceType={sourceType} targetType={targetType} onClose={() => setAdding(false)} onCreated={(created) => { setCatalogVersion((version) => version + 1); setAdding(false); selectPredicate(created); }} />}
        </div>
      )}
    </div>
  );
}

function initialValues(document, descriptors, names) {
  return Object.fromEntries(names.map((name) => {
    const descriptor = descriptors.find((item) => item.name === name);
    return [name, formatSchemaValue(document?.data?.[name], descriptor?.schema || {})];
  }));
}

function relationEndpointIds(relation) {
  return [relation?.data?.subject || relation?.data?.source || "", relation?.data?.object || relation?.data?.target || ""];
}

export function CompactNodeEditor({ document = null, objectType = "entity", dataset = "default", position = null, onClose, onSaved }) {
  const navigate = useNavigate();
  const { documents, execute, setNotice, addDocumentsToActiveGraph, workspace } = useQuasar();
  const dtype = document?.dtype || objectType;
  const descriptors = useMemo(() => dataFieldDescriptorsForDtype(dtype), [dtype]);
  const essential = useMemo(() => essentialDataFieldsForDtype(dtype), [dtype]);
  const [added, setAdded] = useState(() => descriptors.filter((descriptor) => descriptor.name in (document?.data || {}) && !essential.includes(descriptor.name)).map((descriptor) => descriptor.name));
  const [values, setValues] = useState(() => initialValues(document, descriptors, [...essential, ...added]));
  const [rawMode, setRawMode] = useState(false);
  const [raw, setRaw] = useState(() => JSON.stringify(document || { dataset, dtype, data: document?.data || {} }, null, 2));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const visible = [...new Set([...essential, ...added])];

  function addField(name) {
    setAdded((current) => [...new Set([...current, name])]);
    if (!(name in values)) {
      const descriptor = descriptors.find((item) => item.name === name);
      setValues((current) => ({ ...current, [name]: formatSchemaValue(document?.data?.[name], descriptor?.schema || {}) }));
    }
    setDirty(true);
  }

  function buildData() {
    const data = { ...(document?.data || {}) };
    for (const name of visible) {
      const descriptor = descriptors.find((item) => item.name === name);
      const parsed = parseSchemaField(name, values[name], descriptor?.schema || {}, parseJson);
      if (parsed === undefined) delete data[name];
      else data[name] = parsed;
    }
    return data;
  }

  function buildDraft() {
    if (rawMode) return parseJson(raw, "Document JSON", {});
    return {
      ...(document || {}),
      dataset: document?.dataset || dataset,
      dtype,
      data: buildData()
    };
  }

  function toggleRaw() {
    if (!rawMode) setRaw(JSON.stringify(buildDraft(), null, 2));
    else {
      const parsed = parseJson(raw, "Document JSON", {});
      const nextData = parsed.data || {};
      const nextAdded = descriptors.filter((descriptor) => descriptor.name in nextData && !essential.includes(descriptor.name)).map((descriptor) => descriptor.name);
      setAdded(nextAdded);
      setValues(initialValues({ data: nextData }, descriptors, [...essential, ...nextAdded]));
    }
    setRawMode((value) => !value);
  }

  function generateEmpty() {
    if (raw.trim() && raw.trim() !== "{}" && !window.confirm("Replace current JSON?\n\nThis will discard the current editor contents.")) return;
    const generated = generateEmptyDocument(dtype, { overrides: { dataset: document?.dataset || dataset, dtype } });
    setRaw(JSON.stringify(generated.document, null, 2));
    setRawMode(true);
    setDirty(true);
    if (generated.warnings.length) setNotice({ kind: "warning", message: generated.warnings.join(" ") });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const draft = buildDraft();
      const next = document
        ? assertDocument(touchDocument(document, draft))
        : assertDocument(createDocument(dtype, draft));
      await execute(operation.save(next), `${document ? "Update" : "Create"} ${next._id}`);
      if (!document) {
        const changes = { selectedIds: [next._id] };
        if (position?.position) changes.positions = { ...(workspace?.positions || {}), [next._id]: position.position };
        addDocumentsToActiveGraph([next._id], changes);
      }
      setDirty(false);
      onSaved?.(next);
      onClose();
    } catch (error) {
      setNotice({ kind: "error", message: error.message });
    } finally {
      setSaving(false);
    }
  }

  function openFullEditor() {
    const draft = buildDraft();
    const token = saveEditorDraft(draft);
    const path = document ? `/documents/${encodeURIComponent(document._id)}/edit` : "/documents/new";
    navigate(`${path}?draft=${encodeURIComponent(token)}&advanced=1&returnTo=graph`);
  }

  async function remove() {
    if (!document || !window.confirm(`Delete ${documentLabel(document)} and attached relations?`)) return;
    const ids = connectedDocumentIds(documents, [document._id]);
    await execute(operation.batch(ids.map((id) => operation.remove(id)), `Delete ${document._id}`), `Delete ${document._id}`);
    setDirty(false);
    onClose();
  }

  return (
    <GraphModalShell title={`${document ? "Edit" : "New"} ${dtypeLabel(dtype)}`} position={position} onClose={onClose} dirty={dirty} className="graph-node-editor">
      <form className="graph-compact-form" onSubmit={submit}>
        {rawMode ? (
          <label className="field full"><span>Document JSON</span><small>object · complete document</small><textarea className="code-editor graph-json-editor" value={raw} onChange={(event) => { setRaw(event.target.value); setDirty(true); }} /></label>
        ) : (
          <>
            <div className="graph-editor-type-heading"><strong>Fields for {dtype}</strong><span>{document?.dataset || dataset}</span></div>
            <div className="graph-editor-fields">
              {visible.map((name) => {
                const descriptor = descriptors.find((item) => item.name === name);
                return <SchemaField key={name} name={name} fieldSchema={descriptor?.schema || {}} required={descriptor?.required} value={values[name] ?? ""} onChange={(value) => { setValues((current) => ({ ...current, [name]: value })); setDirty(true); }} />;
              })}
            </div>
            <FieldPicker descriptors={descriptors} added={visible} onAdd={addField} />
          </>
        )}
        <div className="graph-editor-secondary-actions">
          <button className="button small" type="button" onClick={toggleRaw}><Braces size={14} /> {rawMode ? "Basic" : "Inspect JSON"}</button>
          <button className="button small" type="button" onClick={generateEmpty}>Generate empty document</button>
          <button className="button small" type="button" onClick={openFullEditor}>Open full editor</button>
        </div>
        <div className="form-actions graph-editor-actions">
          {document && <button className="button danger" type="button" onClick={remove}><Trash2 size={14} /> Delete</button>}
          <span />
          <button className="button" type="button" onClick={onClose}>Cancel</button>
          <button className="button primary" disabled={saving}><Save size={14} /> {saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </GraphModalShell>
  );
}

export function CompactRelationEditor({ ids = [], documents = [], relationDocument = null, position = null, onClose, onSaved }) {
  const navigate = useNavigate();
  const { execute, setNotice, addDocumentsToActiveGraph } = useQuasar();
  const existingIds = relationEndpointIds(relationDocument);
  const [sourceId, setSourceId] = useState(ids[0] || existingIds[0] || "");
  const [targetId, setTargetId] = useState(ids[1] || existingIds[1] || "");
  const source = documents.find((document) => document._id === sourceId);
  const target = documents.find((document) => document._id === targetId);
  const relationSchema = useMemo(() => dataSchemaForDtype("relation"), []);
  const relationProperties = relationSchema.properties || {};
  const [predicate, setPredicate] = useState(relationDocument?.data?.predicate || "related-to");
  const [dataset, setDataset] = useState(relationDocument?.dataset || source?.dataset || target?.dataset || "default");
  const [directed, setDirected] = useState(relationDocument?.data?.directed ?? true);
  const [startAt, setStartAt] = useState(relationDocument?.data?.start_at || relationDocument?.data?.start_date || "");
  const [endAt, setEndAt] = useState(relationDocument?.data?.end_at || relationDocument?.data?.end_date || "");
  const [description, setDescription] = useState(relationDocument?.description || relationDocument?.data?.description || relationDocument?.data?.note || "");
  const [sources, setSources] = useState(JSON.stringify(relationDocument?.sources || [], null, 2));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const sourceLocked = Boolean(ids[0]);
  const targetLocked = Boolean(ids[1]);

  function relationData() {
    const data = { ...(relationDocument?.data || {}), subject: sourceId, predicate, object: targetId, directed };
    if ("start_at" in relationProperties || startAt) data.start_at = startAt || null;
    else if ("start_date" in relationProperties) data.start_date = startAt || null;
    if ("end_at" in relationProperties || endAt) data.end_at = endAt || null;
    else if ("end_date" in relationProperties) data.end_date = endAt || null;
    if ("description" in relationProperties) data.description = description;
    else if ("note" in relationProperties) data.note = description;
    return data;
  }

  function buildDraft() {
    return {
      ...(relationDocument || {}),
      dataset,
      dtype: "relation",
      title: `${documentLabel(source) || sourceId} ${predicate} ${documentLabel(target) || targetId}`,
      description,
      sources: parseJson(sources, "Sources", []),
      data: relationData()
    };
  }

  async function submit(event) {
    event.preventDefault();
    if (!sourceId) return setNotice({ kind: "error", message: "Select a source document." });
    if (!targetId) return setNotice({ kind: "error", message: "Select a target document." });
    setSaving(true);
    try {
      const draft = buildDraft();
      const next = relationDocument
        ? assertDocument(touchDocument(relationDocument, draft))
        : assertDocument(createRelation({ ...draft, subject: sourceId, object: targetId, predicate, directed, data: relationData() }));
      await execute(operation.save(next), `${relationDocument ? "Update" : "Create"} relation ${next._id}`);
      if (!relationDocument) addDocumentsToActiveGraph([next._id]);
      rememberPredicate(predicate);
      setDirty(false);
      onSaved?.(next);
      onClose();
    } catch (error) {
      setNotice({ kind: "error", message: error.message });
    } finally {
      setSaving(false);
    }
  }

  function reverse() {
    setSourceId(targetId);
    setTargetId(sourceId);
    setDirty(true);
  }

  function openFullEditor() {
    const token = saveEditorDraft(buildDraft());
    const path = relationDocument ? `/documents/${encodeURIComponent(relationDocument._id)}/edit` : "/documents/new";
    navigate(`${path}?dtype=relation&draft=${encodeURIComponent(token)}&advanced=1&returnTo=graph`);
  }

  async function remove() {
    if (!relationDocument || !window.confirm("Delete relation?")) return;
    await execute(operation.remove(relationDocument._id), `Delete ${relationDocument._id}`);
    setDirty(false);
    onClose();
  }

  return (
    <GraphModalShell title={relationDocument ? "Edit relation" : "New relation"} position={position} onClose={onClose} dirty={dirty} className="graph-relation-editor-v2">
      <form className="graph-compact-form" onSubmit={submit}>
        {sourceLocked ? <div className="graph-reference-readonly"><span>Source</span><strong>{documentLabel(source) || sourceId}</strong><code>{sourceId}</code></div> : <DocumentSelect label="Source" value={sourceId} documents={documents} required onChange={(value) => { setSourceId(value); setDirty(true); }} />}
        <PredicateAutocomplete value={predicate} onChange={(value) => { setPredicate(value); setDirty(true); }} documents={documents} sourceType={source?.dtype} targetType={target?.dtype} />
        {targetLocked ? <div className="graph-reference-readonly"><span>Target</span><strong>{documentLabel(target) || targetId}</strong><code>{targetId}</code></div> : <DocumentSelect label="Target" value={targetId} documents={documents} required onChange={(value) => { setTargetId(value); setDirty(true); }} />}
        <div className="graph-relation-grid">
          <label className="field"><span>Start date</span><small>date or datetime · optional</small><input type={relationProperties.start_at?.format === "date-time" ? "datetime-local" : "date"} value={startAt} onChange={(event) => { setStartAt(event.target.value); setDirty(true); }} /></label>
          <label className="field"><span>End date</span><small>date or datetime · optional</small><input type={relationProperties.end_at?.format === "date-time" ? "datetime-local" : "date"} value={endAt} onChange={(event) => { setEndAt(event.target.value); setDirty(true); }} /></label>
        </div>
        <label className="field"><span>Description</span><small>string · long text · optional</small><textarea value={description} onChange={(event) => { setDescription(event.target.value); setDirty(true); }} /></label>
        <SchemaField name="sources" fieldSchema={schema.properties?.sources || { type: "array", items: { type: "string" } }} value={sources} onChange={(value) => { setSources(value); setDirty(true); }} />
        <label className="field"><span>Dataset</span><small>string · required</small><input value={dataset} onChange={(event) => { setDataset(event.target.value); setDirty(true); }} required /></label>
        <label className="checkbox"><input type="checkbox" checked={directed} onChange={(event) => { setDirected(event.target.checked); setDirty(true); }} /> Directed relation</label>
        <div className="graph-editor-secondary-actions">
          <button className="button small" type="button" onClick={reverse}><ArrowLeftRight size={14} /> Reverse relation</button>
          <button className="button small" type="button" onClick={openFullEditor}>Open full editor</button>
        </div>
        <div className="form-actions graph-editor-actions">
          {relationDocument && <button className="button danger" type="button" onClick={remove}><Trash2 size={14} /> Delete</button>}
          <span />
          <button className="button" type="button" onClick={onClose}>Cancel</button>
          <button className="button primary" disabled={saving}><Save size={14} /> {saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </GraphModalShell>
  );
}
