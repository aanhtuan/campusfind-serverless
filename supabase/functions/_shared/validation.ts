export const campusLocations = ["Campus security office", "Student affairs office", "University reception"] as const;
export const issueCategories = ["MISSED_MEETING", "RETURN_DISPUTED", "SAFETY_CONCERN"] as const;
export const actionFields = {
  submit_found_response: ["item_id", "proof_text", "request_id"],
  submit_owner_proof: ["claim_id", "proof_text"],
  verify_owner: ["claim_id", "decision"],
  withdraw_match: ["claim_id"],
  submit_claim: ["item_id", "proof_text", "request_id"],
  cancel_claim: ["claim_id"],
  review_claim: ["claim_id", "decision"],
  propose_handover: ["claim_id", "location", "meeting_at", "revision"],
  accept_handover: ["claim_id", "revision"],
  request_change: ["claim_id", "revision"],
  confirm_return: ["claim_id", "revision"],
  share_contact: ["claim_id", "kind", "value", "consent"],
  revoke_contact: ["claim_id"],
  open_issue: ["claim_id", "category"],
  resume_issue: ["claim_id", "issue_id"],
  acknowledge_issue: ["issue_id"],
  resolve_lost: ["item_id"],
  close_report: ["item_id"],
} as const;
export type WorkflowAction = keyof typeof actionFields;
export type WorkflowRequest = { action: WorkflowAction; data: Record<string, unknown> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function parseWorkflowRequest(value: unknown, now = Date.now()): WorkflowRequest {
  if (!object(value) || Object.keys(value).some(k => !["action", "data"].includes(k)) ||
    typeof value.action !== "string" || !Object.hasOwn(actionFields, value.action) || !object(value.data)) throw new Error("Invalid request.");
  const action = value.action as WorkflowAction;
  const data = { ...value.data };
  const fields: readonly string[] = actionFields[action];
  if (Object.keys(data).some(k => !fields.includes(k)) || fields.some(k => !Object.hasOwn(data, k))) throw new Error("Invalid operation fields.");
  for (const field of fields.filter(k => k.endsWith("_id"))) {
    if (typeof data[field] !== "string" || !uuid.test(data[field])) throw new Error("Invalid record ID.");
  }
  if ("revision" in data && (!Number.isSafeInteger(data.revision) || Number(data.revision) < 0)) throw new Error("Reload the arrangement and retry.");
  if (["submit_claim", "submit_found_response", "submit_owner_proof"].includes(action)) {
    if (typeof data.proof_text !== "string") throw new Error("Enter ownership evidence.");
    data.proof_text = data.proof_text.trim();
    if ((data.proof_text as string).length < 20 || (data.proof_text as string).length > 5000) throw new Error("Evidence must contain 20 to 5000 characters.");
  }
  if (["review_claim", "verify_owner"].includes(action) && !["APPROVED", "REJECTED"].includes(String(data.decision))) throw new Error("Choose approve or reject.");
  if (action === "propose_handover") {
    const time = typeof data.meeting_at === "string" ? Date.parse(data.meeting_at) : NaN;
    if (!campusLocations.includes(data.location as typeof campusLocations[number]) || !Number.isFinite(time) || time <= now || time > now + 90 * 86400000 || !/(Z|[+-]\d\d:\d\d)$/.test(String(data.meeting_at))) throw new Error("Choose a public campus location and a future time within 90 days.");
  }
  if (action === "open_issue" && !issueCategories.includes(data.category as typeof issueCategories[number])) throw new Error("Choose an issue category.");
  if (action === "share_contact") {
    if (typeof data.value !== "string" || data.consent !== true) throw new Error("Explicit contact sharing consent is required.");
    data.value = data.value.trim();
    const text = data.value as string;
    if (text.length > 254 || !(data.kind === "EMAIL" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) : data.kind === "PHONE" && /^\+?[0-9 ()-]{7,30}$/.test(text))) throw new Error("Enter a valid email or phone number.");
  }
  return { action, data };
}
