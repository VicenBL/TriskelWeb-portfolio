import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
	(value) => (value === "" ? undefined : value),
	z.string().min(1).optional(),
);

export const serverEnvSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	APP_BASE_URL: z.string().url().optional(),
	DATABASE_URL: optionalNonEmptyString,
	FIREBASE_PROJECT_ID: optionalNonEmptyString,
	FIREBASE_STORAGE_BUCKET: optionalNonEmptyString,
	FIREBASE_CLIENT_EMAIL: optionalNonEmptyString,
	FIREBASE_PRIVATE_KEY: optionalNonEmptyString,
	STRIPE_SECRET_KEY: optionalNonEmptyString,
	STRIPE_WEBHOOK_SECRET: optionalNonEmptyString,
	CORREOS_USERNAME: optionalNonEmptyString,
	CORREOS_PASSWORD: optionalNonEmptyString,
	CORREOS_CONTRACT_NUMBER: optionalNonEmptyString,
	CORREOS_CLIENT_NUMBER: optionalNonEmptyString,
	SMTP_HOST: optionalNonEmptyString,
	SMTP_PORT: z.coerce.number().int().positive().default(587),
	SMTP_USER: optionalNonEmptyString,
	SMTP_PASSWORD: optionalNonEmptyString,
	SMTP_FROM: optionalNonEmptyString,
	SESSION_SECRET: optionalNonEmptyString,
	BACKUP_DESTINATION: optionalNonEmptyString,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
	env: Record<string, string | undefined> = process.env,
): ServerEnv {
	return serverEnvSchema.parse(env);
}

export const serverEnv = parseServerEnv();
