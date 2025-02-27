"""
Utility functions for Cloudflare R2 storage operations.
"""

import os
import boto3
from dotenv import load_dotenv
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# R2 Configuration
R2_ENDPOINT = os.getenv('R2_ENDPOINT')
R2_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID')
R2_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY')
R2_BUCKET_NAME = os.getenv('R2_BUCKET_NAME')
R2_PUBLIC_URL = os.getenv('R2_PUBLIC_URL', '').rstrip('/')

def get_r2_client():
    """
    Create and return a boto3 S3 client configured for Cloudflare R2.
    """
    if not all([R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY]):
        logger.error("R2 credentials not found in environment variables")
        return None
    
    try:
        client = boto3.client(
            's3',
            endpoint_url=R2_ENDPOINT,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY
        )
        return client
    except Exception as e:
        logger.error(f"Failed to create R2 client: {e}")
        return None

def upload_file_to_r2(local_file_path, r2_key=None, content_type=None):
    """
    Upload a file to Cloudflare R2.
    
    Args:
        local_file_path: Path to the local file
        r2_key: Key (path) in R2 bucket. If None, uses the file name
        content_type: MIME type of the file. If None, guessed from extension
    
    Returns:
        tuple: (success: bool, url: str or None)
    """
    if not R2_BUCKET_NAME:
        logger.error("R2_BUCKET_NAME not set in environment variables")
        return False, None
    
    # Create R2 client
    r2_client = get_r2_client()
    if not r2_client:
        return False, None
    
    # Default to filename if r2_key not provided
    if r2_key is None:
        r2_key = os.path.basename(local_file_path)
    
    # Guess content type based on file extension if not provided
    if content_type is None:
        content_type = guess_content_type(local_file_path)
    
    # Upload the file
    try:
        logger.info(f"Uploading {local_file_path} to R2 as {r2_key}")
        
        # Extra options for public access and appropriate content type
        extra_args = {
            'ContentType': content_type,
            'ACL': 'public-read'  # Make the file publicly accessible
        }
        
        with open(local_file_path, 'rb') as file_data:
            r2_client.upload_fileobj(
                file_data, 
                R2_BUCKET_NAME, 
                r2_key,
                ExtraArgs=extra_args
            )
        
        # Generate the public URL
        if R2_PUBLIC_URL:
            public_url = f"{R2_PUBLIC_URL}/{r2_key}"
        else:
            public_url = f"{R2_ENDPOINT}/{R2_BUCKET_NAME}/{r2_key}"
        
        logger.info(f"Upload successful. Public URL: {public_url}")
        return True, public_url
    
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return False, None

def guess_content_type(file_path):
    """
    Guess the MIME type based on file extension.
    """
    extension = os.path.splitext(file_path)[1].lower()
    content_types = {
        '.json': 'application/json',
        '.geojson': 'application/geo+json',
        '.csv': 'text/csv',
        '.txt': 'text/plain',
        '.shp': 'application/octet-stream',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif'
    }
    return content_types.get(extension, 'application/octet-stream')

def list_files_in_r2(prefix=None):
    """
    List files in the R2 bucket with an optional prefix.
    
    Args:
        prefix: Optional path prefix to filter results
        
    Returns:
        list of dictionaries with keys: key, size, last_modified
    """
    r2_client = get_r2_client()
    if not r2_client:
        return []
    
    try:
        if prefix:
            response = r2_client.list_objects_v2(Bucket=R2_BUCKET_NAME, Prefix=prefix)
        else:
            response = r2_client.list_objects_v2(Bucket=R2_BUCKET_NAME)
        
        files = []
        if 'Contents' in response:
            for item in response['Contents']:
                files.append({
                    'key': item['Key'],
                    'size': item['Size'],
                    'last_modified': item['LastModified']
                })
        return files
    
    except Exception as e:
        logger.error(f"Failed to list files: {e}")
        return []

def get_public_url(r2_key):
    """
    Generate a public URL for a file in R2.
    
    Args:
        r2_key: The key (path) of the file in R2
        
    Returns:
        str: Public URL
    """
    if R2_PUBLIC_URL:
        return f"{R2_PUBLIC_URL}/{r2_key}"
    else:
        return f"{R2_ENDPOINT}/{R2_BUCKET_NAME}/{r2_key}" 