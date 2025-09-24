#!/bin/bash

echo "🔧 Setting up PostgreSQL for Ternus Pricing Engine..."

# Install PostgreSQL if not already installed
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    brew install postgresql@14
    brew services start postgresql@14
else
    echo "✅ PostgreSQL already installed"
fi

# Start PostgreSQL service
echo "🚀 Starting PostgreSQL service..."
brew services start postgresql@14

# Wait for PostgreSQL to start
sleep 3

# Create database and user
echo "🏗️ Setting up database and user..."

# Create the pricing engine user and database
psql postgres -c "CREATE USER pricing_user WITH PASSWORD 'pricing_password';" 2>/dev/null || echo "User might already exist"
psql postgres -c "ALTER USER pricing_user CREATEDB;" 2>/dev/null
psql postgres -c "DROP DATABASE IF EXISTS ternus_pricing_engine;" 2>/dev/null
psql postgres -c "CREATE DATABASE ternus_pricing_engine OWNER pricing_user;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE ternus_pricing_engine TO pricing_user;"

echo "📊 Running database schema setup..."
PGPASSWORD=pricing_password psql -h localhost -U pricing_user -d ternus_pricing_engine -f create_database.sql

echo "✅ PostgreSQL setup complete!"
echo "📋 Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: ternus_pricing_engine"
echo "  User: pricing_user"
echo "  Password: pricing_password" 