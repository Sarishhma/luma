import type { FastifyRequest, FastifyReply } from "fastify";
import { ProjectService } from "../service/project.service.js";

export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  getProjects = async (request: FastifyRequest, reply: FastifyReply) => {
    const projects = await this.projectService.getProjects();
    return reply.status(200).send({ success: true, projects });
  };

  createProject = async (request: FastifyRequest<{ Body: { name: string } }>, reply: FastifyReply) => {
    const { name } = request.body;
    const project = await this.projectService.createProject(name);
    return reply.status(201).send({ success: true, project });
  };
}