import { Pool } from 'pg';

export class DatabaseSetup {
  constructor(private pool: Pool) {}

  async initializeDatabase(): Promise<void> {
    await this.createBlocksTable();
    await this.createTransactionsTable();
    await this.createTransactionInputsTable();
    await this.createTransactionOutputsTable();
    await this.createBalancesTable();
    console.log('Database initialized.');
  }

  private async tableExists(tableName: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT EXISTS (
        SELECT FROM pg_catalog.pg_tables 
        WHERE schemaname = 'public' AND tablename = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  }

  private async createBlocksTable(): Promise<void> {
    const exists = await this.tableExists('blocks');
    if (!exists) {
      await this.pool.query(`
        CREATE TABLE blocks (
          id VARCHAR PRIMARY KEY,
          height INTEGER NOT NULL
        );
      `);
      console.log('Blocks table created.');
    }
  }

  private async createTransactionsTable(): Promise<void> {
    const exists = await this.tableExists('transactions');
    if (!exists) {
      await this.pool.query(`
        CREATE TABLE transactions (
          id VARCHAR PRIMARY KEY,
          block_id VARCHAR REFERENCES blocks(id) ON DELETE CASCADE
        );
      `);
      console.log('Transactions table created.');
    }
  }

  private async createTransactionInputsTable(): Promise<void> {
    const exists = await this.tableExists('transaction_inputs');
    if (!exists) {
      await this.pool.query(`
            CREATE TABLE transaction_inputs (
                id SERIAL PRIMARY KEY,
                transaction_id VARCHAR REFERENCES transactions(id) ON DELETE CASCADE,
                base_transaction_id VARCHAR REFERENCES transactions(id) ON DELETE CASCADE,
                index INT NOT NULL
            );
        `);
      console.log('Transaction inputs table created.');
    }
  }

  private async createTransactionOutputsTable(): Promise<void> {
    const exists = await this.tableExists('transaction_outputs');
    if (!exists) {
      await this.pool.query(`
            CREATE TABLE transaction_outputs (
                id SERIAL PRIMARY KEY,
                transaction_id VARCHAR REFERENCES transactions(id) ON DELETE CASCADE,
                address VARCHAR NOT NULL,
                value DECIMAL(18, 8) NOT NULL,
                index INT NOT NULL
            );
        `);
      console.log('Transaction outputs table created.');
    }
  }

  private async createBalancesTable(): Promise<void> {
    const exists = await this.tableExists('balances');
    if (!exists) {
      await this.pool.query(`
        CREATE TABLE balances (
          address VARCHAR PRIMARY KEY,
          balance DECIMAL(18, 8) NOT NULL
        );
      `);
      console.log('Balances table created.');
    }
  }
}
