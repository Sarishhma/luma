import { notFound } from "../../../common/error.js";
import { db } from "../../../lib/db.js";
import { requireTenantContext } from "../../../lib/tenant-context.js";

/**
 * Notice what is NOT here: no `where: { tenantId }` on reads and no permission checks.
 *  - Isolation: `db` adds the tenant filter for us (and throws if there is no tenant context).
 *  - Permissions: routes are guarded by requireRole(...).
 *
 * On create we pass tenantId explicitly. That keeps TypeScript happy (no `as any`)
 * and makes the code honest; `db` would inject it anyway (the seatbelt).
 */
export class ProjectService {
  list() {
    return db.project.findMany({ orderBy: { createdAt: "desc" } });
  }

  async getById(id: string) {
    const project = await db.project.findUnique({ where: { id } });
    // Other tenants' projects look exactly like missing ones: 404, never 403.
    if (!project) throw notFound("Project not found.");
    return project;
  }

  create(name: string) {
    const { tenantId } = requireTenantContext();
    return db.project.create({ data: { name, tenantId } });
  }

  async delete(id: string) {
    const { count } = await db.project.deleteMany({ where: { id } });
    if (count === 0) throw notFound("Project not found.");
  }
}
