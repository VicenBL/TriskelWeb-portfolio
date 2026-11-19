import { createPreviewSessionHandlers } from "../../../../services/preview-access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handlers = createPreviewSessionHandlers();
export const GET = handlers.GET;
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
