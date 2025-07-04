// Apply this patch to ensure API calls work with Netlify Functions

// Get the current environment (development or production)
function getApiBasePath() {
  // When running locally with `netlify dev`, we use /.netlify/functions/
  // When deployed to Netlify, we also use /.netlify/functions/
  return '/.netlify/functions';
}

// Create API path mapping - map from original API path to Netlify Function path
const API_MAPPINGS = {
  '/api/config': '/.netlify/functions/api-config',
  '/api/usage-stats': '/.netlify/functions/api-usage-stats',
  '/api/visitor-data': '/.netlify/functions/api-visitor-data',
  '/api/save-visitor-data': '/.netlify/functions/api-save-visitor-data',
  '/api/visitor-stats': '/.netlify/functions/api-visitor-stats',
  '/api/default-key-usage': '/.netlify/functions/api-default-key-usage',
  '/api/use-default-key': '/.netlify/functions/api-use-default-key',
  '/api/send-itinerary': '/.netlify/functions/api-send-itinerary'
};

console.log('API path mappings loaded:', API_MAPPINGS);

// Monkey patch all fetch calls to API endpoints
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  // Only modify API calls
  if (typeof url === 'string' && url.startsWith('/api/')) {
    // Match exact paths first
    if (API_MAPPINGS[url]) {
      const newUrl = API_MAPPINGS[url];
      console.log(`Redirecting API call from ${url} to ${newUrl}`);
      return originalFetch(newUrl, options);
    }
    
    // Try partial matching
    for (const [originalPath, netlifyPath] of Object.entries(API_MAPPINGS)) {
      if (url.startsWith(originalPath)) {
        const newUrl = url.replace(originalPath, netlifyPath);
        console.log(`Redirecting API call from ${url} to ${newUrl}`);
        return originalFetch(newUrl, options);
      }
    }
    
    // If no match found, use the default pattern
    const basePath = getApiBasePath();
    const functionName = url.replace('/api/', 'api-');
    const newUrl = `${basePath}${functionName}`;
    console.log(`No mapping found, redirecting API call from ${url} to ${newUrl}`);
    return originalFetch(newUrl, options);
  }
  return originalFetch(url, options);
};
