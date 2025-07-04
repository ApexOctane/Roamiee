import { cp } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const distDir = 'dist';
const imagesDir = join(distDir, 'images');
const functionsDir = join(distDir, 'functions');
const functionUtilsDir = join(functionsDir, '_utils');
const functionApiDir = join(functionsDir, 'api');

// Create directories if they don't exist
if (!existsSync(distDir)) mkdirSync(distDir);
if (!existsSync(imagesDir)) mkdirSync(imagesDir);
if (!existsSync(functionsDir)) mkdirSync(functionsDir);
if (!existsSync(functionUtilsDir)) mkdirSync(functionUtilsDir);
if (!existsSync(functionApiDir)) mkdirSync(functionApiDir);

// Copy all function files
async function copyFunctionFiles() {
  // Copy _middleware.js
  try {
    await cp('functions/_middleware.js', join(functionsDir, '_middleware.js'));
    console.log('Copied functions/_middleware.js to dist/functions/_middleware.js');
  } catch (error) {
    console.error('Error copying _middleware.js:', error);
  }

  // Copy _worker.js
  try {
    await cp('functions/_worker.js', join(functionsDir, '_worker.js'));
    console.log('Copied functions/_worker.js to dist/functions/_worker.js');
  } catch (error) {
    console.error('Error copying _worker.js:', error);
  }

  // Copy _utils/kv-helpers.js
  try {
    await cp('functions/_utils/kv-helpers.js', join(functionUtilsDir, 'kv-helpers.js'));
    console.log('Copied functions/_utils/kv-helpers.js to dist/functions/_utils/kv-helpers.js');
  } catch (error) {
    console.error('Error copying kv-helpers.js:', error);
  }
  
  // Copy _utils/memory-storage.js
  try {
    await cp('functions/_utils/memory-storage.js', join(functionUtilsDir, 'memory-storage.js'));
    console.log('Copied functions/_utils/memory-storage.js to dist/functions/_utils/memory-storage.js');
  } catch (error) {
    console.error('Error copying memory-storage.js:', error);
  }

  // Copy kv-test.js
  try {
    await cp('functions/kv-test.js', join(functionsDir, 'kv-test.js'));
    console.log('Copied functions/kv-test.js to dist/functions/kv-test.js');
  } catch (error) {
    console.error('Error copying kv-test.js:', error);
  }

  // Copy all API files from both functions/api/ and direct API functions
  const apiDirFiles = [
    'config.js',
    'default-key-usage.js',
    'save-visitor-data.js',
    'send-itinerary.js',
    'usage-stats.js',
    'use-default-key.js',
    'visitor-data.js',
    'visitor-stats.js'
  ];

  // Copy files from functions/api/ directory
  for (const file of apiDirFiles) {
    try {
      await cp(join('functions/api', file), join(functionApiDir, file));
      console.log(`Copied functions/api/${file} to dist/functions/api/${file}`);
    } catch (error) {
      // Skip files that don't exist
      if (error.code !== 'ENOENT') {
        console.error(`Error copying functions/api/${file}:`, error);
      }
    }
  }
  
  // Copy direct API function files
  const directApiFiles = [
    'api-config.js',
    'api-default-key-usage.js',
    'api-save-visitor-data.js',
    'api-send-itinerary.js',
    'api-usage-stats.js',
    'api-use-default-key.js',
    'api-visitor-data.js',
    'api-visitor-stats.js',
    'memory-storage.js',
    'firebase-config.js',
    'firestore-storage.js'
  ];
  
  // Copy new trip session files (added for new session-based system)
  try {
    await cp('functions/api/complete-trip.js', join(functionApiDir, 'complete-trip.js'));
    console.log('Copied functions/api/complete-trip.js to dist/functions/api/complete-trip.js');
  } catch (error) {
    console.error('Error copying complete-trip.js:', error);
  }
  
  try {
    await cp('functions/api/create-trip-session.js', join(functionApiDir, 'create-trip-session.js'));
    console.log('Copied functions/api/create-trip-session.js to dist/functions/api/create-trip-session.js');
  } catch (error) {
    console.error('Error copying create-trip-session.js:', error);
  }
  
  for (const file of directApiFiles) {
    try {
      await cp(join('functions', file), join(functionsDir, file));
      console.log(`Copied functions/${file} to dist/functions/${file}`);
    } catch (error) {
      // Skip files that don't exist
      if (error.code !== 'ENOENT') {
        console.error(`Error copying functions/${file}:`, error);
      }
    }
  }
}

// Copy static files
async function copyStaticFiles() {
  const staticFiles = [
    'index.html',
    'api-key-tracker.html',
    'test-counter.html',
    'styles.css',
    'script.js',
    'visitor-tracker.js',
    'netlify-api-fix.js', // Added this file to be copied
    '_routes.json'
  ];

  for (const file of staticFiles) {
    try {
      await cp(file, join(distDir, file));
      console.log(`Copied ${file} to dist`);
    } catch (error) {
      // Skip files that don't exist
      if (error.code !== 'ENOENT') {
        console.error(`Error copying ${file}:`, error);
      }
    }
  }

  // Copy images
  const imageFiles = ['logo.ico', 'logo.png', 'roamii-logo.svg'];
  for (const file of imageFiles) {
    try {
      await cp(join('images', file), join(imagesDir, file));
      console.log(`Copied images/${file} to dist/images/${file}`);
    } catch (error) {
      // Skip files that don't exist
      if (error.code !== 'ENOENT') {
        console.error(`Error copying images/${file}:`, error);
      }
    }
  }
}

// Main build function
async function build() {
  try {
    await Promise.all([
      copyFunctionFiles(),
      copyStaticFiles()
    ]);
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build();
