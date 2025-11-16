import { Pool } from 'pg';

// Este objeto Pool será la conexión a Vercel Postgres o tu BD de desarrollo.
// Lo mantendremos simple para el desarrollo local.
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export { db };