import geopandas as gpd

# Read the shapefile
shapefile_path = "../../data/input/seccionado_2024/SECC_CE_20240101.shp"
gdf = gpd.read_file(shapefile_path)

# Print basic information
print("Shapefile columns:")
print(gdf.columns.tolist())
print("\nFirst few rows:")
print(gdf.head(3))

# Print unique values for potential join columns
print("\nPotential join columns:")
for col in gdf.columns:
    if "CUSEC" in col or "COD" in col or "ID" in col:
        print(f"\n{col} - first 5 values: {gdf[col].head(5).tolist()}") 