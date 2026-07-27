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

  useEffect(() => {
    if (!bridge || !connected || !datasetId || loadedDataset.current === datasetId) return undefined;
    let active = true;
    bridge.loadDataset(datasetId)
      .then(async (dataset) => {
        if (!active) return;
        const documents = Array.isArray(dataset.documents) ? dataset.documents : [];
        if (documents.length) {
          const report = await bulkSaveDocuments(documents, { replace: true, atomic: false });
          const ids = report.saved?.map((item) => item.id).filter(Boolean) || documents.map((item) => item._id).filter(Boolean);
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
        bulkSaveDocuments(documents, { replace: true, atomic: false })
          .then(() => addDocumentsToActiveGraph(documents.map((document) => document._id).filter(Boolean)))
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
