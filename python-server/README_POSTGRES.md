# PostgreSQL Setup for Ternus Borrower Portal

The application now uses PostgreSQL instead of SQLite for better performance and scalability.

## Option 1: Docker Setup (Recommended)

The easiest way to set up PostgreSQL is using Docker:

```bash
# Start PostgreSQL and pgAdmin
docker-compose up -d

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs postgres
```

**Services:**
- PostgreSQL: `localhost:5432`
- pgAdmin (Web UI): `http://localhost:8080`
  - Email: `admin@ternus.com`
  - Password: `admin123`

## Option 2: Local PostgreSQL Installation

### macOS (using Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Create database and user
python setup_postgres.py
```

### Ubuntu/Debian
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
python setup_postgres.py
```

### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install and follow the setup wizard
3. Run `python setup_postgres.py`

## Environment Configuration

Create a `.env` file in the python-server directory:

```bash
# Copy the example file
cp env.example .env
```

Update the PostgreSQL configuration in `.env`:

```env
# PostgreSQL Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ternus_borrower
POSTGRES_USER=ternus_user
POSTGRES_PASSWORD=ternus_password
```

## Database Tables

The application will automatically create these tables:

- **users**: Auth0 user → Salesforce contact mapping
- **invitations**: Secure invitation tokens for user onboarding
- **sessions**: Active JWT sessions

## Testing the Connection

Start the Python server to test the database connection:

```bash
# Activate virtual environment
source venv/bin/activate

# Start the server
python main.py
```

You should see:
```
INFO:auth_service:✅ Database initialized successfully
INFO:auth_service:✅ Auth service initialized
```

## Troubleshooting

### Connection Issues
1. Ensure PostgreSQL is running:
   ```bash
   # Docker
   docker-compose ps
   
   # Local installation
   pg_isready -h localhost -p 5432
   ```

2. Check credentials in `.env` file
3. Verify database exists:
   ```bash
   psql -h localhost -U ternus_user -d ternus_borrower
   ```

### Permission Issues
Make sure the user has proper permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE ternus_borrower TO ternus_user;
ALTER USER ternus_user CREATEDB;
```

## Migration from SQLite

The application will automatically create the PostgreSQL tables on first run. No manual migration is needed since we're starting fresh with the auth system.

## Backup and Restore

### Backup
```bash
pg_dump -h localhost -U ternus_user ternus_borrower > backup.sql
```

### Restore
```bash
psql -h localhost -U ternus_user ternus_borrower < backup.sql
``` 