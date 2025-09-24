#!/usr/bin/env python3
"""
PostgreSQL Setup Script for Ternus Borrower Portal
This script helps create the database and user for the application
"""

import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_database_and_user():
    """Create PostgreSQL database and user"""
    
    # Default PostgreSQL connection (usually to 'postgres' database)
    default_config = {
        'host': 'localhost',
        'port': '5432',
        'database': 'postgres',  # Connect to default database first
        'user': 'postgres',      # Default superuser
        'password': input("Enter PostgreSQL admin password: ")
    }
    
    # Application database configuration
    app_config = {
        'database': 'ternus_borrower',
        'user': 'ternus_user',
        'password': 'ternus_password'
    }
    
    try:
        print("🐘 PostgreSQL Setup for Ternus Borrower Portal")
        print("==================================================")
        
        # Check if psycopg2 is available
        try:
            import psycopg2
            print("✅ psycopg2 is installed")
        except ImportError:
            print("❌ psycopg2 not found. Install with:")
            print("   pip install psycopg2-binary")
            return False
        
        print("Connecting to PostgreSQL...")
        
        # Connect to PostgreSQL as admin
        with psycopg2.connect(**default_config) as conn:
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            with conn.cursor() as cursor:
                
                # Create database if it doesn't exist
                cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = %s", 
                             (app_config['database'],))
                exists = cursor.fetchone()
                
                if not exists:
                    print(f"Creating database '{app_config['database']}'...")
                    cursor.execute(f'CREATE DATABASE "{app_config["database"]}"')
                    print("✅ Database created successfully")
                else:
                    print(f"✅ Database '{app_config['database']}' already exists")
                
                # Create user if it doesn't exist
                cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", 
                             (app_config['user'],))
                user_exists = cursor.fetchone()
                
                if not user_exists:
                    print(f"Creating user '{app_config['user']}'...")
                    cursor.execute(f'''
                        CREATE USER "{app_config['user']}" 
                        WITH PASSWORD '{app_config['password']}'
                    ''')
                    print("✅ User created successfully")
                else:
                    print(f"✅ User '{app_config['user']}' already exists")
                
                # Grant privileges on database
                print("Granting privileges...")
                cursor.execute(f'''
                    GRANT ALL PRIVILEGES ON DATABASE "{app_config['database']}" 
                    TO "{app_config['user']}"
                ''')
                
        # Now connect to the application database to grant schema permissions
        app_db_config = {
            'host': 'localhost',
            'port': '5432',
            'database': app_config['database'],
            'user': 'postgres',
            'password': default_config['password']
        }
        
        print("Setting up schema permissions...")
        with psycopg2.connect(**app_db_config) as conn:
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            
            with conn.cursor() as cursor:
                # Grant all privileges on public schema
                cursor.execute(f'''
                    GRANT ALL PRIVILEGES ON SCHEMA public TO "{app_config['user']}"
                ''')
                
                # Grant privileges on all existing tables
                cursor.execute(f'''
                    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public 
                    TO "{app_config['user']}"
                ''')
                
                # Grant privileges on all existing sequences
                cursor.execute(f'''
                    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public 
                    TO "{app_config['user']}"
                ''')
                
                # Set default privileges for future objects
                cursor.execute(f'''
                    ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                    GRANT ALL ON TABLES TO "{app_config['user']}"
                ''')
                
                cursor.execute(f'''
                    ALTER DEFAULT PRIVILEGES IN SCHEMA public 
                    GRANT ALL ON SEQUENCES TO "{app_config['user']}"
                ''')
                
                print("✅ Schema permissions granted successfully")
        
        print("\n🎉 PostgreSQL setup completed successfully!")
        print("\n📝 Add these environment variables to your .env file:")
        print("POSTGRES_HOST=localhost")
        print("POSTGRES_PORT=5432")
        print(f"POSTGRES_DB={app_config['database']}")
        print(f"POSTGRES_USER={app_config['user']}")
        print(f"POSTGRES_PASSWORD={app_config['password']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    create_database_and_user() 