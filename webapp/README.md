# Tourist Accommodations Map Web Application

This is an interactive web application that visualizes tourist accommodation data by census section in Spain.

## Features

- Interactive map visualization using MapLibre GL JS
- Display of tourist accommodation statistics by census section
- Filtering options by region, municipality, and accommodation density
- Responsive design for desktop and mobile use

## Technology Stack

- TypeScript
- MapLibre GL JS
- Vite (build tool)
- Optimized for Cloudflare deployment

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Data

The application uses GeoJSON data located in `../data/output/` which is the result of merging shapefile geographic data with tourist accommodation statistics. 