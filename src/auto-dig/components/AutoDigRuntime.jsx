import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { stateDb, watchDocuments } from "../../lib/db";
import { applyTheme } from "../../lib/themes";
import { useQuasar } from "../../store";
import { useAutoDig } from "../bridge/context";

function documentsFromEvent(event) {
  if (Array.isArray(event?.payload?.documents)) return event.payload.documents;
  if (Array.isArray(event?.payload)) return event.payload;
  return [];
}

function documentIds(documents) {
  return documents.map((document) => document?._id).filter(Boolean);
}

export default function AutoDigRuntime() {
  const { bridge, connected, datasetId } = useAutoDig();
  const {
    bulkSaveDocuments,
    addDocumentsToActiveGraph,
    activeGraph,
    setNotice
  } = useQuasar();
  const location = useLocation();
  const navigate = useNavigate();
  const loadedDataset = useRef("");
  const pendingHostWrites = useRef(new Map());

  function queueHostWrites(documents) {
    for (const id of documentIds(documents)) {
      pendingHostWrites.current.set(id, (pendingHostWrites.current.get(id) || 0) + 1);
    }
  }

  function releaseHostWrite(id) {
    const count = pendingHostWrites.current.get(id) || 0;
    if (count <= 1) pendingHostWrites.current.delete(id);
    else pendingHostWrites.current.set(id, count - 1);
  }

  function consumeHostWrite(id) {
    if (!pendingHostWrites.current.has(id)) return false;
    releaseHostWrite(id);
    return true;
  }

  async function importHostDocuments(documents) {
    queueHostWrites(documents);
    let savedIds = new Set();
    try {
      const report = await bulkSaveDocuments(documents, { replace: true, atomic: false });
      savedIds = new Set(report.saved?.map((item) => item.id).filter(Boolean) || []);
      return report;
    } catch (error) {
      savedIds = new Set(error?.report?.saved?.map((item) => item.id).filter(Boolean) || []);
      throw error;
    } finally {
      for (const id of documentIds(documents)) {
        if (!savedIds.has(id)) releaseHostWrite(id);
      }
    }
  }

  useEffect(() => {
    if (!bridge || !connected || !datasetId || loadedDataset.current === datasetId) return undefined;
    let active = true;
    bridge.loadDataset(datasetId)
      .then(async (dataset) => {
        if (!active) return;
        const documents = Array.isArray(dataset.documents) ? dataset.documents : [];
        if (documents.length) {
          const report = await importHostDocuments(documents);
          const ids = report.saved?.map((item) => item.id).filter(Boolean) || documentIds(documents);
          if (ids.length) addDocumentsToActiveGraph(ids);
        }
        loadedDataset.current = datasetId;
        setNotice({ kind: "success", message: `Loaded Auto-Dig dataset ${datasetId}` });
      })
      .catch((error) => setNotice({ kind: "error", message: error.message }));
    return () => { active = false; };
  }, [addDocumentsToActiveGraph, bridge, bulkSaveDocuments, connected, datasetId, setNotice]);

  useEffect(() => {
    if (!bridge || !connected) return undefined;
    return bridge.subscribe((event) => {
      if (event.type === "actor-findings" || event.type === "dataset-documents") {
        const documents = documentsFromEvent(event);
        if (!documents.length) return;
        importHostDocuments(documents)
          .then(() => addDocumentsToActiveGraph(documentIds(documents)))
          .catch((error) => setNotice({ kind: "error", message: error.message }));
      }
      if (event.type === "theme-changed" && typeof event.payload?.theme === "string") {
        applyTheme(event.payload.theme);
      }
      if (event.type === "navigate" && typeof event.payload?.route === "string" && event.payload.route.startsWith("/")) {
        navigate(event.payload.route);
      }
    });
  }, [addDocumentsToActiveGraph, bridge, bulkSaveDocuments, connected, navigate, setNotice]);

  useEffect(() => {
    if (!bridge || !connected) return undefined;
    return watchDocuments((change) => {
      const document = change?.doc;
      if (!document || change.deleted || document._id?.startsWith("_design/")) return;
      if (consumeHostWrite(document._id)) return;
      const save = document.dtype === "relation"
        ? bridge.saveRelation(document)
        : bridge.saveDocument(document);
      save.catch((error) => setNotice({ kind: "error", message: `Auto-Dig mirror failed: ${error.message}` }));
    });
  }, [bridge, connected, setNotice]);

  useEffect(() => {
    if (!bridge || !connected) return undefined;
    const feed = stateDb.changes({ since: "now", live: true, include_docs: true });
    feed.on("change", (change) => {
      if (change.id !== "workspace:default" || !activeGraph) return;
      bridge.saveGraph(activeGraph).catch((error) => setNotice({ kind: "error", message: `Graph mirror failed: ${error.message}` }));
    });
    return () => feed.cancel();
  }, [activeGraph, bridge, connected, setNotice]);

  useEffect(() => {
    if (!bridge || !connected) return;
    bridge.notify("route-changed", { route: `${location.pathname}${location.search}${location.hash}` });
  }, [bridge, connected, location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (!bridge || !connected) return undefined;
    const blockExternalNavigation = (event) => {
      const anchor = event.target.closest?.("a[href]");
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin) return;
      event.preventDefault();
      setNotice({ kind: "error", message: "External navigation is disabled inside Auto-Dig." });
    };
    document.addEventListener("click", blockExternalNavigation, true);
    return () => document.removeEventListener("click", blockExternalNavigation, true);
  }, [bridge, connected, setNotice]);

  return null;
}
