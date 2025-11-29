#!/usr/bin/env node
/**
 * MedLedger AI - Blockfrost & Aiken Integration Test
 * 
 * Tests:
 * 1. Blockfrost API connection
 * 2. Aiken validator loading
 * 3. Lucid initialization
 * 4. Transaction building (without submitting)
 * 
 * Usage:
 *   node scripts/test-blockfrost-aiken.js
 */

require('dotenv').config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logStep(num, message) {
  log(`\n[${num}] ${message}`, colors.cyan);
}

/**
 * Test 1: Blockfrost API Connection
 */
async function testBlockfrostConnection() {
  logStep(1, 'Testing Blockfrost API Connection');
  
  const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY;
  const BLOCKFROST_URL = process.env.BLOCKFROST_API_URL || 'https://cardano-preprod.blockfrost.io/api';

  if (!BLOCKFROST_API_KEY) {
    logError('BLOCKFROST_API_KEY not set in .env.local');
    return false;
  }

  logInfo(`API Key: ${BLOCKFROST_API_KEY.substring(0, 15)}...`);
  logInfo(`URL: ${BLOCKFROST_URL}`);

  try {
    // Test 1: Get latest block
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${BLOCKFROST_URL}/v0/blocks/latest`, {
      headers: {
        'project_id': BLOCKFROST_API_KEY,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      logError(`Blockfrost API returned ${response.status}`);
      logError(`Response: ${text.substring(0, 200)}`);
      return false;
    }

    const data = await response.json();
    logSuccess('Blockfrost API connection successful!');
    logInfo(`Latest block: ${data.height || data.block_height || 'unknown'}`);
    logInfo(`Slot: ${data.slot || 'unknown'}`);
    
    return true;
  } catch (error) {
    logError(`Blockfrost connection failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Aiken Validator Loading
 */
async function testAikenValidator() {
  logStep(2, 'Testing Aiken Validator Loading');

  try {
    const fs = require('fs');
    const path = require('path');
    
    const validatorPath = path.join(process.cwd(), 'contracts/aiken/access_request_validator/plutus.json');
    
    if (!fs.existsSync(validatorPath)) {
      logError('plutus.json not found');
      logWarning('Run: cd contracts/aiken/access_request_validator && aiken build');
      return false;
    }

    const validatorData = JSON.parse(fs.readFileSync(validatorPath, 'utf-8'));
    
    logSuccess('Validator file found');
    logInfo(`Title: ${validatorData.preamble.title}`);
    logInfo(`Version: ${validatorData.preamble.version}`);
    logInfo(`Plutus Version: ${validatorData.preamble.plutusVersion}`);
    
    const validator = validatorData.validators[0];
    if (!validator || !validator.compiledCode) {
      logError('Validator not compiled properly');
      return false;
    }

    logSuccess('Validator compiled successfully');
    logInfo(`Script Hash: ${validator.hash}`);
    logInfo(`Compiled Code Length: ${validator.compiledCode.length} chars`);
    
    return { hash: validator.hash, compiledCode: validator.compiledCode };
  } catch (error) {
    logError(`Validator loading failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Lucid Initialization
 */
async function testLucidInitialization() {
  logStep(3, 'Testing Lucid Initialization');

  try {
    // Import Lucid dynamically
    const { Blockfrost, Lucid } = await import('lucid-cardano');
    
    const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY;
    const BLOCKFROST_URL = process.env.BLOCKFROST_API_URL || 'https://cardano-preprod.blockfrost.io/api/v0';

    logInfo(`Initializing Lucid with Blockfrost...`);
    logInfo(`URL: ${BLOCKFROST_URL}`);

    const provider = new Blockfrost(BLOCKFROST_URL, BLOCKFROST_API_KEY);
    const lucid = await Lucid.new(provider, 'Preprod');

    logSuccess('Lucid initialized successfully!');
    logInfo(`Network: Preprod Testnet`);
    
    return lucid;
  } catch (error) {
    logError(`Lucid initialization failed: ${error.message}`);
    logError(`Stack: ${error.stack}`);
    return false;
  }
}

/**
 * Test 4: Validator Address Computation
 */
async function testValidatorAddress(lucid, validatorData) {
  logStep(4, 'Testing Validator Address Computation');

  try {
    if (!lucid || !validatorData) {
      logWarning('Skipping (previous tests failed)');
      return false;
    }

    const script = {
      type: 'PlutusV2',
      script: validatorData.compiledCode,
    };

    const validatorAddress = lucid.utils.validatorToAddress(script);

    logSuccess('Validator address computed!');
    logInfo(`Address: ${validatorAddress}`);
    logInfo(`Script Hash: ${validatorData.hash}`);
    
    // Verify it's a valid Preprod address
    if (!validatorAddress.startsWith('addr_test1')) {
      logWarning('Address does not start with addr_test1 (expected for Preprod)');
      return false;
    }

    logSuccess('Validator address is valid Preprod address');
    return validatorAddress;
  } catch (error) {
    logError(`Validator address computation failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Query Validator UTxOs
 */
async function testQueryValidatorUtxos(lucid, validatorAddress) {
  logStep(5, 'Testing Validator UTxO Query');

  try {
    if (!lucid || !validatorAddress) {
      logWarning('Skipping (previous tests failed)');
      return false;
    }

    logInfo(`Querying UTxOs at: ${validatorAddress}`);
    const utxos = await lucid.utxosAt(validatorAddress);

    logSuccess('UTxO query successful!');
    logInfo(`Found ${utxos.length} UTxO(s) at validator address`);
    
    if (utxos.length === 0) {
      logInfo('No UTxOs yet (expected for new validator)');
    } else {
      logInfo(`Total ADA locked: ${utxos.reduce((sum, utxo) => sum + (utxo.assets.lovelace || 0n), 0n) / 1_000_000n} ADA`);
    }

    return true;
  } catch (error) {
    logError(`UTxO query failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 6: Datum Serialization
 */
async function testDatumSerialization() {
  logStep(6, 'Testing Datum Serialization');

  try {
    const { Data } = await import('lucid-cardano');
    
    // Define schema
    const ConsentDatumSchema = Data.Object({
      doctorPkh: Data.Bytes(),
      patientPkh: Data.Bytes(),
      approved: Data.Boolean(),
      timestamp: Data.Integer(),
      zkProofHash: Data.Bytes(),
      requestId: Data.Bytes(),
    });

    // Test data
    const testDatum = {
      doctorPkh: '0'.repeat(56), // 28-byte hex
      patientPkh: '1'.repeat(56), // 28-byte hex
      approved: true,
      timestamp: BigInt(Date.now()),
      zkProofHash: '2'.repeat(64), // 32-byte hex
      requestId: '3'.repeat(32), // 16-byte hex (UUID without dashes)
    };

    const serialized = Data.to(testDatum, ConsentDatumSchema);

    logSuccess('Datum serialization successful!');
    logInfo(`Serialized length: ${serialized.length} chars`);
    logInfo(`Serialized (first 100 chars): ${serialized.substring(0, 100)}...`);

    return true;
  } catch (error) {
    logError(`Datum serialization failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n' + '='.repeat(70), colors.bright);
  log(' MedLedger AI - Blockfrost & Aiken Integration Test', colors.bright);
  log('='.repeat(70) + '\n', colors.bright);

  const results = {
    blockfrost: false,
    validator: false,
    lucid: false,
    address: false,
    utxos: false,
    datum: false,
  };

  try {
    // Test 1: Blockfrost
    results.blockfrost = await testBlockfrostConnection();
    
    // Test 2: Validator
    const validatorData = await testAikenValidator();
    results.validator = !!validatorData;

    // Test 3: Lucid
    const lucid = await testLucidInitialization();
    results.lucid = !!lucid;

    // Test 4: Validator Address
    const validatorAddress = await testValidatorAddress(lucid, validatorData);
    results.address = !!validatorAddress;

    // Test 5: Query UTxOs
    results.utxos = await testQueryValidatorUtxos(lucid, validatorAddress);

    // Test 6: Datum Serialization
    results.datum = await testDatumSerialization();

  } catch (error) {
    logError(`Test suite error: ${error.message}`);
  }

  // Summary
  log('\n' + '='.repeat(70), colors.bright);
  log(' Test Summary', colors.bright);
  log('='.repeat(70), colors.bright);

  const tests = [
    ['Blockfrost API Connection', results.blockfrost],
    ['Aiken Validator Loading', results.validator],
    ['Lucid Initialization', results.lucid],
    ['Validator Address Computation', results.address],
    ['Validator UTxO Query', results.utxos],
    ['Datum Serialization', results.datum],
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, result] of tests) {
    if (result) {
      log(`  ✅ ${name}`, colors.green);
      passed++;
    } else {
      log(`  ❌ ${name}`, colors.red);
      failed++;
    }
  }

  log('\n' + '-'.repeat(70));
  log(`Total: ${passed} passed, ${failed} failed`, passed === tests.length ? colors.green : colors.yellow);

  if (passed === tests.length) {
    log('\n🎉 All tests passed! Aiken integration is ready!', colors.green);
    log('\n📝 Next steps:', colors.blue);
    log('  1. The validator is compiled and ready');
    log('  2. Blockfrost connection is working');
    log('  3. To submit real transactions, implement wallet signing (CIP-30)');
    log('  4. Use submitRealConsentTransaction() with a connected wallet');
  } else {
    log('\n⚠️  Some tests failed. Check the output above for details.', colors.yellow);
  }

  log('\n');
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);

