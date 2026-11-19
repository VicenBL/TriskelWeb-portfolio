export type AuthenticatedAccount = Readonly<{
	accountId: string;
	customerId: string;
	email: string;
	emailVerified: boolean;
	isAdmin: boolean;
	role: string;
}>;

export type AuthSessionResponse = Readonly<{
	authenticated: true;
	account: AuthenticatedAccount;
}>;

type FetchLike = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

export class AuthSessionClientError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "AuthSessionClientError";
	}
}

export async function createAppSessionFromFirebaseIdToken(
	idToken: string,
	options: Readonly<{ fetchFn?: FetchLike }> = {},
): Promise<AuthSessionResponse> {
	const response = await (options.fetchFn ?? fetch)("/api/auth/session", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ idToken }),
	});

	if (!response.ok) {
		throw new AuthSessionClientError(
			await readErrorMessage(response),
			response.status,
		);
	}

	return (await response.json()) as AuthSessionResponse;
}

export async function clearAppSession(
	options: Readonly<{ fetchFn?: FetchLike }> = {},
): Promise<void> {
	const response = await (options.fetchFn ?? fetch)("/api/auth/session", {
		method: "DELETE",
	});

	if (!response.ok) {
		throw new AuthSessionClientError(
			await readErrorMessage(response),
			response.status,
		);
	}
}

async function readErrorMessage(response: Response): Promise<string> {
	const fallback = "Authentication session request failed";

	try {
		const body = (await response.json()) as unknown;

		if (isErrorBody(body)) {
			return body.error;
		}
	} catch {
		return fallback;
	}

	return fallback;
}

function isErrorBody(body: unknown): body is Readonly<{ error: string }> {
	return (
		typeof body === "object" &&
		body !== null &&
		"error" in body &&
		typeof body.error === "string"
	);
}
