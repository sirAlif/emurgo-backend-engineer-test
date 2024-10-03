import Fastify from 'fastify';
import request from 'supertest';
import { blockRoutes } from '../src/routes/block.routes';
import { BlockService } from '../src/services/block.service';

// Manually mock the BlockService methods
const mockProcessBlock = jest.fn();
const mockGetBalance = jest.fn();
const mockRollbackToHeight = jest.fn();

// Replace the actual BlockService methods with our mocked implementations
BlockService.prototype.processBlock = mockProcessBlock as any;
BlockService.prototype.getBalance = mockGetBalance as any;
BlockService.prototype.rollbackToHeight = mockRollbackToHeight as any;

describe('Block Routes', () => {
  let fastify;

  beforeEach(async () => {
    fastify = Fastify();
    const pool = {}; // Mock pool object

    // Register routes
    await fastify.register(blockRoutes, pool);
    await fastify.ready();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /blocks should process a block and return 200', async () => {
    mockProcessBlock.mockResolvedValueOnce(undefined);

    const block = {
      id: 'd1582b9e2cac15e170c39ef2e85855ffd7e6a820550a8ca16a2f016d366503dc',
      height: 1,
      transactions: [
        {
          id: 'tx1',
          inputs: [],
          outputs: [{ address: 'addr1', value: 10 }],
        },
      ],
    };

    const response = await request(fastify.server)
      .post('/blocks')
      .send(block);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Block processed successfully');
    expect(mockProcessBlock).toHaveBeenCalledWith(block);
  });

  it('GET /balance/:address should return the balance for a valid address', async () => {
    mockGetBalance.mockResolvedValueOnce(100);

    const response = await request(fastify.server).get('/balance/addr1');

    expect(response.status).toBe(200);
    expect(response.body.balance).toBe(100);
    expect(mockGetBalance).toHaveBeenCalledWith('addr1');
  });

  it('POST /rollback should rollback to a given height and return 200', async () => {
    mockRollbackToHeight.mockResolvedValueOnce(undefined);

    const response = await request(fastify.server)
      .post('/rollback')
      .query({ height: 2 });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Rollback successful');
    expect(mockRollbackToHeight).toHaveBeenCalledWith(2);
  });
});
