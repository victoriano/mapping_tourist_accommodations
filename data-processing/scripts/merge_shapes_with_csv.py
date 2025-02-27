import geopandas as gpd
import polars as pl
import pandas as pd

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

print("Merge completed successfully!") 