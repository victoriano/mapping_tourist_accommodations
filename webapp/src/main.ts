import * as maplibregl from 'maplibre-gl';
import { FeatureCollection, Feature, FilterOptions } from './types/types';

// Define constants
const LOCAL_DATA_PATH = '/data/output/secciones_with_shapes.geojson';
const CONFIG_PATH = '/data-config.json';
let DATA_PATH = LOCAL_DATA_PATH; // Will be updated if R2 URL is available
const DEFAULT_LOCATION = { lng: -3.7033, lat: 40.4167, zoom: 5 }; // Spain

// State
let map: maplibregl.Map;
let geojsonData: FeatureCollection | null = null;
let provinces: { code: string, name: string }[] = [];
let municipalities: { code: string, name: string, provinceCode: string }[] = [];
let currentFilters: FilterOptions = {
  minAccommodations: 0,
  maxAccommodations: 500,
  province: 'all',
  municipality: 'all'
};

// Load config and update data path
async function loadConfig(): Promise<void> {
  try {
    const response = await fetch(CONFIG_PATH);
    if (response.ok) {
      const config = await response.json();
      if (config.dataUrl) {
        console.log(`Using remote data URL from config: ${config.dataUrl}`);
        DATA_PATH = config.dataUrl;
        
        // Show last updated info if available
        if (config.lastUpdated) {
          const lastUpdated = new Date(config.lastUpdated);
          console.log(`Data last updated: ${lastUpdated.toLocaleString()}`);
        }
      } else {
        console.log(`Config file found but no dataUrl specified, using local path: ${LOCAL_DATA_PATH}`);
      }
    } else {
      console.log(`Could not load config file, using local path: ${LOCAL_DATA_PATH}`);
    }
  } catch (error) {
    console.error('Error loading config:', error);
    console.log(`Falling back to local data path: ${LOCAL_DATA_PATH}`);
  }
}

// Initialize the map
function initializeMap(): void {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: [DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat],
    zoom: DEFAULT_LOCATION.zoom,
  });

  map.addControl(new maplibregl.NavigationControl());
  map.addControl(new maplibregl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true
  }));

  // Add region navigation controls
  addRegionNavigationControls();

  map.on('load', () => {
    loadGeoJSONData();
  });
}

// Add custom controls for navigating to specific regions of Spain
function addRegionNavigationControls(): void {
  // Check if map element exists first
  const mapElement = document.querySelector('.map') || document.getElementById('map');
  if (!mapElement) {
    console.warn('Map element not found, skipping region navigation controls');
    return;
  }

  const controlContainer = document.createElement('div');
  controlContainer.className = 'map-region-controls';
  
  // Button for mainland Spain
  const mainlandButton = document.createElement('button');
  mainlandButton.className = 'region-button';
  mainlandButton.textContent = 'Mainland Spain';
  mainlandButton.addEventListener('click', () => {
    if (map) {
      map.flyTo({
        center: [-3.7033, 40.4167],
        zoom: 5,
        duration: 1500
      });
    }
  });
  
  // Button for Canary Islands
  const canaryButton = document.createElement('button');
  canaryButton.className = 'region-button';
  canaryButton.textContent = 'Canary Islands';
  canaryButton.addEventListener('click', () => {
    if (map) {
      map.flyTo({
        center: [-15.5, 28.1],
        zoom: 7,
        duration: 1500
      });
    }
  });
  
  controlContainer.appendChild(mainlandButton);
  controlContainer.appendChild(canaryButton);
  
  // Append the control container to the map
  mapElement.appendChild(controlContainer);
}

// Load the GeoJSON data
async function loadGeoJSONData(): Promise<void> {
  try {
    showLoading(true);
    console.log('Attempting to load GeoJSON data from:', DATA_PATH);
    
    const response = await fetch(DATA_PATH);
    console.log('Fetch response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to load GeoJSON data:', response.status, response.statusText);
      console.error('Error details:', errorText);
      throw new Error(`Failed to load GeoJSON data: ${response.status} ${response.statusText}`);
    }
    
    geojsonData = await response.json() as FeatureCollection;
    console.log('GeoJSON data loaded successfully:', geojsonData.features.length, 'features');
    
    // Check if the GeoJSON has valid geometry
    if (geojsonData.features.length > 0) {
      const sampleFeature = geojsonData.features[0];
      console.log('Sample feature geometry:', sampleFeature.geometry);
      console.log('Sample feature properties:', sampleFeature.properties);
    } else {
      console.warn('No features found in the GeoJSON data!');
    }
    
    processData();
    addDataToMap();
    populateFilters();
    setupEventListeners();
    showLoading(false);
    
  } catch (error: any) {
    console.error('Error loading GeoJSON data:', error);
    showLoading(false);
    
    // Display error on the page - ensure the map element exists first
    const mapElement = document.querySelector('.map') || document.getElementById('map');
    if (mapElement) {
      const errorElement = document.createElement('div');
      errorElement.style.position = 'absolute';
      errorElement.style.top = '50%';
      errorElement.style.left = '50%';
      errorElement.style.transform = 'translate(-50%, -50%)';
      errorElement.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      errorElement.style.color = 'red';
      errorElement.style.padding = '20px';
      errorElement.style.borderRadius = '5px';
      errorElement.style.maxWidth = '80%';
      errorElement.style.textAlign = 'center';
      errorElement.innerHTML = `
        <h3>Error Loading Map Data</h3>
        <p>${error.message || 'Unknown error occurred'}</p>
        <p>Please check your internet connection and try again.</p>
      `;
      mapElement.appendChild(errorElement);
    } else {
      // Fallback if map element doesn't exist yet
      alert('Failed to load map data. Please try again later.');
    }
  }
}

// Show or hide loading indicator
function showLoading(show: boolean): void {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = show ? 'flex' : 'none';
  }
}

// Process the data to extract provinces and municipalities
function processData(): void {
  if (!geojsonData) return;

  const uniqueProvinces = new Map<string, string>();
  const uniqueMunicipalities = new Map<string, { name: string, provinceCode: string }>();

  geojsonData.features.forEach(feature => {
    const props = feature.properties;
    
    // Extract province info
    if (props.CPRO && props.NPRO) {
      uniqueProvinces.set(props.CPRO, props.NPRO);
    }
    
    // Extract municipality info
    if (props.CMUN && props.NMUN && props.CPRO) {
      uniqueMunicipalities.set(props.CMUN, { 
        name: props.NMUN, 
        provinceCode: props.CPRO 
      });
    }
  });

  // Convert Maps to arrays
  provinces = Array.from(uniqueProvinces, ([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  municipalities = Array.from(uniqueMunicipalities, ([code, { name, provinceCode }]) => ({ 
    code, 
    name, 
    provinceCode 
  })).sort((a, b) => a.name.localeCompare(b.name));
}

// Add the GeoJSON data to the map
function addDataToMap(): void {
  if (!geojsonData || !map) return;

  // Remove existing layers if they exist
  if (map.getLayer('sections-fill')) map.removeLayer('sections-fill');
  if (map.getLayer('sections-outline')) map.removeLayer('sections-outline');
  if (map.getSource('sections')) map.removeSource('sections');

  // Add source
  map.addSource('sections', {
    type: 'geojson',
    data: geojsonData,
    generateId: true
  });

  // Add fill layer
  map.addLayer({
    id: 'sections-fill',
    type: 'fill',
    source: 'sections',
    paint: {
      'fill-color': [
        'case',
        ['has', 'vivienda turistica'],
        [
          'step',
          ['to-number', ['get', 'vivienda turistica']],
          '#f7fbff',  // 0
          1, '#deebf7',  // 1-4
          5, '#c6dbef',  // 5-9
          10, '#9ecae1', // 10-49
          50, '#6baed6', // 50-99
          100, '#4292c6', // 100-199
          200, '#2171b5', // 200-499
          500, '#084594'  // 500+
        ],
        '#e5e5e5'  // Default color if no data
      ],
      'fill-opacity': 0.7
    }
  });

  // Add outline layer
  map.addLayer({
    id: 'sections-outline',
    type: 'line',
    source: 'sections',
    paint: {
      'line-color': '#000',
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5, 0.1,  // Thin lines at low zoom
        8, 0.5,  // Medium lines at medium zoom
        12, 1    // Thicker lines at high zoom
      ],
      'line-opacity': 0.3
    }
  });

  // Add hover effect
  map.on('mousemove', 'sections-fill', (e) => {
    if (e.features && e.features.length > 0) {
      map.getCanvas().style.cursor = 'pointer';
      const feature = e.features[0] as unknown as Feature;
      showPopup(feature, e.lngLat);
    }
  });

  map.on('mouseleave', 'sections-fill', () => {
    map.getCanvas().style.cursor = '';
    hidePopup();
  });

  // Add click handler
  map.on('click', 'sections-fill', (e) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0] as unknown as Feature;
      zoomToFeature(feature);
      showFeatureModal(feature);
    }
  });

  // Add legend
  addLegend();
}

// Create and add the legend to the map
function addLegend(): void {
  const legendElement = document.getElementById('legend');
  if (!legendElement) {
    console.warn('Legend element not found, skipping legend creation');
    return;
  }

  // Clear any existing content
  legendElement.innerHTML = '';
  
  const title = document.createElement('h4');
  title.textContent = 'Tourist Accommodations';
  legendElement.appendChild(title);
  
  const legendItems = [
    { color: '#f7fbff', label: '0' },
    { color: '#deebf7', label: '1' },
    { color: '#c6dbef', label: '1-5' },
    { color: '#9ecae1', label: '5-10' },
    { color: '#6baed6', label: '10-50' },
    { color: '#4292c6', label: '50-100' },
    { color: '#2171b5', label: '100-200' },
    { color: '#084594', label: '200-500' },
  ];
  
  const legendItemsContainer = document.createElement('div');
  legendItemsContainer.className = 'legend-items';
  
  legendItems.forEach(item => {
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    
    const colorBox = document.createElement('div');
    colorBox.className = 'legend-color';
    colorBox.style.backgroundColor = item.color;
    
    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = item.label;
    
    legendItem.appendChild(colorBox);
    legendItem.appendChild(label);
    legendItemsContainer.appendChild(legendItem);
  });
  
  legendElement.appendChild(legendItemsContainer);
}

// Show the popup with feature information
function showPopup(feature: Feature, lngLat: maplibregl.LngLat): void {
  const popup = document.getElementById('popup');
  if (!popup) {
    console.warn('Popup element not found, cannot show popup');
    return;
  }
  
  const props = feature.properties;
  
  // Safely set text content with null checks
  const setElementText = (id: string, value: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    } else {
      console.warn(`Element with id ${id} not found`);
    }
  };
  
  setElementText('popup-title', `Census Section: ${props.CUSEC}`);
  setElementText('popup-accommodations', props['vivienda turistica']?.toString() || 'N/A');
  setElementText('popup-places', props['plazas']?.toString() || 'N/A');
  setElementText(
    'popup-percentage', 
    props['Porcentaje vivienda turistica'] ? `${(props['Porcentaje vivienda turistica'] * 100).toFixed(2)}%` : 'N/A'
  );
  setElementText('popup-municipality', props['MUN_LITERAL'] || 'N/A');
  setElementText('popup-province', props['PROV_LITERAL'] || 'N/A');
  
  const mapCanvas = map.getCanvas();
  const mapRect = mapCanvas.getBoundingClientRect();
  
  const point = map.project(lngLat);
  const x = point.x;
  const y = point.y;
  
  popup.style.left = `${x + mapRect.left + 10}px`;
  popup.style.top = `${y + mapRect.top - 100}px`;
  popup.style.display = 'block';
}

// Hide the popup
function hidePopup(): void {
  const popup = document.getElementById('popup');
  if (popup) {
    popup.style.display = 'none';
  }
}

// Zoom to a specific feature
function zoomToFeature(feature: Feature): void {
  if (!map || !feature.geometry) return;
  
  const bounds = new maplibregl.LngLatBounds();
  
  if (feature.geometry.type === 'Polygon') {
    feature.geometry.coordinates[0].forEach(coord => {
      bounds.extend([coord[0], coord[1]]);
    });
  } else if (feature.geometry.type === 'MultiPolygon') {
    feature.geometry.coordinates.forEach(polygon => {
      polygon[0].forEach(coord => {
        bounds.extend([coord[0], coord[1]]);
      });
    });
  }
  
  map.fitBounds(bounds, {
    padding: 50,
    maxZoom: 15,
    duration: 1000
  });
}

// Populate filter dropdowns
function populateFilters(): void {
  const provinceSelect = document.getElementById('province-select') as HTMLSelectElement;
  if (!provinceSelect) {
    console.warn('Province select element not found');
    return;
  }
  
  // Safely set text content with null checks
  const setElementText = (id: string, value: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    } else {
      console.warn(`Element with id ${id} not found`);
    }
  };
  
  // Clear existing options except the first one
  while (provinceSelect.options.length > 1) {
    provinceSelect.remove(1);
  }
  
  // Add province options
  provinces.forEach(province => {
    const option = document.createElement('option');
    option.value = province.code;
    option.textContent = province.name;
    provinceSelect.appendChild(option);
  });
  
  // Update slider value displays
  setElementText('min-accommodations-value', currentFilters.minAccommodations.toString());
  setElementText('max-accommodations-value', currentFilters.maxAccommodations.toString());
}

// Apply filters to the map
function applyFilters(): void {
  if (!map) return;
  
  const filterExpression: any[] = ['all'];
  
  // Filter by accommodation count
  if (currentFilters.minAccommodations > 0) {
    filterExpression.push([
      '>=', 
      ['to-number', ['get', 'vivienda turistica']], 
      currentFilters.minAccommodations
    ]);
  }
  
  if (currentFilters.maxAccommodations < 500) {
    filterExpression.push([
      '<=', 
      ['to-number', ['get', 'vivienda turistica']], 
      currentFilters.maxAccommodations
    ]);
  }
  
  // Filter by province
  if (currentFilters.province !== 'all') {
    filterExpression.push(['==', ['get', 'CPRO'], currentFilters.province]);
  }
  
  // Filter by municipality
  if (currentFilters.municipality !== 'all') {
    filterExpression.push(['==', ['get', 'CMUN'], currentFilters.municipality]);
  }
  
  // Apply the filters with type assertion
  map.setFilter('sections-fill', filterExpression as maplibregl.FilterSpecification);
  map.setFilter('sections-outline', filterExpression as maplibregl.FilterSpecification);
}

// Update municipality dropdown based on selected province
function updateMunicipalityDropdown(): void {
  const municipalitySelect = document.getElementById('municipality-select') as HTMLSelectElement;
  const selectedProvince = currentFilters.province;
  
  // Clear current options except the "All" option
  while (municipalitySelect.options.length > 1) {
    municipalitySelect.remove(1);
  }
  
  // Add municipalities for the selected province
  const filteredMunicipalities = selectedProvince === 'all' 
    ? municipalities 
    : municipalities.filter(m => m.provinceCode === selectedProvince);
  
  filteredMunicipalities.forEach(municipality => {
    const option = document.createElement('option');
    option.value = municipality.code;
    option.textContent = municipality.name;
    municipalitySelect.appendChild(option);
  });
  
  // Reset municipality selection when province changes
  if (currentFilters.municipality !== 'all') {
    currentFilters.municipality = 'all';
    municipalitySelect.value = 'all';
  }
}

// Setup all event listeners
function setupEventListeners(): void {
  // Helper function for safely setting text content
  const setElementText = (id: string, value: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    } else {
      console.warn(`Element with id ${id} not found`);
    }
  };

  // Min accommodations slider
  const minSlider = document.getElementById('min-accommodations') as HTMLInputElement;
  if (minSlider) {
    minSlider.addEventListener('input', () => {
      const value = parseInt(minSlider.value);
      currentFilters.minAccommodations = value;
      setElementText('min-accommodations-value', value.toString());
      applyFilters();
    });
  } else {
    console.warn('Min accommodations slider not found');
  }
  
  // Max accommodations slider
  const maxSlider = document.getElementById('max-accommodations') as HTMLInputElement;
  if (maxSlider) {
    maxSlider.addEventListener('input', () => {
      const value = parseInt(maxSlider.value);
      currentFilters.maxAccommodations = value;
      setElementText('max-accommodations-value', value.toString());
      applyFilters();
    });
  } else {
    console.warn('Max accommodations slider not found');
  }
  
  // Province dropdown
  const provinceSelect = document.getElementById('province-select') as HTMLSelectElement;
  if (provinceSelect) {
    provinceSelect.addEventListener('change', () => {
      currentFilters.province = provinceSelect.value;
      updateMunicipalityDropdown();
      applyFilters();
    });
  } else {
    console.warn('Province select not found');
  }
  
  // Municipality dropdown
  const municipalitySelect = document.getElementById('municipality-select') as HTMLSelectElement;
  if (municipalitySelect) {
    municipalitySelect.addEventListener('change', () => {
      currentFilters.municipality = municipalitySelect.value;
      applyFilters();
    });
  } else {
    console.warn('Municipality select not found');
  }
  
  // Reset button
  const resetButton = document.getElementById('reset-filters');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      resetFilters();
      applyFilters();
    });
  } else {
    console.warn('Reset filters button not found');
  }
}

// Reset all filters to default values
function resetFilters(): void {
  currentFilters = {
    minAccommodations: 0,
    maxAccommodations: 500,
    province: 'all',
    municipality: 'all'
  };
  
  // Helper function for safely setting text content
  const setElementText = (id: string, value: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    } else {
      console.warn(`Element with id ${id} not found`);
    }
  };
  
  // Reset UI elements
  const minSlider = document.getElementById('min-accommodations') as HTMLInputElement;
  if (minSlider) minSlider.value = '0';
  
  const maxSlider = document.getElementById('max-accommodations') as HTMLInputElement;
  if (maxSlider) maxSlider.value = '500';
  
  setElementText('min-accommodations-value', '0');
  setElementText('max-accommodations-value', '500');
  
  const provinceSelect = document.getElementById('province-select') as HTMLSelectElement;
  if (provinceSelect) provinceSelect.value = 'all';
  
  const municipalitySelect = document.getElementById('municipality-select') as HTMLSelectElement;
  if (municipalitySelect) municipalitySelect.value = 'all';
  
  updateMunicipalityDropdown();
  
  // Reset map view
  if (map) {
    map.flyTo({
      center: [DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat],
      zoom: DEFAULT_LOCATION.zoom,
      duration: 1000
    });
  }
}

// Setup toggle sidebar functionality
function setupToggleSidebar(): void {
  const toggleButton = document.getElementById('toggle-sidebar');
  const sidebar = document.getElementById('sidebar');
  
  if (toggleButton && sidebar) {
    toggleButton.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  } else {
    console.warn('Toggle sidebar elements not found');
  }
}

// Show the feature detail modal with all properties
function showFeatureModal(feature: Feature): void {
  const modal = document.getElementById('feature-modal');
  const modalTitle = document.getElementById('feature-modal-title');
  const modalProperties = document.getElementById('feature-modal-properties');
  const closeBtn = document.getElementById('feature-modal-close');
  
  if (!modal || !modalTitle || !modalProperties || !closeBtn) {
    console.warn('Modal elements not found in the DOM');
    return;
  }
  
  // Set the title
  const sectionId = feature.properties.CUSEC || 'Unknown Section';
  modalTitle.textContent = `Census Section: ${sectionId}`;
  
  // Clear existing properties
  modalProperties.innerHTML = '';
  
  // Add all properties to the modal
  const properties = feature.properties;
  Object.keys(properties).sort().forEach(key => {
    // Create property container
    const propertyRow = document.createElement('div');
    propertyRow.classList.add('feature-property-row');
    
    // Create label
    const label = document.createElement('div');
    label.classList.add('feature-property-label');
    label.textContent = formatPropertyLabel(key);
    
    // Create value
    const value = document.createElement('div');
    value.classList.add('feature-property-value');
    
    // Format value based on type
    const propValue = (properties as any)[key];
    if (propValue === null || propValue === undefined) {
      value.textContent = 'N/A';
    } else if (typeof propValue === 'number') {
      // Format percentages specially
      if (key.toLowerCase().includes('porcentaje')) {
        value.textContent = `${(propValue * 100).toFixed(2)}%`;
      } else {
        value.textContent = propValue.toString();
      }
    } else {
      value.textContent = propValue.toString();
    }
    
    // Add label and value to the row
    propertyRow.appendChild(label);
    propertyRow.appendChild(value);
    
    // Add row to the properties container
    modalProperties.appendChild(propertyRow);
  });
  
  // Show the modal
  modal.style.display = 'block';
  
  // Add event listener to close button
  closeBtn.onclick = () => {
    hideFeatureModal();
  };
  
  // Close when clicking outside the modal content
  window.onclick = (event) => {
    if (event.target === modal) {
      hideFeatureModal();
    }
  };
  
  // Close on Escape key
  document.addEventListener('keydown', handleEscKey);
}

// Hide the feature detail modal
function hideFeatureModal(): void {
  const modal = document.getElementById('feature-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Remove event listener
  document.removeEventListener('keydown', handleEscKey);
}

// Handle Escape key for modal
function handleEscKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    hideFeatureModal();
  }
}

// Format property label for better readability
function formatPropertyLabel(label: string): string {
  // Special cases
  if (label === 'vivienda turistica') return 'Tourist Accommodations';
  if (label === 'plazas') return 'Places';
  if (label === 'plazas por vivienda turistica') return 'Places per Accommodation';
  if (label === 'Porcentaje vivienda turistica') return 'Percentage of Tourist Accommodations';
  if (label === 'MUN_LITERAL') return 'Municipality';
  if (label === 'PROV_LITERAL') return 'Province';
  
  // General formatting
  return label
    // Add spaces before capital letters
    .replace(/([A-Z])/g, ' $1')
    // Replace underscores with spaces
    .replace(/_/g, ' ')
    // Capitalize first letter
    .replace(/^./, str => str.toUpperCase())
    // Trim extra spaces
    .trim();
}

// Initialize the application
async function initialize(): Promise<void> {
  try {
    // Make sure all necessary DOM elements exist
    ensureDOMElementsExist();
    
    // Load configuration
    await loadConfig();
    
    // Initialize map
    initializeMap();
    
    // Setup toggle sidebar
    setupToggleSidebar();
  } catch (error) {
    console.error('Error initializing application:', error);
  }
}

// Verify that all necessary DOM elements exist
function ensureDOMElementsExist(): void {
  const requiredElements = [
    'map',
    'popup',
    'feature-modal',
    'feature-modal-title',
    'feature-modal-properties',
    'feature-modal-close'
  ];
  
  const missingElements = requiredElements.filter(id => !document.getElementById(id));
  if (missingElements.length > 0) {
    console.error('Missing DOM elements:', missingElements.join(', '));
    
    // For popup and modal elements, create them if missing
    if (!document.getElementById('popup')) {
      createPopupElement();
    }
    
    if (!document.getElementById('feature-modal')) {
      createModalElement();
    }
  }
}

// Create the popup element if it doesn't exist
function createPopupElement(): void {
  const popup = document.createElement('div');
  popup.id = 'popup';
  popup.className = 'popup';
  
  const popupContent = document.createElement('div');
  popupContent.className = 'popup-content';
  
  const title = document.createElement('h3');
  title.id = 'popup-title';
  title.textContent = 'Census Section';
  
  const table = document.createElement('table');
  table.className = 'popup-table';
  
  // Create table rows
  const createRow = (label: string, valueId: string) => {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.textContent = label;
    const tdValue = document.createElement('td');
    tdValue.id = valueId;
    tdValue.textContent = '-';
    tr.appendChild(tdLabel);
    tr.appendChild(tdValue);
    return tr;
  };
  
  table.appendChild(createRow('Tourist Accommodations:', 'popup-accommodations'));
  table.appendChild(createRow('Number of Places:', 'popup-places'));
  table.appendChild(createRow('Percentage:', 'popup-percentage'));
  table.appendChild(createRow('Municipality:', 'popup-municipality'));
  table.appendChild(createRow('Province:', 'popup-province'));
  
  popupContent.appendChild(title);
  popupContent.appendChild(table);
  popup.appendChild(popupContent);
  
  document.body.appendChild(popup);
  console.log('Created missing popup element');
}

// Create the modal element if it doesn't exist
function createModalElement(): void {
  const modal = document.createElement('div');
  modal.id = 'feature-modal';
  modal.className = 'feature-modal';
  
  modal.innerHTML = `
    <div class="feature-modal-content">
      <div class="feature-modal-header">
        <h3 id="feature-modal-title">Census Section Details</h3>
        <button id="feature-modal-close" class="feature-modal-close">&times;</button>
      </div>
      <div class="feature-modal-body">
        <div id="feature-modal-properties" class="feature-modal-properties">
          <!-- Properties will be populated dynamically -->
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  console.log('Created missing modal element');
}

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the application using the centralized initialize function
  await initialize();
}); 