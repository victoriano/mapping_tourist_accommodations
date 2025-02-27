// This script checks if the data files are accessible
document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.createElement('div');
  statusElement.style.position = 'fixed';
  statusElement.style.top = '10px';
  statusElement.style.left = '10px';
  statusElement.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  statusElement.style.padding = '10px';
  statusElement.style.borderRadius = '5px';
  statusElement.style.zIndex = '1000';
  document.body.appendChild(statusElement);

  try {
    // First check if we have a data config with R2 URL
    statusElement.textContent = 'Checking data configuration...';
    
    let dataPath = '/data/output/secciones_with_shapes.geojson'; // Default local path
    let dataSource = 'Local';
    
    try {
      const configResponse = await fetch('/data-config.json');
      if (configResponse.ok) {
        const config = await configResponse.json();
        if (config.dataUrl) {
          dataPath = config.dataUrl;
          dataSource = 'Cloudflare R2';
          statusElement.textContent = `Using ${dataSource} data source: ${dataPath}`;
        }
      }
    } catch (configError) {
      console.log('No config found or error loading config, using local path');
    }
    
    // Now check the actual data file
    statusElement.textContent = `Checking data file from ${dataSource}...`;
    
    const response = await fetch(dataPath);
    if (response.ok) {
      const data = await response.json();
      statusElement.textContent = `Data file accessible (${dataSource}): ${data.features.length} features found`;
      statusElement.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
      
      // Add timestamp if available from config
      if (dataSource === 'Cloudflare R2') {
        try {
          const configResponse = await fetch('/data-config.json');
          if (configResponse.ok) {
            const config = await configResponse.json();
            if (config.lastUpdated) {
              const lastUpdated = new Date(config.lastUpdated);
              const timestampElement = document.createElement('div');
              timestampElement.textContent = `Last updated: ${lastUpdated.toLocaleString()}`;
              timestampElement.style.fontSize = '0.8em';
              statusElement.appendChild(timestampElement);
            }
          }
        } catch (error) {
          // Ignore timestamp errors
        }
      }
    } else {
      statusElement.textContent = `Data file not accessible (${dataSource}): ${response.status} ${response.statusText}`;
      statusElement.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    }
  } catch (error) {
    statusElement.textContent = `Error: ${error.message}`;
    statusElement.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
  }
}); 