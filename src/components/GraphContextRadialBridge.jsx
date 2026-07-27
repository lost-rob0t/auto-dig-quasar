import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarDays,
  CircleDot,
  Database,
  FileText,
  Flag,
  Grid2X2,
  Lightbulb,
  MapPin,
  Network,
  Plus,
  UserRound,
  X
} from "lucide-react";
import { createPortal } from "react-dom";
import { useCorrectionReports } from "../auto-dig/correction-reports/CorrectionReports";
import { useQuasar } from "../store";

const QUICK_TYPES = [
  { label: "person", Icon: UserRound },
  { label: "organization", Icon: Building2 },
  { label: "event", Icon: CalendarDays },
  { label: "location", Icon: MapPin },
  { label: "entity", Icon: CircleDot },
  { label: "document", Icon: FileText },
  { label: "source", Icon: BookOpen },
  { label: "concept", Icon: Lightbulb }
];

const CATEGORY_MATCHERS = {
  create: (label) => label.startsWith("Create ") || label.startsWith("Other object type"),
  graph: (label) => /^(Fit graph|Focus selection|Clear filters|Clear graph|Add from corpus|New graph)$/.test(label),
  layout: (label) => label.startsWith("Layout:"),
  ingest: (label) => /^(Import documents|Start queue listener|Stop queue listener|Connection settings)$/.test(label)
};

function actionLabel(element) {
  return element?.textContent?.replace(/\s+/g, " ").trim() || "";
}

function originalActions(menu) {
  return [...menu.querySelectorAll(":scope > button[role='menuitem'], :scope > a[role='menuitem']")]
    .filter((element) => !element.dataset.radialBridge);
}

function invokeAction(menu, predicate) {
  const action = originalActions(menu).find((element) => predicate(actionLabel(element)));
  action?.click();
}

function menuKind(menu) {
  if (menu?.classList.contains("node-actions")) return "node";
  if (menu?.classList.contains("edge-actions")) return "relation";
  return "canvas";
}

function linkedDocumentId(menu) {
  const link = [...(menu?.querySelectorAll("a[href]") || [])]
    .map((element) => element.getAttribute("href") || "")
    .find((href) => href.includes("/documents/"));
  const match = link?.match(/\/documents\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function GraphContextRadialBridge() {
  const [menu, setMenu] = useState(null);
  const [category, setCategory] = useState("");
  const [, setVersion] = useState(0);
  const { documents, selectedIds } = useQuasar();
  const { openCorrection } = useCorrectionReports();

  useEffect(() => {
    const sync = () => {
      const next = document.querySelector(".graph-context-menu.expanded");
      setMenu((current) => current === next ? current : next);
      setVersion((current) => current + 1);
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();
    return () => observer.disconnect();
  }, []);

  useEffect(() => setCategory(""), [menu]);

  const kind = menuKind(menu);
  const correctionDocument = useMemo(() => {
    if (!menu || kind === "canvas") return null;
    const id = kind === "node" ? selectedIds[0] || linkedDocumentId(menu) : linkedDocumentId(menu);
    return documents.find((document) => document._id === id) || null;
  }, [documents, kind, menu, selectedIds]);

  const categoryActions = useMemo(() => {
    if (!menu || !category) return [];
    const matcher = CATEGORY_MATCHERS[category];
    return originalActions(menu)
      .map((element) => ({ element, label: actionLabel(element) }))
      .filter(({ label }) => matcher(label));
  }, [category, menu]);

  if (!menu) return null;

  // Auto-Dig fork: inject extension actions without changing the upstream graph editor.
  if (kind !== "canvas") {
    return createPortal(
      correctionDocument ? (
        <button
          data-radial-bridge="true"
          role="menuitem"
          type="button"
          onClick={() => openCorrection(
            { kind, targetId: correctionDocument._id, document: correctionDocument },
            kind === "relation" ? "bad-relation" : "incorrect-data"
          )}
        >
          <Flag size={15} /> {kind === "relation" ? "Report bad relation" : "Report incorrect data"}
        </button>
      ) : null,
      menu
    );
  }

  return createPortal(
    <>
      <div className="graph-context-palette" aria-label="Create node type" data-radial-bridge="true">
        {QUICK_TYPES.map(({ label, Icon }) => (
          <button
            key={label}
            type="button"
            aria-label={`Create ${label} here`}
            title={label}
            onClick={() => invokeAction(menu, (action) => action === `Create ${label}`)}
          >
            <Icon size={15} aria-hidden="true" />
          </button>
        ))}
      </div>
      <button data-radial-bridge="true" data-radial-slot="create" className="radial-category" role="menuitem" type="button" onClick={() => setCategory("create")}><Plus size={15} /> Create node</button>
      <button data-radial-bridge="true" data-radial-slot="graph" className="radial-category" role="menuitem" type="button" onClick={() => setCategory("graph")}><Network size={15} /> Graph</button>
      <button data-radial-bridge="true" data-radial-slot="layout" className="radial-category" role="menuitem" type="button" onClick={() => setCategory("layout")}><Grid2X2 size={15} /> Layout</button>
      <button data-radial-bridge="true" data-radial-slot="ingest" className="radial-category" role="menuitem" type="button" onClick={() => setCategory("ingest")}><Database size={15} /> Ingest</button>
      {category && (
        <div className="radial-action-submenu" role="menu" aria-label={`${category} actions`} data-radial-bridge="true">
          <header><strong>{category}</strong><button type="button" aria-label="Close actions" onClick={() => setCategory("")}><X size={14} /></button></header>
          {categoryActions.map(({ element, label }) => (
            <button key={label} type="button" role="menuitem" disabled={element.disabled} onClick={() => element.click()}>{label}</button>
          ))}
          {!categoryActions.length && <small>No actions available.</small>}
        </div>
      )}
    </>,
    menu
  );
}
