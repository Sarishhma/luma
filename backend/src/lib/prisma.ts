import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * The ONE raw Prisma client (and one connection pool) for the whole app.
 * Use it for things that are NOT tenant data: users, sessions, tenants,
 * memberships, invitations, audit logs.
 *
 * For tenant data (projects, posts...) use `db` from ./db.ts instead.
 * Tip: `fastify.decorate("prisma", prisma)` so Fastify shares this same client.
 */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
