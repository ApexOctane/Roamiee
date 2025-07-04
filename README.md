# Roamii Travel Planner - Cloudflare Pages Deployment

This repository contains the Roamii Travel Planner application, migrated to run on Cloudflare Pages with Cloudflare Workers handling the backend functionality.

## Architecture

The application uses:
- **Frontend**: HTML, CSS, and JavaScript
- **Backend**: Cloudflare Functions (previously Express.js)
- **Storage**: Cloudflare KV (previously JSON files)
- **API Integration**: OpenAI API for AI-generated travel plans

## Setup Instructions

### Prerequisites

1. A Cloudflare account
2. Node.js and npm installed
3. Wrangler CLI installed (`npm install -g wrangler@latest`)
4. OpenAI API key (for AI functionality)

### Local Development

1. Clone the repository
2. Install dependencies
   ```
   npm install
   ```
3. Set up environment variables by creating a `.dev.vars` file:
   ```
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_MODEL=gpt-3.5-turbo
   EMAIL_USER=your_email_user (optional)
   EMAIL_PASS=your_email_pass (optional)
   ```
4. Create a KV namespace for development:
   ```
   wrangler kv:namespace create TRAVEL_DATA
   ```
5. Update `wrangler.toml` with your KV namespace ID
6. Run locally:
   ```
   npm run pages:dev
   ```

### Deployment to Cloudflare Pages

1. Login to Cloudflare through Wrangler:
   ```
   wrangler login
   ```

2. Create KV namespace for production:
   ```
   wrangler kv:namespace create TRAVEL_DATA --env production
   ```

3. Update `wrangler.toml` with production KV namespace ID:
   ```toml
   [[kv_namespaces]]
   binding = "TRAVEL_DATA"
   id = "YOUR_KV_NAMESPACE_ID"
   preview_id = "YOUR_KV_NAMESPACE_ID"
   ```

4. Deploy to Cloudflare Pages:
   ```
   npm run pages:deploy
   ```

5. Set environment variables in the Cloudflare Dashboard:
   - Go to your Pages project
   - Navigate to Settings > Environment variables
   - Add:
     - `OPENAI_API_KEY`: Your OpenAI API key
     - `OPENAI_MODEL`: gpt-3.5-turbo
     - `EMAIL_USER`: Email username (optional)
     - `EMAIL_PASS`: Email password (optional)

## Project Structure

```
/
├── functions/                  # Cloudflare Functions
│   ├── _utils/                 # Utility functions
│   │   └── kv-helpers.js       # KV storage helpers
│   ├── api/                    # API endpoints
│   │   ├── config.js           # Environment configuration
│   │   ├── usage-stats.js      # Usage statistics
│   │   ├── visitor-data.js     # Get visitor data
│   │   ├── save-visitor-data.js # Save visitor data
│   │   ├── visitor-stats.js    # Admin visitor stats
│   │   ├── default-key-usage.js # Check default key usage
│   │   ├── use-default-key.js  # Use default OpenAI key
│   │   └── send-itinerary.js   # Send itinerary via email
│   └── _worker.js              # Main entry point
├── index.html                  # Main HTML file
├── script.js                   # Frontend JavaScript
├── styles.css                  # CSS styles
├── visitor-tracker.js          # Visitor tracking
├── images/                     # Image assets
├── package.json                # Dependencies
├── wrangler.toml               # Cloudflare configuration
└── _routes.json                # Routing configuration
```

## API Endpoints

The application exposes the following API endpoints:

- `GET /api/config` - Returns environment configuration
- `GET/POST /api/usage-stats` - Usage statistics
- `POST /api/visitor-data` - Get visitor data
- `POST /api/save-visitor-data` - Save visitor data
- `GET /api/visitor-stats` - Get visitor statistics
- `GET /api/default-key-usage` - Check default API key usage
- `POST /api/use-default-key` - Use default OpenAI API key
- `POST /api/send-itinerary` - Send travel itinerary via email

## Migrating Data

If you have existing data from the Express.js version:

1. Export your usage stats and visitor data
2. Use Wrangler to import into KV:
   ```
   wrangler kv:key put --namespace-id=YOUR_KV_NAMESPACE_ID "usage-stats" "$(cat usage-stats.json)"
   wrangler kv:key put --namespace-id=YOUR_KV_NAMESPACE_ID "visitor-data" "$(cat visitor.json)"
   ```

## Limitations and Considerations

- **Email Functionality**: The current implementation simulates email sending. For production, integrate with a service like Mailchannels, SendGrid, or Postmark.
- **Authentication**: The application doesn't include authentication. Consider adding Cloudflare Access for admin endpoints.
- **Rate Limiting**: Consider adding rate limiting for production use.

## Testing

- Individual test scripts are available for testing specific functionality:
  - `api-config-test.js`: Test config endpoint
  - `api-usage-stats-test.js`: Test usage stats endpoints
  - `api-visitor-tracking-test.js`: Test visitor tracking endpoints
  - `kv-test-script.js`: Test KV storage functionality

## License

MIT
