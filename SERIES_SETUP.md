# Setting Up Series Tables on Ubuntu

This guide explains how to set up the series tables in your local PostgreSQL database on Ubuntu.

## Prerequisites

1. PostgreSQL installed on your Ubuntu system
2. The pdp-movie database already created
3. Node.js and npm installed

## Option 1: Using SQL Script (Recommended)

This method directly creates the tables in your local PostgreSQL database.

1. Clone the repository to your Ubuntu machine:
   ```bash
   git clone <repository-url>
   cd pdp-movie
   ```

2. Make the script executable:
   ```bash
   chmod +x scripts/add-series-table.sh
   ```

3. Run the script:
   ```bash
   ./scripts/add-series-table.sh
   ```

4. The script will:
   - Check if PostgreSQL is installed and running
   - Create the series, episodes, and episode_subtitles tables
   - Add a sample series (Stranger Things) if the table is empty

5. Create a `.env.local` file in the project root with your database credentials:
   ```
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://dkhblpxugaxynqqiqdbn.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRraGJscHh1Z2F4eW5xcWlxZGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MTE3ODIsImV4cCI6MjA2MDk4Nzc4Mn0.XyJYSMikdcf1j0Z7I-Ea1DDB_zmRpT8jYCmKo-LYA9k

   # Local PostgreSQL Configuration
   USE_LOCAL_PG=true
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=pdp_movie
   POSTGRES_USE_SSL=false
   ```

6. Run the application:
   ```bash
   npm run dev
   ```

## Option 2: Migrating Data from Supabase

If you want to copy the series data from Supabase to your local PostgreSQL:

1. Install the required dependencies:
   ```bash
   npm install dotenv pg @supabase/supabase-js
   ```

2. Create a `.env.local` file as shown in Option 1.

3. Run the migration script:
   ```bash
   node scripts/migrate-series-data.js
   ```

4. The script will:
   - Fetch all series, episodes, and episode subtitles from Supabase
   - Insert them into your local PostgreSQL database
   - Handle any conflicts by updating existing records

5. Run the application with local PostgreSQL:
   ```bash
   USE_LOCAL_PG=true npm run dev
   ```

## Troubleshooting

### Table Does Not Exist Error
If you see "Series table does not exist in local database" in the logs:
- Make sure you've run the `add-series-table.sh` script
- Check if the script executed without errors
- Verify the table exists by running:
  ```bash
  sudo -u postgres psql -d pdp_movie -c "\dt"
  ```

### Connection Issues
If you have connection issues with PostgreSQL:
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Verify your credentials in `.env.local`
- Make sure your PostgreSQL is configured to accept connections

### Empty Series List
If no series appear in the application:
- Check if the series table has data:
  ```bash
  sudo -u postgres psql -d pdp_movie -c "SELECT COUNT(*) FROM series"
  ```
- If empty, run the migration script to import data from Supabase 