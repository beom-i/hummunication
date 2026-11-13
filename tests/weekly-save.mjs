import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { weeklyDefaultValues, weeklyDraftSchema } from "../src/features/weekly/schemas.ts";
import { setFormErrors } from "../src/lib/form-errors.ts";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "./server" && context.parentURL?.endsWith("/supabase/with-user.ts")) return { url: "data:text/javascript," + encodeURIComponent("export async function createClient(){return globalThis.__weeklySaveDb;}"), shortCircuit: true };
  if (specifier === "next/cache") return { url: "data:text/javascript,export function revalidatePath(){}", shortCircuit: true };
  return next(specifier, context);
} });
const { saveWeekly } = await import("../src/features/weekly/actions.ts");
const values = weeklyDraftSchema.parse({ ...weeklyDefaultValues, date: "2035-01-07" });
const ref = { id: "00000000-0000-4000-8000-000000000010", sermon: null };
let calls = [];
let saveError = null;
globalThis.__weeklySaveDb = {
  auth: { async getClaims() { return { data: { claims: { sub: "00000000-0000-4000-8000-000000000001" } } }; } },
  async rpc(name, input) {
    calls.push({ name, input });
    if (name === "save_weekly") return { error: saveError };
    return { data: { id: ref.id, date: values.date, updated_at: "2035-01-07T00:00:00.000Z", sections: values.sections, sermon: null, families: [], senders: [] }, error: null };
  },
};
saveError = { code: "23505", message: 'duplicate key value violates unique constraint "weekly_active_date"' };
const duplicate = await saveWeekly({ ref: null, values });
assert.equal(duplicate.ok, false);
assert.equal(duplicate.error.code, "CONFLICT");
assert.ok(duplicate.error.fields?.["values.date"], "A duplicate publication date needs a date-specific recovery action");
assert.equal(calls.length, 1, "An existing publication must not be overwritten automatically");
const errors = new Map();
setFormErrors({ getValues: () => values, setError: (name, error) => errors.set(name, error) }, duplicate.error);
assert.equal(errors.get("root").type, "CONFLICT", "The form must retain the server error code instead of treating every error as login failure");
assert.ok(errors.has("date"));
saveError = { code: "23505", message: 'duplicate key value violates unique constraint "family_active_position"' };
const positionConflict = await saveWeekly({ ref, values });
assert.equal(positionConflict.error.code, "CONFLICT");
assert.equal(positionConflict.error.fields, undefined, "A row-order conflict must not link to a duplicate date");
saveError = null; calls = [];
const styledValues = { ...values, sermon: { ...values.sermon, content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "고정 서식", marks: [{ type: "bold" }, { type: "textStyle", attrs: { color: "#B92330", fontSize: "32px" } }] }] }] } } };
const saved = await saveWeekly({ ref, values: styledValues });
assert.deepEqual(calls[0].input.p_sermon.values.content.content[0].content[0].marks, [{ type: "bold" }], "API saving must strip legacy custom typography");
assert.equal(saved.ok, true);
assert.equal(calls[0].input.p_id, ref.id, "Editing an existing bulletin must update its server identity");
assert.deepEqual(saved.data.ref, ref);
console.log("PASS: duplicate dates have a recovery action, keep their error code, and never overwrite existing bulletins");
