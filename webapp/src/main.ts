import * as maplibregl from 'maplibre-gl';
import { FeatureCollection, Feature, FilterOptions } from './types/types';

// Define constants
const DATA_PATH = '/data/output/secciones_with_shapes.geojson';
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

// Initialize the map
function initializeMap(): void {
  map = new maplibregl.Map({
    container: 'map',
    style: 'https://demotiles.maplibre.org/style.json',
    center: [DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat],
    zoom: DEFAULT_LOCATION.zoom,
    maxBounds: [[-10.0, 35.0], [5.0, 44.0]] // Limit view to Spain
  });

  map.addControl(new maplibregl.NavigationControl());
  map.addControl(new maplibregl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true
    },
    trackUserLocation: true
  }));

  map.on('load', () => {
    loadGeoJSONData();
  });
}

// Load the GeoJSON data
async function loadGeoJSONData(): Promise<void> {
  try {
    showLoading(true);
    const response = await fetch(DATA_PATH);
    if (!response.ok) {
      throw new Error('Failed to load GeoJSON data');
    }
    
    geojsonData = await response.json() as FeatureCollection;
    console.log('GeoJSON data loaded successfully:', geojsonData.features.length, 'features');
    
    // Check if the GeoJSON has valid geometry
    if (geojsonData.features.length > 0) {
      const sampleFeature = geojsonData.features[0];
      console.log('Sample feature geometry:', sampleFeature.geometry);
      console.log('Sample feature properties:', sampleFeature.properties);
    }
    
    processData();
    addDataToMap();
    populateFilters();
    setupEventListeners();
    showLoading(false);
    
  } catch (error) {
    console.error('Error loading GeoJSON data:', error);
    alert('Failed to load map data. Please try again later.');
    showLoading(false);
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
    }
  });

  // Add legend
  addLegend();
}

// Create and add the legend to the map
function addLegend(): void {
  const legendContainer = document.createElement('div');
  legendContainer.className = 'legend';
  
  const title = document.createElement('h4');
  title.textContent = 'Tourist Accommodations';
  legendContainer.appendChild(title);
  
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
    legendContainer.appendChild(legendItem);
  });
  
  document.querySelector('.map')?.appendChild(legendContainer);
}

// Show the popup with feature information
function showPopup(feature: Feature, lngLat: maplibregl.LngLat): void {
  const popup = document.getElementById('popup');
  if (!popup) return;
  
  const props = feature.properties;
  
  document.getElementById('popup-title')!.textContent = `Census Section: ${props.CUSEC}`;
  document.getElementById('popup-accommodations')!.textContent = props['vivienda turistica']?.toString() || 'N/A';
  document.getElementById('popup-places')!.textContent = props['plazas']?.toString() || 'N/A';
  document.getElementById('popup-percentage')!.textContent = 
    props['Porcentaje vivienda turistica'] ? `${(props['Porcentaje vivienda turistica'] * 100).toFixed(2)}%` : 'N/A';
  document.getElementById('popup-municipality')!.textContent = props['MUN_LITERAL'] || 'N/A';
  document.getElementById('popup-province')!.textContent = props['PROV_LITERAL'] || 'N/A';
  
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
  // Populate province dropdown
  const provinceSelect = document.getElementById('province-select') as HTMLSelectElement;
  provinces.forEach(province => {
    const option = document.createElement('option');
    option.value = province.code;
    option.textContent = province.name;
    provinceSelect.appendChild(option);
  });
  
  // Populate min/max accommodation values
  document.getElementById('min-accommodations-value')!.textContent = currentFilters.minAccommodations.toString();
  document.getElementById('max-accommodations-value')!.textContent = currentFilters.maxAccommodations.toString();
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
  // Min accommodations slider
  const minSlider = document.getElementById('min-accommodations') as HTMLInputElement;
  minSlider.addEventListener('input', () => {
    const value = parseInt(minSlider.value);
    currentFilters.minAccommodations = value;
    document.getElementById('min-accommodations-value')!.textContent = value.toString();
    applyFilters();
  });
  
  // Max accommodations slider
  const maxSlider = document.getElementById('max-accommodations') as HTMLInputElement;
  maxSlider.addEventListener('input', () => {
    const value = parseInt(maxSlider.value);
    currentFilters.maxAccommodations = value;
    document.getElementById('max-accommodations-value')!.textContent = value.toString();
    applyFilters();
  });
  
  // Province dropdown
  const provinceSelect = document.getElementById('province-select') as HTMLSelectElement;
  provinceSelect.addEventListener('change', () => {
    currentFilters.province = provinceSelect.value;
    updateMunicipalityDropdown();
    applyFilters();
  });
  
  // Municipality dropdown
  const municipalitySelect = document.getElementById('municipality-select') as HTMLSelectElement;
  municipalitySelect.addEventListener('change', () => {
    currentFilters.municipality = municipalitySelect.value;
    applyFilters();
  });
  
  // Reset filters button
  const resetButton = document.getElementById('reset-filters');
  resetButton?.addEventListener('click', () => {
    // Reset filters to default values
    currentFilters = {
      minAccommodations: 0,
      maxAccommodations: 500,
      province: 'all',
      municipality: 'all'
    };
    
    // Reset UI elements
    minSlider.value = '0';
    maxSlider.value = '500';
    provinceSelect.value = 'all';
    municipalitySelect.value = 'all';
    document.getElementById('min-accommodations-value')!.textContent = '0';
    document.getElementById('max-accommodations-value')!.textContent = '500';
    
    // Update dropdown and apply filters
    updateMunicipalityDropdown();
    applyFilters();
    
    // Reset map view
    map.flyTo({
      center: [DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat],
      zoom: DEFAULT_LOCATION.zoom,
      duration: 1000
    });
  });
  
  // Toggle sidebar button
  const toggleButton = document.getElementById('toggle-sidebar');
  const sidebar = document.getElementById('sidebar');
  toggleButton?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initializeMap();
}); 