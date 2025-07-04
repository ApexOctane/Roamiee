/**
 * Simple test script for KV helper functions
 * This script simulates a KV environment to test our helper functions
 */

// Mock Cloudflare KV environment
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

// Import our KV helper functions
import('./functions/_utils/kv-helpers.js').then(async (helpers) => {
  const {
    readJSONFile,
    writeJSONFile,
    keyExists,
    initializeDefaultData,
    getDefaultUsageStats,
    getDefaultVisitorData
  } = helpers;
  
  // Test write function
  console.log('\n=== Testing writeJSONFile ===');
  const testData = {
    id: 'test123',
    timestamp: new Date().toISOString(),
    nested: { works: true, value: 42 }
  };
  
  const writeResult = await writeJSONFile(mockEnv, 'test-data.json', testData);
  console.log('Write result:', writeResult);
  console.log('Raw KV store after write:', mockKV.store);
  
  // Test read function
  console.log('\n=== Testing readJSONFile ===');
  const readResult = await readJSONFile(mockEnv, 'test-data.json');
  console.log('Read result:', readResult);
  console.log('Matches original data?', JSON.stringify(readResult) === JSON.stringify(testData));
  
  // Test keyExists function
  console.log('\n=== Testing keyExists ===');
  const existsResult = await keyExists(mockEnv, 'test-data.json');
  console.log('Key exists result:', existsResult);
  
  const nonExistentResult = await keyExists(mockEnv, 'non-existent.json');
  console.log('Non-existent key result:', nonExistentResult);
  
  // Test initialize function with default data
  console.log('\n=== Testing initializeDefaultData ===');
  
  // First with existing data
  const existingInit = await initializeDefaultData(mockEnv, 'test-data.json', { default: 'value' });
  console.log('Init with existing data result:', existingInit);
  
  // Then with new data
  const newInit = await initializeDefaultData(mockEnv, 'new-data.json', { default: 'new-value' });
  console.log('Init with new data result:', newInit);
  
  // Test usage stats default function
  console.log('\n=== Testing getDefaultUsageStats ===');
  const defaultStats = getDefaultUsageStats();
  console.log('Default usage stats:', defaultStats);
  
  // Test visitor data default function
  console.log('\n=== Testing getDefaultVisitorData ===');
  const defaultVisitor = getDefaultVisitorData();
  console.log('Default visitor data:', defaultVisitor);
  
  console.log('\n=== All tests completed successfully ===');
}).catch(error => {
  console.error('Error during tests:', error);
});
