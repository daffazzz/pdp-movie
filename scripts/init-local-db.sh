#!/bin/bash

# Exit on error
set -e

# Database configuration
DB_NAME=${POSTGRES_DB:-pdp_movie}
DB_USER=${POSTGRES_USER:-postgres}
DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}

echo "Initializing local PostgreSQL database: $DB_NAME"

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

# Create database if it doesn't exist
echo "Creating database if it doesn't exist..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE $DB_NAME"

# Enable uuid-ossp extension
echo "Enabling uuid-ossp extension..."
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Import base schema
echo "Importing base schema from supabase/schema.sql..."
sudo -u postgres psql -d $DB_NAME -f ../supabase/schema.sql

# Apply migrations
echo "Applying migrations..."
for migration in ../supabase/migrations/*.sql; do
    echo "Applying migration: $migration"
    sudo -u postgres psql -d $DB_NAME -f "$migration"
done

echo "Database initialization complete!"
echo "You can now run the application with the environment variable USE_LOCAL_PG=true"
echo "Example: USE_LOCAL_PG=true npm run dev" 