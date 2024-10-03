import Fastify from 'fastify';
import { blockRoutes } from './routes/block.routes';

export function buildApp(pool: any) {
  const fastify = Fastify({ logger: true });
  fastify.register(blockRoutes, pool);
  return fastify;
}
