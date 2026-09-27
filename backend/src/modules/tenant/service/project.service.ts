import { db } from "../../../lib/db.js";

export class ProjectService {
  async getProjects() {
    // tenantId is auto-injected by the Prisma extension via AsyncLocalStorage!
    return await db.project.findMany();
  }

  async createProject(name: string) {
    // tenantId is auto-injected into the creation payload!
    return await db.project.create({
      data: { name } as any,
    });
  }
}