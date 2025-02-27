import geopandas as gpd
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Read the merged shapefile
print("Reading merged shapefile...")
merged_file = "../../data/output/secciones_with_shapes.shp"
gdf = gpd.read_file(merged_file)

# Print basic information
print(f"Merged data has {len(gdf)} rows and {len(gdf.columns)} columns")
print("Columns:", gdf.columns.tolist())

# Check for missing values in key columns
print("\nMissing values in key columns:")
for col in ['CUSEC', 'vivienda turistica', 'plazas', 'Porcentaje vivienda turistica']:
    if col in gdf.columns:
        missing = gdf[col].isna().sum()
        total = len(gdf)
        print(f"{col}: {missing} missing values ({missing/total:.2%})")

# Create a simple visualization of the data
print("\nCreating visualization...")
fig, ax = plt.subplots(1, 1, figsize=(12, 10))

# If 'vivienda turistica' column exists, use it for coloring
if 'vivienda turistica' in gdf.columns:
    # Convert to numeric if needed
    if gdf['vivienda turistica'].dtype == 'object':
        gdf['vivienda turistica'] = pd.to_numeric(gdf['vivienda turistica'], errors='coerce')
    
    # Create bins for coloring
    max_value = gdf['vivienda turistica'].max()
    bins = [0, 1, 5, 10, 50, 100, max_value]
    
    # Plot with color based on number of tourist accommodations
    gdf.plot(column='vivienda turistica', 
             ax=ax,
             cmap='OrRd', 
             scheme='user_defined',
             classification_kwds={'bins': bins},
             legend=True,
             legend_kwds={'title': 'Tourist Accommodations'})
else:
    # Just plot the shapes if the column doesn't exist
    gdf.plot(ax=ax)

plt.title('Tourist Accommodations by Census Section')
plt.savefig('../../data/output/tourist_accommodations_map.png', dpi=300, bbox_inches='tight')
print("Visualization saved as '../../data/output/tourist_accommodations_map.png'")

# Print some statistics
if 'vivienda turistica' in gdf.columns:
    print("\nStatistics for tourist accommodations:")
    print(f"Total tourist accommodations: {gdf['vivienda turistica'].sum()}")
    print(f"Maximum in a single section: {gdf['vivienda turistica'].max()}")
    print(f"Average per section: {gdf['vivienda turistica'].mean():.2f}")
    
    # Top 10 sections with most tourist accommodations
    print("\nTop 10 sections with most tourist accommodations:")
    top10 = gdf.sort_values('vivienda turistica', ascending=False).head(10)
    for idx, row in top10.iterrows():
        print(f"CUSEC: {row['CUSEC']}, Tourist Accommodations: {row['vivienda turistica']}, Municipality: {row['MUN_LITERAL'] if 'MUN_LITERAL' in row else 'N/A'}") 