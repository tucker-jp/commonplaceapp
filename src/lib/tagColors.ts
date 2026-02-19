// Deterministic tag color based on tag name — consistent across renders
const TAG_COLOR_CLASSES = [
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-800",
  "bg-lime-100 text-lime-800",
  "bg-slate-100 text-slate-700",
  "bg-yellow-100 text-yellow-800",
] as const;

export function getTagColor(tag: string): string {
  const hash = Array.from(tag).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TAG_COLOR_CLASSES[hash % TAG_COLOR_CLASSES.length];
}
