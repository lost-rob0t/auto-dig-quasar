import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AutoDigBridgeClient, isAutoDigEmbedded } from "./client";

const AutoDigContext = createContext(null);

export function AutoDigProvider({ children }) {
  const [state, setState] = useState({
    bridge: null,
    connected: false,
    datasetId: null,
    runId: null,
    error: null
  });

  useEffect(() => {
    if (!isAutoDigEmbedded()) return undefined;
    const bridge = new AutoDigBridgeClient();
    let active = true;
    const unsubscribe = bridge.subscribe((event) => {
      if (!active) return;
      if (event.type === "dataset-changed") {
        setState((current) => ({ ...current, datasetId: event.payload?.datasetId || null }));
      }
      if (event.type === "active-run-changed") {
        setState((current) => ({ ...current, runId: event.payload?.runId || null }));
      }
    });
    bridge.connect()
      .then(async () => {
        const [datasetId, runId] = await Promise.all([
          bridge.getActiveDatasetId(),
          bridge.getActiveRunId()
        ]);
        if (active) setState({ bridge, connected: true, datasetId, runId, error: null });
      })
      .catch((error) => {
        if (active) setState({ bridge: null, connected: false, datasetId: null, runId: null, error });
      });
    return () => {
      active = false;
      unsubscribe();
      bridge.destroy();
    };
  }, []);

  const value = useMemo(() => ({ ...state, embedded: isAutoDigEmbedded() }), [state]);
  return <AutoDigContext.Provider value={value}>{children}</AutoDigContext.Provider>;
}

export function useAutoDig() {
  const value = useContext(AutoDigContext);
  if (!value) throw new Error("useAutoDig must be used inside AutoDigProvider");
  return value;
}
