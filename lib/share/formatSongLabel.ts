export function formatSongLabel(title: string, artist: string): string {
  const name = artist.trim();
  if (!name || name.toLowerCase() === "unknown") return title;
  return `${title} · ${name}`;
}
