import { createHash, createHmac, randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";

export const PREVIEW_COOKIE_NAME = "triskelweb_preview";
const TTL_SECONDS = 2 * 60 * 60;
const MAX_TOKEN_LENGTH = 2048;
const MAX_BODY_BYTES = 4096;
const HASH_RE = /^scrypt-v1:65536:8:1:([A-Za-z0-9_-]{22}):([A-Za-z0-9_-]{86})$/;
const DEFAULT_BODY_TIMEOUT_MS = 5000;
const MAX_SCRYPTMEM = 128 * 1024 * 1024;

type PreviewHash = Readonly<{ encoded: string; salt: Buffer; key: Buffer }>;
export type PreviewConfig = Readonly<{
 mode: "protected" | "public";
 configured: boolean;
 passwordHash?: PreviewHash;
 sessionSecret?: Buffer;
 origin?: string;
 secure: boolean;
}>;
export class PreviewConfigurationError extends Error {
 constructor() { super("Invalid preview configuration"); this.name = "PreviewConfigurationError"; }
}

export function readPreviewConfig(env: Record<string, string | undefined> = process.env): PreviewConfig {
 const mode = env.PREVIEW_ACCESS_MODE === undefined ? "protected" : env.PREVIEW_ACCESS_MODE;
 if (mode !== "protected" && mode !== "public") throw new PreviewConfigurationError();
 const secure = env.NODE_ENV === "production";
 if (mode === "public") {
  if (secure) throw new PreviewConfigurationError();
  return { mode, configured: true, secure, ...(env.PREVIEW_ORIGIN ? { origin: assertOrigin(env.PREVIEW_ORIGIN, secure) } : {}) };
 }
 const rawHash = env.PREVIEW_PASSWORD_HASH;
 const rawSecret = env.PREVIEW_SESSION_SECRET;
 const rawOrigin = env.PREVIEW_ORIGIN;
 if (!rawHash || !rawSecret || !rawOrigin) return { mode, configured: false, secure };
 const match = HASH_RE.exec(rawHash);
 const salt = match && decodeCanonical(match[1], 16);
 const key = match && decodeCanonical(match[2], 64);
 const secret = decodeCanonical(rawSecret, undefined);
 if (!match || !salt || !key || !secret || secret.length < 32 || (env.SESSION_SECRET !== undefined && rawSecret === env.SESSION_SECRET)) throw new PreviewConfigurationError();
 const origin = assertOrigin(rawOrigin, secure);
 return { mode, configured: true, passwordHash: { encoded: rawHash, salt, key }, sessionSecret: secret, origin, secure };
}

export function hashPreviewPassword(password: string, salt = randomBytes(16)): string {
 if (Buffer.byteLength(password, "utf8") > 1024 || Buffer.byteLength(password, "utf8") < 12 || salt.length !== 16) throw new Error("Invalid preview password");
 return `scrypt-v1:65536:8:1:${salt.toString("base64url")}:${scryptSync(password, salt, 64, { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }).toString("base64url")}`;
}

export function verifyPreviewSession(token: string | undefined, config: PreviewConfig, nowMs = Date.now()): boolean {
 if (!token || token.length > MAX_TOKEN_LENGTH || !config.configured || config.mode !== "protected" || !config.passwordHash || !config.sessionSecret) return false;
 const parts = token.split(".");
 if (parts.length !== 2 || !canonicalBase64url(parts[0]!, 1024) || !canonicalBase64url(parts[1]!, 43)) return false;
 const expected = createHmac("sha256", config.sessionSecret).update(parts[0]!).digest();
 const actual = Buffer.from(parts[1]!, "base64url");
 if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
 try {
  const raw = Buffer.from(parts[0]!, "base64url").toString("utf8");
  if (Buffer.from(raw).toString("base64url") !== parts[0]) return false;
  const claims = JSON.parse(raw);
  const now = Math.floor(nowMs / 1000);
  return claims && Object.keys(claims).sort().join(",") === "aud,exp,hash,iat" && claims.aud === "triskelweb-preview" && claims.hash === createHash("sha256").update(config.passwordHash.encoded).digest("hex") && Number.isSafeInteger(claims.iat) && Number.isSafeInteger(claims.exp) && claims.iat <= now && claims.exp > now && claims.exp - claims.iat === TTL_SECONDS && now - claims.iat < TTL_SECONDS;
 } catch { return false; }
}

type Limiter = { take?: () => boolean; acquire?: () => (() => void) | null };
type HandlerDependencies = { config?: PreviewConfig; now?: () => number; limiter?: Limiter; bodyTimeoutMs?: number };
let windowStarted = 0;
let attemptCount = 0;
let concurrentChecks = 0;
const processLimiter: Limiter = {
 take() { const now = Date.now(); if (now - windowStarted >= 15 * 60_000) { windowStarted = now; attemptCount = 0; } attemptCount += 1; return attemptCount <= 20; },
 acquire() { if (concurrentChecks >= 2) return null; concurrentChecks += 1; return () => { concurrentChecks = Math.max(0, concurrentChecks - 1); }; },
};

export function createPreviewSessionHandlers(deps: HandlerDependencies = {}) {
 const getConfig = () => deps.config ?? readPreviewConfig();
 const now = deps.now ?? Date.now;
 const limiter = deps.limiter ?? processLimiter;
 const bodyTimeoutMs = deps.bodyTimeoutMs ?? DEFAULT_BODY_TIMEOUT_MS;
 return {
  GET: async (request: Request) => {
   const config = safeConfig(getConfig);
   if (!config) return response(503);
   if (config.mode === "public") return response(204);
   if (!config.configured) return response(503);
   return response(verifyPreviewSession(readCookie(request.headers.get("cookie")), config, now()) ? 204 : 401);
  },
  POST: async (request: Request) => {
   const config = safeConfig(getConfig);
   if (!config) return response(503);
   if (config.mode === "protected" && !config.configured) return response(503);
   if (!validOrigin(request, config)) return response(403);
   if (config.mode === "public") return response(204);
   const contentType = request.headers.get("content-type") ?? "";
   if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType)) return response(415);
   let body: unknown;
   try { const bytes = await readLimited(request, MAX_BODY_BYTES, bodyTimeoutMs); body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { return response(400); }
   if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || typeof (body as { password?: unknown }).password !== "string") return response(400);
   const pass = (body as { password: string }).password;
   if (Buffer.from(pass, "utf8").toString("utf8") !== pass || Buffer.byteLength(pass, "utf8") > 1024) return response(400);
   if (limiter.take && !limiter.take()) return response(429, { "Retry-After": "900" });
   const release = limiter.acquire?.();
   if (limiter.acquire && !release) return response(429, { "Retry-After": "1" });
   try {
    const computed = await scryptAsync(pass, config.passwordHash!.salt);
    if (!timingSafeEqual(computed, config.passwordHash!.key)) return response(401);
    const iat = Math.floor(now() / 1000);
    const passwordFingerprint = createHash("sha256").update(config.passwordHash!.encoded).digest("hex");
    const payload = Buffer.from(JSON.stringify({ aud: "triskelweb-preview", exp: iat + TTL_SECONDS, hash: passwordFingerprint, iat })).toString("base64url");
    const signature = createHmac("sha256", config.sessionSecret!).update(payload).digest("base64url");
    return response(204, { "Set-Cookie": cookieHeader(`${payload}.${signature}`, config.secure) });
   } finally { release?.(); }
  },
  DELETE: async (request: Request) => {
   const config = safeConfig(getConfig);
   if (!config) return response(503);
   if (!validOrigin(request, config)) return response(403);
   return response(204, { "Set-Cookie": clearCookieHeader(config.secure) });
  },
 };
}

export function requirePreviewRequest(request: Request): Response | null {
 const config = safeConfig(() => readPreviewConfig());
 if (!config) return response(503);
 if (config.mode === "public") return null;
 if (!config.configured) return response(503);
 return verifyPreviewSession(readCookie(request.headers.get("cookie")), config) ? null : response(401);
}

function safeConfig(read: () => PreviewConfig): PreviewConfig | null { try { return read(); } catch { return null; } }
function response(status: number, extra: Record<string, string> = {}): Response { return new Response(null, { status, headers: { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow", Vary: "Cookie, Origin", ...extra } }); }
function cookieHeader(token: string, secure: boolean): string { return `${PREVIEW_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_SECONDS}${secure ? "; Secure" : ""}`; }
function clearCookieHeader(secure: boolean): string { return `${PREVIEW_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`; }
function validOrigin(request: Request, config: PreviewConfig): boolean { return Boolean(config.origin && request.headers.get("origin") === config.origin); }
function assertOrigin(value: string, secure: boolean): string { let parsed: URL; try { parsed = new URL(value); } catch { throw new PreviewConfigurationError(); } if (parsed.origin !== value || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash || (secure && parsed.protocol !== "https:")) throw new PreviewConfigurationError(); return value; }
function readCookie(header: string | null): string | undefined {
 if (!header) return undefined;
 let found: string | undefined;
 for (const part of header.split(";")) { const i = part.indexOf("="); if (i < 0) continue; const name = part.slice(0, i).trim(); if (name !== PREVIEW_COOKIE_NAME) continue; if (found !== undefined) return undefined; const value = part.slice(i + 1).trim(); if (!value || /[^A-Za-z0-9_.-]/.test(value)) return undefined; found = value; }
 return found;
}
async function readLimited(request: Request, max: number, timeoutMs: number): Promise<Buffer> {
 if (!request.body) throw new Error("bad body");
 const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
 let timer: ReturnType<typeof setTimeout> | undefined;
 const readBody = async () => { for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > max) throw new Error("body too large"); chunks.push(value); } return Buffer.concat(chunks.map((part) => Buffer.from(part)), total); };
 try {
  return await Promise.race([readBody(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("body timeout")), timeoutMs); })]);
 } catch (error) { void reader.cancel().catch(() => undefined); throw error; }
 finally { if (timer) clearTimeout(timer); try { reader.releaseLock(); } catch { /* canceled read may still be unwinding */ } }
}
function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
 return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 65536, r: 8, p: 1, maxmem: MAX_SCRYPTMEM }, (error, key) => error ? reject(error) : resolve(Buffer.from(key))));
}
function decodeCanonical(value: string, size: number | undefined): Buffer | null { const maxChars = size === undefined ? 256 : Math.ceil(size * 4 / 3); if (!canonicalBase64url(value, maxChars)) return null; const decoded = Buffer.from(value, "base64url"); return decoded.length >= (size ?? 32) && (size === undefined || decoded.length === size) ? decoded : null; }
function canonicalBase64url(value: string, max: number): boolean { return value.length > 0 && value.length <= max && /^[A-Za-z0-9_-]+$/.test(value) && Buffer.from(value, "base64url").toString("base64url") === value; }
