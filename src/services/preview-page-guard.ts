import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readPreviewConfig, requirePreviewRequest } from "./preview-access";
export async function requirePreviewPage(): Promise<boolean> {
 const store = await cookies();
 const request = new Request("http://preview.internal/", { headers: { Cookie: store.toString() } });
 if (requirePreviewRequest(request)) redirect("/construccion");
 return readPreviewConfig().mode === "protected";
}
