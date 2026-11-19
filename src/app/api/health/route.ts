import { NextResponse } from "next/server";
import { withPreviewGuard } from "../../../services/preview-request-guard";

export const dynamic = "force-dynamic";

export const GET = withPreviewGuard(() => {
	return NextResponse.json({
		service: "triskelweb",
		status: "ok",
		timestamp: new Date().toISOString(),
	});
});
