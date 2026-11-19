import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { isPublicPreviewRequest } from "./preview-policy";
import { withPreviewGuard } from "./preview-request-guard";
import { GET as assetGET } from "../app/api/preview/assets/[...path]/route";

const url = (p: string) => new Request(`http://localhost:3000${p}`);

describe("preview protection boundaries", () => {
 it("allows only the construction screen, technical assets, symbol, status and legal routes", () => {
  for (const p of ["/construccion", "/robots.txt", "/brand/triskel-simbolo.png", "/_next/static/chunks/app.js", "/api/preview/session", "/privacidad"]) expect(isPublicPreviewRequest(url(p))).toBe(true);
  for (const p of ["/", "/login", "/images/banda/JOSEPH%20front.jpeg", "/brand/triskel-logotipo.png", "/api/auth/session", "/api/admin/session", "/api/health", "/_next/static/chunks/app.js.map", "/construccion-otra"]) expect(isPublicPreviewRequest(url(p))).toBe(false);
 });
 it("does not expose the private image optimizer, alternate sources or duplicate URL arguments", () => {
  expect(isPublicPreviewRequest(url("/_next/image?url=%2Fbrand%2Ftriskel-simbolo.png&w=384&q=75"))).toBe(true);
  for (const q of ["url=%2Fimages%2Fbanda%2Fx.jpeg", "url=https%3A%2F%2Fevil.test%2Fx.png", "url=%2Fbrand%2Ftriskel-simbolo.png&url=%2Fimages%2Fx.png", "url=%2Fbrand%2Ftriskel-simbolo.png%3Fv%3D1"]) expect(isPublicPreviewRequest(url(`/_next/image?${q}&w=384&q=75`))).toBe(false);
 });
 it("denies GET and POST API execution even without middleware and ignores spoofed headers", async () => {
  vi.stubEnv("PREVIEW_ACCESS_MODE", "protected");
  vi.stubEnv("PREVIEW_PASSWORD_HASH", "");
  const handler = vi.fn(() => new Response("private"));
  try { for (const method of ["GET", "POST"]) {
   const response = await withPreviewGuard(handler)(new Request("http://localhost:3000/api/admin/session", { method, headers: { "x-middleware-subrequest": "middleware:middleware:middleware:middleware:middleware", "x-forwarded-for": randomBytes(8).toString("hex") } }));
   expect(response.status).toBe(503); expect(await response.text()).toBe(""); expect(response.headers.get("cache-control")).toContain("no-store");
  } expect(handler).not.toHaveBeenCalled(); } finally { vi.unstubAllEnvs(); }
 });
 it("guards original private assets independently of middleware while preserving the public symbol", async () => {
  vi.stubEnv("PREVIEW_ACCESS_MODE", "protected"); vi.stubEnv("PREVIEW_PASSWORD_HASH", "");
  try {
   const denied = await assetGET(url("/api/preview/assets/images/banda/JOSEPH%20front.jpeg"), { params: Promise.resolve({ path: ["images", "banda", "JOSEPH front.jpeg"] }) });
   expect(denied.status).toBe(503); expect((await denied.arrayBuffer()).byteLength).toBe(0);
   const symbol = await assetGET(url("/api/preview/assets/brand/triskel-simbolo.png"), { params: Promise.resolve({ path: ["brand", "triskel-simbolo.png"] }) });
   expect(symbol.status).toBe(200); expect(symbol.headers.get("content-type")).toBe("image/png"); expect((await symbol.arrayBuffer()).byteLength).toBe(1172010);
  } finally { vi.unstubAllEnvs(); }
 });
 it("rejects traversal, encoded paths and non-asset roots without reading sensitive files", async () => {
  for (const parts of [["..", "package.json"], ["brand", "..", "package.json"], ["brand", "%2e%2e", "package.json"], ["brand", "a/b.png"], ["brand", "a\\b.png"], ["package.json"]]) {
   const r=await assetGET(url("/api/preview/assets/nope"), { params: Promise.resolve({ path: parts }) });
   expect(r.status).toBe(404); expect((await r.arrayBuffer()).byteLength).toBe(0);
  }
 });
});
