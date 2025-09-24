#!/bin/bash

echo "🔧 Setting up PostgreSQL for Ternus Pricing Engine..."

# Connect to PostgreSQL as the current user and set up the pricing database
echo "🏗️ Setting up database and user..."

# Create the pricing engine user and database
psql postgres << EOF
-- Create user if it doesn't exist
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'pricing_user') THEN
      CREATE USER pricing_user WITH PASSWORD 'pricing_password';
   END IF;
END
\$\$;

-- Grant necessary privileges
ALTER USER pricing_user CREATEDB;

-- Drop and recreate database
DROP DATABASE IF EXISTS ternus_pricing_engine;
CREATE DATABASE ternus_pricing_engine OWNER pricing_user;
GRANT ALL PRIVILEGES ON DATABASE ternus_pricing_engine TO pricing_user;

-- Display confirmation
\l
EOF

# Run the schema setup
echo "📊 Running database schema setup..."
PGPASSWORD=pricing_password psql -h localhost -U pricing_user -d ternus_pricing_engine -f create_database.sql

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL setup complete!"
    echo "📋 Connection details:"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: ternus_pricing_engine"
    echo "  User: pricing_user"
    echo "  Password: pricing_password"
    
    # Test connection
    echo "🧪 Testing connection..."
    PGPASSWORD=pricing_password psql -h localhost -U pricing_user -d ternus_pricing_engine -c "SELECT 'Connection successful!' as status;"
else
    echo "❌ Failed to set up database schema"
fi 