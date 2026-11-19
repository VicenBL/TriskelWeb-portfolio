import type { AdminAuditInput, AdminAuditService } from "./admin-audit";
import type { AppSessionClaims } from "./app-session";
import {
	AdminAuthorizationError,
	requireAdminSession,
	requireAuthenticatedSession,
	type AuthGuardDependencies,
} from "./auth-guards";

export type AdminMutationAuditDetails = Readonly<
	Pick<
		AdminAuditInput,
		| "action"
		| "resourceType"
		| "resourceId"
		| "previousState"
		| "nextState"
		| "note"
		| "providerReferenceId"
	>
>;

export type AdminMutationAuditRecorder = Pick<AdminAuditService, "log">;

export type AdminMutationAuthorizationDependencies = AuthGuardDependencies &
	Readonly<{
		auditService: AdminMutationAuditRecorder;
	}>;

type AdminMutationAuditOutcome = "allowed" | "denied";

export async function authorizeAdminMutation(
	request: Request,
	auditDetails: AdminMutationAuditDetails,
	dependencies: AdminMutationAuthorizationDependencies,
): Promise<AppSessionClaims> {
	try {
		const adminClaims = requireAdminSession(request, dependencies);
		await dependencies.auditService.log(
			buildMutationAuditInput(adminClaims, auditDetails, "allowed"),
		);

		return adminClaims;
	} catch (error) {
		if (error instanceof AdminAuthorizationError) {
			const authenticatedClaims = requireAuthenticatedSession(
				request,
				dependencies,
			);

			await dependencies.auditService.log(
				buildMutationAuditInput(authenticatedClaims, auditDetails, "denied"),
			);
		}

		throw error;
	}
}

function buildMutationAuditInput(
	claims: AppSessionClaims,
	auditDetails: AdminMutationAuditDetails,
	outcome: AdminMutationAuditOutcome,
): AdminAuditInput {
	return {
		actorAccountId: claims.accountId,
		action: markAuditAction(auditDetails.action, outcome),
		resourceType: auditDetails.resourceType,
		resourceId: auditDetails.resourceId,
		previousState: auditDetails.previousState,
		nextState: auditDetails.nextState,
		note: buildAuditNote(auditDetails.note, outcome),
		providerReferenceId: auditDetails.providerReferenceId,
	};
}

function markAuditAction(
	action: string,
	outcome: AdminMutationAuditOutcome,
): string {
	const normalizedAction = action.trim();

	if (normalizedAction.length === 0) {
		return normalizedAction;
	}

	return `${normalizedAction}.${outcome}`;
}

function buildAuditNote(
	note: string | undefined,
	outcome: AdminMutationAuditOutcome,
): string {
	const outcomeNote = `Admin mutation ${outcome}`;
	const normalizedNote = note?.trim();

	if (!normalizedNote) {
		return outcomeNote;
	}

	return `${outcomeNote}: ${normalizedNote}`;
}
