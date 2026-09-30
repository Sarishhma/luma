import type { FastifyReply, FastifyRequest } from "fastify";
import { ProjectService } from "../service/project.service.js";
import type { CreateProjectInput } from "../schema/project.schema.js";

export class ProjectController {
  private readonly service = new ProjectService();

  list = async (_request: FastifyRequest, reply: FastifyReply) => {
    const projects = await this.service.list();
    return reply.status(200).send({ projects });
  };

  get = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const project = await this.service.getById(request.params.id);
    return reply.status(200).send({ project });
  };

  create = async (request: FastifyRequest<{ Body: CreateProjectInput }>, reply: FastifyReply) => {
    const project = await this.service.create(request.body.name);
    return reply.status(201).send({ project });
  };

  remove = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.delete(request.params.id);
    return reply.status(204).send();
  };
}
