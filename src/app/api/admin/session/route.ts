import { createProductionAuthSessionStatusDependencies } from "../../auth/session/handlers";
import { createAdminSessionRouteHandlers } from "./handlers";

import { withPreviewGuard } from "../../../../services/preview-request-guard";
export const dynamic = "force-dynamic";

const productionHandlers = createAdminSessionRouteHandlers(
	createProductionAuthSessionStatusDependencies,
);

export const GET = withPreviewGuard(productionHandlers.GET);
