import geopandas as gpd
import polars as pl
import pandas as pd
import os
import json
from pathlib import Path
from datetime import datetime

# Import R2 utilities
try:
    from r2_utils import upload_file_to_r2, get_public_url
    r2_available = True
    print("R2 utilities imported successfully")
except ImportError:
    r2_available = False
    print("R2 utilities not available, falling back to local storage only")

# Read the shapefile
print("Reading shapefile...")
shapefile_path = "../../data/input/seccionado_2024/SECC_CE_20240101.shp"
gdf = gpd.read_file(shapefile_path)
print(f"Shapefile loaded with {len(gdf)} rows")

# Check the CRS (Coordinate Reference System)
print(f"Original CRS: {gdf.crs}")

# If not already in WGS84 (EPSG:4326), convert to it for web mapping
if gdf.crs != "EPSG:4326":
    print("Converting to WGS84 (EPSG:4326) for web mapping...")
    gdf = gdf.to_crs("EPSG:4326")
    print(f"New CRS: {gdf.crs}")

# Read the CSV file with Polars
print("Reading CSV file...")
csv_file = "../../data/input/secciones.csv"
df_pl = pl.read_csv(csv_file)
print(f"CSV file loaded with {len(df_pl)} rows")

# Convert Polars DataFrame to Pandas for compatibility with GeoPandas
df_pd = df_pl.to_pandas()

# Ensure the join column is of the same type in both dataframes
gdf['CUSEC'] = gdf['CUSEC'].astype(str)
df_pd['CUSEC'] = df_pd['CUSEC'].astype(str)

# Merge the data
print("Merging data...")
merged_gdf = gdf.merge(df_pd, on='CUSEC', how='left')
print(f"Merged data has {len(merged_gdf)} rows")

# Check for unmatched rows
unmatched_count = merged_gdf['vivienda turistica'].isna().sum()
print(f"Number of shapefile rows without matching CSV data: {unmatched_count}")

# Simplify geometries to reduce file size for web use (tolerance in degrees)
print("Simplifying geometries for web use...")
merged_gdf['geometry'] = merged_gdf['geometry'].simplify(tolerance=0.0001)

# Save the merged data as a new shapefile
output_shapefile = "../../data/output/secciones_with_shapes.shp"
print(f"Saving merged data to {output_shapefile}...")
merged_gdf.to_file(output_shapefile)

# Also save as GeoJSON for easier web use
output_geojson = "../../data/output/secciones_with_shapes.geojson"
print(f"Saving merged data to {output_geojson}...")
merged_gdf.to_file(output_geojson, driver='GeoJSON')

# Upload to R2 if available
r2_url = None
if r2_available:
    print("Uploading GeoJSON to Cloudflare R2...")
    # Create a version with timestamp for versioning
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    r2_key = f"data/secciones_with_shapes_{timestamp}.geojson"
    
    # Also create a "latest" version that will always be overwritten
    r2_key_latest = "data/secciones_with_shapes_latest.geojson"
    
    # Upload the timestamped version
    success, versioned_url = upload_file_to_r2(
        output_geojson, 
        r2_key=r2_key, 
        content_type="application/geo+json"
    )
    
    if success:
        print(f"Uploaded timestamped version to: {versioned_url}")
        
        # Upload the "latest" version
        success_latest, latest_url = upload_file_to_r2(
            output_geojson, 
            r2_key=r2_key_latest, 
            content_type="application/geo+json"
        )
        
        if success_latest:
            print(f"Uploaded latest version to: {latest_url}")
            r2_url = latest_url
            
            # Save the URL to a config file for the webapp
            config = {
                "dataUrl": latest_url,
                "lastUpdated": datetime.now().isoformat(),
                "versionedUrl": versioned_url
            }
            
            # Save in data-processing folder for reference
            config_path = "../../data-processing/data_config.json"
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            print(f"Saved data config to {config_path}")
            
            # Also save in webapp public folder for the webapp to access
            webapp_config_path = "../../webapp/public/data-config.json"
            os.makedirs(os.path.dirname(webapp_config_path), exist_ok=True)
            with open(webapp_config_path, 'w') as f:
                json.dump(config, f, indent=2)
            print(f"Saved data config to {webapp_config_path} for webapp access")
        else:
            print("Failed to upload latest version to R2")
    else:
        print("Failed to upload GeoJSON to R2")
else:
    print("R2 upload skipped (R2 utilities not available)")

print("Merge completed successfully!") 