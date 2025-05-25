# Migrating from Supabase to Local PostgreSQL

This document summarizes the changes made to migrate the application from Supabase to a local PostgreSQL database.

## Files Created

1. **lib/db.ts**: PostgreSQL connection pool and query utilities
2. **lib/dbService.ts**: Database service layer that works with both Supabase and local PostgreSQL
3. **scripts/init-local-db.sh**: Script to initialize the local PostgreSQL database
4. **supabase/migrations/20240101000000_create_series_table.sql**: Migration to create the series tables
5. **README_LOCAL_PG.md**: Documentation for using local PostgreSQL

## Files Modified

1. **lib/supabaseClient.ts**: Updated to support both Supabase and local PostgreSQL
2. **app/page.tsx**: Updated to use the database service instead of direct Supabase client

## How It Works

The application now supports both Supabase and local PostgreSQL through a feature flag:

- When `USE_LOCAL_PG=true`, the application uses the local PostgreSQL database
- When `USE_LOCAL_PG` is not set or is `false`, the application uses Supabase

The database service layer (`dbService`) provides a consistent interface for database operations regardless of which backend is being used.

## Setup Instructions

See the detailed setup instructions in [README_LOCAL_PG.md](./README_LOCAL_PG.md).

## Next Steps

1. Update other components and pages to use the database service instead of direct Supabase client
2. Add more database operations to the database service as needed
3. Consider implementing authentication for the local PostgreSQL setup 