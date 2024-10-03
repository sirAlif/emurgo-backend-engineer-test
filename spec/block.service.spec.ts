import { BlockService } from '../src/services/block.service';
import { Pool } from 'pg';
import * as hashUtils from '../src/utils/hash'; // Import the hash module

// Manually mock the database Pool and methods
const mockQuery = jest.fn();
const mockConnect = jest.fn(() => ({
  query: mockQuery,
  release: jest.fn(),
}));

// Replace the actual Pool constructor with our mocked implementation
Pool.prototype.connect = mockConnect as any;

describe('BlockService', () => {
  let blockService: BlockService;

  beforeEach(() => {
    const pool = new Pool();
    blockService = new BlockService(pool);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
    jest.restoreAllMocks(); // Restore any spied or mocked functions to their original implementation
  });

  it('should process the first block correctly', async () => {
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

    mockQuery
      .mockResolvedValueOnce({ rows: [{ height: 0 }] }) // Last block height query result
      .mockResolvedValueOnce({ rows: [] }) // Empty input query result
      .mockResolvedValueOnce({}) // Insert block
      .mockResolvedValueOnce({}) // Insert transaction
      .mockResolvedValueOnce({}) // Insert transaction output
      .mockResolvedValueOnce({}); // Update balance

    // Mock calculateBlockHash and spy on its call
    const calculateBlockHashSpy = jest
      .spyOn(hashUtils, 'calculateBlockHash')
      .mockReturnValue(block.id);

    await blockService.processBlock(block);

    // Assertions
    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT height FROM blocks ORDER BY height DESC LIMIT 1'
    );
    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO blocks (id, height) VALUES ($1, $2)',
      [block.id, block.height]
    );
    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO transactions (id, block_id) VALUES ($1, $2)',
      ['tx1', block.id]
    );
    expect(mockQuery).toHaveBeenCalledWith(
      'INSERT INTO transaction_outputs (transaction_id, address, value, index) VALUES ($1, $2, $3, $4)',
      ['tx1', 'addr1', 10, 0]
    );
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['addr1', 10]);
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');

    // Ensure the hash was calculated correctly
    expect(calculateBlockHashSpy).toHaveBeenCalledWith(block);
  });
});
