// Public exceptions contain no private page or commercial API.
const publicPaths = new Set(["/construccion", "/robots.txt", "/brand/triskel-simbolo.png", "/api/preview/session", "/aviso-legal", "/privacidad", "/cookies"]);
export function isPublicPreviewRequest(request: Request): boolean {
 const url = new URL(request.url), p = url.pathname;
 if (publicPaths.has(p)) return true;
 if (p.startsWith("/_next/static/") && !p.endsWith(".map") && !p.includes("%") && !p.includes("\\")) return request.method === "GET" || request.method === "HEAD";
 return p === "/_next/image" && url.searchParams.getAll("url").length === 1 && url.searchParams.get("url") === "/brand/triskel-simbolo.png" && (request.method === "GET" || request.method === "HEAD");
}
