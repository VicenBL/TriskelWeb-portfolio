import type { AppSessionClaims } from "./app-session";
import {
	requireVerifiedEmailSession,
	type AuthGuardDependencies,
} from "./auth-guards";

export type SensitiveAccountActionTarget = Readonly<{
	accountId: string;
}>;

export class AccountActionAuthorizationError extends Error {
	readonly code = "ACCOUNT_ACTION_FORBIDDEN";
	readonly status = 403;

	constructor(message = "Account action forbidden") {
		super(message);
		this.name = "AccountActionAuthorizationError";
	}
}

export function authorizeSensitiveAccountAction(
	request: Request,
	target: SensitiveAccountActionTarget,
	dependencies: AuthGuardDependencies,
): AppSessionClaims {
	const claims = requireVerifiedEmailSession(request, dependencies);
	const targetAccountId = target.accountId.trim();

	if (targetAccountId.length === 0 || claims.accountId !== targetAccountId) {
		throw new AccountActionAuthorizationError();
	}

	return claims;
}
