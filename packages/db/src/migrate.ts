import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "migrations");

const url = process.env.DATABASE_URL ?? "postgres://seaclip:seaclip@localhost:5432/seaclip";
const client = postgres(url, { max: 1 });
const db = drizzle(client);

console.log("Running migrations from:", migrationsFolder);
await migrate(db, { migrationsFolder });
console.log("Migrations complete.");
await client.end();
