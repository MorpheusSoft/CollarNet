import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno resolviendo backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config(); // Fallback al directorio actual

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
});

// Registrar eventos de conexión para depuración
pool.on('connect', () => {
  // Conexión exitosa del pool
});

pool.on('error', (err) => {
  console.error('[Database] Error crítico en el pool de conexión de PostgreSQL:', err);
});

export default pool;
