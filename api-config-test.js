/**
 * Test script for /api/config endpoint
 * This script simulates a Cloudflare environment to test our endpoint
 */
import { onRequest } from './functions/api/config.js';

// Simulate Cloudflare environment
const mockEnv = {
  OPENAI_API_KEY: 'test-api-key-12345',
  OPENAI_MODEL: 'gpt-3.5-turbo-test'
};

// Create mock request
const mockRequest = new Request('https://example.com/api/config');
const mockCtx = {};

// Test the API endpoint
async function testConfigEndpoint() {
  console.log('=== Testing /api/config endpoint ===');
  
  try {
    // Call the endpoint handler
    const response = await onRequest({ 
      request: mockRequest, 
      env: mockEnv, 
      ctx: mockCtx 
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Parse the JSON response
    const responseData = await response.json();
    console.log('Response data:', responseData);
    
    // Verify the response contains the expected data
    const apiKeyProvided = responseData.OPENAI_API_KEY === mockEnv.OPENAI_API_KEY;
    const modelProvided = responseData.OPENAI_MODEL === mockEnv.OPENAI_MODEL;
    
    console.log('\nVerification:');
    console.log('API Key provided correctly:', apiKeyProvided);
    console.log('Model provided correctly:', modelProvided);
    
    if (apiKeyProvided && modelProvided) {
      console.log('\n✅ Test passed: Config endpoint returns correct data');
    } else {
      console.log('\n❌ Test failed: Config endpoint does not return expected data');
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testConfigEndpoint();
