# Roamiee Travel Planner Deployment Guide

## Local Development

The application can be run locally using the built-in development server:

```bash
# Install dependencies
npm install

# Build and run the local server
npm run local
```

This will start a server at http://localhost:3000 with mock API responses.

## Deployment Challenges

### Current Issue: Yarn PnP Environment

The application is currently experiencing deployment issues when using Cloudflare Pages due to the Yarn Plug'n'Play (PnP) environment in this workspace:

- Wrangler's internal templates have a dependency on `path-to-regexp`
- The Yarn PnP manifest forbids importing `path-to-regexp` because it's not listed as a dependency of the Wrangler package
- Even adding path-to-regexp to our dependencies doesn't resolve the issue due to the PnP isolation

### Workaround Options

#### Option 1: Direct Dashboard Upload

1. Build the application locally: `npm run build`
2. Log in to the Cloudflare Dashboard
3. Navigate to Pages
4. Create a new project and upload the `dist` directory manually
5. Add the environment variables in the Cloudflare Dashboard

#### Option 2: Alternative Deployment Platforms

The application can be deployed to other platforms that don't have the same PnP conflicts:

- **Netlify**: Create a netlify.toml file and deploy with the Netlify CLI
- **Vercel**: Create a vercel.json file and deploy with the Vercel CLI
- **GitHub Pages**: Use GitHub Actions to build and deploy

#### Option 3: Cloudflare Workers Direct Deployment

To bypass the Pages bundling issue:

1. Create a Worker entry point that combines the static assets and Functions
2. Use `wrangler deploy` instead of `wrangler pages deploy`

## Environment Variables

The following environment variables are required:

- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_MODEL`: The OpenAI model to use (default: gpt-3.5-turbo)

## Conclusion

For now, the recommended approach is to use the local development server for testing and development, and consider one of the alternative deployment methods for production.
