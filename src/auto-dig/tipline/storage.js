import { stateDb } from "../../lib/db";

const PREFIX = "auto-dig:tip:";

export function createTip(values = {}) {
  const now = new Date().toISOString();
  const id = values._id || values.id || `${PREFIX}${crypto.randomUUID()}`;
  return {
    _id: id,
    tip_id: values.tip_id || id.slice(PREFIX.length),
    title: values.title || "Untitled tip",
    body: values.body || "",
    source: values.source || "",
    status: values.status || "new",
    priority: values.priority || "normal",
    linked_document_ids: values.linked_document_ids || [],
    generated_finding_ids: values.generated_finding_ids || [],
    created_at: values.created_at || now,
    updated_at: now,
    handling: { local_only: true, remote_destination: null, ...(values.handling || {}) }
  };
}

export async function listTips() {
  const result = await stateDb.allDocs({ include_docs: true, startkey: PREFIX, endkey: `${PREFIX}\ufff0` });
  return result.rows.map((row) => row.doc).filter(Boolean).sort((left, right) => String(right.updated_at).localeCompare(String(left.updated_at)));
}

export async function saveTip(input) {
  const tip = createTip(input);
  if (input._rev) tip._rev = input._rev;
  else {
    try {
      const existing = await stateDb.get(tip._id);
      tip._rev = existing._rev;
    } catch (error) {
      if (error?.status !== 404) throw error;
    }
  }
  const result = await stateDb.put(tip);
  return { ...tip, _rev: result.rev };
}

export async function deleteTip(tip) {
  const current = tip._rev ? tip : await stateDb.get(tip._id);
  await stateDb.remove(current);
}

export function exportTip(tip) {
  const clean = { ...tip };
  delete clean._rev;
  return JSON.stringify(clean, null, 2);
}
