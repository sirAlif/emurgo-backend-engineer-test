import { Pool } from 'pg';
import { Block } from '../models/block.model';
import { calculateBlockHash } from '../utils/hash';

export class BlockService {
  constructor(private pool: Pool) {}

  async processBlock(block: Block): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate block height
      const { rows: lastBlockRows } = await client.query(
        'SELECT height FROM blocks ORDER BY height DESC LIMIT 1'
      );
      const lastHeight = lastBlockRows.length ? lastBlockRows[0].height : 0;
      if (block.height !== lastHeight + 1) {
        throw new Error(`Block height must be ${lastHeight + 1}`);
      }

      let inputSum = 0;
      let outputSum = 0;

      for (const tx of block.transactions) {
        // Skip input/output balance validation for blocks with no inputs (e.g., coinbase transactions)
        if (tx.inputs.length === 0 && lastHeight === 0) {
          // Allow the first block or coinbase transactions
          continue;
        }

        // Validate inputs/outputs balance
        for (const input of tx.inputs) {
          const { rows: inputRows } = await client.query(
            `SELECT value, address FROM transaction_outputs
             WHERE transaction_id = $1 AND index = $2`,
            [input.txId, input.index]
          );

          if (inputRows.length === 0) {
            throw new Error(`Input transaction ${input.txId} not found`);
          }
          inputSum += Number(inputRows[0].value);
        }

        for (const output of tx.outputs) {
          outputSum += Number(output.value);
        }

        if (inputSum !== outputSum) {
          console.log(`Input Sum: ${inputSum}, Output Sum: ${outputSum}`);
          throw new Error('Input/output value mismatch');
        }
      }

      // Validate block hash
      const calculatedHash = calculateBlockHash(block);
      if (block.id !== calculatedHash) {
        console.log(`Calculated Hash: ${calculatedHash}, Provided Hash: ${block.id}`);
        throw new Error('Invalid block ID');
      }

      // Insert block
      await client.query('INSERT INTO blocks (id, height) VALUES ($1, $2)', [
        block.id,
        block.height,
      ]);

      // Insert transactions and update balances
      for (const tx of block.transactions) {
        await client.query(
          'INSERT INTO transactions (id, block_id) VALUES ($1, $2)',
          [tx.id, block.id]
        );

        for (const [index, output] of tx.outputs.entries()) {
          await client.query(
            'INSERT INTO transaction_outputs (transaction_id, address, value, index) VALUES ($1, $2, $3, $4)',
            [tx.id, output.address, output.value, index] // Insert transaction output details
          );

          // Update the balance for the address
          await this.updateBalance(client, output.address, output.value);
        }

        for (const input of tx.inputs) {
          // Check if input transaction is valid
          const { rows } = await client.query(
            'SELECT value, address FROM transaction_outputs WHERE transaction_id = $1 AND index = $2',
            [input.txId, input.index] // Query from the outputs table
          );

          if (rows.length === 0) {
            throw new Error(`Input transaction ${input.txId} not found`);
          }

          // Get the information of the output from the previous transaction
          const inputValue = rows[0].value;
          const address = rows[0].address;

          await client.query(
            'INSERT INTO transaction_inputs (transaction_id, base_transaction_id, index) VALUES ($1, $2, $3)',
            [tx.id, input.txId, input.index] // Insert transaction input details
          );

          await this.updateBalance(client, address, -inputValue);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getBalance(address: string): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT balance FROM balances WHERE address = $1',
      [address]
    );

    if (rows.length === 0) {
      return -1;
    }
    return parseFloat(rows[0].balance);
  }

  async rollbackToHeight(height: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get the current height
      const currentHeight = (await this.getCurrentHeight());

      // Validate height input
      if (height < 0) {
        throw new Error('Height must be a non-negative number.');
      }
      if (height > currentHeight) {
        throw new Error(`Height cannot be greater than the current height (${currentHeight}).`);
      }
      if (height === currentHeight) {
        throw new Error('No rollback needed. Already at the specified height.');
      }
      if (currentHeight - height > 2000) {
        throw new Error('Rollback distance cannot exceed 2000 blocks.');
      }

      // Special case: If height = 0, delete everything and go to the initial state
      if (height === 0) {
        await client.query('DELETE FROM blocks');
        await client.query('DELETE FROM balances');
        await client.query('COMMIT');
        return; // Bypass the rest of the function
      }

      // Get blocks that need to be reverted
      const { rows: blockRows } = await client.query(
        'SELECT id FROM blocks WHERE height > $1 ORDER BY height DESC',
        [height]
      );

      for (const block of blockRows) {
        const { rows: txRows } = await client.query(
          'SELECT id FROM transactions WHERE block_id = $1',
          [block.id]
        );

        // Revert all transactions for each block
        for (const tx of txRows) {
          await this.revertTransaction(client, tx.id);
        }

        // Delete the block after reverting its transactions
        await client.query('DELETE FROM blocks WHERE id = $1', [block.id]);
      }

      // Commit the rollback
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getCurrentHeight(): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT height FROM blocks ORDER BY height DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return 0; // No blocks exist, so height is 0
    }

    return rows[0].height;
  }

  private async revertTransaction(client: Pool, txId: string): Promise<void> {
    // Get the outputs and inputs from the transaction to revert balances
    const { rows: outputRows } = await client.query(
      'SELECT address, value FROM transaction_outputs WHERE transaction_id = $1',
      [txId]
    );

    for (const output of outputRows) {
      // Subtract the output value from the balance
      await this.updateBalance(client, output.address, -output.value);
    }

    const { rows: inputRows } = await client.query(
      'SELECT txo.address, txo.value FROM transaction_inputs txi ' +
      'JOIN transaction_outputs txo ON txi.base_transaction_id = txo.transaction_id AND txi.index = txo.index ' +
      'WHERE txi.transaction_id = $1',
      [txId]
    );

    for (const input of inputRows) {
      // Add the input value back to the balance
      await this.updateBalance(client, input.address, Number(input.value));
    }

    // Delete the transaction after reverting its balances
    await client.query('DELETE FROM transactions WHERE id = $1', [txId]);
  }

  private async updateBalance(client: Pool, address: string, value: number): Promise<void> {
    await client.query(
      `INSERT INTO balances (address, balance)
       VALUES ($1, $2)
       ON CONFLICT (address)
       DO UPDATE SET balance = balances.balance + $2`,
      [address, value]
    );
  }
}
