/** Join class names, dropping falsy ones. No clsx dependency needed. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
