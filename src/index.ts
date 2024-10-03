import { Pool } from 'pg';
import { DatabaseSetup } from './database/setup';
import { buildApp } from './app';
import { dbConfig, webServerConfig } from './config';

const pool = new Pool({
  connectionString: `postgres://${dbConfig.user}:${dbConfig.password}@db:${dbConfig.port}/${dbConfig.database}`
});

const fastify = buildApp(pool);

const start = async () => {
  try {
    const databaseSetup = new DatabaseSetup(pool);
    await databaseSetup.initializeDatabase();

    await fastify.listen({
      host: webServerConfig.host,
      port: webServerConfig.port
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

await start();
