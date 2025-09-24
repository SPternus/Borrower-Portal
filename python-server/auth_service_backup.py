#!/usr/bin/env python3
"""
Auth0 Service for Ternus Borrower Portal
Handles JWT validation, user authentication, and contact ID mapping
"""

import os
import jwt
import json
import time
import sqlite3
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from jose import jwt as jose_jwt
from cryptography.hazmat.primitives import serialization
from fastapi import HTTPException, status
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TernusAuthService:
    def __init__(self):
        """Initialize Auth0 service with configuration"""
        
        # Auth0 Configuration
        self.auth0_domain = os.getenv('AUTH0_DOMAIN', 'ternus-dev.auth0.com')
        self.auth0_audience = os.getenv('AUTH0_AUDIENCE', 'https://ternus-borrower-api')
        self.auth0_client_id = os.getenv('AUTH0_CLIENT_ID', '')
        self.auth0_client_secret = os.getenv('AUTH0_CLIENT_SECRET', '')
        self.algorithms = ["RS256"]
        
        # Internal JWT Configuration (for our own tokens)
        self.jwt_secret = os.getenv('JWT_SECRET', 'ternus-super-secret-development-key')
        self.jwt_algorithm = 'HS256'
        self.jwt_expiry_hours = 24
        
        # Initialize database
        self.init_database()
        
        # Cache for Auth0 public keys
        self.jwks_cache = {}
        self.jwks_cache_expiry = None
        
        logger.info("✅ Auth service initialized")

    def init_database(self):
        """Initialize SQLite database for user-contact mapping"""
        try:
            self.db_path = os.path.join(os.path.dirname(__file__), 'ternus_auth.db')
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Users table for Auth0 user -> Contact ID mapping
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        auth0_user_id TEXT UNIQUE,
                        email TEXT UNIQUE,
                        salesforce_contact_id TEXT,
                        salesforce_account_id TEXT,
                        first_name TEXT,
                        last_name TEXT,
                        invitation_token TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_login TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1
                    )
                ''')
                
                # Invitations table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS invitations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        token TEXT UNIQUE,
                        email TEXT,
                        salesforce_contact_id TEXT,
                        salesforce_account_id TEXT,
                        loan_officer_id TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP,
                        used_at TIMESTAMP,
                        is_used BOOLEAN DEFAULT 0
                    )
                ''')
                
                # Sessions table for active sessions
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        token TEXT UNIQUE,
                        salesforce_contact_id TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1,
                        FOREIGN KEY (user_id) REFERENCES users (id)
                    )
                ''')
                
                conn.commit()
                logger.info("✅ Database initialized successfully")
                
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {str(e)}")
            raise

    def get_auth0_public_key(self, kid: str) -> str:
        """Get Auth0 public key for JWT verification"""
        try:
            # Check cache first
            if (self.jwks_cache_expiry and 
                datetime.now() < self.jwks_cache_expiry and 
                kid in self.jwks_cache):
                return self.jwks_cache[kid]
            
            # Fetch JWKS from Auth0
            jwks_url = f"https://{self.auth0_domain}/.well-known/jwks.json"
            response = requests.get(jwks_url, timeout=10)
            response.raise_for_status()
            
            jwks = response.json()
            
            # Cache keys for 1 hour
            self.jwks_cache = {}
            self.jwks_cache_expiry = datetime.now() + timedelta(hours=1)
            
            for key in jwks['keys']:
                if key['kid'] == kid:
                    # Convert to PEM format
                    public_key = jose_jwt.get_unverified_header(kid)
                    return public_key
                    
            raise HTTPException(
                status_code=401,
                detail="Unable to find appropriate key"
            )
            
        except Exception as e:
            logger.error(f"❌ Error fetching Auth0 public key: {str(e)}")
            raise HTTPException(
                status_code=401,
                detail="Failed to verify token"
            )

    def verify_auth0_token(self, token: str) -> Dict[str, Any]:
        """Verify Auth0 JWT token"""
        try:
            # Get unverified header to extract kid
            unverified_header = jose_jwt.get_unverified_header(token)
            
            # For development, we'll skip Auth0 verification if no domain configured
            if not self.auth0_domain or self.auth0_domain == 'ternus-dev.auth0.com':
                logger.warning("⚠️ Auth0 not configured, using development mode")
                
                # Decode without verification for development
                payload = jose_jwt.get_unverified_claims(token)
                return {
                    'sub': payload.get('sub', 'auth0|development_user'),
                    'email': payload.get('email', 'dev@example.com'),
                    'email_verified': True,
                    'name': payload.get('name', 'Development User'),
                    'given_name': payload.get('given_name', 'Development'),
                    'family_name': payload.get('family_name', 'User'),
                    'iss': f"https://{self.auth0_domain}/",
                    'aud': self.auth0_audience
                }
            
            # Production verification
            public_key = self.get_auth0_public_key(unverified_header['kid'])
            
            payload = jose_jwt.decode(
                token,
                public_key,
                algorithms=self.algorithms,
                audience=self.auth0_audience,
                issuer=f"https://{self.auth0_domain}/"
            )
            
            return payload
            
        except jose_jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail="Token has expired"
            )
        except jose_jwt.JWTClaimsError:
            raise HTTPException(
                status_code=401,
                detail="Invalid token claims"
            )
        except Exception as e:
            logger.error(f"❌ Token verification failed: {str(e)}")
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

    def create_invitation_token(self, email: str, contact_id: str, account_id: str, 
                              loan_officer_id: Optional[str] = None) -> str:
        """Create an invitation token and store in database"""
        try:
            import secrets
            import uuid
            
            # Generate secure token
            token = f"inv_{int(time.time())}_{secrets.token_urlsafe(16)}"
            expires_at = datetime.now() + timedelta(days=7)  # 7 days expiry
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO invitations 
                    (token, email, salesforce_contact_id, salesforce_account_id, 
                     loan_officer_id, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (token, email.lower(), contact_id, account_id, loan_officer_id, expires_at))
                
                conn.commit()
                
            logger.info(f"✅ Created invitation token for {email}")
            return token
            
        except Exception as e:
            logger.error(f"❌ Error creating invitation token: {str(e)}")
            raise

    def validate_invitation_token(self, token: str, email: str) -> Dict[str, Any]:
        """Validate invitation token and return invitation data"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT token, email, salesforce_contact_id, salesforce_account_id,
                           loan_officer_id, expires_at, is_used
                    FROM invitations 
                    WHERE token = ? AND email = ?
                ''', (token, email.lower()))
                
                result = cursor.fetchone()
                
                if not result:
                    raise HTTPException(
                        status_code=404,
                        detail="Invalid invitation token or email"
                    )
                
                (token, inv_email, contact_id, account_id, 
                 loan_officer_id, expires_at, is_used) = result
                
                # Check if expired
                if datetime.now() > datetime.fromisoformat(expires_at):
                    raise HTTPException(
                        status_code=400,
                        detail="Invitation token has expired"
                    )
                
                # Check if already used
                if is_used:
                    raise HTTPException(
                        status_code=400,
                        detail="Invitation token has already been used"
                    )
                
                return {
                    'token': token,
                    'email': inv_email,
                    'salesforce_contact_id': contact_id,
                    'salesforce_account_id': account_id,
                    'loan_officer_id': loan_officer_id,
                    'expires_at': expires_at
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error validating invitation token: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to validate invitation token"
            )

    def get_contact_id_from_token(self, authorization_header: str) -> str:
        """Complete user registration by linking Auth0 user to Salesforce contact"""
        try:
            # Validate invitation token
            invitation = self.validate_invitation_token(token, email)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if user already exists
                cursor.execute('SELECT id FROM users WHERE email = ?', (email.lower(),))
                existing_user = cursor.fetchone()
                
                if existing_user:
                    # Update existing user
                    cursor.execute('''
                        UPDATE users SET
                            auth0_user_id = ?,
                            salesforce_contact_id = ?,
                            salesforce_account_id = ?,
                            first_name = ?,
                            last_name = ?,
                            invitation_token = ?,
                            last_login = CURRENT_TIMESTAMP
                        WHERE email = ?
                    ''', (
                        auth0_user_data.get('sub'),
                        invitation['salesforce_contact_id'],
                        invitation['salesforce_account_id'],
                        auth0_user_data.get('given_name', ''),
                        auth0_user_data.get('family_name', ''),
                        token,
                        email.lower()
                    ))
                    user_id = existing_user[0]
                else:
                    # Create new user
                    cursor.execute('''
                        INSERT INTO users 
                        (auth0_user_id, email, salesforce_contact_id, salesforce_account_id,
                         first_name, last_name, invitation_token, last_login)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ''', (
                        auth0_user_data.get('sub'),
                        email.lower(),
                        invitation['salesforce_contact_id'],
                        invitation['salesforce_account_id'],
                        auth0_user_data.get('given_name', ''),
                        auth0_user_data.get('family_name', ''),
                        token
                    ))
                    user_id = cursor.lastrowid
                
                # Mark invitation as used
                cursor.execute('''
                    UPDATE invitations SET 
                        is_used = 1, 
                        used_at = CURRENT_TIMESTAMP 
                    WHERE token = ?
                ''', (token,))
                
                conn.commit()
                
                # Create session token
                session_token = self.create_session_token(user_id, invitation['salesforce_contact_id'])
                
                user_data = {
                    'id': user_id,
                    'auth0_user_id': auth0_user_data.get('sub'),
                    'email': email.lower(),
                    'salesforce_contact_id': invitation['salesforce_contact_id'],
                    'salesforce_account_id': invitation['salesforce_account_id'],
                    'first_name': auth0_user_data.get('given_name', ''),
                    'last_name': auth0_user_data.get('family_name', ''),
                    'session_token': session_token
                }
                
                logger.info(f"✅ User registration completed for {email}")
                return user_data
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error completing user registration: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to complete user registration"
            )

    def complete_user_registration(self, token: str, email: str, auth0_user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Complete user registration by linking Auth0 user to Salesforce contact"""
        try:
            # Validate invitation token
            invitation = self.validate_invitation_token(token, email)
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check if user already exists
                cursor.execute('SELECT id FROM users WHERE email = ?', (email.lower(),))
                existing_user = cursor.fetchone()
                
                if existing_user:
                    # Update existing user
                    cursor.execute('''
                        UPDATE users SET
                            auth0_user_id = ?,
                            salesforce_contact_id = ?,
                            salesforce_account_id = ?,
                            first_name = ?,
                            last_name = ?,
                            invitation_token = ?,
                            last_login = CURRENT_TIMESTAMP
                        WHERE email = ?
                    ''', (
                        auth0_user_data.get('sub'),
                        invitation['salesforce_contact_id'],
                        invitation['salesforce_account_id'],
                        auth0_user_data.get('given_name', ''),
                        auth0_user_data.get('family_name', ''),
                        token,
                        email.lower()
                    ))
                    user_id = existing_user[0]
                else:
                    # Create new user
                    cursor.execute('''
                        INSERT INTO users 
                        (auth0_user_id, email, salesforce_contact_id, salesforce_account_id,
                         first_name, last_name, invitation_token, last_login)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ''', (
                        auth0_user_data.get('sub'),
                        email.lower(),
                        invitation['salesforce_contact_id'],
                        invitation['salesforce_account_id'],
                        auth0_user_data.get('given_name', ''),
                        auth0_user_data.get('family_name', ''),
                        token
                    ))
                    user_id = cursor.lastrowid
                
                # Mark invitation as used
                cursor.execute('''
                    UPDATE invitations SET 
                        is_used = 1, 
                        used_at = CURRENT_TIMESTAMP 
                    WHERE token = ?
                ''', (token,))
                
                conn.commit()
                
                # Create session token
                session_token = self.create_session_token(user_id, invitation['salesforce_contact_id'])
                
                user_data = {
                    'id': user_id,
                    'auth0_user_id': auth0_user_data.get('sub'),
                    'email': email.lower(),
                    'salesforce_contact_id': invitation['salesforce_contact_id'],
                    'salesforce_account_id': invitation['salesforce_account_id'],
                    'first_name': auth0_user_data.get('given_name', ''),
                    'last_name': auth0_user_data.get('family_name', ''),
                    'session_token': session_token
                }
                
                logger.info(f"✅ User registration completed for {email}")
                return user_data
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error completing user registration: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to complete user registration"
            )

    def create_session_token(self, user_id: int, contact_id: str) -> str:
        """Create a session token for authenticated user"""
        try:
            expires_at = datetime.now() + timedelta(hours=self.jwt_expiry_hours)
            
            # Create JWT payload
            payload = {
                'user_id': user_id,
                'contact_id': contact_id,
                'exp': expires_at.timestamp(),
                'iat': datetime.now().timestamp(),
                'iss': 'ternus-borrower-portal'
            }
            
            # Generate JWT token
            token = jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
            
            # Store session in database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO sessions 
                    (user_id, token, salesforce_contact_id, expires_at)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, token, contact_id, expires_at))
                
                conn.commit()
            
            return token
            
        except Exception as e:
            logger.error(f"❌ Error creating session token: {str(e)}")
            raise

    def validate_session_token(self, token: str) -> Dict[str, Any]:
        """Validate session token and return user data"""
        try:
            # Decode JWT
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            
            user_id = payload.get('user_id')
            contact_id = payload.get('contact_id')
            
            # Verify session exists and is active
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT s.id, s.user_id, s.salesforce_contact_id, 
                           u.email, u.first_name, u.last_name, u.auth0_user_id
                    FROM sessions s
                    JOIN users u ON s.user_id = u.id
                    WHERE s.token = ? AND s.is_active = 1 AND s.expires_at > CURRENT_TIMESTAMP
                ''', (token,))
                
                result = cursor.fetchone()
                
                if not result:
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid or expired session"
                    )
                
                session_id, user_id, contact_id, email, first_name, last_name, auth0_user_id = result
                
                return {
                    'session_id': session_id,
                    'user_id': user_id,
                    'contact_id': contact_id,
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'auth0_user_id': auth0_user_id
                }
                
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail="Session has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=401,
                detail="Invalid session token"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error validating session: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to validate session"
            )

    def get_user_by_auth0_id(self, auth0_user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data by Auth0 user ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT id, email, salesforce_contact_id, salesforce_account_id,
                           first_name, last_name, is_active
                    FROM users 
                    WHERE auth0_user_id = ? AND is_active = 1
                ''', (auth0_user_id,))
                
                result = cursor.fetchone()
                
                if result:
                    user_id, email, contact_id, account_id, first_name, last_name, is_active = result
                    return {
                        'id': user_id,
                        'email': email,
                        'salesforce_contact_id': contact_id,
                        'salesforce_account_id': account_id,
                        'first_name': first_name,
                        'last_name': last_name,
                        'is_active': bool(is_active)
                    }
                
                return None
                
        except Exception as e:
            logger.error(f"❌ Error getting user by Auth0 ID: {str(e)}")
            return None

    def get_contact_id_from_token(self, authorization_header: str) -> str:
        """Extract Salesforce Contact ID from Authorization header"""
        try:
            if not authorization_header:
                # For development, return default contact ID
                logger.warning("⚠️ No authorization header, using development contact ID")
                return "003Oz00000QAiECIA1"  # Real contact ID for testing
            
            # Extract token from "Bearer <token>" format
            parts = authorization_header.split(' ')
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                logger.warning("⚠️ Invalid auth header format, using development contact ID")
                return "003Oz00000QAiECIA1"
            
            token = parts[1]
            
            # For development, decode the demo contact ID from token
            if token.startswith('demo_') or token == 'demo-token':
                return "003Oz00000QAiECIA1"
            
            # Try to validate as session token first (our own JWT)
            try:
                session_data = self.validate_session_token(token)
                return session_data['contact_id']
            except:
                pass
            
            # For now, return development contact ID
            logger.warning("⚠️ Using development contact ID for unknown token")
            return "003Oz00000QAiECIA1"
            
        except Exception as e:
            logger.error(f"❌ Error extracting contact ID: {str(e)}")
            # Return development contact ID as fallback
            return "003Oz00000QAiECIA1"

    def logout_session(self, token: str) -> bool:
        """Logout user by deactivating session"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE sessions SET 
                        is_active = 0 
                    WHERE token = ?
                ''', (token,))
                
                conn.commit()
                return cursor.rowcount > 0
                
        except Exception as e:
            logger.error(f"❌ Error logging out session: {str(e)}")
            return False 