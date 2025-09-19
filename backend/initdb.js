import dotenv from "dotenv";
import fs from "fs";
import pg from 'pg';
const { Pool } = pg;

dotenv.config();

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);


async function initDb() {
  const client = await pool.connect();
  try {
    // Read and split SQL commands
    const dbInitCommands = fs
      .readFileSync(`./db.sql`, "utf-8")
      .toString()
      .split(/(?=CREATE TABLE |INSERT INTO)/);

    // Execute each command individually (no transaction for better error handling)
    for (let cmd of dbInitCommands) {
      // Skip empty commands and comments
      if (cmd.trim() === '' || cmd.trim().startsWith('--')) {
        continue;
      }
      
      try {
        await client.query(cmd);
      } catch (error) {
        // Skip duplicate key errors for INSERT statements silently
        if (error.code === '23505' && cmd.trim().startsWith('INSERT')) {
          // Silently skip duplicate insertions - this is expected behavior
          continue;
        }
        console.error('Error executing command:', error.message);
        throw error;
      }
    }

    console.log('Database initialization completed successfully');
  } catch (e) {
    console.error('Database initialization failed:', e);
    throw e;
  } finally {
    // Release client back to pool
    client.release();
  }
}

// Execute initialization
initDb().catch(console.error);
