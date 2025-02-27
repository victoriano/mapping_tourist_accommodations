#!/bin/bash

# Navigate to the webapp directory
cd webapp

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build the application
echo "Building application for production..."
npm run build

echo "Build completed! The application is available in webapp/dist/" 