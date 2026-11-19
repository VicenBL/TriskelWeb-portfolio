import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { createPreviewSessionHandlers, readPreviewConfig } from "../src/services/preview-access";
// @ts-expect-error Node executes this adjacent standalone ESM utility.
import { createPreviewPasswordHash, runCredentialCli } from "./preview-credentials.mjs";

type Feed = (input: EventEmitter) => void;
async function tty(feeds: Feed[]) {
 const input = Object.assign(new EventEmitter(), {
  isTTY: true, isRaw: false, readableFlowing: null,
  setRawMode(value: boolean) { this.isRaw = value; }, resume() {}, pause() {},
 });
 let stdout = "", stderr = "", prompt = 0;
 const status = await runCredentialCli([], { input,
  output: { isTTY: true, write(text: string) {
   stdout += text;
   if (text.endsWith(": ")) setImmediate(() => feeds[prompt++]?.(input));
  } }, error: { write(text: string) { stderr += text; } },
 });
 return { status, stdout, stderr, input };
}
const enter = (password: string): Feed => input => input.emit("data", Buffer.from(`${password}\r`));
function assertNoEcho(result: {stdout:string;stderr:string}, password: string) {
 // Assertions use booleans so a failing regression cannot print the password.
 expect((result.stdout + result.stderr).includes(password)).toBe(false);
}
function getHash(stdout: string) {
 const hash = stdout.trim().split("\n").at(-1)!;
 expect(/^scrypt-v1:65536:8:1:[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]{86}$/.test(hash)).toBe(true);
 return hash;
}
async function authenticate(hash: string, password: string) {
 const origin = "http://localhost:3000";
 const config = readPreviewConfig({ PREVIEW_ACCESS_MODE:"protected", PREVIEW_PASSWORD_HASH:hash,
  PREVIEW_SESSION_SECRET:randomBytes(32).toString("base64url"), PREVIEW_ORIGIN:origin, NODE_ENV:"test" });
 const handlers = createPreviewSessionHandlers({ config, limiter:{ take:()=>true, acquire:()=>()=>{} } });
 const response = await handlers.POST(new Request(`${origin}/api/preview/session`, {
  method:"POST", headers:{Origin:origin,"Content-Type":"application/json"}, body:JSON.stringify({password}),
 }));
 expect(await response.text()).toBe("");
 return { status:response.status, cookie:response.headers.get("set-cookie") };
}

describe("preview credential utility", () => {
 it("creates canonical salted scrypt output without embedding the password", async () => {
  const password = randomBytes(18).toString("base64url");
  const result = await createPreviewPasswordHash(password, randomBytes(16));
  getHash(result);
  expect(result.includes(password)).toBe(false);
 });
 it("rejects weak, oversized and ill-formed passwords", async () => {
  for (const password of ["too-short", "x".repeat(1025), `${randomBytes(18).toString("base64url")}\ud800`]) {
   let rejected = false;
   try { await createPreviewPasswordHash(password, randomBytes(16)); } catch { rejected = true; }
   expect(rejected).toBe(true);
  }
 });
 it("refuses non-TTY entry and unexpected arguments without echo", () => {
  const password = randomBytes(18).toString("base64url");
  const nonTty = spawnSync(process.execPath, ["scripts/preview-credentials.mjs"], {input:password,encoding:"utf8"});
  expect(nonTty.status).toBe(2); expect(nonTty.stdout === "").toBe(true);
  expect(nonTty.stderr.includes("terminal interactiva")).toBe(true); assertNoEcho(nonTty,password);
  const argument = spawnSync(process.execPath,["scripts/preview-credentials.mjs",password],{encoding:"utf8"});
  expect(argument.status).toBe(2); expect(argument.stdout === "").toBe(true); assertNoEcho(argument,password);
 });
 it("preserves the separate session-secret command", () => {
  const result = spawnSync(process.execPath,["scripts/preview-credentials.mjs","--session-secret"],{encoding:"utf8"});
  expect(result.status).toBe(0); expect(result.stderr === "").toBe(true);
  expect(/^[A-Za-z0-9_-]{43}\n$/.test(result.stdout)).toBe(true);
 });
 const cases: [string,(base:string)=>[string,string]][] = [
  ["ASCII symbols",base=>[`${base}!#?`,`${base}!#.`]],
  ["enye",base=>[`${base}ñ`,`${base}n`]],
  ["accents",base=>[`${base}áéíóú`,`${base}aeiou`]],
  ["Unicode and supplementary code points",base=>[`${base}漢字🪈♬`,`${base}漢字🪈♪`]],
  ["decomposed Unicode without normalization",base=>[`${base}e\u0301`,`${base}é`]],
  ["leading and trailing spaces",base=>[` ${base} `,base]],
  ["UTF-8 BOM as a real password character",base=>[`\ufeff${base}`,base]],
  ["maximum 1024 UTF-8 bytes",base=>[`${base}${"ñ".repeat(500)}`,`${base}n${"ñ".repeat(499)}`]],
 ];
 for (const [name,build] of cases) it(`preserves exact ${name} and rejects a different password`, async () => {
  const [password,variant] = build(randomBytes(18).toString("base64url"));
  const result = await tty([enter(password),enter(password)]);
  expect(result.status).toBe(0); expect(result.stderr === "").toBe(true);
  assertNoEcho(result,password); expect(result.input.isRaw).toBe(false);
  const hash = getHash(result.stdout);
  const accepted = await authenticate(hash,password), rejected = await authenticate(hash,variant);
  expect(accepted.status).toBe(204); expect(Boolean(accepted.cookie)).toBe(true);
  expect(rejected.status).toBe(401); expect(rejected.cookie === null).toBe(true);
 });
 it("decodes UTF-8 split across single-byte chunks and edits a whole Unicode code point", async () => {
  const base = randomBytes(18).toString("base64url"), password = `${base}ñ🪈`;
  const split: Feed = input => { for (const byte of Buffer.from(`${password}🦊\x7f\r\n`)) input.emit("data",Buffer.from([byte])); };
  const result = await tty([split,enter(password)]);
  expect(result.status).toBe(0); assertNoEcho(result,password);
  expect((await authenticate(getHash(result.stdout),password)).status).toBe(204);
 });
 it("rejects confirmation differing only in a special character without a hash", async () => {
  const base = randomBytes(18).toString("base64url");
  const result = await tty([enter(`${base}ñ`),enter(`${base}n`)]);
  expect(result.status).toBe(2); expect(result.stdout.includes("scrypt-v1:")).toBe(false);
  expect(result.stderr).toBe("Las contraseñas no coinciden.\n"); assertNoEcho(result,base);
 });
 const failures: [string,(base:string)=>Feed][] = [
  ["invalid UTF-8",base=>input=>input.emit("data",Buffer.concat([Buffer.from(base),Buffer.from([255,13])]))],
  ["truncated UTF-8",base=>input=>{input.emit("data",Buffer.concat([Buffer.from(base),Buffer.from([240,159])]));input.emit("end");}],
  ["EOF without Enter",base=>input=>{input.emit("data",Buffer.from(base));input.emit("end");}],
  ["closed input",()=>input=>input.emit("close")],
  ["read error",base=>input=>input.emit("error",new Error(base))],
  ["oversized UTF-8",base=>input=>input.emit("data",Buffer.from(`${base}${"ñ".repeat(501)}\r`))],
  ["unsupported terminal control",base=>input=>input.emit("data",Buffer.from(`${base}\x1b[A\r`))],
  ["multiple pasted lines",base=>input=>input.emit("data",Buffer.from(`${base}\rtrailing\r`))],
 ];
 for (const [name,feed] of failures) it(`fails closed on ${name} without a hash or password echo`, async () => {
  const password = randomBytes(18).toString("base64url");
  const result = await tty([feed(password),enter(password)]);
  expect(result.status).toBe(2); expect(result.stdout.includes("scrypt-v1:")).toBe(false);
  expect(result.stderr).toBe("No se pudo generar la credencial.\n"); assertNoEcho(result,password);
  expect(result.input.isRaw).toBe(false);
 });
 it("rejects an ill-formed JSON Unicode variant instead of accepting replacement bytes", async () => {
  const base = randomBytes(18).toString("base64url"), password = `${base}\ufffd`;
  const hash = await createPreviewPasswordHash(password);
  expect((await authenticate(hash,`${base}\ud800`)).status).toBe(400);
 });
});
