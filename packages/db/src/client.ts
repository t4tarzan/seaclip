import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index.js";

export type Db = ReturnType<typeof createDb>;

export function createDb(url: string) {
  const client = postgres(url, { max: 10 });
  return drizzle(client, { schema });
}
