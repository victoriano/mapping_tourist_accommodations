# Data Input Directory

This directory should contain the input data files needed for the application. The files are not included in the repository due to their large size, but can be downloaded from the sources below.

## Required Data Files

### Census Sections (Secciones Censales) 2024

1. Download the census sections shapefile data from the Spanish National Statistics Institute (INE) website:
   - URL: [https://www.ine.es/ss/Satellite?L=es_ES&c=Page&cid=1259952026632&p=1259952026632&pagename=ProductosYServicios%2FPYSLayout#](https://www.ine.es/ss/Satellite?L=es_ES&c=Page&cid=1259952026632&p=1259952026632&pagename=ProductosYServicios%2FPYSLayout#)
   - Look for the section "Cartografía digitalizada" and download the "Secciones Censales" for 2024
   - The file should be named something like "SECC_CPV_E_20240101_ESPAÑA"

2. After downloading, decompress the zip file to extract the following files:
   - .shp (Shapefile)
   - .shx (Shape index file)
   - .dbf (dBASE table)
   - .prj (Projection file)
   - .cpg (Character encoding file)

3. Place all extracted files in this directory (data/input)

### Tourist Accommodations Data (Viviendas Turísticas)

1. Download the tourist accommodations data from the following sources:

   a. Main dataset:
      - URL: [https://www.ine.es/experimental/viv_turistica/exp_viv_turistica_tablas.htm](https://www.ine.es/experimental/viv_turistica/exp_viv_turistica_tablas.htm)
      - Download the most recent Excel file with tourist accommodation data by census sections

   b. Additional information:
      - URL: [https://www.ine.es/experimental/viv_turistica/exp_viv_turistica_descarga.htm](https://www.ine.es/experimental/viv_turistica/exp_viv_turistica_descarga.htm)
      - Download any supplementary data files related to tourist accommodations

2. Place the downloaded Excel files in this directory (data/input)

## Processing the Data

After placing all the required files in this directory, run the data processing scripts from the project root to generate the GeoJSON files needed by the application.

> **Important**: Always use `uv` to run Python scripts in this project for faster execution and better dependency management.

```bash
# Convert Excel data to CSV
uv run data-processing/scripts/convert_excel_to_csv.py

# Merge shape data with tourist accommodation data
uv run data-processing/scripts/merge_shapes_with_csv.py
```

The processed output files will be saved in the `data/output` directory. 