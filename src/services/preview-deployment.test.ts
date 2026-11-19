import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

const read = (name: string) => readFileSync(new URL(`../../${name}`, import.meta.url), "utf8");
describe("preview deployment contracts", () => {
 it("keeps Next.js and PostgreSQL off published host ports", () => {
  const compose=read("docker-compose.yml");
  const database=compose.split("  postgres:")[1]!.split("  app:")[0]!;
  const app=compose.split("  app:")[1]!.split("  proxy:")[0]!;
  expect(database).not.toMatch(/^\s+ports:/m); expect(app).not.toMatch(/^\s+ports:/m);
  expect(compose).toContain('"80:80"'); expect(compose).toContain('"443:443"');
  expect(compose).toContain("internal: true");
  for(const key of ["POSTGRES_PASSWORD", "DATABASE_URL", "PREVIEW_PASSWORD_HASH", "PREVIEW_SESSION_SECRET", "TRISKEL_TLS_DIRECTORY"]) expect(compose).toContain(`\${${key}:?`);
  expect(app).toContain("PREVIEW_ACCESS_MODE: protected");
 });
 it("guards original asset roots before public filesystem serving and restricts optimizer sources", async () => {
  const rules=await nextConfig.rewrites!();
  expect(rules).toMatchObject({beforeFiles:[{source:"/images/:path*",destination:"/api/preview/assets/images/:path*"},{source:"/brand/:path*",destination:"/api/preview/assets/brand/:path*"}]});
  expect(nextConfig.images?.localPatterns).toEqual([{pathname:"/brand/triskel-simbolo.png",search:""}]);
  expect(nextConfig.images?.loader).toBeUndefined();
 });
 it("uses one session validator in Nginx, no HTTP Basic or static asset alias", () => {
  const nginx=read("deploy/nginx.conf"), headers=read("deploy/proxy-headers.conf");
  expect(nginx.match(/auth_request \/_preview_auth;/g)).toHaveLength(2);
  expect(nginx).toMatch(/location = \/_preview_auth\s*\{\s*internal;/);
  expect(nginx).toContain("proxy_pass http://triskel_app/api/preview/session;");
  expect(nginx).not.toMatch(/auth_basic|\balias\s|\broot\s/);
  expect(headers).toContain('proxy_set_header X-Middleware-Subrequest "";');
  expect(headers).toContain("proxy_set_header X-Forwarded-For $remote_addr;");
  expect(headers).not.toContain("$http_x_forwarded_for");
  expect(nginx).toContain("limit_req zone=preview_login");
  const logging=nginx.split("\n").find(line=>line.includes("log_format"))!;
  expect(logging).not.toMatch(/\$request_body|\$http_cookie|\$args|\$request_uri/);
 });
});
