import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authGuard } from "../../../middleware/authGuard.js";
import { createTenantScope } from "../../../middleware/tenantScope.js";

import {
  createProjectSchema,
  listProjectsResponseSchema,
  projectParamsSchema,
  projectResponseSchema,
} from "../schema/project.schema.js";
import { ProjectController } from "../controller/project-controller.js";
import { requireRole } from "../../../middleware/require-role.js";
import { standardErrors } from "../../../common/common.schema.js";

export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const controller = new ProjectController();
// Fix: Add `as const` or explicitly type it
const security = [{ bearerAuth: [] }, { cookieAuth: [] }] as const;
  // Order matters: verify JWT -> open tenant context -> check role.
  const scope = [authGuard, createTenantScope(fastify.prisma)];

  app.get("/projects", {
    schema: {
      tags: ["Projects"],
      summary: "List projects in the active workspace",
      security,
      response: { 200: listProjectsResponseSchema, ...standardErrors },
    },
    preHandler: scope, // any member, including VIEWER
    handler: controller.list,
  });

  app.get("/projects/:id", {
    schema: {
      tags: ["Projects"],
      summary: "Get one project",
      security,
      params: projectParamsSchema,
      response: { 200: projectResponseSchema, ...standardErrors },
    },
    preHandler: scope,
    handler: controller.get,
  });

  app.post("/projects", {
    schema: {
      tags: ["Projects"],
      summary: "Create a project",
      security,
      body: createProjectSchema,
      response: { 201: projectResponseSchema, ...standardErrors },
    },
    preHandler: [...scope, requireRole("MEMBER")], // VIEWERs are read-only
    handler: controller.create,
  });

  app.delete("/projects/:id", {
    schema: {
      tags: ["Projects"],
      summary: "Delete a project",
      security,
      params: projectParamsSchema,
      response: { 204: { type: "null" }, ...standardErrors },
    },
    preHandler: [...scope, requireRole("ADMIN")],
    handler: controller.remove,
  });
};
