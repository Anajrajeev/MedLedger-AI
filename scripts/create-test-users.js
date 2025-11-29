#!/usr/bin/env node
/**
 * MedLedger AI - Create Test Users Script
 * 
 * Creates test doctor and patient users in the database for blockchain integration testing.
 * 
 * Usage:
 *   node scripts/create-test-users.js
 */

const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:4000';

// Test wallet addresses (these are test addresses, not real wallets)
const TEST_DOCTOR_WALLET = process.env.TEST_DOCTOR_WALLET || 'addr_test1qz_doctor_test_wallet_for_testing';
const TEST_PATIENT_WALLET = process.env.TEST_PATIENT_WALLET || 'addr_test1qz_patient_test_wallet_for_testing';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
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
  log(`  ✓ ${message}`, colors.green);
}

function logError(message) {
  log(`  ✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`  ℹ ${message}`, colors.blue);
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
 * Create a test user
 */
async function createUser(walletAddress, role) {
  logInfo(`Creating ${role}: ${walletAddress.substring(0, 30)}...`);
  
  try {
    const response = await makeRequest('POST', '/api/register-role', {
      walletAddress,
      role,
    });
    
    if (response.status === 200) {
      logSuccess(`${role} user created/verified`);
      return true;
    } else {
      logError(`Failed to create ${role}: ${response.data.error || response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Error creating ${role}: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('MedLedger AI - Create Test Users', colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);
  
  // Check server health
  log('Checking server connection...');
  try {
    const health = await makeRequest('GET', '/health');
    if (health.status !== 200) {
      logError('Server is not responding correctly');
      log('\nMake sure the backend server is running:');
      log('  npm run server:dev', colors.yellow);
      process.exit(1);
    }
    logSuccess('Server is running');
  } catch (error) {
    logError(`Cannot connect to server: ${error.message}`);
    log('\nMake sure the backend server is running:');
    log('  npm run server:dev', colors.yellow);
    process.exit(1);
  }
  
  log('\nCreating test users...\n');
  
  // Create doctor
  const doctorCreated = await createUser(TEST_DOCTOR_WALLET, 'doctor');
  
  // Create patient
  const patientCreated = await createUser(TEST_PATIENT_WALLET, 'patient');
  
  // Summary
  log('\n' + '-'.repeat(60));
  if (doctorCreated && patientCreated) {
    log('\n✅ Test users created successfully!', colors.green);
    log('\nYou can now run the blockchain tests:');
    log('  npm run test:blockchain', colors.yellow);
  } else {
    log('\n⚠️  Some users could not be created. Check the errors above.', colors.yellow);
  }
  
  log('\nTest wallet addresses:');
  log(`  Doctor:  ${TEST_DOCTOR_WALLET}`, colors.blue);
  log(`  Patient: ${TEST_PATIENT_WALLET}`, colors.blue);
  log('\n');
  
  process.exit(doctorCreated && patientCreated ? 0 : 1);
}

main().catch(console.error);

