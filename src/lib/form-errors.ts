import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { AppError } from "./result";

export function setFormErrors<T extends FieldValues>(form: UseFormReturn<T>, error: AppError) {
  const values = form.getValues();
  for (const [key, messages] of Object.entries(error.fields ?? {})) {
    const path = key.replace(/^values\./, "");
    let current: unknown = values;
    const known = path.split(".").every(part => {
      if (["__proto__", "prototype", "constructor"].includes(part) || !current || typeof current !== "object" || !Object.hasOwn(current, part)) return false;
      current = (current as Record<string, unknown>)[part];
      return true;
    });
    if (known && messages[0]) form.setError(path as Path<T>, { type: "server", message: messages[0] });
  }
  form.setError("root", { type: "server", message: error.message });
}
