import type { FastifyInstance } from "fastify";
import { ProjectController } from "../controller/project.controller.js";
import { createTenantContextHook } from "../../../lib/tenant-context.js";
import { db } from "../../../lib/db.js";


export async function projectRoutes(app: FastifyInstance) {
  const controller = new ProjectController();

  // Apply your tenant context hook to all routes in this plugin group
  app.addHook("preHandler", createTenantContextHook(db));

  app.get("/", controller.getProjects);
  app.post("/", controller.createProject);
}