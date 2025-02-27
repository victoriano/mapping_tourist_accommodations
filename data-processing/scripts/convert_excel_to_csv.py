import polars as pl

# Read the Excel file, specifically the "Secciones" sheet
try:
    excel_file = "../../data/input/exp_viv_turistica_tabla5_NOV2024.xlsx"
    # Polars uses read_excel to read Excel files
    df = pl.read_excel(excel_file, sheet_name="Secciones")
    
    # Convert to CSV
    csv_file = "../../data/input/secciones.csv"
    df.write_csv(csv_file)
    
    print(f"Successfully converted '{excel_file}' sheet 'Secciones' to '{csv_file}'")
    print(f"CSV file contains {len(df)} rows and {len(df.columns)} columns")
    
except Exception as e:
    print(f"Error: {e}") 