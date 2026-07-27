import type {
  ActorRun,
  ActorRunRequest,
  AutoDigEvent,
  AutoDigQuasarBridge,
  CorrectionTarget,
  GraphDataset,
  SavedGraph,
  StarDocument,
  StarRelation
} from "./types";
import { AUTO_DIG_PROTOCOL, isBridgeMessage, requestId, type BridgeMethod, type BridgeResponse } from "./protocol";

const REQUEST_TIMEOUT_MS = 15_000;

function parentOrigin(): string | null {
  if (window.parent === window) return null;
  if (!document.referrer) return window.location.origin;
  try {
    return new URL(document.referrer).origin;
  } catch {
    return null;
  }
}

export function isAutoDigEmbedded(): boolean {
  return window.parent !== window && parentOrigin() !== null;
}

export class AutoDigBridgeClient implements AutoDigQuasarBridge {
  readonly origin: string;
  private listeners = new Set<(event: AutoDigEvent) => void>();
  private pending = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: number;
  }>();
  private connected = false;

  constructor(origin = parentOrigin()) {
    if (!origin) throw new Error("Auto-Dig bridge requires an embedded parent origin");
    this.origin = origin;
    window.addEventListener("message", this.onMessage);
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.request("handshake", {
      childOrigin: window.location.origin,
      basePath: import.meta.env.BASE_URL
    });
    this.connected = true;
  }

  destroy(): void {
    window.removeEventListener("message", this.onMessage);
    for (const entry of this.pending.values()) {
      window.clearTimeout(entry.timer);
      entry.reject(new Error("Auto-Dig bridge closed"));
    }
    this.pending.clear();
    this.listeners.clear();
  }

  notify(type: string, payload?: unknown): void {
    window.parent.postMessage({ protocol: AUTO_DIG_PROTOCOL, channel: "event", type, payload }, this.origin);
  }

  private onMessage = (event: MessageEvent): void => {
    if (event.source !== window.parent || event.origin !== this.origin || !isBridgeMessage(event.data)) return;
    if (event.data.channel === "event") {
      const next = { type: event.data.type, payload: event.data.payload };
      for (const listener of this.listeners) listener(next);
      return;
    }
    if (event.data.channel !== "response") return;
    const response = event.data as BridgeResponse;
    const entry = this.pending.get(response.id);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    this.pending.delete(response.id);
    if (response.ok) entry.resolve(response.result);
    else entry.reject(new Error(response.error || "Auto-Dig bridge request failed"));
  };

  private request<T>(method: BridgeMethod, params?: unknown): Promise<T> {
    const id = requestId();
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Auto-Dig bridge timed out: ${method}`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
      window.parent.postMessage({ protocol: AUTO_DIG_PROTOCOL, channel: "request", id, method, params }, this.origin);
    });
  }

  getActiveDatasetId(): Promise<string | null> {
    return this.request("getActiveDatasetId");
  }

  getActiveRunId(): Promise<string | null> {
    return this.request("getActiveRunId");
  }

  loadDataset(datasetId: string): Promise<GraphDataset> {
    return this.request("loadDataset", { datasetId });
  }

  saveDocument(document: StarDocument): Promise<void> {
    return this.request("saveDocument", { document });
  }

  saveRelation(relation: StarRelation): Promise<void> {
    return this.request("saveRelation", { relation });
  }

  saveGraph(graph: SavedGraph): Promise<void> {
    return this.request("saveGraph", { graph });
  }

  runActor(request: ActorRunRequest): Promise<ActorRun> {
    return this.request("runActor", { request });
  }

  openTipline(): void {
    this.notify("open-tipline");
  }

  reportIncorrectData(target: CorrectionTarget): Promise<void> {
    return this.request("reportIncorrectData", { target });
  }

  subscribe(listener: (event: AutoDigEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
