import type { TenantRole } from "../generated/prisma/enums.ts";
import type { PrismaClient } from "../generated/prisma/client.ts";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { JWT } from "@fastify/jwt";
import type { AccessTokenPayload } from "../utils/token.ts";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;

    jwt: JWT;

    googleOAuth2: {
      getAccessTokenFromAuthorizationCodeFlow: (
        request: FastifyRequest,
        reply?: FastifyReply
      ) => Promise<{
        token: {
          access_token: string;
        };
      }>;
    };
  }

  interface FastifyRequest {
    user?: AccessTokenPayload;

    tenantContext?: {
      tenantId: string;
      role: TenantRole;
    };
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}


//What this actually does: declare module "fastify" tells TypeScript "I want to add extra properties to this 
// existing library's types." We're saying: every FastifyRequest object now optionally has a .user field, typed as your
//  AccessTokenPayload (remember, that's { sub: string; email: string } from token.ts). Without this,
//  writing request.user = ... anywhere would be a TypeScript error — "Property 'user' does not exist on type FastifyRequest