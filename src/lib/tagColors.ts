// Deterministic tag color based on tag name — consistent across renders
const TAG_COLOR_CLASSES = [
  "bg-orange-100 text-orange-700",
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-600",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
] as const;

export function getTagColor(tag: string): string {
  const hash = Array.from(tag).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TAG_COLOR_CLASSES[hash % TAG_COLOR_CLASSES.length];
}
