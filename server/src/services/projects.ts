import { randomUUID } from "node:crypto";
import { notFound } from "../errors.js";

export interface Project {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  status: "active" | "paused" | "completed" | "archived";
  startDate?: string;
  endDate?: string;
  color?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: Project["status"];
  startDate?: string;
  endDate?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

const store = new Map<string, Project>();

export async function listProjects(companyId: string): Promise<Project[]> {
  return Array.from(store.values())
    .filter((p) => p.companyId === companyId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createProject(
  companyId: string,
  input: CreateProjectInput,
): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: randomUUID(),
    companyId,
    name: input.name,
    description: input.description,
    status: input.status ?? "active",
    startDate: input.startDate,
    endDate: input.endDate,
    color: input.color,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
  store.set(project.id, project);
  return project;
}

export async function getProject(companyId: string, id: string): Promise<Project> {
  const project = store.get(id);
  if (!project || project.companyId !== companyId) {
    throw notFound(`Project "${id}" not found`);
  }
  return project;
}

export async function updateProject(
  companyId: string,
  id: string,
  input: Partial<CreateProjectInput>,
): Promise<Project> {
  const project = await getProject(companyId, id);
  const updated: Project = {
    ...project,
    ...input,
    metadata: input.metadata !== undefined
      ? { ...project.metadata, ...input.metadata }
      : project.metadata,
    updatedAt: new Date().toISOString(),
  };
  store.set(id, updated);
  return updated;
}

export async function deleteProject(companyId: string, id: string): Promise<void> {
  await getProject(companyId, id);
  store.delete(id);
}
