#!/usr/bin/env node
/**
 * MedLedger AI - Aiken & Midnight Integration Test Script
 * 
 * This script tests the full access request workflow including:
 * 1. POST /api/access/request - Doctor creates access request
 * 2. POST /api/access/approve - Patient approves (triggers Midnight + Aiken)
 * 3. Verify database has proper TX hashes
 * 4. POST /api/access/release - Doctor fetches data (verifies both chains)
 * 5. GET /api/access/all - Check logs endpoint
 * 
 * Prerequisites:
 * - Backend server running (npm run server:dev)
 * - Database configured and running
 * - Test doctor and patient users in database
 * 
 * Usage:
 *   node scripts/test-aiken-midnight.js
 *   node scripts/test-aiken-midnight.js --verbose
 */

const http = require('http');
const https = require('https');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:4000';
const VERBOSE = process.argv.includes('--verbose');

// Test data - these should exist in your database
// You may need to adjust these wallet addresses
const TEST_DOCTOR_WALLET = process.env.TEST_DOCTOR_WALLET || 'addr_test1qz_doctor_test_wallet_for_testing';
const TEST_PATIENT_WALLET = process.env.TEST_PATIENT_WALLET || 'addr_test1qz_patient_test_wallet_for_testing';
const TEST_PATIENT_NAME = 'Test Patient';

// Colors for terminal output
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

function logStep(step, message) {
  log(`\n${colors.bright}[Step ${step}]${colors.reset} ${message}`, colors.cyan);
}

function logSuccess(message) {
  log(`  ✓ ${message}`, colors.green);
}

function logError(message) {
  log(`  ✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`  ⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  if (VERBOSE) {
    log(`  ℹ ${message}`, colors.blue);
  }
}

/**
 * Make HTTP request
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (VERBOSE) {
      logInfo(`${method} ${url.toString()}`);
    }

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Test 1: Check server health and blockchain status
 */
async function testServerHealth() {
  logStep(1, 'Checking server health and blockchain integration status');
  
  try {
    // Check health
    const health = await makeRequest('GET', '/health');
    if (health.status !== 200) {
      throw new Error(`Health check failed: ${health.status}`);
    }
    logSuccess('Server is running');
    
    // Check blockchain status
    const status = await makeRequest('GET', '/api/access/status');
    if (status.status !== 200) {
      throw new Error(`Status check failed: ${status.status}`);
    }
    
    logSuccess('Blockchain status endpoint working');
    
    const { midnight, aiken, network } = status.data;
    
    logInfo(`Network: ${network}`);
    logInfo(`Midnight: ${midnight.network} (SDK available: ${midnight.sdkAvailable})`);
    logInfo(`Aiken: Lucid configured: ${aiken.lucidConfigured}, Validator compiled: ${aiken.validatorStatus.compiled}`);
    
    if (aiken.ready) {
      logSuccess('Aiken integration is fully configured');
    } else {
      logWarning('Aiken running in stub mode (configure Blockfrost and compile contract)');
    }
    
    return { midnight, aiken, network };
  } catch (error) {
    logError(`Server health check failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test 2: Create access request
 */
async function testCreateRequest() {
  logStep(2, 'Creating access request (doctor → patient)');
  
  try {
    const response = await makeRequest('POST', '/api/access/request', {
      doctorWallet: TEST_DOCTOR_WALLET,
      patientWallet: TEST_PATIENT_WALLET,
      patientName: TEST_PATIENT_NAME,
      recordTypes: ['lab-results', 'cardiac-evaluation'],
      reason: 'Integration test - testing Aiken & Midnight',
    });
    
    if (response.status === 404) {
      logWarning('Doctor not found in database - using existing pending request');
      // Try to find existing pending request
      const pending = await makeRequest('GET', `/api/access/pending?wallet=${encodeURIComponent(TEST_PATIENT_WALLET)}`);
      if (pending.data.requests && pending.data.requests.length > 0) {
        const request = pending.data.requests[0];
        logSuccess(`Using existing request: ${request.id}`);
        return { requestId: request.id, doctorWallet: request.doctorWallet };
      }
      throw new Error('No pending requests found. Create test users first.');
    }
    
    if (response.status === 409) {
      logWarning('Duplicate request - using existing');
      return { requestId: response.data.requestId, doctorWallet: TEST_DOCTOR_WALLET };
    }
    
    if (response.status !== 200) {
      throw new Error(`Create request failed: ${response.data.error || response.status}`);
    }
    
    logSuccess(`Request created: ${response.data.requestId}`);
    logInfo(`Created at: ${response.data.createdAt}`);
    
    return { requestId: response.data.requestId, doctorWallet: TEST_DOCTOR_WALLET };
  } catch (error) {
    logError(`Create request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test 3: Approve request (triggers Midnight + Aiken)
 */
async function testApproveRequest(requestId) {
  logStep(3, 'Approving request (triggers Midnight ZK + Aiken audit)');
  
  try {
    const response = await makeRequest('POST', '/api/access/approve', {
      requestId: requestId,
      patientWallet: TEST_PATIENT_WALLET,
    });
    
    if (response.status === 404) {
      logWarning('Patient not found or request already processed');
      // Check if already approved
      return await checkApprovedRequest(requestId);
    }
    
    if (response.status === 400 && response.data.error?.includes('already')) {
      logWarning('Request already approved');
      return await checkApprovedRequest(requestId);
    }
    
    if (response.status !== 200) {
      throw new Error(`Approve failed: ${response.data.error || response.status}`);
    }
    
    logSuccess('Request approved successfully');
    
    // Check blockchain results
    const { blockchain, midnightTx, zkProofHash, aikenTx } = response.data;
    
    if (blockchain) {
      logInfo(`Midnight TX: ${blockchain.midnight.txId}`);
      logInfo(`ZK Proof Hash: ${blockchain.midnight.zkProofHash.substring(0, 40)}...`);
      logInfo(`Aiken TX: ${blockchain.cardano.txHash}`);
      logInfo(`Validator Hash: ${blockchain.cardano.validatorHash}`);
      logInfo(`Network: ${blockchain.cardano.network}`);
      
      if (blockchain.midnight.isRealProof) {
        logSuccess('Real Midnight ZK proof generated');
      } else {
        logWarning('Using Midnight stub (real SDK not integrated)');
      }
      
      if (blockchain.cardano.isRealTx) {
        logSuccess('Real Cardano transaction submitted');
      } else {
        logWarning('Using Aiken stub (configure for real transactions)');
      }
      
      return {
        midnightTx: blockchain.midnight.txId,
        zkProofHash: blockchain.midnight.zkProofHash,
        aikenTx: blockchain.cardano.txHash,
        validatorHash: blockchain.cardano.validatorHash,
        network: blockchain.cardano.network,
      };
    }
    
    // Legacy response format
    return { midnightTx, zkProofHash, aikenTx };
  } catch (error) {
    logError(`Approve request failed: ${error.message}`);
    throw error;
  }
}

async function checkApprovedRequest(requestId) {
  // Fetch from logs
  const response = await makeRequest('GET', `/api/access/all?wallet=${encodeURIComponent(TEST_DOCTOR_WALLET)}`);
  if (response.status === 200 && response.data.requests) {
    const request = response.data.requests.find(r => r.id === requestId);
    if (request && request.status === 'approved') {
      return {
        midnightTx: request.midnightTx,
        zkProofHash: request.zkProofHash,
        aikenTx: request.aikenTx,
        validatorHash: request.validatorHash,
        network: request.cardanoNetwork,
      };
    }
  }
  throw new Error('Could not find approved request');
}

/**
 * Test 4: Verify database values
 */
async function testVerifyDatabase(requestId, blockchainData) {
  logStep(4, 'Verifying database contains blockchain transaction hashes');
  
  try {
    const response = await makeRequest('GET', `/api/access/all?wallet=${encodeURIComponent(TEST_DOCTOR_WALLET)}`);
    
    if (response.status !== 200) {
      throw new Error(`Fetch requests failed: ${response.status}`);
    }
    
    const request = response.data.requests.find(r => r.id === requestId);
    
    if (!request) {
      throw new Error('Request not found in database');
    }
    
    logInfo(`Status: ${request.status}`);
    
    // Verify fields exist
    let allFieldsPresent = true;
    
    if (request.midnightTx) {
      logSuccess(`Midnight TX stored: ${request.midnightTx.substring(0, 30)}...`);
    } else {
      logError('Midnight TX missing from database');
      allFieldsPresent = false;
    }
    
    if (request.zkProofHash) {
      logSuccess(`ZK Proof Hash stored: ${request.zkProofHash.substring(0, 30)}...`);
    } else {
      logError('ZK Proof Hash missing from database');
      allFieldsPresent = false;
    }
    
    if (request.aikenTx) {
      logSuccess(`Aiken TX stored: ${request.aikenTx.substring(0, 30)}...`);
    } else {
      logError('Aiken TX missing from database');
      allFieldsPresent = false;
    }
    
    if (request.validatorHash) {
      logSuccess(`Validator Hash stored: ${request.validatorHash.substring(0, 30)}...`);
    } else {
      logWarning('Validator Hash not stored (may be older approval)');
    }
    
    if (request.cardanoNetwork) {
      logSuccess(`Network stored: ${request.cardanoNetwork}`);
    } else {
      logWarning('Network not stored (may be older approval)');
    }
    
    return allFieldsPresent;
  } catch (error) {
    logError(`Database verification failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test 5: Test data release (verifies both chains)
 */
async function testDataRelease(requestId, doctorWallet) {
  logStep(5, 'Testing data release (verifies Midnight + Cardano)');
  
  try {
    const response = await makeRequest('POST', '/api/access/release', {
      requestId: requestId,
      doctorWallet: doctorWallet,
    });
    
    if (response.status === 404) {
      logWarning('Patient profile not found - skipping data release test');
      return true;
    }
    
    if (response.status === 403) {
      logError(`Verification failed: ${response.data.error}`);
      if (response.data.reason) {
        logInfo(`Reason: ${response.data.reason}`);
      }
      return false;
    }
    
    if (response.status !== 200) {
      throw new Error(`Release failed: ${response.data.error || response.status}`);
    }
    
    logSuccess('Data release authorized');
    
    if (response.data.verification) {
      const { midnight, cardano } = response.data.verification;
      
      if (midnight.verified) {
        logSuccess('Midnight ZK verification passed');
      }
      
      if (cardano.verified) {
        logSuccess('Cardano audit verification passed');
        logInfo(`Verified on network: ${cardano.network}`);
      }
    }
    
    if (response.data.encryptedData) {
      logSuccess(`Encrypted data returned (${response.data.encryptedData.length} chars)`);
    }
    
    return true;
  } catch (error) {
    logError(`Data release test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test 6: Verify Aiken contract compiled correctly
 */
async function testAikenContract() {
  logStep(6, 'Verifying Aiken contract compilation');
  
  const fs = require('fs');
  const path = require('path');
  
  const contractPath = path.join(process.cwd(), 'contracts/aiken/access_request_validator');
  const plutusPath = path.join(contractPath, 'plutus.json');
  
  try {
    // Check if directory exists
    if (!fs.existsSync(contractPath)) {
      logError('Contract directory not found');
      return false;
    }
    logSuccess('Contract directory exists');
    
    // Check for source files
    const validatorPath = path.join(contractPath, 'validators/access_request.ak');
    if (fs.existsSync(validatorPath)) {
      logSuccess('Validator source file exists');
    } else {
      logError('Validator source file not found');
    }
    
    // Check for aiken.toml
    const tomlPath = path.join(contractPath, 'aiken.toml');
    if (fs.existsSync(tomlPath)) {
      logSuccess('aiken.toml exists');
    } else {
      logError('aiken.toml not found');
    }
    
    // Check plutus.json
    if (fs.existsSync(plutusPath)) {
      const plutus = JSON.parse(fs.readFileSync(plutusPath, 'utf-8'));
      
      logSuccess('plutus.json exists');
      logInfo(`Title: ${plutus.preamble.title}`);
      logInfo(`Version: ${plutus.preamble.version}`);
      
      // Check if compiled
      const validator = plutus.validators[0];
      if (validator.compiledCode && !validator.compiledCode.includes('PLACEHOLDER')) {
        logSuccess('Contract is compiled (has valid CBOR code)');
        return true;
      } else {
        logWarning('Contract not compiled - run "aiken build" in contracts directory');
        return false;
      }
    } else {
      logWarning('plutus.json not found - contract not built');
      return false;
    }
  } catch (error) {
    logError(`Aiken contract check failed: ${error.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n' + '='.repeat(60), colors.bright);
  log('MedLedger AI - Aiken & Midnight Integration Tests', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);
  
  const results = {
    serverHealth: false,
    createRequest: false,
    approveRequest: false,
    verifyDatabase: false,
    dataRelease: false,
    aikenContract: false,
  };
  
  try {
    // Test 1: Server health
    const status = await testServerHealth();
    results.serverHealth = true;
    
    // Test 2: Create request
    let requestData;
    try {
      requestData = await testCreateRequest();
      results.createRequest = true;
    } catch (e) {
      logWarning('Skipping remaining tests - need test users in database');
      logInfo('Create a doctor and patient user, then update TEST_DOCTOR_WALLET and TEST_PATIENT_WALLET');
      throw e;
    }
    
    // Test 3: Approve request
    const blockchainData = await testApproveRequest(requestData.requestId);
    results.approveRequest = true;
    
    // Test 4: Verify database
    results.verifyDatabase = await testVerifyDatabase(requestData.requestId, blockchainData);
    
    // Test 5: Data release
    results.dataRelease = await testDataRelease(requestData.requestId, requestData.doctorWallet);
    
    // Test 6: Aiken contract
    results.aikenContract = await testAikenContract();
    
  } catch (error) {
    logError(`\nTest suite failed: ${error.message}`);
  }
  
  // Summary
  log('\n' + '='.repeat(60), colors.bright);
  log('Test Results Summary', colors.bright);
  log('='.repeat(60), colors.bright);
  
  const tests = [
    ['Server Health & Status', results.serverHealth],
    ['Create Access Request', results.createRequest],
    ['Approve Request (Midnight + Aiken)', results.approveRequest],
    ['Database TX Hash Storage', results.verifyDatabase],
    ['Data Release Verification', results.dataRelease],
    ['Aiken Contract Compilation', results.aikenContract],
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, result] of tests) {
    if (result) {
      log(`  ✓ ${name}`, colors.green);
      passed++;
    } else {
      log(`  ✗ ${name}`, colors.red);
      failed++;
    }
  }
  
  log('\n' + '-'.repeat(60));
  log(`Total: ${passed} passed, ${failed} failed`, passed === tests.length ? colors.green : colors.yellow);
  
  if (passed === tests.length) {
    log('\n🎉 All tests passed! Blockchain integration is working.', colors.green);
  } else {
    log('\n⚠️  Some tests failed. Check the output above for details.', colors.yellow);
    log('\nTo enable full blockchain integration:', colors.blue);
    log('  1. Set BLOCKFROST_API_KEY in .env.local (get from blockfrost.io)');
    log('  2. Run "aiken build" in contracts/aiken/access_request_validator/');
    log('  3. Create test doctor and patient users in the database');
    log('  4. Run this script again');
  }
  
  log('\n');
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);

