import { Pool } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';

const getSSLConfig = () => {
    if (isProduction) {
        return { rejectUnauthorized: false };
    } 
    return false;
}

// Este objeto Pool será la conexión a Vercel Postgres o tu BD de desarrollo.
// Lo mantendremos simple para el desarrollo local.
const db = new Pool({
      ssl: getSSLConfig(),
      database: process.env.POSTGRES_DATABASE,
      host: process.env.POSTGRES_HOST,
      port: 6543,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });

export { db };