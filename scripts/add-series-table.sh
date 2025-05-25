#!/bin/bash

# Exit on error
set -e

# Database configuration - read from .env.local if available
if [ -f .env.local ]; then
  source .env.local
fi

# Use environment variables or defaults
DB_NAME=${POSTGRES_DB:-pdp_movie}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}

echo "Adding series tables to database: $DB_NAME"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed. Please install it first:"
    echo "sudo apt update && sudo apt install -y postgresql postgresql-contrib"
    exit 1
fi

# Check if PostgreSQL service is running
if ! systemctl is-active --quiet postgresql; then
    echo "PostgreSQL service is not running. Starting it..."
    sudo systemctl start postgresql
fi

# Run the SQL script
echo "Running add-series-table.sql script..."
sudo -u postgres psql -d $DB_NAME -f scripts/add-series-table.sql

echo "Series tables have been added successfully!"
echo "You can now run the application with USE_LOCAL_PG=true" 