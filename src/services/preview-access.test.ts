import { createHash, createHmac, randomBytes, scryptSync } from "node:crypto";
import "../../scripts/preview-credentials.test";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
 createPreviewSessionHandlers, PREVIEW_COOKIE_NAME, readPreviewConfig,
 requirePreviewRequest, verifyPreviewSession,
} from "./preview-access";

const password = randomBytes(18).toString("base64url");
const salt = randomBytes(16);
const hash = `scrypt-v1:65536:8:1:${salt.toString("base64url")}:${scryptSync(password, salt, 64, { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }).toString("base64url")}`;
const secret = randomBytes(32).toString("base64url");
const env = { PREVIEW_ACCESS_MODE: "protected", PREVIEW_PASSWORD_HASH: hash, PREVIEW_SESSION_SECRET: secret, PREVIEW_ORIGIN: "http://localhost:3000", NODE_ENV: "test" };
const fixedNow = Date.parse("2026-01-01T00:00:00.000Z");
const config = readPreviewConfig(env);
const fingerprint = createHash("sha256").update(hash).digest("hex");
const savedEnv = Object.fromEntries(["PREVIEW_ACCESS_MODE", "PREVIEW_PASSWORD_HASH", "PREVIEW_SESSION_SECRET", "PREVIEW_ORIGIN", "NODE_ENV"].map((key) => [key, process.env[key]]));

afterEach(() => { for (const [key, value] of Object.entries(savedEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } vi.restoreAllMocks(); });
function handlers(extra: Record<string, unknown> = {}) {
 return createPreviewSessionHandlers({ config, now: () => fixedNow, ...extra } as never);
}
function request(method: string, options: { body?: string; cookie?: string; origin?: string; type?: string; headers?: Record<string,string> } = {}) {
 return new Request("http://localhost:3000/api/preview/session", { method, headers: { ...(options.body === undefined ? {} : { "Content-Type": options.type ?? "application/json" }), ...(options.origin ? { Origin: options.origin } : {}), ...(options.cookie ? { Cookie: options.cookie } : {}), ...options.headers }, ...(options.body === undefined ? {} : { body: options.body }) });
}
function signedToken(claims: Record<string, unknown>, signingSecret = Buffer.from(secret, "base64url")) {
 const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
 return `${payload}.${createHmac("sha256", signingSecret).update(payload).digest("base64url")}`;
}
function claims(overrides: Record<string, unknown> = {}) {
 const iat = Math.floor(fixedNow / 1000);
 return { aud: "triskelweb-preview", exp: iat + 7200, hash: fingerprint, iat, ...overrides };
}
function useProtectedEnv() {
 process.env.PREVIEW_ACCESS_MODE = "protected";
 process.env.PREVIEW_PASSWORD_HASH = hash;
 process.env.PREVIEW_SESSION_SECRET = secret;
 process.env.PREVIEW_ORIGIN = env.PREVIEW_ORIGIN;
}

describe("preview access", () => {
 it("creates a cookie with no password hash material and verifies its digest-bound session", async () => {
  const response = await handlers().POST(request("POST", { origin: env.PREVIEW_ORIGIN, body: JSON.stringify({ password }) }));
  expect(response.status).toBe(204);
  const cookie = response.headers.get("set-cookie")!;
  expect(cookie).toContain(`${PREVIEW_COOKIE_NAME}=`);
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Lax");
  expect(cookie).toContain("Path=/");
  expect(cookie).not.toContain(hash);
  expect(cookie).not.toContain(salt.toString("base64url"));
  expect(cookie).not.toContain(password);
  const token = cookie.split(";")[0]!.split("=")[1]!;
  expect(verifyPreviewSession(token, config, fixedNow)).toBe(true);
 });
 it("rejects bad passwords, malformed JSON, wrong media types and oversized bodies generically", async () => {
  const h = handlers();
  const bad = await h.POST(request("POST", { origin: env.PREVIEW_ORIGIN, body: JSON.stringify({ password: randomBytes(18).toString("base64url") }) }));
  expect(bad.status).toBe(401);
  expect(bad.headers.get("cache-control")).toContain("no-store");
  expect((await h.POST(request("POST", { origin: env.PREVIEW_ORIGIN, body: "{" }))).status).toBe(400);
  expect((await h.POST(request("POST", { origin: env.PREVIEW_ORIGIN, body: "{}", type: "text/plain" }))).status).toBe(415);
  expect((await h.POST(request("POST", { origin: env.PREVIEW_ORIGIN, body: "x".repeat(4097) }))).status).toBe(400);
 });
 it("returns 503 for missing/invalid protected config before origin validation", async () => {
  const unconfigured = createPreviewSessionHandlers({ config: readPreviewConfig({ PREVIEW_ACCESS_MODE: "protected" }), now: () => fixedNow });
  expect((await unconfigured.GET(request("GET"))).status).toBe(503);
  expect((await unconfigured.POST(request("POST", { body: "{}" }))).status).toBe(503);
  expect((await unconfigured.DELETE(request("DELETE"))).status).toBe(403);
  process.env.PREVIEW_ACCESS_MODE = "protected";
  delete process.env.PREVIEW_PASSWORD_HASH;
  delete process.env.PREVIEW_SESSION_SECRET;
  delete process.env.PREVIEW_ORIGIN;
  expect(requirePreviewRequest(request("GET"))?.status).toBe(503);
  for (const invalid of [
   { ...env, PREVIEW_PASSWORD_HASH: `scrypt-v1:999999:8:1:${salt.toString("base64url")}:${randomBytes(64).toString("base64url")}` },
   { ...env, PREVIEW_PASSWORD_HASH: `scrypt-v1:65536:8:1:${salt.toString("base64url")}=${randomBytes(64).toString("base64url")}` },
   { ...env, PREVIEW_SESSION_SECRET: randomBytes(8).toString("base64url") },
   { ...env, SESSION_SECRET: secret },
   { ...env, PREVIEW_ORIGIN: "https://user:pass@example.test/path" },
   { ...env, PREVIEW_ACCESS_MODE: "invalid" },
  ]) expect(() => readPreviewConfig(invalid)).toThrow("Invalid preview configuration");
 });
 it("fails closed for production public mode and protects properly configured HTTPS cookies", async () => {
  expect(() => readPreviewConfig({ PREVIEW_ACCESS_MODE: "public", NODE_ENV: "production" })).toThrow();
  expect(readPreviewConfig({ PREVIEW_ACCESS_MODE: "protected", NODE_ENV: "production" }).configured).toBe(false);
  expect(() => readPreviewConfig({ ...env, PREVIEW_SESSION_SECRET: randomBytes(8).toString("base64url"), NODE_ENV: "production", PREVIEW_ORIGIN: "https://example.test" })).toThrow();
  expect(() => readPreviewConfig({ ...env, PREVIEW_ORIGIN: "http://example.test", NODE_ENV: "production" })).toThrow();
  const production = readPreviewConfig({ ...env, PREVIEW_ORIGIN: "https://example.test", NODE_ENV: "production" });
  const productionHandlers = createPreviewSessionHandlers({ config: production, now: () => fixedNow });
  const response = await productionHandlers.POST(request("POST", { origin: "https://example.test", body: JSON.stringify({ password }) }));
  expect(response.headers.get("set-cookie")).toContain("; Secure");
 });
 it("rejects tampering, expiry, future iat, wrong audience, TTL and malformed cookies", async () => {
  const h = handlers();
  const response = await h.POST(request("POST", { origin: env.PREVIEW_ORIGIN, body: JSON.stringify({ password }) }));
  const token = response.headers.get("set-cookie")!.split(";")[0]!.split("=")[1]!;
  expect(verifyPreviewSession(`${token}x`, config, fixedNow)).toBe(false);
  expect(verifyPreviewSession(token, config, fixedNow + 7200_000)).toBe(false);
  expect(verifyPreviewSession(token, config, fixedNow)).toBe(true);
  expect(verifyPreviewSession(signedToken(claims({ iat: Math.floor(fixedNow / 1000) + 1, exp: Math.floor(fixedNow / 1000) + 7201 })), config, fixedNow)).toBe(false);
  expect(verifyPreviewSession(signedToken(claims({ aud: "wrong" })), config, fixedNow)).toBe(false);
  expect(verifyPreviewSession(signedToken(claims({ exp: Math.floor(fixedNow / 1000) + 7199 })), config, fixedNow)).toBe(false);
  expect(verifyPreviewSession("x".repeat(2049), config, fixedNow)).toBe(false);
  expect((await h.GET(request("GET", { cookie: `${PREVIEW_COOKIE_NAME}=${token}; ${PREVIEW_COOKIE_NAME}=${token}` }))).status).toBe(401);
  expect((await h.GET(request("GET", { cookie: `${PREVIEW_COOKIE_NAME}=%ZZ` }))).status).toBe(401);
  expect((await h.GET(request("GET", { cookie: `${PREVIEW_COOKIE_NAME}=` }))).status).toBe(401);
 });
 it("invalidates sessions on hash/secret rotation while logout only clears the browser cookie", async () => {
  const h = handlers();
  const response = await h.POST(request("POST", { origin: env.PREVIEW_ORIGIN, body: JSON.stringify({ password }) }));
  const token = response.headers.get("set-cookie")!.split(";")[0]!.split("=")[1]!;
  const otherHash = `scrypt-v1:65536:8:1:${randomBytes(16).toString("base64url")}:${randomBytes(64).toString("base64url")}`;
  const rotatedHash = readPreviewConfig({ ...env, PREVIEW_PASSWORD_HASH: otherHash });
  const rotatedSecret = readPreviewConfig({ ...env, PREVIEW_SESSION_SECRET: randomBytes(32).toString("base64url") });
  expect(verifyPreviewSession(token, rotatedHash, fixedNow)).toBe(false);
  expect(verifyPreviewSession(token, rotatedSecret, fixedNow)).toBe(false);
  const logout = await h.DELETE(request("DELETE", { origin: env.PREVIEW_ORIGIN, cookie: `${PREVIEW_COOKIE_NAME}=${token}; triskelweb_session=keep` }));
  expect(logout.status).toBe(204);
  expect(logout.headers.get("set-cookie")).toContain(`${PREVIEW_COOKIE_NAME}=`);
  expect(logout.headers.get("set-cookie")).not.toContain("triskelweb_session");
  expect(verifyPreviewSession(token, config, fixedNow)).toBe(true);
 });
 it("supports development public mode, requires mutation origin, and preserves exact guard signature", async () => {
  const publicConfig = readPreviewConfig({ PREVIEW_ACCESS_MODE: "public", PREVIEW_ORIGIN: "http://localhost:3000", NODE_ENV: "test" });
  const h = createPreviewSessionHandlers({ config: publicConfig, now: () => fixedNow });
  expect((await h.GET(request("GET"))).status).toBe(204);
  expect((await h.POST(request("POST", { origin: "http://localhost:3000", body: "{}" }))).status).toBe(204);
  expect((await h.POST(request("POST", { body: "{}" }))).status).toBe(403);
  useProtectedEnv();
  expect(requirePreviewRequest(request("GET"))?.status).toBe(401);
 });
 it("applies bounded attempts despite forged XFF and releases/inhibits asynchronous work via limiter leases", async () => {
  let attempts = 0;
  const limiter = { take: () => ++attempts <= 1, acquire: vi.fn(() => null) };
  const h = handlers({ limiter });
  const post = () => h.POST(request("POST", { origin: env.PREVIEW_ORIGIN, headers: { "X-Forwarded-For": randomBytes(12).toString("hex") }, body: JSON.stringify({ password: randomBytes(18).toString("base64url") }) }));
  expect((await post()).status).toBe(429);
  expect((await post()).status).toBe(429);
  expect(limiter.acquire).toHaveBeenCalledTimes(1);
  const release = vi.fn();
  const success = handlers({ limiter: { take: () => true, acquire: () => release } });
  expect((await success.POST(request("POST", { origin: env.PREVIEW_ORIGIN, body: JSON.stringify({ password }) }))).status).toBe(204);
  expect(release).toHaveBeenCalledOnce();
 });
 it("bounds request-body read duration", async () => {
  const stream = new ReadableStream<Uint8Array>({ start() {} });
  const slow = new Request("http://localhost:3000/api/preview/session", { method: "POST", headers: { Origin: env.PREVIEW_ORIGIN, "Content-Type": "application/json" }, body: stream, duplex: "half" } as RequestInit & { duplex: "half" });
  const h = createPreviewSessionHandlers({ config, now: () => fixedNow, bodyTimeoutMs: 10 } as never);
  expect((await h.POST(slow)).status).toBe(400);
 });
});
