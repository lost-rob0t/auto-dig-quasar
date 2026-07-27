export type StarDocument = Record<string, unknown> & {
  _id: string;
  dtype: string;
  dataset?: string;
};

export type StarRelation = StarDocument & { dtype: "relation" };

export interface SavedGraph {
  id: string;
  name: string;
  documentIds: string[] | null;
  positions?: Record<string, { x: number; y: number }>;
  viewport?: { pan?: { x: number; y: number }; zoom?: number } | null;
}

export interface GraphDataset {
  id: string;
  documents: StarDocument[];
  graph?: SavedGraph | null;
  runId?: string | null;
}

export interface ActorRunRequest {
  actorId: string;
  datasetId?: string | null;
  runId?: string | null;
  targetIds?: string[];
  input?: Record<string, unknown>;
  tipId?: string | null;
}

export interface ActorRun {
  id: string;
  actorId: string;
  status: "queued" | "running" | "completed" | "failed";
  documents?: StarDocument[];
  error?: string;
}

export interface CorrectionTarget {
  kind: "document" | "relation" | "finding" | "graph";
  targetId?: string | null;
  reportType:
    | "incorrect-data"
    | "bad-relation"
    | "missing-source"
    | "outdated-data"
    | "duplicate";
  payload: Record<string, unknown>;
}

export interface AutoDigEvent {
  type: string;
  payload?: unknown;
}

export interface AutoDigQuasarBridge {
  getActiveDatasetId(): Promise<string | null>;
  getActiveRunId(): Promise<string | null>;
  loadDataset(datasetId: string): Promise<GraphDataset>;
  saveDocument(document: StarDocument): Promise<void>;
  saveRelation(relation: StarRelation): Promise<void>;
  saveGraph(graph: SavedGraph): Promise<void>;
  runActor(request: ActorRunRequest): Promise<ActorRun>;
  openTipline(): void;
  reportIncorrectData(target: CorrectionTarget): Promise<void>;
  subscribe(listener: (event: AutoDigEvent) => void): () => void;
}
