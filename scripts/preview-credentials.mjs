import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const scryptAsync = promisify(scrypt);

export async function createPreviewPasswordHash(password, salt = randomBytes(16)) {
 if (typeof password !== "string" || !password.isWellFormed() || Buffer.byteLength(password, "utf8") < 12 || Buffer.byteLength(password, "utf8") > 1024 || salt.length !== 16) throw new Error("Invalid password");
 const key = await scryptAsync(password, salt, 64, { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
 return `scrypt-v1:65536:8:1:${salt.toString("base64url")}:${Buffer.from(key).toString("base64url")}`;
}

export async function runCredentialCli(args = process.argv.slice(2), io = { input: process.stdin, output: process.stdout, error: process.stderr }) {
 if (args.length) {
  if (args.length === 1 && args[0] === "--session-secret") {
   io.output.write(`${randomBytes(32).toString("base64url")}\n`);
   return 0;
  }
  io.error.write("Uso: node scripts/preview-credentials.mjs [--session-secret]\n");
  return 2;
 }
 const input = io.input;
 if (!input.isTTY || typeof input.setRawMode !== "function" || !io.output.isTTY) {
  io.error.write("Se requiere una terminal interactiva.\n");
  return 2;
 }
 const originalRaw = input.isRaw;
 let skipLf = false;
 const readHidden = (prompt) => new Promise((resolve, reject) => {
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  let value = "";
  const cleanup = () => {
   input.off("data", onData);
   for (const event of ["error", "end", "close"]) input.off(event, fail);
  };
  const fail = () => { cleanup(); reject(new Error("Input failed")); };
  const onData = (chunk) => {
   try {
    const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    for (let i = 0; i < bytes.length; i++) {
     const byte = bytes[i];
     if (skipLf) { skipLf = false; if (byte === 10) continue; }
     if (byte === 13 || byte === 10) {
      value += decoder.decode();
      // Accept only the optional LF of CRLF, never silently discard pasted lines.
      const rest = bytes.subarray(i + 1);
      if (rest.length && !(byte === 13 && rest.length === 1 && rest[0] === 10)) throw new Error("Extra input");
      skipLf = byte === 13 && rest.length === 0;
      cleanup(); io.output.write("\n"); resolve(value); return;
     }
     if (byte === 8 || byte === 127) {
      value += decoder.decode();
      value = Array.from(value).slice(0, -1).join("");
     } else {
      if (byte < 32) throw new Error("Unsupported control");
      value += decoder.decode(Uint8Array.of(byte), { stream: true });
     }
     if (Buffer.byteLength(value, "utf8") > 1024) throw new Error("Input too long");
    }
   } catch { fail(); }
  };
  input.on("data", onData);
  for (const event of ["error", "end", "close"]) input.once(event, fail);
  io.output.write(prompt);
 });
 try {
  input.setRawMode(true);
  input.resume();
  const first = await readHidden("Contraseña de vista previa: ");
  const second = await readHidden("Repita la contraseña: ");
  if (first !== second) { io.error.write("Las contraseñas no coinciden.\n"); return 2; }
  const result = await createPreviewPasswordHash(first);
  io.output.write(`${result}\n`);
  return 0;
 } catch {
  io.error.write("No se pudo generar la credencial.\n");
  return 2;
 } finally {
  input.setRawMode(Boolean(originalRaw));
 }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 process.exitCode = await runCredentialCli();
}
