# Using Local PostgreSQL Database

This guide explains how to set up and use a local PostgreSQL database instead of Supabase for the PDP Movie application.

## Prerequisites

- Ubuntu server or desktop
- PostgreSQL installed
- Node.js and npm installed

## Installation Steps

### 1. Install PostgreSQL (if not already installed)

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

### 2. Clone the repository

```bash
git clone <your-repository-url>
cd pdp-movie
```

### 3. Set up the database

Run the initialization script:

```bash
chmod +x scripts/init-local-db.sh
cd scripts
./init-local-db.sh
cd ..
```

The script will:
- Create a database named `pdp_movie` (or the name specified in your environment variables)
- Enable the UUID extension
- Import the schema from `supabase/schema.sql`

### 4. Configure environment variables

Create a `.env.local` file in the project root:

```bash
touch .env.local
```

Add the following environment variables:

```
# Set to 'true' to use local PostgreSQL instead of Supabase
USE_LOCAL_PG=true

# Local PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=pdp_movie
```

Adjust the values according to your PostgreSQL setup.

### 5. Install dependencies and run the application

```bash
npm install
npm run dev
```

## Switching Between Supabase and Local PostgreSQL

To use Supabase:
- Set `USE_LOCAL_PG=false` or remove it from your `.env.local` file
- Ensure your Supabase credentials are properly set:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  ```

To use local PostgreSQL:
- Set `USE_LOCAL_PG=true` in your `.env.local` file
- Ensure your PostgreSQL credentials are properly set

## Troubleshooting

### PostgreSQL Connection Issues

If you encounter connection issues:

1. Check if PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Verify your database exists:
   ```bash
   sudo -u postgres psql -c "\l" | grep pdp_movie
   ```

3. Check PostgreSQL log files:
   ```bash
   sudo tail -f /var/log/postgresql/postgresql-*.log
   ```

### Permission Issues

If you encounter permission issues:

1. Make sure your PostgreSQL user has the necessary permissions:
   ```bash
   sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pdp_movie TO postgres;"
   ```

2. Check pg_hba.conf configuration:
   ```bash
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   ```
   
   Ensure it has appropriate entries for local connections, for example:
   ```
   local   all             postgres                                peer
   host    all             all             127.0.0.1/32            md5
   host    all             all             ::1/128                 md5
   ```

3. Restart PostgreSQL after making changes:
   ```bash
   sudo systemctl restart postgresql
   ```