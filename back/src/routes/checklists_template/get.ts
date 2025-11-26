import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { TemplateDetails } from '@/models/template';
import { getTemplatesSchema } from '@/schemas/checklists_template';

export const getTemplatesRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  /**
   * GET /templates - Obtener liustado de templates
   * @return Lista de templates de las checklist
   */
  fastify.get<{ Reply: { temps: TemplateDetails[]; total: number } }>(
    '/',
    { schema: getTemplatesSchema },
    async (request, reply) => {
      try {
        const result = await fastify.services.templates.getAllTemplates();
        return reply.send(result);
      } catch (error) {
        fastify.log.error({ error }, 'problemas');
        return reply.internalServerError('problemas');
      }
    }
  );
};
