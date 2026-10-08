🛠️ Why Certain Architectural Choices Were Made

1. Why AsyncLocalStorage?
In a concurrent Node.js server, multiple requests share the same process memory. AsyncLocalStorage acts as a request-scoped thread-local storage.

The Problem It Solves: Instead of manually threading context objects (tenantId, userId, role) through every single controller, service, and repository method, AsyncLocalStorage tracks the execution context asynchronously.

Security Benefit: Deep database clients can instantly read the active tenant context right before executing a query, ensuring tenant isolation without developer oversight.

2. Why a Custom Prisma db Extension? (Fails Closed)
Relying on developers to remember where: { tenantId } in every repository query inevitably leads to data leaks.

Fails Closed: If a database query is attempted outside of an active tenant scope (i.e., AsyncLocalStorage is empty), the extension throws an error immediately rather than running an un-scoped query.

Allowlisting: It uses an explicit allowlist of operations, automatically injecting tenant constraints for tenant-bound models like Projects and Posts.


3. Why is a "Tenant" used?
What it is: A tenant represents an independent organization, company, or workspace (e.g., Company A and Company B using the same SaaS application).

Why it's used: This is a multi-tenant architecture. Instead of spinning up an entirely separate database and server for every single customer (which is expensive and hard to maintain), all customers share the same application and database, but their data is strictly segregated.

The security role: The tenant ID ensures that a user belonging to Company A can never view, update, or delete data belonging to Company B, even though their data lives in the same PostgreSQL database tables.

4. The Tenant is the Company/Organization (e.g., Himalaya NeoTech Nepal). It is the master container that holds all your company's data, users, and settings.

The Project is like a Team Workspace, Channel, or Specific App inside that company (like the "orbis" or "rms-frontend" apps you've built).

 Why is a "Project" used?
What it is: A project is a domain-specific resource or entity inside a tenant workspace (defined in your database schema, alongside things like posts or tasks).

Why it's used: It serves as a practical example of a tenant-scoped resource. While a Tenant divides organizations, a Project is the actual item that belongs to that organization.

The architectural role: In your request flow, creating or fetching a Project acts as the test case to prove your security layers work: when you create a project, the system automatically forces it to belong to your active tenant using the AsyncLocalStorage context, ensuring it can never be created orphaned or under the wrong workspace.