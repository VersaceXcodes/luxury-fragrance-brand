import dotenv from "dotenv";
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

async function migrateUserRole() {
  let client;
  try {
    client = await pool.connect();
    
    console.log('Adding user_role column to users table...');
    
    // Add user_role column if it doesn't exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS user_role VARCHAR(255) NOT NULL DEFAULT 'customer';
    `);
    
    console.log('Column added successfully.');
    
    // Update specific users with their roles
    console.log('Updating user roles...');
    
    await client.query(`
      UPDATE users SET user_role = 'host' WHERE email = 'sarah.thompson@email.com';
    `);
    
    await client.query(`
      UPDATE users SET user_role = 'admin' WHERE email = 'bob.jones@email.com';
    `);
    
    await client.query(`
      UPDATE users SET user_role = 'vip_customer' WHERE email = 'david.brown@email.com';
    `);
    
    console.log('User roles updated successfully.');
    
    // Verify the changes
    const result = await client.query('SELECT email, user_role FROM users ORDER BY user_id;');
    console.log('\nCurrent user roles:');
    console.table(result.rows);
    
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

migrateUserRole().catch(console.error);
