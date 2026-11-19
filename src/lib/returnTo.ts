export function fromHere(pathname: string, search: string): { from: string } {
  return { from: `${pathname}${search}` };
}

export function safeInternal(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return null;
  return path;
}

export function backLabel(path: string): string {
  if (path.startsWith("/rooms")) return "Back to rooms";
  if (path.startsWith("/team")) return "Back to physicians";
  if (path === "/" || path.startsWith("/?")) return "Back to the board";
  return "Back to census";
}
