import { Pool, PoolConfig } from 'pg';

const myPoolConfig = (): PoolConfig => {
  if (process.env.SCOPE === 'prod') {
    return {
      ssl: true,
      database: process.env.POSTGRES_DATABASE,
      host: process.env.POSTGRES_HOST,
      port: 6543,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    };
  }

  return {
    connectionString: process.env.DATABASE_URL || '',
  }
}

// Este objeto Pool será la conexión a Vercel Postgres o tu BD de desarrollo.
// Lo mantendremos simple para el desarrollo local.
const db = new Pool(myPoolConfig());

export { db };