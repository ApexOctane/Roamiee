/**
 * Test script for visitor tracking endpoints
 * Tests /api/visitor-data, /api/save-visitor-data, and /api/visitor-stats
 */
import { onRequest as visitorDataHandler } from './functions/api/visitor-data.js';
import { onRequest as saveVisitorDataHandler } from './functions/api/save-visitor-data.js';
import { onRequest as visitorStatsHandler } from './functions/api/visitor-stats.js';

// Mock KV store
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

// Helper function to make requests
async function makeRequest(handler, method, body = null) {
  const request = new Request('https://example.com/api/test', { 
    method,
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  
  const response = await handler({ 
    request, 
    env: mockEnv, 
    ctx: {} 
  });
  
  console.log(`${method} Response status:`, response.status);
  let responseData;
  
  try {
    responseData = await response.json();
  } catch (e) {
    responseData = null;
  }
  
  return { status: response.status, data: responseData };
}

// Generate test visitor data
function createTestVisitor(id) {
  const now = new Date().toISOString();
  return {
    visitorId: id,
    totalRuns: Math.floor(Math.random() * 10),
    weeklyUsage: [
      { timestamp: now, id: Date.now() },
      { timestamp: now, id: Date.now() + 1 }
    ],
    firstVisit: now,
    lastVisit: now
  };
}

// Test visitor tracking endpoints
async function testVisitorTracking() {
  console.log('\n=== Testing Visitor Tracking Endpoints ===\n');
  
  try {
    // Test 1: Try to get non-existent visitor data
    console.log('Test 1: Getting non-existent visitor data');
    const visitorId = 'test-visitor-' + Date.now();
    const getResult1 = await makeRequest(visitorDataHandler, 'POST', { visitorId });
    console.log('Get result:', getResult1);
    
    // Test 2: Save new visitor data
    console.log('\nTest 2: Saving new visitor data');
    const testVisitor = createTestVisitor(visitorId);
    const saveResult = await makeRequest(saveVisitorDataHandler, 'POST', testVisitor);
    console.log('Save result:', saveResult);
    
    // Test 3: Get saved visitor data
    console.log('\nTest 3: Getting saved visitor data');
    const getResult2 = await makeRequest(visitorDataHandler, 'POST', { visitorId });
    console.log('Get result:', getResult2);
    
    // Test 4: Get visitor stats
    console.log('\nTest 4: Getting visitor stats');
    const statsResult = await makeRequest(visitorStatsHandler, 'GET');
    console.log('Stats result:', statsResult);
    
    // Verify test results
    console.log('\n=== Verification ===');
    
    const test1 = getResult1.status === 404;
    console.log('✓ Test 1 - Non-existent visitor returns 404:', test1);
    
    const test2 = saveResult.status === 200 && saveResult.data.success === true;
    console.log('✓ Test 2 - Visitor data saved successfully:', test2);
    
    const test3 = getResult2.status === 200 && getResult2.data.visitorId === visitorId;
    console.log('✓ Test 3 - Saved visitor data retrieved successfully:', test3);
    
    const test4 = statsResult.status === 200 && 
                 statsResult.data.totalVisitors > 0 &&
                 statsResult.data.visitors.some(v => v.visitorId === visitorId);
    console.log('✓ Test 4 - Visitor stats include new visitor:', test4);
    
    // Overall result
    if (test1 && test2 && test3 && test4) {
      console.log('\n✅ All visitor tracking tests passed!');
    } else {
      console.log('\n❌ Some visitor tracking tests failed');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testVisitorTracking();
