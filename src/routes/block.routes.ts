import { FastifyInstance } from 'fastify';
import { BlockService } from '../services/block.service';
import { Block } from '../models/block.model';

export async function blockRoutes(fastify: FastifyInstance, pool: any) {
  const blockService = new BlockService(pool);

  fastify.post('/blocks', async (request, reply) => {
    const block: Block = request.body as Block;

    try {
      await blockService.processBlock(block);
      reply.code(200).send({ message: 'Block processed successfully' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.get('/balance/:address', async (request, reply) => {
    const { address } = request.params as { address: string };

    try {
      const balance = await blockService.getBalance(address);

      if (balance === -1) {
        reply.code(404).send({ error: 'Address not found' });
      } else {
        reply.code(200).send({ balance });
      }
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });

  fastify.post('/rollback', async (request, reply) => {
    let { height } = request.query as { height: any };

    try {
      height = parseInt(height, 10);  // Ensure height is parsed as a number

      if (isNaN(height)) {
        throw new Error('Invalid height value. It must be a valid number.');
      }

      await blockService.rollbackToHeight(height);
      reply.code(200).send({ message: 'Rollback successful' });
    } catch (error: any) {
      reply.code(400).send({ error: error.message });
    }
  });
}
