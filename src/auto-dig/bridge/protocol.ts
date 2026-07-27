export const AUTO_DIG_PROTOCOL = "auto-dig-quasar.v1" as const;

export type BridgeMethod =
  | "handshake"
  | "getActiveDatasetId"
  | "getActiveRunId"
  | "loadDataset"
  | "saveDocument"
  | "saveRelation"
  | "saveGraph"
  | "runActor"
  | "openTipline"
  | "reportIncorrectData";

export interface BridgeRequest {
  protocol: typeof AUTO_DIG_PROTOCOL;
  channel: "request";
  id: string;
  method: BridgeMethod;
  params?: unknown;
}

export interface BridgeResponse {
  protocol: typeof AUTO_DIG_PROTOCOL;
  channel: "response";
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface BridgeEvent {
  protocol: typeof AUTO_DIG_PROTOCOL;
  channel: "event";
  type: string;
  payload?: unknown;
}

export type BridgeMessage = BridgeRequest | BridgeResponse | BridgeEvent;

export function isBridgeMessage(value: unknown): value is BridgeMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return message.protocol === AUTO_DIG_PROTOCOL
    && (message.channel === "request" || message.channel === "response" || message.channel === "event");
}

export function requestId(): string {
  return `adq-${Date.now().toString(36)}-${crypto.randomUUID()}`;
}
