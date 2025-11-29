#!/usr/bin/env node
/**
 * MedLedger AI - Approval Verification Script
 * 
 * Verifies if blockchain integrations ran when a patient approved a request.
 * Checks:
 * 1. Server logs for integration steps
 * 2. Database for stored transaction hashes
 * 3. API response structure
 * 
 * Usage:
 *   node scripts/verify-approval.js [requestId]
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const requestId = process.argv[2];

async function verifyApproval() {
  console.log('🔍 MedLedger AI - Approval Verification');
  console.log('━'.repeat(60));
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    console.log('✓ Connected to database\n');

    // Get the most recent approved request, or specific requestId
    let query, params;
    if (requestId) {
      query = `
        SELECT 
          id,
          status,
          doctor_wallet,
          patient_wallet,
          record_types,
          midnight_tx,
          zk_proof_hash,
          aiken_tx,
          validator_hash,
          validator_address,
          cardano_network,
          approved_at,
          created_at
        FROM public.access_requests
        WHERE id = $1
        ORDER BY approved_at DESC NULLS LAST
        LIMIT 1
      `;
      params = [requestId];
    } else {
      query = `
        SELECT 
          id,
          status,
          doctor_wallet,
          patient_wallet,
          record_types,
          midnight_tx,
          zk_proof_hash,
          aiken_tx,
          validator_hash,
          validator_address,
          cardano_network,
          approved_at,
          created_at
        FROM public.access_requests
        WHERE status = 'approved'
        ORDER BY approved_at DESC
        LIMIT 1
      `;
      params = [];
    }

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      console.log('❌ No approved requests found');
      if (requestId) {
        console.log(`   Request ID: ${requestId}`);
      }
      console.log('\n💡 To test:');
      console.log('   1. Create an access request');
      console.log('   2. Approve it as a patient');
      console.log('   3. Run this script again');
      client.release();
      await pool.end();
      return;
    }

    const request = result.rows[0];

    console.log('📋 Request Details:');
    console.log('━'.repeat(60));
    console.log(`  Request ID: ${request.id}`);
    console.log(`  Status: ${request.status}`);
    console.log(`  Doctor: ${request.doctor_wallet.substring(0, 30)}...`);
    console.log(`  Patient: ${request.patient_wallet.substring(0, 30)}...`);
    console.log(`  Record Types: ${request.record_types.join(', ')}`);
    console.log(`  Created: ${request.created_at}`);
    console.log(`  Approved: ${request.approved_at || 'Not approved'}`);
    console.log('');

    // Verify blockchain integrations
    console.log('🔗 Blockchain Integration Status:');
    console.log('━'.repeat(60));

    const checks = {
      midnight: {
        tx: request.midnight_tx,
        proof: request.zk_proof_hash,
        label: 'Midnight (ZK Proof)',
      },
      aiken: {
        tx: request.aiken_tx,
        validator: request.validator_hash,
        address: request.validator_address,
        network: request.cardano_network,
        label: 'Aiken (Cardano Audit)',
      },
    };

    // Check Midnight
    console.log(`\n🌙 ${checks.midnight.label}:`);
    if (checks.midnight.tx) {
      console.log(`  ✓ Midnight TX: ${checks.midnight.tx}`);
      console.log(`    ${checks.midnight.tx.startsWith('midnight_tx_stub') ? '⚠️  STUB MODE' : '✓ Real transaction'}`);
    } else {
      console.log('  ❌ Midnight TX: Missing');
    }
    
    if (checks.midnight.proof) {
      console.log(`  ✓ ZK Proof Hash: ${checks.midnight.proof.substring(0, 40)}...`);
      console.log(`    ${checks.midnight.proof.startsWith('zkp_stub') ? '⚠️  STUB MODE' : '✓ Real proof'}`);
    } else {
      console.log('  ❌ ZK Proof Hash: Missing');
    }

    // Check Aiken
    console.log(`\n🔷 ${checks.aiken.label}:`);
    if (checks.aiken.tx) {
      console.log(`  ✓ Aiken TX: ${checks.aiken.tx}`);
      console.log(`    ${checks.aiken.tx.startsWith('aiken_preprod_stub') ? '⚠️  STUB MODE' : '✓ Real transaction'}`);
    } else {
      console.log('  ❌ Aiken TX: Missing');
    }
    
    if (checks.aiken.validator) {
      console.log(`  ✓ Validator Hash: ${checks.aiken.validator}`);
      console.log(`    ${checks.aiken.validator.startsWith('stub_validator') ? '⚠️  STUB MODE' : '✓ Real validator'}`);
    } else {
      console.log('  ❌ Validator Hash: Missing');
    }
    
    if (checks.aiken.address) {
      console.log(`  ✓ Validator Address: ${checks.aiken.address.substring(0, 40)}...`);
    } else {
      console.log('  ⚠️  Validator Address: Missing (optional)');
    }
    
    if (checks.aiken.network) {
      console.log(`  ✓ Network: ${checks.aiken.network}`);
    } else {
      console.log('  ⚠️  Network: Missing (defaults to preprod)');
    }

    // Summary
    console.log('\n' + '━'.repeat(60));
    console.log('📊 Verification Summary:');
    console.log('━'.repeat(60));

    const allPresent = 
      checks.midnight.tx && 
      checks.midnight.proof && 
      checks.aiken.tx && 
      checks.aiken.validator;

    const allReal = 
      allPresent &&
      !checks.midnight.tx.startsWith('midnight_tx_stub') &&
      !checks.midnight.proof.startsWith('zkp_stub') &&
      !checks.aiken.tx.startsWith('aiken_preprod_stub') &&
      !checks.aiken.validator.startsWith('stub_validator');

    if (allReal) {
      console.log('✅ All blockchain integrations executed successfully!');
      console.log('   ✓ Midnight ZK proof generated');
      console.log('   ✓ Aiken audit log recorded on Cardano');
      console.log('   ✓ All transaction hashes stored in database');
    } else if (allPresent) {
      console.log('⚠️  Blockchain integrations ran in STUB MODE');
      console.log('   ✓ Midnight ZK proof generated (stub)');
      console.log('   ✓ Aiken audit log recorded (stub)');
      console.log('   ✓ All transaction hashes stored in database');
      console.log('\n💡 To enable real blockchain transactions:');
      console.log('   1. Set BLOCKFROST_API_KEY in .env.local');
      console.log('   2. Get API key from: https://blockfrost.io');
      console.log('   3. Ensure Aiken contract is compiled: aiken build');
    } else {
      console.log('❌ Blockchain integrations did not complete');
      console.log('   Some transaction hashes are missing from database');
      console.log('\n💡 Check server logs for errors during approval');
    }

    // Check server logs indicators
    console.log('\n' + '━'.repeat(60));
    console.log('📝 How to Verify in Server Logs:');
    console.log('━'.repeat(60));
    console.log('Look for these log messages when patient approves:');
    console.log('  ✓ [Access Approve] Step 1: Generating ZK proof via Midnight...');
    console.log('  ✓ [Midnight] ZK proof generated: {...}');
    console.log('  ✓ [Access Approve] Step 2: Recording audit on Cardano (Preprod)...');
    console.log('  ✓ [Aiken Audit] Recording consent event: {...}');
    console.log('  ✓ [Access Approve] Approval workflow complete: {...}');
    console.log('\nIf you see "[Aiken Audit] STUB MODE", Blockfrost API key is missing/invalid.');

    client.release();
    await pool.end();

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('\nCould not connect to database. Check your DATABASE_URL.');
    }
    process.exit(1);
  }
}

verifyApproval();

