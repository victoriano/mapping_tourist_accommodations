#!/bin/bash
# Setup script for Cloudflare R2 integration

# Install Python dependencies with UV
echo "Installing required Python packages..."
uv pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "Please edit the .env file with your Cloudflare R2 credentials:"
    echo "nano .env"
    echo ""
    echo "You'll need the following information from your Cloudflare R2 dashboard:"
    echo "- Account ID (for the endpoint URL)"
    echo "- R2 Access Key ID"
    echo "- R2 Secret Access Key"
    echo "- Bucket name"
    echo "- Public URL (if you have a custom domain or public access URL)"
    echo ""
else
    echo ".env file already exists. If you need to update your R2 credentials, edit it manually."
fi

echo "Setup completed!"
echo ""
echo "To generate and upload your GeoJSON data to R2, run:"
echo "cd data-processing/scripts"
echo "uv run merge_shapes_with_csv.py" 