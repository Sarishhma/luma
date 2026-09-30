import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const projectParamsSchema = z.object({
  id: z.string().uuid(),
});

// Note: tenantId is deliberately NOT in the response. Clients don't need it.
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const listProjectsResponseSchema = z.object({ projects: z.array(projectSchema) });
export const projectResponseSchema = z.object({ project: projectSchema });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
