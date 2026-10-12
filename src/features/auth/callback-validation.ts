import { safeReturnPath } from "./navigation";

export type Confirmation = { token_hash: string; type: "email" | "signup"; next: string };
export type CodeCallback = { code: string; next: string };
const credential = /^[A-Za-z0-9_-]{20,1024}$/;
function one(params: URLSearchParams, key: string): string | null {
  const values = params.getAll(key);
  return values.length === 1 ? values[0] : null;
}
function validEnvelope(params: URLSearchParams): boolean {
  return !params.has("error") && !params.has("error_description") && params.getAll("next").length <= 1;
}
export function parseConfirmation(params: URLSearchParams): Confirmation | null {
  const token_hash = one(params, "token_hash");
  const type = one(params, "type");
  if (!validEnvelope(params) || params.has("code") || !token_hash || !credential.test(token_hash) || (type !== "email" && type !== "signup")) return null;
  return { token_hash, type, next: safeReturnPath(params.get("next")) };
}
export function parseCodeCallback(params: URLSearchParams): CodeCallback | null {
  const code = one(params, "code");
  if (!validEnvelope(params) || params.has("token_hash") || params.has("type") || !code || !credential.test(code)) return null;
  return { code, next: safeReturnPath(params.get("next")) };
}
