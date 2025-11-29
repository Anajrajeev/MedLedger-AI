#!/usr/bin/env node
/**
 * MedLedger AI - Database Migration Script
 * 
 * Adds new blockchain-related columns to the access_requests table:
 * - validator_hash: Aiken validator script hash
 * - validator_address: Validator address on Cardano
 * - cardano_network: Network used (preprod, mainnet)
 * 
 * Usage:
 *   node scripts/migrate-blockchain-columns.js
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  console.log('Please set DATABASE_URL in .env.local');
  process.exit(1);
}

async function migrate() {
  console.log('🔄 MedLedger AI - Database Migration');
  console.log('━'.repeat(50));
  console.log('Adding blockchain columns to access_requests table...\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    // Check connection
    const client = await pool.connect();
    console.log('✓ Connected to database');

    // Check if columns already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'access_requests'
        AND column_name IN ('validator_hash', 'validator_address', 'cardano_network');
    `;
    
    const existingColumns = await client.query(checkQuery);
    const existing = existingColumns.rows.map(r => r.column_name);
    
    console.log(`\nExisting columns: ${existing.length > 0 ? existing.join(', ') : 'none'}`);

    // Add missing columns
    const migrations = [
      {
        column: 'validator_hash',
        sql: `ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS validator_hash TEXT;`,
        description: 'Aiken validator script hash',
      },
      {
        column: 'validator_address',
        sql: `ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS validator_address TEXT;`,
        description: 'Validator address on Cardano',
      },
      {
        column: 'cardano_network',
        sql: `ALTER TABLE public.access_requests ADD COLUMN IF NOT EXISTS cardano_network TEXT DEFAULT 'preprod';`,
        description: 'Cardano network (preprod/mainnet)',
      },
    ];

    for (const migration of migrations) {
      if (!existing.includes(migration.column)) {
        console.log(`\n→ Adding column: ${migration.column}`);
        console.log(`  Description: ${migration.description}`);
        await client.query(migration.sql);
        console.log(`  ✓ Column added successfully`);
      } else {
        console.log(`\n→ Column ${migration.column} already exists, skipping`);
      }
    }

    // Verify all columns exist
    const verifyQuery = `
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'access_requests'
        AND column_name IN ('midnight_tx', 'zk_proof_hash', 'aiken_tx', 'validator_hash', 'validator_address', 'cardano_network')
      ORDER BY column_name;
    `;
    
    const verifyResult = await client.query(verifyQuery);
    
    console.log('\n' + '━'.repeat(50));
    console.log('Blockchain columns in access_requests table:');
    console.log('━'.repeat(50));
    
    for (const row of verifyResult.rows) {
      console.log(`  ${row.column_name}: ${row.data_type}${row.column_default ? ` (default: ${row.column_default})` : ''}`);
    }

    client.release();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nThe following columns are now available:');
    console.log('  - midnight_tx: Midnight blockchain transaction ID');
    console.log('  - zk_proof_hash: ZK proof hash from Midnight');
    console.log('  - aiken_tx: Cardano transaction hash');
    console.log('  - validator_hash: Aiken validator script hash');
    console.log('  - validator_address: Validator address on Cardano');
    console.log('  - cardano_network: Network used (preprod by default)');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('\nCould not connect to database. Check your DATABASE_URL.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();

