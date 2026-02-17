const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'admin',
  password: 'admin123',
  database: 'TestIntegrityDb'
});

async function fixDatabase() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    await client.query('ALTER TABLE "user" ALTER COLUMN "role" DROP NOT NULL');
    console.log('✅ Role column is now nullable!');
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fixDatabase();
