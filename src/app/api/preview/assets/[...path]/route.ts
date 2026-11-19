import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { requirePreviewRequest } from "../../../../../services/preview-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const types: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml" };
type Context = { params: Promise<{ path: string[] }> };
const empty = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
export async function GET(request: Request, context: Context): Promise<Response> {
 const parts = (await context.params).path;
 if (!Array.isArray(parts) || parts.length < 2 || !["images", "brand"].includes(parts[0]!) || parts.some(p => !p || p === "." || p === ".." || /[%/\\\x00-\x1f:]/.test(p))) return empty();
 const mime = types[path.extname(parts.at(-1)!).toLowerCase()];
 if (!mime) return empty();
 const isSymbol = parts.join("/") === "brand/triskel-simbolo.png";
 if (!isSymbol) { const denied = requirePreviewRequest(request); if (denied) return denied; }
 try {
  const root = await realpath(path.join(process.cwd(), "public"));
  const file = await realpath(path.join(root, ...parts));
  if (!file.startsWith(root + path.sep)) return empty();
  const data = await readFile(file);
  return new Response(new Uint8Array(data), { headers: { "Content-Type": mime, "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow" } });
 } catch { return empty(); }
}
export async function HEAD(request: Request, context: Context): Promise<Response> {
 const response = await GET(request, context);
 return new Response(null, { status: response.status, headers: response.headers });
}
