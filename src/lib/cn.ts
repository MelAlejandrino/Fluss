/**
 * Conditional className joiner.
 *
 * Deliberately not a Tailwind-aware merger: the UI primitives own their visual
 * classes and callers only ever pass *layout* overrides (`w-full`, `mt-6`,
 * `col-span-2`), so there is nothing to de-duplicate. If a caller ever needs to
 * override a primitive's colour or padding, that's a missing variant on the
 * primitive, not a merge problem.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
