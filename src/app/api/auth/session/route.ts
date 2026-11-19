import {
	createAuthSessionRouteHandlers,
	createProductionAuthSessionDependencies,
	createProductionAuthSessionStatusDependencies,
	shouldUseSecureAuthCookies,
} from "./handlers";

import { withPreviewGuard } from "../../../../services/preview-request-guard";
export const dynamic = "force-dynamic";

const productionHandlers = createAuthSessionRouteHandlers(
	createProductionAuthSessionDependencies,
	{
		resolveStatusDependencies: createProductionAuthSessionStatusDependencies,
		secureCookies: shouldUseSecureAuthCookies(),
	},
);

export const GET = withPreviewGuard(productionHandlers.GET);
export const POST = withPreviewGuard(productionHandlers.POST);
export const DELETE = withPreviewGuard(productionHandlers.DELETE);
