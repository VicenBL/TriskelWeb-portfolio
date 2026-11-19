import { NextRequest, NextResponse } from "next/server";
import { requirePreviewRequest } from "./services/preview-access";
import { isPublicPreviewRequest } from "./services/preview-policy";

export function middleware(request: NextRequest) {
 let response: Response;
 if (isPublicPreviewRequest(request)) {
  response = NextResponse.next();
 } else if (request.nextUrl.pathname === "/_next/image") {
  // Never expose cached private optimizer output, even to a preview session.
  response = new Response(null, { status: 404 });
 } else {
  const denied = requirePreviewRequest(request);
  if (!denied) response = NextResponse.next();
  else if ((request.method === "GET" || request.method === "HEAD") && !/^\/(api|images|brand|_next)(\/|$)/.test(request.nextUrl.pathname) && request.headers.get("RSC") !== "1") {
   response = NextResponse.redirect(new URL("/construccion", request.url), 307);
  } else response = denied;
 }
 response.headers.set("Cache-Control", "private, no-store, max-age=0");
 response.headers.set("Vary", "Cookie, Origin");
 response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
 response.headers.set("X-Content-Type-Options", "nosniff");
 return response;
}
export const config = { matcher: ["/:path*"], runtime: "nodejs" };
