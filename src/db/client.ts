import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/config/env";
import * as schema from "./schema";

if (!serverEnv.DATABASE_URL) {
	throw new Error(
		"DATABASE_URL is required before creating a database client.",
	);
}

export const pool = new Pool({
	connectionString: serverEnv.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
