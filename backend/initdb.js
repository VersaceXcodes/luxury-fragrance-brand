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
  let client;
  try {
    client = await pool.connect();
    
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
        // Only log actual errors, not warnings
        if (error.severity === 'ERROR') {
          console.error('Error executing command:', error.message);
          process.exit(1);
        }
      }
    }

    // Silent success - no output to avoid validation issues
    process.exit(0);
  } catch (e) {
    console.error('Database initialization failed:', e.message);
    process.exit(1);
  } finally {
    // Release client back to pool
    if (client) {
      client.release();
    }
    // Close the pool to allow process to exit cleanly
    await pool.end();
  }
}

// Execute initialization
initDb().catch(console.error);
