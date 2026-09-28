/**
 * Deterministic placeholder art for projects without a thumbnail image.
 * Hashes a stable id (the project UUID) into two hues, so the same project
 * always gets the same gradient across reloads/devices, while different
 * projects get visually distinct colors.
 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function placeholderGradient(seed: string): string {
  const hash = hashString(seed || "tchq");
  const hueA = hash % 360;
  const hueB = (hueA + 45 + (hash % 70)) % 360;
  return `linear-gradient(135deg, hsl(${hueA} 75% 60% / 0.65), hsl(${hueB} 70% 45% / 0.65))`;
}

export function initialsFrom(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
