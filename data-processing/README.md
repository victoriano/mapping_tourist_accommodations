# Data Processing

This folder contains Python scripts for processing geographic data related to tourist accommodations in Spain.

## Scripts

- `examine_shapefile.py` - Examines the structure of shapefile data
- `convert_excel_to_csv.py` - Converts Excel data to CSV format
- `merge_shapes_with_csv.py` - Merges shapefile data with CSV data
- `visualize_merged_data.py` - Creates a visualization of the merged data

## Usage

1. Install the required dependencies:
   ```bash
   uv pip install -r requirements.txt
   ```

2. Run the desired script:
   ```bash
   uv run scripts/merge_shapes_with_csv.py
   ```

## Data

- Input data is located in `../data/input/`
- Output data is stored in `../data/output/` 