/**
 * Test script for /api/usage-stats endpoint
 * This script simulates a Cloudflare environment to test our endpoint
 */
import { onRequest } from './functions/api/usage-stats.js';

// Mock KV store (similar to our previous test)
const mockKV = {
  store: new Map(),
  
  async get(key) {
    console.log(`[KV GET] Reading key: ${key}`);
    return this.store.get(key) || null;
  },
  
  async put(key, value) {
    console.log(`[KV PUT] Writing key: ${key}`);
    this.store.set(key, value);
    return true;
  },
  
  async getWithMetadata(key) {
    console.log(`[KV METADATA] Checking key: ${key}`);
    const value = this.store.get(key);
    return { value: value || null };
  }
};

// Mock environment with KV binding
const mockEnv = {
  TRAVEL_DATA: mockKV
};

// Test helper function to make requests to the endpoint
async function makeRequest(method, body = null) {
  const request = new Request('https://example.com/api/usage-stats', { 
    method,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  
  const response = await onRequest({ 
    request, 
    env: mockEnv, 
    ctx: {} 
  });
  
  console.log(`${method} Response status:`, response.status);
  const responseData = await response.json();
  return responseData;
}

// Test the API endpoint
async function testUsageStatsEndpoint() {
  console.log('\n=== Testing /api/usage-stats endpoint ===\n');
  
  try {
    // Test 1: GET - should return default stats (empty KV)
    console.log('Test 1: GET initial usage stats');
    const initialStats = await makeRequest('GET');
    console.log('Initial stats:', initialStats);
    console.log('Initial usageCount:', initialStats.usageCount);
    
    // Test 2: POST - update usage stats
    console.log('\nTest 2: POST update usage stats');
    const newStats = {
      usageCount: 42,
      lastUpdated: new Date().toISOString()
    };
    
    const updateResult = await makeRequest('POST', newStats);
    console.log('Update result:', updateResult);
    console.log('Update success:', updateResult.success);
    
    // Test 3: GET again - verify updated stats
    console.log('\nTest 3: GET updated usage stats');
    const updatedStats = await makeRequest('GET');
    console.log('Updated stats:', updatedStats);
    console.log('Updated usageCount:', updatedStats.usageCount);
    
    // Verify results
    console.log('\n=== Verification ===');
    
    const initialCheck = initialStats.usageCount === 0;
    console.log('✓ Initial stats returned default values:', initialCheck);
    
    const updateCheck = updateResult.success === true;
    console.log('✓ Update operation successful:', updateCheck);
    
    const finalCheck = updatedStats.usageCount === 42;
    console.log('✓ Updated stats reflect new values:', finalCheck);
    
    if (initialCheck && updateCheck && finalCheck) {
      console.log('\n✅ All tests passed for usage-stats endpoint');
    } else {
      console.log('\n❌ Some tests failed for usage-stats endpoint');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testUsageStatsEndpoint();
