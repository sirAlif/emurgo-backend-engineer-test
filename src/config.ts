import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'blockchain_db',
  user: process.env.DB_USER || 'youruser',
  password: process.env.DB_PASSWORD || 'yourpassword'
};

export const webServerConfig = {
  host: process.env.WEB_SERVER_HOST || '0.0.0.0',
  port:parseInt(process.env.WEB_SERVER_PORT || '3000', 10),
};
