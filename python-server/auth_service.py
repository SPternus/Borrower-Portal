#!/usr/bin/env python3
"""
Auth0 Service for Ternus Borrower Portal
Handles JWT validation, user authentication, and contact ID mapping
"""

import os
import json
import jwt
import time
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import HTTPException, status
import logging
import psycopg2
import sqlite3
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TernusAuthService:
    def __init__(self, salesforce_connector=None):
        """Initialize Auth0 service with configuration"""
        
        # Auth0 Configuration
        self.auth0_domain = os.getenv('AUTH0_DOMAIN', 'ternus-dev.auth0.com')
        self.auth0_audience = os.getenv('AUTH0_AUDIENCE', 'https://ternus-borrower-api')
        self.auth0_client_id = os.getenv('AUTH0_CLIENT_ID', 'your_auth0_client_id')
        self.auth0_client_secret = os.getenv('AUTH0_CLIENT_SECRET', 'your_auth0_client_secret')
        
        # JWT Configuration
        self.jwt_secret = os.getenv('JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production')
        self.jwt_algorithm = 'HS256'
        self.jwt_expiry_hours = 24
        
        # Database Configuration
        self.db_config = {
            'host': os.getenv('POSTGRES_HOST', 'localhost'),
            'port': os.getenv('POSTGRES_PORT', '5432'),
            'database': os.getenv('POSTGRES_DB', 'ternus_borrower'),
            'user': os.getenv('POSTGRES_USER', 'ternus_user'),
            'password': os.getenv('POSTGRES_PASSWORD', 'ternus_password')
        }
        
        # Check PostgreSQL availability
        self.postgres_available = self._check_postgres_availability()
        
        # Salesforce connector reference
        self.salesforce_connector = salesforce_connector
        
        # Initialize database if available
        if self.postgres_available:
            self.init_database()
            self.create_application_progress_table()  # Initialize loan applications table
            logger.info("✅ Auth service initialized with PostgreSQL")
        else:
            logger.warning("⚠️ PostgreSQL not available - running in development mode")
            logger.info("📖 To set up PostgreSQL:")
            logger.info("   1. Install Docker: https://docs.docker.com/get-docker/")
            logger.info("   2. Run: docker compose up -d")
            logger.info("   3. Or follow README_POSTGRES.md for local installation")
            
    def _check_postgres_availability(self):
        """Check if PostgreSQL is available"""
        try:
            conn = psycopg2.connect(**self.db_config)
            conn.close()
            return True
        except ImportError:
            logger.warning("⚠️ psycopg2 not found. Install with: pip install psycopg2-binary")
            return False
        except Exception as e:
            logger.warning(f"⚠️ PostgreSQL connection failed: {str(e)}")
            return False

    def get_db_connection(self):
        """Get PostgreSQL database connection"""
        if not self.postgres_available:
            raise Exception("PostgreSQL not available")
            
        try:
            return psycopg2.connect(**self.db_config)
        except Exception as e:
            logger.error(f"❌ Database connection failed: {str(e)}")
            raise

    def init_database(self):
        """Initialize PostgreSQL database for user-contact mapping"""
        if not self.postgres_available:
            return
            
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    
                    # Users table for Auth0 user -> Contact ID mapping
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS users (
                            id SERIAL PRIMARY KEY,
                            auth0_user_id VARCHAR(255) UNIQUE,
                            email VARCHAR(255) UNIQUE,
                            salesforce_contact_id VARCHAR(255),
                            salesforce_account_id VARCHAR(255),
                            first_name VARCHAR(255),
                            last_name VARCHAR(255),
                            invitation_token VARCHAR(255),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            last_login TIMESTAMP,
                            is_active BOOLEAN DEFAULT TRUE
                        )
                    ''')
                    
                    # Invitations table
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS invitations (
                            id SERIAL PRIMARY KEY,
                            token VARCHAR(255) UNIQUE,
                            email VARCHAR(255),
                            salesforce_contact_id VARCHAR(255),
                            salesforce_account_id VARCHAR(255),
                            loan_officer_id VARCHAR(255),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            expires_at TIMESTAMP,
                            used_at TIMESTAMP,
                            is_used BOOLEAN DEFAULT FALSE
                        )
                    ''')
                    
                    # Sessions table for active sessions
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS sessions (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER REFERENCES users(id),
                            token VARCHAR(500) UNIQUE,
                            salesforce_contact_id VARCHAR(255),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            expires_at TIMESTAMP,
                            is_active BOOLEAN DEFAULT TRUE
                        )
                    ''')
                    
                    # Referral tokens table for refer-a-friend functionality
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS referral_tokens (
                            id SERIAL PRIMARY KEY,
                            token VARCHAR(50) UNIQUE NOT NULL,
                            contact_id VARCHAR(50) NOT NULL,
                            user_email VARCHAR(255) NOT NULL,
                            max_uses INTEGER DEFAULT 10,
                            uses_count INTEGER DEFAULT 0,
                            is_active BOOLEAN DEFAULT TRUE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            expires_at TIMESTAMP NOT NULL
                        )
                    ''')
                    
                    # Referrals tracking table
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS referral_uses (
                            id SERIAL PRIMARY KEY,
                            referral_token VARCHAR(50) NOT NULL,
                            referrer_contact_id VARCHAR(50) NOT NULL,
                            referred_contact_id VARCHAR(50) NOT NULL,
                            referred_user_email VARCHAR(255) NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            
                            FOREIGN KEY (referral_token) REFERENCES referral_tokens(token)
                        )
                    ''')
                    
                    conn.commit()
                    logger.info("✅ Database initialized successfully")
                    
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {str(e)}")
            raise

    def create_invitation_token(self, email: str, contact_id: str, account_id: str, 
                              loan_officer_id: Optional[str] = None) -> str:
        """Create an invitation token and store in database"""
        if not self.postgres_available:
            # Development mode - just return a mock token
            token = f"dev_invite_{int(time.time())}_{secrets.token_urlsafe(8)}"
            logger.info(f"🔧 Development mode: Created mock invitation token for {email}")
            return token
            
        try:
            # Generate secure token
            token = f"inv_{int(time.time())}_{secrets.token_urlsafe(16)}"
            expires_at = datetime.now() + timedelta(days=7)  # 7 days expiry
            
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    
                    cursor.execute('''
                        INSERT INTO invitations 
                        (token, email, salesforce_contact_id, salesforce_account_id, 
                         loan_officer_id, expires_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    ''', (token, email.lower(), contact_id, account_id, loan_officer_id, expires_at))
                    
                    conn.commit()
                    
            logger.info(f"✅ Created invitation token for {email}")
            return token
            
        except Exception as e:
            logger.error(f"❌ Error creating invitation token: {str(e)}")
            raise

    def validate_invitation_token(self, token: str, email: str) -> Dict[str, Any]:
        """Validate invitation token against Salesforce"""
        try:
            logger.info(f"🔍 Validating invitation token for email: {email}")
            
            # First check our database for the token
            if self.postgres_available:
                with self.get_db_connection() as conn:
                    with conn.cursor() as cursor:
                        cursor.execute('''
                            SELECT token, email, salesforce_contact_id, salesforce_account_id, 
                                   created_at, expires_at, is_used
                            FROM invitations 
                            WHERE token = %s AND email = %s AND is_used = FALSE
                        ''', (token, email.lower()))
                        
                        row = cursor.fetchone()
                        if row:
                            logger.info(f"✅ Token found in database for {email}")
                            return {
                                'valid': True,
                                'token': row[0],
                                'email': row[1],
                                'contact_id': row[2],
                                'account_id': row[3],
                                'created_at': row[4].isoformat() if row[4] else None,
                                'expires_at': row[5].isoformat() if row[5] else None
                            }
                        else:
                            logger.warning(f"⚠️ Token not found in database for {email}")

            # Check Salesforce
            if self.salesforce_connector:
                logger.info(f"🔍 Checking Salesforce for token")
                result = self.salesforce_connector.check_invitation_token_exists(token)
                logger.info(f"🔍 Result: {result}")
                if result.get('exists'):
                    logger.info(f"✅ Token validated in Salesforce for {email}")
                    return {
                        'valid': True,
                        'token': token,
                        'email': email,
                        'contact_id': result['contact_id'],
                        'account_id': result['account_id'],
                        'first_name': result.get('first_name', ''),
                        'last_name': result.get('last_name', '')
                    }
                else:
                    logger.warning(f"⚠️ Token not found in Salesforce: {result.get('error', 'Unknown error')}")

            # If we get here, token is invalid
            logger.error(f"❌ Invalid token for {email}")
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired invitation token"
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error validating invitation token: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error validating token: {str(e)}"
            )

    def complete_user_registration(self, token: str, email: str, auth0_user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Complete user registration by linking Auth0 user to Salesforce contact"""
        
        # First validate the invitation token
        validation_result = self.validate_invitation_token(token, email)
        
        if not validation_result.get('valid'):
            raise HTTPException(status_code=400, detail="Invalid invitation token")
        
        contact_id = validation_result['contact_id']
        auth0_user_id = auth0_user_data.get('sub') or auth0_user_data.get('user_id')
        
        if not auth0_user_id:
            raise HTTPException(status_code=400, detail="Auth0 user ID not found")
        
        if not self.postgres_available:
            # Development mode - return mock registration
            logger.info(f"🔧 Development mode: Mock registration for {email}")
            return {
                'user_id': 1,
                'email': email,
                'contact_id': contact_id,
                'account_id': validation_result.get('account_id'),
                'session_token': f"dev_session_{int(time.time())}_{secrets.token_urlsafe(8)}"
            }
            
        try:
            import psycopg2
            import psycopg2.extras
            
            # Link user to contact in Salesforce
            if self.sf_connector:
                link_result = self.sf_connector.link_user_to_contact(
                    contact_id, auth0_user_id, email
                )
                if not link_result.get('success'):
                    logger.error(f"Failed to link user to contact: {link_result}")
            
            # Store user record in PostgreSQL
            with psycopg2.connect(**self.db_config) as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                    # Check if user already exists
                    cur.execute("""
                        SELECT id FROM users 
                        WHERE auth0_user_id = %s OR email = %s
                    """, (auth0_user_id, email))
                    
                    existing_user = cur.fetchone()
                    
                    if existing_user:
                        # Update existing user
                        cur.execute("""
                            UPDATE users 
                            SET contact_id = %s, account_id = %s, updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s
                            RETURNING id
                        """, (contact_id, validation_result.get('account_id'), existing_user['id']))
                        user_id = cur.fetchone()['id']
                    else:
                        # Create new user
                        cur.execute("""
                            INSERT INTO users (auth0_user_id, email, contact_id, account_id, first_name, last_name)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            RETURNING id
                        """, (
                            auth0_user_id,
                            email,
                            contact_id,
                            validation_result.get('account_id'),
                            auth0_user_data.get('given_name') or validation_result.get('first_name'),
                            auth0_user_data.get('family_name') or validation_result.get('last_name')
                        ))
                        user_id = cur.fetchone()['id']
                    
                    # Create session
                    session_token = f"session_{int(time.time())}_{secrets.token_urlsafe(16)}"
                    cur.execute("""
                        INSERT INTO sessions (user_id, session_token, expires_at)
                        VALUES (%s, %s, %s)
                        RETURNING session_token
                    """, (
                        user_id,
                        session_token,
                        datetime.now() + timedelta(days=30)
                    ))
                    
                    session_token = cur.fetchone()['session_token']
                    
                    logger.info(f"✅ User registration completed for {email}")
                    
                    return {
                        'user_id': user_id,
                        'email': email,
                        'contact_id': contact_id,
                        'account_id': validation_result.get('account_id'),
                        'session_token': session_token
                    }
            
        except Exception as e:
            logger.error(f"❌ Error during user registration: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to complete registration: {str(e)}"
            )

    def check_user_portal_access(self, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Check if user has portal access"""
        if not self.sf_connector:
            return {
                "has_access": False,
                "message": "Salesforce not available"
            }
        
        return self.sf_connector.check_user_portal_access(auth0_user_id, email)

    def create_simple_session_token(self, auth0_user_id: str, contact_id: str, email: str) -> str:
        """Create a simplified JWT session token"""
        try:
            # Create JWT payload
            payload = {
                'auth0_user_id': auth0_user_id,
                'contact_id': contact_id,
                'email': email,
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(hours=self.jwt_expiry_hours)
            }
            
            # Generate JWT token
            token = jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
            
            logger.info(f"✅ Session token created for user {email}")
            return token
            
        except Exception as e:
            logger.error(f"❌ Error creating session token: {str(e)}")
            raise

    def create_session_token(self, user_id: int, contact_id: str) -> str:
        """Create a JWT session token for authenticated user"""
        try:
            # Create JWT payload
            payload = {
                'user_id': user_id,
                'contact_id': contact_id,
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(hours=self.jwt_expiry_hours)
            }
            
            # Generate JWT token
            token = jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
            
            if not self.postgres_available:
                # Development mode - just return the JWT
                logger.info(f"🔧 Development mode: Created mock session token")
                return token
            
            # Store session in database
            expires_at = datetime.now() + timedelta(hours=self.jwt_expiry_hours)
            
            import psycopg2
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    
                    cursor.execute('''
                        INSERT INTO sessions 
                        (user_id, token, salesforce_contact_id, expires_at)
                        VALUES (%s, %s, %s, %s)
                    ''', (user_id, token, contact_id, expires_at))
                    
                    conn.commit()
                    
            logger.info(f"✅ Session token created for user {user_id}")
            return token
            
        except Exception as e:
            logger.error(f"❌ Error creating session token: {str(e)}")
            raise

    def validate_session_token(self, token: str) -> Dict[str, Any]:
        """Validate JWT session token and return user data"""
        try:
            # Decode JWT token
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            
            if not self.postgres_available:
                # Development mode - just return JWT payload
                logger.info(f"🔧 Development mode: Mock session validation")
                return {
                    'user_id': payload.get('user_id', 1),
                    'email': 'dev@example.com',
                    'first_name': 'Development',
                    'last_name': 'User',
                    'salesforce_contact_id': payload.get('contact_id', '003Oz00000QAiECIA1'),
                    'salesforce_account_id': '001XX000004DcWYA0',
                    'expires_at': datetime.fromtimestamp(payload['exp']).isoformat()
                }
            
            # Check if session exists and is active
            import psycopg2
            import psycopg2.extras
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                    
                    cursor.execute('''
                        SELECT s.user_id, s.salesforce_contact_id, s.expires_at, s.is_active,
                               u.email, u.first_name, u.last_name, u.salesforce_account_id
                        FROM sessions s
                        JOIN users u ON s.user_id = u.id
                        WHERE s.token = %s AND s.is_active = TRUE
                    ''', (token,))
                    
                    result = cursor.fetchone()
                    
                    if not result:
                        raise HTTPException(
                            status_code=401,
                            detail="Invalid session token"
                        )
                    
                    # Check if session expired
                    if datetime.now() > result['expires_at']:
                        # Mark session as inactive
                        cursor.execute('''
                            UPDATE sessions SET is_active = FALSE WHERE token = %s
                        ''', (token,))
                        conn.commit()
                        
                        raise HTTPException(
                            status_code=401,
                            detail="Session token has expired"
                        )
                    
                    return {
                        'user_id': result['user_id'],
                        'email': result['email'],
                        'first_name': result['first_name'],
                        'last_name': result['last_name'],
                        'salesforce_contact_id': result['salesforce_contact_id'],
                        'salesforce_account_id': result['salesforce_account_id'],
                        'expires_at': result['expires_at'].isoformat()
                    }
                    
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail="Session token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=401,
                detail="Invalid session token"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error validating session token: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to validate session token"
            )

    def get_contact_id_from_token(self, authorization_header: str) -> str:
        """Extract contact ID from authorization header (Bearer token)"""
        try:
            if not authorization_header or not authorization_header.startswith('Bearer '):
                # No auth header provided - this means no invitation token was validated
                logger.warning(f"⚠️ No authorization header provided - user may not have valid invitation token")
                raise HTTPException(
                    status_code=401,
                    detail="No authorization token provided. Please use a valid invitation link."
                )
            
            token = authorization_header.replace('Bearer ', '')
            session_data = self.validate_session_token(token)
            
            return session_data['salesforce_contact_id']
            
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
            
        except Exception as e:
            logger.error(f"❌ Error extracting contact ID from token: {str(e)}")
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization token. Please use a valid invitation link."
            )

    def logout_session(self, token: str) -> bool:
        """Logout user by invalidating session token"""
        if not self.postgres_available:
            # Development mode - always return success
            logger.info("🔧 Development mode: Mock logout")
            return True
            
        try:
            import psycopg2
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    
                    cursor.execute('''
                        UPDATE sessions 
                        SET is_active = FALSE 
                        WHERE token = %s
                    ''', (token,))
                    
                    conn.commit()
                    
                    if cursor.rowcount > 0:
                        logger.info("✅ Session logged out successfully")
                        return True
                    else:
                        logger.warning("⚠️ Session token not found")
                        return False
                        
        except Exception as e:
            logger.error(f"❌ Error logging out session: {str(e)}")
            return False

    def get_user_by_auth0_id(self, auth0_user_id: str, email: str = None) -> Optional[Dict[str, Any]]:
        """Get user mapping by Auth0 user ID and optionally validate email"""
        if not self.postgres_available:
            return None
            
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    if email:
                        # Validate both auth0_user_id and email
                        cursor.execute('''
                            SELECT auth0_user_id, email, salesforce_contact_id, 
                                   salesforce_account_id, first_name, last_name,
                                   created_at, last_login, is_active
                            FROM users 
                            WHERE auth0_user_id = %s AND email = %s AND is_active = TRUE
                        ''', (auth0_user_id, email.lower()))
                    else:
                        # Just check auth0_user_id
                        cursor.execute('''
                            SELECT auth0_user_id, email, salesforce_contact_id, 
                                   salesforce_account_id, first_name, last_name,
                                   created_at, last_login, is_active
                            FROM users 
                            WHERE auth0_user_id = %s AND is_active = TRUE
                        ''', (auth0_user_id,))
                    
                    row = cursor.fetchone()
                    if row:
                        return {
                            'auth0_user_id': row[0],
                            'email': row[1],
                            'salesforce_contact_id': row[2],
                            'salesforce_account_id': row[3],
                            'first_name': row[4],
                            'last_name': row[5],
                            'created_at': row[6],
                            'last_login': row[7],
                            'is_active': row[8]
                        }
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting user by Auth0 ID: {str(e)}")
            return None

    def get_user_by_contact_id(self, contact_id: str) -> Optional[Dict[str, Any]]:
        """Get user mapping by Salesforce contact ID"""
        if not self.postgres_available:
            return None
            
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        SELECT auth0_user_id, email, salesforce_contact_id, 
                               salesforce_account_id, first_name, last_name,
                               created_at, last_login, is_active
                        FROM users 
                        WHERE salesforce_contact_id = %s AND is_active = TRUE
                    ''', (contact_id,))
                    
                    row = cursor.fetchone()
                    if row:
                        return {
                            'auth0_user_id': row[0],
                            'email': row[1],
                            'salesforce_contact_id': row[2],
                            'salesforce_account_id': row[3],
                            'first_name': row[4],
                            'last_name': row[5],
                            'created_at': row[6],
                            'last_login': row[7],
                            'is_active': row[8]
                        }
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting user by contact ID: {str(e)}")
            return None

    def create_or_update_user_mapping(self, auth0_user_id: str, email: str, 
                                    contact_id: str, account_id: str, 
                                    first_name: str = "", last_name: str = "",
                                    invitation_token: str = "") -> Dict[str, Any]:
        """Create or update user mapping with 1-to-1 validation"""
        if not self.postgres_available:
            logger.warning("⚠️ PostgreSQL not available - cannot store user mapping")
            return {
                'success': True,
                'message': 'Development mode - mapping not stored'
            }
            
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    
                    # Check if Auth0 user is already mapped to a different contact
                    existing_user = self.get_user_by_auth0_id(auth0_user_id)
                    if existing_user and existing_user['salesforce_contact_id'] != contact_id:
                        raise HTTPException(
                            status_code=409,
                            detail=f"Auth0 user {auth0_user_id} is already associated with a different Salesforce contact"
                        )
                    
                    # Check if contact is already mapped to a different user
                    existing_contact_user = self.get_user_by_contact_id(contact_id)
                    if existing_contact_user and existing_contact_user['auth0_user_id'] != auth0_user_id:
                        raise HTTPException(
                            status_code=409,
                            detail=f"Salesforce contact {contact_id} is already associated with a different user"
                        )
                    
                    # If invitation token provided, mark it as used (1-to-1 validation)
                    if invitation_token:
                        cursor.execute('''
                            SELECT id, is_used FROM invitations 
                            WHERE token = %s
                        ''', (invitation_token,))
                        
                        invite_row = cursor.fetchone()
                        if invite_row:
                            invite_id, is_used = invite_row
                            if is_used:
                                raise HTTPException(
                                    status_code=409,
                                    detail="Invitation token has already been used"
                                )
                            
                            # Mark invitation as used
                            cursor.execute('''
                                UPDATE invitations 
                                SET is_used = TRUE, used_at = CURRENT_TIMESTAMP
                                WHERE id = %s
                            ''', (invite_id,))
                    
                    # Create or update user mapping
                    cursor.execute('''
                        INSERT INTO users 
                        (auth0_user_id, email, salesforce_contact_id, salesforce_account_id, 
                         first_name, last_name, invitation_token, last_login)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                        ON CONFLICT (auth0_user_id) 
                        DO UPDATE SET 
                            email = EXCLUDED.email,
                            salesforce_contact_id = EXCLUDED.salesforce_contact_id,
                            salesforce_account_id = EXCLUDED.salesforce_account_id,
                            first_name = EXCLUDED.first_name,
                            last_name = EXCLUDED.last_name,
                            last_login = CURRENT_TIMESTAMP,
                            is_active = TRUE
                    ''', (auth0_user_id, email.lower(), contact_id, account_id, 
                          first_name, last_name, invitation_token))
                    
                    conn.commit()
                    
                    logger.info(f"✅ Created/updated user mapping: {auth0_user_id} -> {contact_id}")
                    return {
                        'success': True,
                        'message': 'User mapping created/updated successfully',
                        'auth0_user_id': auth0_user_id,
                        'contact_id': contact_id
                    }
                    
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error creating user mapping: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create user mapping: {str(e)}"
            )

    def validate_invitation_token_with_mapping(self, token: str, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Validate invitation token and create user mapping"""
        try:
            # First validate the token against Salesforce
            validation_result = self.validate_invitation_token(token, email)
            
            if validation_result.get('valid'):
                # Create/update the user mapping with 1-to-1 validation
                mapping_result = self.create_or_update_user_mapping(
                    auth0_user_id=auth0_user_id,
                    email=email,
                    contact_id=validation_result['contact_id'],
                    account_id=validation_result.get('account_id', ''),
                    first_name=validation_result.get('first_name', ''),
                    last_name=validation_result.get('last_name', ''),
                    invitation_token=token
                )
                
                validation_result['mapping_created'] = mapping_result['success']
                return validation_result
            
            return validation_result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error in token validation with mapping: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Token validation failed: {str(e)}"
            )

    def create_application_progress_table(self):
        """Create table for storing loan application progress"""
        if not self.postgres_available:
            return
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS loan_applications (
                            id SERIAL PRIMARY KEY,
                            application_id VARCHAR(50) UNIQUE NOT NULL,
                            auth0_user_id VARCHAR(255),
                            contact_id VARCHAR(50),
                            current_step INTEGER DEFAULT 1,
                            form_data JSONB DEFAULT '{}',
                            is_submitted BOOLEAN DEFAULT FALSE,
                            is_draft BOOLEAN DEFAULT TRUE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            submitted_at TIMESTAMP NULL,
                            
                            FOREIGN KEY (auth0_user_id) REFERENCES users(auth0_user_id)
                        )
                    ''')
                    
                    # Create indexes separately
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_application_id 
                        ON loan_applications (application_id)
                    ''')
                    
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_auth0_user_id 
                        ON loan_applications (auth0_user_id)
                    ''')
                    
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_contact_id 
                        ON loan_applications (contact_id)
                    ''')
                    
                    # Create trigger to update updated_at timestamp
                    cursor.execute('''
                        CREATE OR REPLACE FUNCTION update_loan_applications_updated_at()
                        RETURNS TRIGGER AS $$
                        BEGIN
                            NEW.updated_at = CURRENT_TIMESTAMP;
                            RETURN NEW;
                        END;
                        $$ language 'plpgsql';
                    ''')
                    
                    cursor.execute('''
                        DROP TRIGGER IF EXISTS update_loan_applications_updated_at_trigger 
                        ON loan_applications;
                    ''')
                    
                    cursor.execute('''
                        CREATE TRIGGER update_loan_applications_updated_at_trigger
                        BEFORE UPDATE ON loan_applications
                        FOR EACH ROW
                        EXECUTE FUNCTION update_loan_applications_updated_at();
                    ''')
                    
                    conn.commit()
                    logger.info("✅ Loan applications table created successfully")
                    
        except Exception as e:
            logger.error(f"❌ Error creating loan applications table: {str(e)}")

    def save_application_progress(self, application_id: str, auth0_user_id: str, 
                                contact_id: str, current_step: int, form_data: dict, 
                                is_submitted: bool = False) -> Dict[str, Any]:
        """Save or update loan application progress"""
        if not self.postgres_available:
            logger.warning("⚠️ PostgreSQL not available - cannot save application progress")
            return {'success': False, 'message': 'Database not available'}
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    # Check if application exists
                    cursor.execute('''
                        SELECT id FROM loan_applications WHERE application_id = %s
                    ''', (application_id,))
                    
                    existing = cursor.fetchone()
                    
                    if existing:
                        # Update existing application
                        cursor.execute('''
                            UPDATE loan_applications 
                            SET current_step = %s, 
                                form_data = %s, 
                                is_submitted = %s,
                                is_draft = %s,
                                submitted_at = CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE submitted_at END
                            WHERE application_id = %s
                        ''', (current_step, json.dumps(form_data), is_submitted, 
                              not is_submitted, is_submitted, application_id))
                        
                        logger.info(f"✅ Updated application progress: {application_id} - Step {current_step}")
                    else:
                        # Create new application
                        cursor.execute('''
                            INSERT INTO loan_applications 
                            (application_id, auth0_user_id, contact_id, current_step, 
                             form_data, is_submitted, is_draft, submitted_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, 
                                    CASE WHEN %s THEN CURRENT_TIMESTAMP ELSE NULL END)
                        ''', (application_id, auth0_user_id, contact_id, current_step, 
                              json.dumps(form_data), is_submitted, not is_submitted, is_submitted))
                        
                        logger.info(f"✅ Created new application: {application_id} - Step {current_step}")
                    
                    conn.commit()
                    
                    return {
                        'success': True,
                        'message': 'Application progress saved successfully',
                        'application_id': application_id,
                        'current_step': current_step,
                        'is_submitted': is_submitted
                    }
                    
        except Exception as e:
            logger.error(f"❌ Error saving application progress: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to save application progress: {str(e)}'
            }

    def get_application_progress(self, application_id: str) -> Optional[Dict[str, Any]]:
        """Get loan application progress by application ID"""
        if not self.postgres_available:
            return None
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        SELECT application_id, auth0_user_id, contact_id, current_step,
                               form_data, is_submitted, is_draft, created_at, 
                               updated_at, submitted_at
                        FROM loan_applications 
                        WHERE application_id = %s
                    ''', (application_id,))
                    
                    row = cursor.fetchone()
                    if row:
                        return {
                            'application_id': row[0],
                            'auth0_user_id': row[1],
                            'contact_id': row[2],
                            'current_step': row[3],
                            'form_data': row[4] if row[4] else {},  # Don't json.loads - it's already a dict
                            'is_submitted': row[5],
                            'is_draft': row[6],
                            'created_at': row[7],
                            'updated_at': row[8],
                            'submitted_at': row[9]
                        }
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting application progress: {str(e)}")
            return None

    def get_user_applications(self, auth0_user_id: str) -> List[Dict[str, Any]]:
        """Get all loan applications for a user"""
        if not self.postgres_available:
            return []
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        SELECT application_id, current_step, form_data, is_submitted, 
                               is_draft, created_at, updated_at, submitted_at
                        FROM loan_applications 
                        WHERE auth0_user_id = %s
                        ORDER BY updated_at DESC
                    ''', (auth0_user_id,))
                    
                    applications = []
                    for row in cursor.fetchall():
                        applications.append({
                            'application_id': row[0],
                            'current_step': row[1],
                            'form_data': row[2] if row[2] else {},  # Don't json.loads - it's already a dict
                            'is_submitted': row[3],
                            'is_draft': row[4],
                            'created_at': row[5],
                            'updated_at': row[6],
                            'submitted_at': row[7]
                        })
                    
                    return applications
                    
        except Exception as e:
            logger.error(f"❌ Error getting user applications: {str(e)}")
            return []

    def create_referral_tokens_table(self):
        """Create referral tokens table if it doesn't exist"""
        if not self.postgres_available:
            logger.warning("⚠️ PostgreSQL not available - skipping referral tokens table creation")
            return
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS referral_tokens (
                            id SERIAL PRIMARY KEY,
                            token VARCHAR(50) UNIQUE NOT NULL,
                            contact_id VARCHAR(50) NOT NULL,
                            user_email VARCHAR(255) NOT NULL,
                            max_uses INTEGER DEFAULT 10,
                            uses_count INTEGER DEFAULT 0,
                            is_active BOOLEAN DEFAULT TRUE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            expires_at TIMESTAMP NOT NULL
                        )
                    ''')
                    
                    # Create referrals tracking table
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS referral_uses (
                            id SERIAL PRIMARY KEY,
                            referral_token VARCHAR(50) NOT NULL,
                            referrer_contact_id VARCHAR(50) NOT NULL,
                            referred_contact_id VARCHAR(50) NOT NULL,
                            referred_user_email VARCHAR(255) NOT NULL,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            
                            FOREIGN KEY (referral_token) REFERENCES referral_tokens(token)
                        )
                    ''')
                    
                    # Create indexes
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_referral_token 
                        ON referral_tokens (token)
                    ''')
                    
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_referral_contact_id 
                        ON referral_tokens (contact_id)
                    ''')
                    
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_referral_uses_token 
                        ON referral_uses (referral_token)
                    ''')
                    
                    conn.commit()
                    logger.info("✅ Referral tokens table created successfully")
                    
        except Exception as e:
            logger.error(f"❌ Error creating referral tokens table: {str(e)}")

    def create_referral_token(self, token_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new referral token"""
        if not self.postgres_available:
            logger.warning("⚠️ PostgreSQL not available - cannot create referral token")
            return {}
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        INSERT INTO referral_tokens 
                        (token, contact_id, user_email, max_uses, uses_count, 
                         is_active, expires_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING id, token, contact_id, user_email, max_uses, 
                                  uses_count, is_active, created_at, expires_at
                    ''', (
                        token_data['token'],
                        token_data['contact_id'],
                        token_data['user_email'],
                        token_data['max_uses'],
                        token_data['uses_count'],
                        token_data['is_active'],
                        token_data['expires_at']
                    ))
                    
                    row = cursor.fetchone()
                    conn.commit()
                    
                    if row:
                        return {
                            'id': str(row[0]),
                            'token': row[1],
                            'contact_id': row[2],
                            'user_email': row[3],
                            'max_uses': row[4],
                            'uses_count': row[5],
                            'is_active': row[6],
                            'created_at': row[7].isoformat() if row[7] else None,
                            'expires_at': row[8].isoformat() if row[8] else None
                        }
                    
                    return {}
                    
        except Exception as e:
            logger.error(f"❌ Error creating referral token: {str(e)}")
            return {}

    def get_user_referral_token(self, contact_id: str) -> Optional[Dict[str, Any]]:
        """Get active referral token for a user"""
        if not self.postgres_available:
            return None
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        SELECT id, token, contact_id, user_email, max_uses, 
                               uses_count, is_active, created_at, expires_at
                        FROM referral_tokens 
                        WHERE contact_id = %s AND is_active = TRUE 
                        AND expires_at > CURRENT_TIMESTAMP
                        ORDER BY created_at DESC
                        LIMIT 1
                    ''', (contact_id,))
                    
                    row = cursor.fetchone()
                    if row:
                        return {
                            'id': str(row[0]),
                            'token': row[1],
                            'contact_id': row[2],
                            'user_email': row[3],
                            'max_uses': row[4],
                            'uses_count': row[5],
                            'is_active': row[6],
                            'created_at': row[7].isoformat() if row[7] else None,
                            'expires_at': row[8].isoformat() if row[8] else None
                        }
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error getting user referral token: {str(e)}")
            return None

    def validate_referral_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate a referral token"""
        if not self.postgres_available:
            return None
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute('''
                        SELECT id, token, contact_id, user_email, max_uses, 
                               uses_count, is_active, created_at, expires_at
                        FROM referral_tokens 
                        WHERE token = %s AND is_active = TRUE 
                        AND expires_at > CURRENT_TIMESTAMP
                    ''', (token,))
                    
                    row = cursor.fetchone()
                    if row:
                        return {
                            'id': str(row[0]),
                            'token': row[1],
                            'contact_id': row[2],
                            'user_email': row[3],
                            'max_uses': row[4],
                            'uses_count': row[5],
                            'is_active': row[6],
                            'created_at': row[7].isoformat() if row[7] else None,
                            'expires_at': row[8].isoformat() if row[8] else None
                        }
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error validating referral token: {str(e)}")
            return None

    def use_referral_token(self, token: str, new_contact_id: str, new_user_email: str) -> Dict[str, Any]:
        """Use a referral token (increment usage count)"""
        if not self.postgres_available:
            return {'success': False, 'message': 'Database not available'}
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    # First validate the token
                    token_data = self.validate_referral_token(token)
                    if not token_data:
                        return {'success': False, 'message': 'Invalid or expired referral token'}
                    
                    # Check if this contact has already used this token
                    cursor.execute('''
                        SELECT id FROM referral_uses 
                        WHERE referral_token = %s AND referred_contact_id = %s
                    ''', (token, new_contact_id))
                    
                    if cursor.fetchone():
                        return {'success': False, 'message': 'Referral token already used by this user'}
                    
                    # Increment usage count
                    cursor.execute('''
                        UPDATE referral_tokens 
                        SET uses_count = uses_count + 1
                        WHERE token = %s
                        RETURNING uses_count, max_uses, contact_id
                    ''', (token,))
                    
                    result = cursor.fetchone()
                    if not result:
                        return {'success': False, 'message': 'Failed to update token usage'}
                    
                    uses_count, max_uses, referrer_contact_id = result
                    
                    # Record the referral use
                    cursor.execute('''
                        INSERT INTO referral_uses 
                        (referral_token, referrer_contact_id, referred_contact_id, referred_user_email)
                        VALUES (%s, %s, %s, %s)
                    ''', (token, referrer_contact_id, new_contact_id, new_user_email))
                    
                    # Note: Tokens remain active for unlimited use
                    
                    conn.commit()
                    
                    return {
                        'success': True,
                        'referrer_contact_id': referrer_contact_id,
                        'uses_remaining': max_uses - uses_count
                    }
                    
        except Exception as e:
            logger.error(f"❌ Error using referral token: {str(e)}")
            return {'success': False, 'message': f'Failed to use referral token: {str(e)}'}

    def get_referral_stats(self, contact_id: str) -> Dict[str, Any]:
        """Get referral statistics for a user"""
        if not self.postgres_available:
            return {}
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cursor:
                    # Get token info
                    cursor.execute('''
                        SELECT token, uses_count, max_uses, is_active, created_at, expires_at
                        FROM referral_tokens 
                        WHERE contact_id = %s
                        ORDER BY created_at DESC
                        LIMIT 1
                    ''', (contact_id,))
                    
                    token_row = cursor.fetchone()
                    
                    # Get referral history
                    cursor.execute('''
                        SELECT ru.referred_user_email, ru.created_at
                        FROM referral_uses ru
                        JOIN referral_tokens rt ON ru.referral_token = rt.token
                        WHERE rt.contact_id = %s
                        ORDER BY ru.created_at DESC
                    ''', (contact_id,))
                    
                    referrals = []
                    for row in cursor.fetchall():
                        referrals.append({
                            'email': row[0],
                            'joined_at': row[1].isoformat() if row[1] else None
                        })
                    
                    stats = {
                        'total_referrals': len(referrals),
                        'recent_referrals': referrals[:5],  # Last 5 referrals
                        'token_info': None
                    }
                    
                    if token_row:
                        stats['token_info'] = {
                            'token': token_row[0],
                            'uses_count': token_row[1],
                            'max_uses': token_row[2],
                            'is_active': token_row[3],
                            'created_at': token_row[4].isoformat() if token_row[4] else None,
                            'expires_at': token_row[5].isoformat() if token_row[5] else None
                        }
                    
                    return stats
                    
        except Exception as e:
            logger.error(f"❌ Error getting referral stats: {str(e)}")
            return {} 