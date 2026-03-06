/**
 * companies service — CRUD operations on the companies table.
 *
 * NOTE: This service uses a DB stub pattern. When @seaclip/db is available,
 * swap out the stub calls for real Drizzle ORM queries.
 */
import { randomUUID } from "node:crypto";
import { notFound, conflict } from "../errors.js";

export interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyInput {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateCompanyInput {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  settings?: Record<string, unknown>;
}

// In-memory store (replace with Drizzle DB calls)
const store = new Map<string, Company>();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export async function listCompanies(): Promise<Company[]> {
  // db: await db.select().from(companiesTable).orderBy(companiesTable.createdAt);
  return Array.from(store.values()).sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  );
}

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const slug = input.slug ?? generateSlug(input.name);

  // Check slug uniqueness
  for (const c of store.values()) {
    if (c.slug === slug) {
      throw conflict(`A company with slug "${slug}" already exists`);
    }
  }

  const now = new Date().toISOString();
  const company: Company = {
    id: randomUUID(),
    name: input.name,
    slug,
    description: input.description,
    logoUrl: input.logoUrl,
    settings: input.settings ?? {},
    createdAt: now,
    updatedAt: now,
  };

  store.set(company.id, company);
  return company;
}

export async function getCompany(id: string): Promise<Company> {
  const company = store.get(id);
  if (!company) {
    throw notFound(`Company "${id}" not found`);
  }
  return company;
}

export async function updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
  const company = await getCompany(id);

  if (input.slug && input.slug !== company.slug) {
    for (const c of store.values()) {
      if (c.id !== id && c.slug === input.slug) {
        throw conflict(`A company with slug "${input.slug}" already exists`);
      }
    }
  }

  const updated: Company = {
    ...company,
    ...input,
    settings: input.settings !== undefined
      ? { ...company.settings, ...input.settings }
      : company.settings,
    updatedAt: new Date().toISOString(),
  };

  store.set(id, updated);
  return updated;
}

export async function deleteCompany(id: string): Promise<void> {
  await getCompany(id); // throws if not found
  store.delete(id);
}
