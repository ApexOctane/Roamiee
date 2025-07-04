/**
 * Simple local development server for testing the Roamii Travel Planner
 * This server will serve the static files and provide a way to test the functions
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .dev.vars
function loadEnvVars() {
  try {
    const envFile = fs.readFileSync('.dev.vars', 'utf8');
    const lines = envFile.split('\n');
    
    lines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
    
    console.log('Loaded environment variables from .dev.vars');
    console.log('OPENAI_MODEL:', process.env.OPENAI_MODEL);
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '****' + process.env.OPENAI_API_KEY.slice(-4) : 'not set');
  } catch (error) {
    console.error('Error loading .dev.vars:', error.message);
  }
}

// Load environment variables before starting the server
loadEnvVars();

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Create a server
const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  // Handle API requests with mock responses
  if (req.url.startsWith('/api/')) {
    handleApiRequest(req, res);
    return;
  }
  
  // For the root path, serve index.html
  let filePath = req.url === '/' 
    ? path.join(__dirname, 'dist', 'index.html') 
    : path.join(__dirname, 'dist', req.url);
  
  // Ensure the path is within the 'dist' directory
  if (!filePath.startsWith(path.join(__dirname, 'dist'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  // Check if the file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      console.error(`File not found: ${filePath}`);
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    
    // Get the file extension to determine the MIME type
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Read and serve the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server error');
        return;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

// Handle API requests
function handleApiRequest(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Extract the API endpoint from the URL
  const endpoint = req.url.split('?')[0]; // Remove query parameters
  
  console.log(`API Request: ${req.method} ${endpoint}`);
  
  // Handle each API endpoint with appropriate mock responses
  switch (endpoint) {
    case '/api/config':
      handleConfigEndpoint(req, res);
      break;
    case '/api/usage-stats':
      handleUsageStatsEndpoint(req, res);
      break;
    case '/api/visitor-data':
      handleVisitorDataEndpoint(req, res);
      break;
    case '/api/save-visitor-data':
      handleSaveVisitorDataEndpoint(req, res);
      break;
    case '/api/visitor-stats':
      handleVisitorStatsEndpoint(req, res);
      break;
    case '/api/default-key-usage':
      handleDefaultKeyUsageEndpoint(req, res);
      break;
    case '/api/use-default-key':
      handleUseDefaultKeyEndpoint(req, res);
      break;
    case '/api/send-itinerary':
      handleSendItineraryEndpoint(req, res);
      break;
    default:
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'API endpoint not found' }));
  }
}

// Mock API endpoint handlers
function handleConfigEndpoint(req, res) {
  const configData = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'test-api-key',
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
  };
  
  res.writeHead(200);
  res.end(JSON.stringify(configData));
}

function handleUsageStatsEndpoint(req, res) {
  if (req.method === 'GET') {
    // Read the mock usage stats
    const usageStats = {
      usageCount: 42,
      lastUpdated: new Date().toISOString()
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(usageStats));
  } else if (req.method === 'POST') {
    // Handle POST request to update usage stats
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        res.writeHead(200);
        res.end(JSON.stringify({ 
          success: true, 
          stats: {
            usageCount: data.usageCount || 0,
            lastUpdated: new Date().toISOString()
          }
        }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }
}

function handleVisitorDataEndpoint(req, res) {
  if (req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        if (!data.visitorId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Visitor ID is required' }));
          return;
        }
        
        // Mock visitor data
        const visitorData = {
          visitorId: data.visitorId,
          totalRuns: 5,
          weeklyUsage: [
            { timestamp: new Date().toISOString(), id: Date.now() }
          ],
          firstVisit: new Date().toISOString(),
          lastVisit: new Date().toISOString()
        };
        
        res.writeHead(200);
        res.end(JSON.stringify(visitorData));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }
}

function handleSaveVisitorDataEndpoint(req, res) {
  if (req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        if (!data.visitorId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Visitor ID is required' }));
          return;
        }
        
        res.writeHead(200);
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Visitor data saved successfully',
          isNewVisitor: false
        }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }
}

function handleVisitorStatsEndpoint(req, res) {
  if (req.method === 'GET') {
    // Mock visitor stats
    const stats = {
      totalVisitors: 10,
      totalRuns: 42,
      activeThisWeek: 5,
      runsThisWeek: 15,
      visitors: [
        {
          visitorId: 'test-visitor-1',
          totalRuns: 5,
          weeklyRuns: 2,
          firstVisit: new Date().toISOString(),
          lastVisit: new Date().toISOString()
        }
      ]
    };
    
    res.writeHead(200);
    res.end(JSON.stringify(stats));
  }
}

function handleDefaultKeyUsageEndpoint(req, res) {
  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const visitorId = url.searchParams.get('visitorId');
    
    if (!visitorId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Visitor ID is required' }));
      return;
    }
    
    res.writeHead(200);
    res.end(JSON.stringify({
      count: 1,
      remaining: 1,
      maxWeeklyUses: 2,
      canUse: true
    }));
  }
}

function handleUseDefaultKeyEndpoint(req, res) {
  if (req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        if (!data.visitorId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Visitor ID is required' }));
          return;
        }
        
        if (!data.messages || !Array.isArray(data.messages)) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Valid messages array is required' }));
          return;
        }
        
        res.writeHead(200);
        res.end(JSON.stringify({
          content: "This is a mock response from the OpenAI API. Your travel itinerary would appear here.",
          usage: {
            count: 2,
            remaining: 0,
            maxWeeklyUses: 2
          }
        }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }
}

function handleSendItineraryEndpoint(req, res) {
  if (req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        if (!data.email || !data.itinerary) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Email and itinerary are required' }));
          return;
        }
        
        res.writeHead(200);
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Email sent successfully (test mode)',
          testUrl: `https://example.com/test-email/${Date.now()}`,
          recipient: data.email
        }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log('Using mock API responses for all endpoints');
});
