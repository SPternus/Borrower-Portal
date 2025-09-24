#!/usr/bin/env python3
"""
Ternus Borrower Profile - Python FastAPI Backend
Replacement for the crashing Node.js server with better SFDC integration
"""

import os
import json
import time
import uuid
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from fastapi import FastAPI, HTTPException, Request, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
import uvicorn
from dotenv import load_dotenv
import logging
import requests

# Import Salesforce connector and Auth service
from salesforce_connector_v2 import TernusSalesforceConnectorV2
from auth_service import TernusAuthService
from pricing_api import pricing_router  # Import pricing router

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Ternus Borrower Profile API",
    description="Python FastAPI backend for SFDC loan management",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI at /docs
    redoc_url="/redoc"  # ReDoc at /redoc
)

# Initialize services
sfdc = TernusSalesforceConnectorV2()
auth_service = TernusAuthService(salesforce_connector=sfdc)

# Include pricing router
app.include_router(pricing_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        os.getenv("CLIENT_URL", "http://localhost:3000")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Configure for production
)

# Pydantic models for request/response validation
class InvitationRequest(BaseModel):
    email: str
    contactId: str
    accountId: str
    loanOfficerId: Optional[str] = None

class TokenValidationRequest(BaseModel):
    token: str
    email: str

class RegistrationRequest(BaseModel):
    token: str
    email: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None

class ActivityRequest(BaseModel):
    contactId: str
    activityType: str
    description: str

class OpportunityUpdate(BaseModel):
    stageName: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None

class ApplicationSaveRequest(BaseModel):
    application_id: str
    current_step: int
    form_data: dict
    is_submitted: bool = False

class ApplicationProgressResponse(BaseModel):
    application_id: str
    current_step: int
    form_data: dict
    is_submitted: bool
    is_draft: bool
    created_at: str
    updated_at: str

# Simple token cache to avoid expensive repeated SFDC calls
TOKEN_CACHE: Dict[str, Tuple[str, float]] = {}
CACHE_DURATION = 5 * 60  # 5 minutes

def get_cached_contact_id(token: str) -> Optional[str]:
    """Get contact ID from cache if valid"""
    if token in TOKEN_CACHE:
        contact_id, timestamp = TOKEN_CACHE[token]
        if time.time() - timestamp < CACHE_DURATION:
            print(f"⚡ Using cached contact ID {contact_id} for token {token}")
            return contact_id
        else:
            print(f"⏰ Cache expired for token {token}")
            del TOKEN_CACHE[token]
    return None

def cache_contact_id(token: str, contact_id: str):
    """Cache contact ID for token"""
    TOKEN_CACHE[token] = (contact_id, time.time())
    print(f"💾 Cached contact ID {contact_id} for token {token}")

# Helper function to get contact ID from request (UPDATED VERSION)
def get_contact_id_from_request(request: Request, auth0_user_id: str = None, email: str = None) -> str:
    """Extract contact ID from user mapping, auth header, or invitation token"""
    try:
        logger.info(f"🔍 Getting contact ID for Auth0 user: {auth0_user_id}, email: {email}")
        
        # First priority: Check if we have an existing user mapping
        if auth0_user_id:
            # Try with both auth0_user_id and email first
            if email:
                user_mapping = auth_service.get_user_by_auth0_id(auth0_user_id, email)
                if user_mapping and user_mapping.get('salesforce_contact_id'):
                    logger.info(f"✅ Found user mapping with email validation: {auth0_user_id} -> {user_mapping['salesforce_contact_id']}")
                    return user_mapping['salesforce_contact_id']
            
            # If that fails, try with just auth0_user_id
            user_mapping = auth_service.get_user_by_auth0_id(auth0_user_id)
            if user_mapping and user_mapping.get('salesforce_contact_id'):
                logger.info(f"✅ Found user mapping: {auth0_user_id} -> {user_mapping['salesforce_contact_id']}")
                return user_mapping['salesforce_contact_id']
            else:
                logger.warning(f"❌ No valid user mapping found for Auth0 user: {auth0_user_id}")
        
        # Second priority: Try authorization header
        auth_header = request.headers.get('authorization')
        if auth_header:
            try:
                contact_id = auth_service.get_contact_id_from_token(auth_header)
                if contact_id:
                    logger.info(f"✅ Found contact ID from auth header: {contact_id}")
                    return contact_id
            except Exception as e:
                logger.warning(f"⚠️ Failed to get contact ID from auth header: {str(e)}")
        
        # Third priority: Check for invitation token in URL params
        invitation_token = request.query_params.get('invitation_token')
        if invitation_token and email:
            try:
                validation_result = auth_service.validate_invitation_token(invitation_token, email)
                if validation_result.get('valid') and validation_result.get('contact_id'):
                    logger.info(f"✅ Found contact ID from invitation token: {validation_result['contact_id']}")
                    return validation_result['contact_id']
            except Exception as e:
                logger.warning(f"⚠️ Failed to validate invitation token: {str(e)}")
        
        # If we get here, no valid contact ID was found
        logger.error(f"❌ No valid contact ID found for Auth0 user: {auth0_user_id}, email: {email}")
        raise HTTPException(
            status_code=401,
            detail="No valid contact ID found. Please ensure you are using the correct invitation link."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting contact ID: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get contact ID: {str(e)}"
        )

# Authentication Endpoints

# Note: Token generation happens in Salesforce, not in our portal
# The portal only validates tokens that come from Salesforce email invitations

@app.get("/api/auth/validate-token")
async def validate_token(token: str = Query(...), email: str = Query(...)):
    """Validate an invitation token against Salesforce"""
    try:
        validation_result = auth_service.validate_invitation_token(token, email)

        return {
            "valid": True,
            "invitation": {
                "email": validation_result["email"],
                "contactId": validation_result["contact_id"],
                "accountId": validation_result.get("account_id"),
                "firstName": validation_result.get("first_name", ""),
                "lastName": validation_result.get("last_name", "")
            },
            "nextStep": "redirect_to_auth0",
            "message": "Valid invitation token - proceed to Auth0 authentication"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error validating token: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to validate token: {str(e)}"
        )

@app.post("/api/auth/complete-registration")
async def complete_registration(request: RegistrationRequest):
    """Complete user registration after Auth0 authentication"""
    try:
        # For demo purposes, simulate Auth0 user data
        auth0_user_data = {
            "sub": f"auth0|demo_{int(time.time())}",
            "email": request.email,
            "given_name": request.firstName or "Demo",
            "family_name": request.lastName or "User",
            "email_verified": True
        }

        # Complete registration using auth service
        user_data = auth_service.complete_user_registration(
            token=request.token,
            email=request.email,
            auth0_user_data=auth0_user_data
        )

        return {
            "success": True,
            "message": "Registration completed successfully",
            "user": {
                "id": user_data["user_id"],
                "email": user_data["email"],
                "contactId": user_data["contact_id"],
                "accountId": user_data.get("account_id")
            },
            "sessionToken": user_data["session_token"],
            "redirectUrl": f"{os.getenv('CLIENT_URL', 'http://localhost:3000')}/dashboard"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error completing registration: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to complete registration: {str(e)}"
        )

@app.post("/api/auth/logout")
async def logout(request: Request):
    """Logout user by invalidating session"""
    try:
        auth_header = request.headers.get('authorization')
        if not auth_header:
            raise HTTPException(status_code=401, detail="No authorization header")
        
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        success = auth_service.logout_session(token)
        
        return {
            "success": success,
            "message": "Logged out successfully" if success else "Session not found"
        }
        
    except Exception as e:
        print(f"❌ Error during logout: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to logout: {str(e)}"
        )

@app.get("/api/auth/check-access")
async def check_portal_access(auth0_user_id: str = Query(...), email: str = Query(...)):
    """Check if a user has portal access by looking up their contact connection"""
    try:
        access_data = auth_service.check_user_portal_access(auth0_user_id, email)
        
        if access_data.get("has_access"):
            return {
                "hasAccess": True,
                "contact": {
                    "id": access_data.get("contact_id"),
                    "accountId": access_data.get("account_id"),
                    "name": access_data.get("contact_name"),
                    "email": access_data.get("contact_email")
                },
                "redirectUrl": f"{os.getenv('CLIENT_URL', 'http://localhost:3000')}/dashboard"
            }
        else:
            return {
                "hasAccess": False,
                "message": access_data.get("message", "No portal access found"),
                "redirectUrl": f"{os.getenv('CLIENT_URL', 'http://localhost:3000')}/no-access"
            }
        
    except Exception as e:
        print(f"❌ Error checking portal access: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check portal access: {str(e)}"
        )

@app.post("/api/auth/test-set-token")
async def test_set_invitation_token(contact_id: str = Query(...), token: str = Query(...)):
    """Test endpoint to set an invitation token on a contact for testing"""
    try:
        # Try to update a contact with an invitation token
        result = sfdc.sf.Contact.update(contact_id, {'Invitation_Token__c': token})
        
        return {
            "success": True,
            "message": f"Successfully set token {token} on contact {contact_id}",
            "result": result
        }
        
    except Exception as e:
        print(f"❌ Error setting test token: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to set invitation token - field might not exist"
        }

@app.get("/api/auth/test-validate-token")
async def test_validate_token_direct(token: str = Query(...), email: str = Query(default="")):
    """Test endpoint to validate invitation token and get contact data directly"""
    try:
        # Validate token using the Salesforce connector
        validation = sfdc.validate_invitation_token_from_salesforce(token, email)
        
        if validation.get('valid'):
            # Get the full contact data
            contact = sfdc.get_contact(validation['contact_id'])
            
            return {
                "success": True,
                "validation": validation,
                "contact": contact,
                "message": f"Token {token} is valid for contact {validation['contact_id']}"
            }
        else:
            return {
                "success": False,
                "error": "Invalid token",
                "message": "Token validation failed"
            }
        
    except Exception as e:
        print(f"❌ Error testing token validation: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to validate token"
        }

@app.get("/api/auth/test-contact-fields")
async def test_contact_fields(contact_id: str = Query(...)):
    """Test endpoint to check what fields are available on a contact"""
    try:
        # Get a contact to see available fields
        contact = sfdc.sf.Contact.get(contact_id)
        
        return {
            "success": True,
            "contact_id": contact_id,
            "available_fields": list(contact.keys()),
            "has_invitation_token_field": 'Invitation_Token__c' in contact,
            "invitation_token_value": contact.get('Invitation_Token__c', 'NOT_SET')
        }
        
    except Exception as e:
        print(f"❌ Error getting contact fields: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to get contact fields"
        }

# New Auth0 User Mapping Endpoints

@app.post("/api/auth/link-user")
async def link_auth0_user_with_invitation(
    auth0_user_id: str = Query(...), 
    email: str = Query(...), 
    invitation_token: str = Query(...)
):
    """Link Auth0 user with Salesforce contact using invitation token (1-to-1 validation)"""
    try:
        result = auth_service.validate_invitation_token_with_mapping(
            token=invitation_token,
            auth0_user_id=auth0_user_id,
            email=email
        )
        
        return {
            "success": True,
            "message": "User successfully linked with Salesforce contact",
            "user_mapping": {
                "auth0_user_id": auth0_user_id,
                "contact_id": result['contact_id'],
                "email": result['email']
            },
            "invitation_consumed": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error linking user: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to link user: {str(e)}"
        )

@app.get("/api/auth/user-mapping")
async def get_user_mapping(auth0_user_id: str = Query(...)):
    """Get user's Salesforce mapping by Auth0 user ID"""
    try:
        user_mapping = auth_service.get_user_by_auth0_id(auth0_user_id)
        
        if user_mapping:
            return {
                "found": True,
                "mapping": {
                    "auth0_user_id": user_mapping['auth0_user_id'],
                    "email": user_mapping['email'],
                    "contact_id": user_mapping['salesforce_contact_id'],
                    "account_id": user_mapping['salesforce_account_id'],
                    "first_name": user_mapping['first_name'],
                    "last_name": user_mapping['last_name'],
                    "created_at": user_mapping['created_at'],
                    "last_login": user_mapping['last_login']
                }
            }
        else:
            return {
                "found": False,
                "message": "No Salesforce mapping found for this user"
            }
            
    except Exception as e:
        logger.error(f"❌ Error getting user mapping: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get user mapping: {str(e)}"
        )

# Salesforce Endpoints

@app.get("/api/salesforce/test-connection")
async def test_salesforce_connection():
    """Test Salesforce connection and return basic info"""
    try:
        if sfdc.connected:
            # Get basic org info
            org_info = sfdc.sf.query("SELECT Id, Name, OrganizationType FROM Organization LIMIT 1")
            
            return {
                "status": "connected",
                "message": "Successfully connected to Salesforce",
                "instance": sfdc.sf.sf_instance,
                "org_name": org_info['records'][0]['Name'] if org_info['records'] else "Unknown",
                "org_type": org_info['records'][0]['OrganizationType'] if org_info['records'] else "Unknown",
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "disconnected",
                "message": "Not connected to Salesforce (using mock mode)",
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"Error testing SFDC connection: {str(e)}")
        return {
            "status": "error",
            "message": f"Connection test failed: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/salesforce/opportunity-fields")
async def get_opportunity_fields():
    """Get available Opportunity fields in Salesforce"""
    try:
        result = sfdc.get_opportunity_fields()
        return result
    except Exception as e:
        logger.error(f"Error getting opportunity fields: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/salesforce/picklist-values/{object_name}/{field_name}")
async def get_picklist_values(object_name: str, field_name: str):
    """Get picklist values for a specific SFDC field"""
    try:
        result = sfdc.get_picklist_values(object_name, field_name)
        return result
    except Exception as e:
        logger.error(f"Error getting picklist values: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/salesforce/contact")
async def get_contact(
    request: Request,
    auth0_user_id: str = Query(None),
    email: str = Query(None),
    invitation_token: str = Query(None)
):
    """Get Salesforce contact information"""
    try:
        logger.info(f"🔍 Getting contact for Auth0 user: {auth0_user_id}, email: {email}, token: {invitation_token}")
        
        # Step 1: Try to get contact ID from existing user mapping or token
        contact_id = None
        
        try:
            contact_id = get_contact_id_from_request(
                request=request,
                auth0_user_id=auth0_user_id,
                email=email
            )
            logger.info(f"✅ Found contact ID from existing mapping or token: {contact_id}")
        except HTTPException as e:
            if e.status_code != 401:
                # Re-raise non-auth errors
                raise
            logger.info("🔍 No contact ID found via mapping or token")
        
        # Step 2: If we have invitation token, validate it (with or without Auth0 info)
        if invitation_token and not contact_id:
            try:
                logger.info("🔍 Validating invitation token...")
                # For contact endpoint, we don't need email validation if not provided
                validation_email = email or "unknown@example.com"  # Fallback for token validation
                validation_result = auth_service.validate_invitation_token(invitation_token, validation_email)
                
                if validation_result.get('valid'):
                    contact_id = validation_result['contact_id']
                    logger.info(f"✅ Found contact ID from invitation token: {contact_id}")
                    
                    # If we have Auth0 info, try to create user mapping for future use
                    if auth0_user_id and email:
                        logger.info(f"🔍 Checking if we should create user mapping: auth0_user_id={auth0_user_id}, email={email}")
                        try:
                            logger.info(f"🔗 Creating user mapping: {auth0_user_id} -> {contact_id}")
                            mapping_result = auth_service.create_or_update_user_mapping(
                                auth0_user_id=auth0_user_id,
                                email=email,
                                contact_id=validation_result['contact_id'],
                                account_id=validation_result.get('account_id', ''),
                                first_name=validation_result.get('first_name', ''),
                                last_name=validation_result.get('last_name', ''),
                                invitation_token=invitation_token
                            )
                            logger.info(f"🔗 Mapping result: {mapping_result}")
                            if mapping_result['success']:
                                logger.info(f"✅ Created user mapping for future use: {auth0_user_id} -> {contact_id}")
                            else:
                                logger.warning(f"⚠️ User mapping creation failed: {mapping_result}")
                        except Exception as mapping_error:
                            logger.error(f"❌ Failed to create user mapping: {str(mapping_error)}")
                            import traceback
                            logger.error(f"❌ Traceback: {traceback.format_exc()}")
                    else:
                        logger.info("ℹ️ No Auth0 user info provided - skipping user mapping creation")
                else:
                    raise HTTPException(status_code=401, detail="Invalid invitation token")
                    
            except Exception as token_error:
                logger.error(f"❌ Failed to validate invitation token: {str(token_error)}")
                raise HTTPException(status_code=401, detail=f"Invalid or expired invitation token: {str(token_error)}")
        
        # Step 3: If we have invitation token and Auth0 info but already have contact_id, still try to create mapping
        elif invitation_token and auth0_user_id and email and contact_id:
            try:
                logger.info("🔍 Validating invitation token for user mapping creation...")
                validation_email = email or "unknown@example.com"
                validation_result = auth_service.validate_invitation_token(invitation_token, validation_email)
                
                if validation_result.get('valid'):
                    # Try to create user mapping for future use
                    logger.info(f"🔍 Creating user mapping: {auth0_user_id} -> {contact_id}")
                    try:
                        mapping_result = auth_service.create_or_update_user_mapping(
                            auth0_user_id=auth0_user_id,
                            email=email,
                            contact_id=validation_result['contact_id'],
                            account_id=validation_result.get('account_id', ''),
                            first_name=validation_result.get('first_name', ''),
                            last_name=validation_result.get('last_name', ''),
                            invitation_token=invitation_token
                        )
                        logger.info(f"🔗 Mapping result: {mapping_result}")
                        if mapping_result['success']:
                            logger.info(f"✅ Created user mapping for future use: {auth0_user_id} -> {contact_id}")
                    except Exception as mapping_error:
                        logger.error(f"❌ Failed to create user mapping: {str(mapping_error)}")
            except Exception as token_error:
                logger.warning(f"⚠️ Token validation failed but we have contact ID: {str(token_error)}")
        
        if not contact_id:
            raise HTTPException(
                status_code=404,
                detail="Contact not found"
            )
        
        # Step 3: Get contact details from Salesforce
        contact_details = sfdc.get_contact(contact_id)
        if not contact_details:
            raise HTTPException(
                status_code=404,
                detail="Contact not found in Salesforce"
            )
        
        logger.info(f"✅ Successfully retrieved contact data for: {contact_details.get('email', 'unknown')}")
        return {
            "success": True,
            "contact": contact_details
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting contact: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get contact: {str(e)}"
        )

@app.get("/api/salesforce/opportunities")
async def get_opportunities(
    request: Request, 
    auth0_user_id: Optional[str] = Query(default=None), 
    email: Optional[str] = Query(default=None),
    invitation_token: Optional[str] = Query(default=None),
    contactId: Optional[str] = Query(default=None)
):
    """Get Salesforce opportunities"""
    try:
        logger.info(f"🔍 Getting opportunities for Auth0 user: {auth0_user_id}, email: {email}, token: {invitation_token}")
        
        # Step 1: Try to get contact ID from existing user mapping or provided contactId
        contact_id = contactId
        if not contact_id:
            try:
                contact_id = get_contact_id_from_request(
                    request=request,
                    auth0_user_id=auth0_user_id,
                    email=email
                )
                logger.info(f"✅ Found contact ID from existing mapping or token: {contact_id}")
            except HTTPException as e:
                if e.status_code != 401:
                    # Re-raise non-auth errors
                    raise
                logger.info("🔍 No contact ID found via mapping or token")
        
        # Step 2: If we have invitation token, validate it (with or without Auth0 info)
        if invitation_token and not contact_id:
            try:
                logger.info("🔍 Validating invitation token...")
                validation_email = email or "unknown@example.com"  # Fallback for token validation
                validation_result = auth_service.validate_invitation_token(invitation_token, validation_email)
                
                if validation_result.get('valid'):
                    contact_id = validation_result['contact_id']
                    logger.info(f"✅ Found contact ID from invitation token: {contact_id}")
                    
                    # If we have Auth0 info, try to create user mapping for future use
                    if auth0_user_id and email:
                        logger.info(f"🔍 Checking if we should create user mapping: auth0_user_id={auth0_user_id}, email={email}")
                        try:
                            logger.info(f"🔗 Creating user mapping: {auth0_user_id} -> {contact_id}")
                            mapping_result = auth_service.create_or_update_user_mapping(
                                auth0_user_id=auth0_user_id,
                                email=email,
                                contact_id=validation_result['contact_id'],
                                account_id=validation_result.get('account_id', ''),
                                first_name=validation_result.get('first_name', ''),
                                last_name=validation_result.get('last_name', ''),
                                invitation_token=invitation_token
                            )
                            logger.info(f"🔗 Mapping result: {mapping_result}")
                            if mapping_result['success']:
                                logger.info(f"✅ Created user mapping for future use: {auth0_user_id} -> {contact_id}")
                            else:
                                logger.warning(f"⚠️ User mapping creation failed: {mapping_result}")
                        except Exception as mapping_error:
                            logger.error(f"❌ Failed to create user mapping: {str(mapping_error)}")
                            import traceback
                            logger.error(f"❌ Traceback: {traceback.format_exc()}")
                    else:
                        logger.info("ℹ️ No Auth0 user info provided - skipping user mapping creation")
                else:
                    raise HTTPException(status_code=401, detail="Invalid invitation token")
                    
            except Exception as token_error:
                logger.error(f"❌ Failed to validate invitation token: {str(token_error)}")
                raise HTTPException(status_code=401, detail=f"Invalid or expired invitation token: {str(token_error)}")
        
        # Step 3: If we have invitation token and Auth0 info but already have contact_id, still try to create mapping
        elif invitation_token and auth0_user_id and email and contact_id:
            try:
                logger.info("🔍 Validating invitation token for user mapping creation...")
                validation_email = email or "unknown@example.com"
                validation_result = auth_service.validate_invitation_token(invitation_token, validation_email)
                
                if validation_result.get('valid'):
                    # Try to create user mapping for future use
                    logger.info(f"🔍 Creating user mapping: {auth0_user_id} -> {contact_id}")
                    try:
                        mapping_result = auth_service.create_or_update_user_mapping(
                            auth0_user_id=auth0_user_id,
                            email=email,
                            contact_id=validation_result['contact_id'],
                            account_id=validation_result.get('account_id', ''),
                            first_name=validation_result.get('first_name', ''),
                            last_name=validation_result.get('last_name', ''),
                            invitation_token=invitation_token
                        )
                        logger.info(f"🔗 Mapping result: {mapping_result}")
                        if mapping_result['success']:
                            logger.info(f"✅ Created user mapping for future use: {auth0_user_id} -> {contact_id}")
                    except Exception as mapping_error:
                        logger.error(f"❌ Failed to create user mapping: {str(mapping_error)}")
            except Exception as token_error:
                logger.warning(f"⚠️ Token validation failed but we have contact ID: {str(token_error)}")

        if not contact_id:
            raise HTTPException(status_code=401, detail="No valid contact ID found")

        # Step 3: Get opportunities from Salesforce
        logger.info(f"📡 Fetching opportunities for contact ID: {contact_id}")
        opportunities = sfdc.get_opportunities(contact_id)
        
        logger.info(f"✅ Found {len(opportunities)} opportunities for contact {contact_id}")
        return {
            "opportunities": opportunities,
            "access_method": "user_mapping" if auth0_user_id else "invitation_token",
            "contact_id": contact_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching opportunities: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch opportunities: {str(e)}"
        )

@app.post("/api/salesforce/activity")
async def log_activity(http_request: Request, request: ActivityRequest):
    """Log activity to Salesforce for authenticated user"""
    try:
        # Use provided contactId or extract from auth token
        contact_id = request.contactId if request.contactId else get_contact_id_from_request(http_request)
        
        result = sfdc.log_activity(
            contact_id=contact_id,
            activity_type=request.activityType,
            description=request.description
        )
        
        return result

    except Exception as e:
        print(f"❌ Error logging activity: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to log activity: {str(e)}"
        )

@app.patch("/api/salesforce/opportunities/{opportunity_id}")
async def update_opportunity(opportunity_id: str, request: OpportunityUpdate):
    """Update a Salesforce opportunity"""
    try:
        updates = request.dict(exclude_unset=True)
        result = sfdc.update_opportunity(opportunity_id, updates)
        
        return result

    except Exception as e:
        print(f"❌ Error updating opportunity: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update opportunity: {str(e)}"
        )

@app.put("/api/salesforce/opportunities/{opportunity_id}")
async def update_opportunity(
    opportunity_id: str, 
    updates: OpportunityUpdate,
    request: Request,
    auth0_user_id: Optional[str] = Query(None)
):
    """Update an opportunity in Salesforce"""
    try:
        # Get contact ID using the same pattern as other endpoints
        contact_id = get_contact_id_from_request(request, auth0_user_id)
        
        if not contact_id:
            raise HTTPException(status_code=401, detail="Valid contact ID required")
        
        # Convert updates to dict, removing None values
        update_data = {k: v for k, v in updates.dict().items() if v is not None}
        
        result = sfdc.update_opportunity(opportunity_id, update_data)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to update opportunity"))
        
        return result
        
    except Exception as e:
        logger.error(f"Error updating opportunity: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/salesforce/opportunities")
async def create_opportunity_from_application(
    request: Request,
    auth0_user_id: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    invitation_token: Optional[str] = Query(None)
):
    """Create opportunity from application form data with automatic user mapping"""
    try:
        # Get form data from request body
        form_data = await request.json()
        logger.info(f"🚀 Creating opportunity for Auth0 user: {auth0_user_id}, email: {email}")
        
        # Step 1: Try to get existing contact ID
        contact_id = None
        try:
            contact_id = get_contact_id_from_request(request, auth0_user_id, email)
            logger.info(f"✅ Found existing contact ID: {contact_id}")
        except HTTPException as e:
            if e.status_code == 401:
                logger.info("🔍 No existing user mapping found, checking for invitation token...")
                
                # Step 2: If no mapping exists, try to create one using invitation token
                if invitation_token and email and auth0_user_id:
                    try:
                        logger.info(f"🎫 Validating invitation token for {email}")
                        validation_result = auth_service.validate_invitation_token(invitation_token, email)
                        
                        if validation_result.get('valid'):
                            logger.info(f"✅ Token validated, creating user mapping...")
                            
                            # Create user mapping
                            mapping_result = auth_service.create_or_update_user_mapping(
                                auth0_user_id=auth0_user_id,
                                email=email,
                                contact_id=validation_result['contact_id'],
                                account_id=validation_result.get('account_id', ''),
                                first_name=validation_result.get('first_name', ''),
                                last_name=validation_result.get('last_name', ''),
                                invitation_token=invitation_token
                            )
                            
                            if mapping_result['success']:
                                contact_id = validation_result['contact_id']
                                logger.info(f"✅ User mapping created successfully: {auth0_user_id} -> {contact_id}")
                            else:
                                raise HTTPException(status_code=500, detail="Failed to create user mapping")
                        else:
                            raise HTTPException(status_code=401, detail="Invalid invitation token")
                            
                    except Exception as token_error:
                        logger.error(f"❌ Failed to validate token or create mapping: {str(token_error)}")
                        raise HTTPException(
                            status_code=401, 
                            detail=f"Failed to validate invitation token: {str(token_error)}"
                        )
                else:
                    logger.error("❌ No invitation token provided for user mapping creation")
                    raise HTTPException(
                        status_code=401,
                        detail="No user mapping found and no invitation token provided. Please use the invitation link from your email."
                    )
            else:
                raise  # Re-raise other HTTP exceptions
        
        # Step 3: Create the opportunity with the contact ID
        if not contact_id:
            raise HTTPException(status_code=500, detail="Failed to obtain contact ID")
            
        logger.info(f"🏗️ Creating opportunity with contact ID: {contact_id}")
        
        # Create opportunity in Salesforce
        opportunity_result = sfdc.create_opportunity(contact_id, form_data)
        
        if opportunity_result.get('success'):
            logger.info(f"✅ Opportunity created successfully: {opportunity_result.get('id')}")
            return {
                "success": True,
                "id": opportunity_result.get('id'),
                "opportunityId": opportunity_result.get('id'),
                "message": "Opportunity created successfully"
            }
        else:
            logger.error(f"❌ Failed to create opportunity: {opportunity_result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create opportunity: {opportunity_result.get('error', 'Unknown error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error creating opportunity: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

# Health Check

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "mode": "python-fastapi",
        "auth_service": "postgresql" if auth_service.postgres_available else "sqlite",
        "salesforce": "connected" if sfdc.connected else "mock",
        "python_version": "3.x",
        "framework": "FastAPI",
        "services": {
            "pricing": "operational"
        }
    }

# Error handlers

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "message": "Endpoint not found",
                "status": 404,
                "timestamp": datetime.now().isoformat()
            }
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "message": "Internal server error",
                "status": 500,
                "timestamp": datetime.now().isoformat()
            }
        }
    )

# Loan Application Wizard Endpoints

@app.post("/api/applications/save")
async def save_application_progress(
    request: ApplicationSaveRequest,
    http_request: Request,
    auth0_user_id: str = Query(...),
    email: str = Query(default=None),
    invitation_token: str = Query(default=None),
    contact_id: str = Query(default=None)
):
    """Save loan application progress at any step"""
    try:
        logger.info(f"💾 Saving application for Auth0 user: {auth0_user_id}, email: {email}")
        
        # If no contact_id provided, try to get it using the same logic as other endpoints
        if not contact_id:
            try:
                contact_id = get_contact_id_from_request(
                    request=http_request,
                    auth0_user_id=auth0_user_id,
                    email=email
                )
                logger.info(f"✅ Found contact ID from user mapping: {contact_id}")
            except HTTPException as e:
                if e.status_code == 401 and invitation_token:
                    logger.info("🔍 No user mapping found, trying invitation token...")
                    
                    # Try to validate invitation token and create mapping
                    try:
                        validation_email = email or "unknown@example.com"
                        validation_result = auth_service.validate_invitation_token(invitation_token, validation_email)
                        
                        if validation_result.get('valid'):
                            contact_id = validation_result['contact_id']
                            logger.info(f"✅ Found contact ID from invitation token: {contact_id}")
                            
                            # Create user mapping for future use
                            if auth0_user_id and email:
                                try:
                                    mapping_result = auth_service.create_or_update_user_mapping(
                                        auth0_user_id=auth0_user_id,
                                        email=email,
                                        contact_id=validation_result['contact_id'],
                                        account_id=validation_result.get('account_id', ''),
                                        first_name=validation_result.get('first_name', ''),
                                        last_name=validation_result.get('last_name', ''),
                                        invitation_token=invitation_token
                                    )
                                    if mapping_result['success']:
                                        logger.info(f"✅ Created user mapping for future use: {auth0_user_id} -> {contact_id}")
                                except Exception as mapping_error:
                                    logger.warning(f"⚠️ Failed to create user mapping (non-critical): {str(mapping_error)}")
                        else:
                            raise HTTPException(status_code=401, detail="Invalid invitation token")
                            
                    except Exception as token_error:
                        logger.error(f"❌ Failed to validate invitation token: {str(token_error)}")
                        raise HTTPException(
                            status_code=401,
                            detail=f"Failed to validate invitation token: {str(token_error)}"
                        )
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="Contact ID required for saving application. Please ensure you are using the correct invitation link."
                    )
        
        if not contact_id:
            raise HTTPException(
                status_code=400,
                detail="Contact ID required for saving application"
            )
        
        result = auth_service.save_application_progress(
            application_id=request.application_id,
            auth0_user_id=auth0_user_id,
            contact_id=contact_id,
            current_step=request.current_step,
            form_data=request.form_data,
            is_submitted=request.is_submitted
        )
        
        if result['success']:
            return {
                "success": True,
                "message": result['message'],
                "application_id": result['application_id'],
                "current_step": result['current_step'],
                "is_submitted": result['is_submitted'],
                "saved_at": datetime.now().isoformat()
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result['message']
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error saving application progress: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save application progress: {str(e)}"
        )

@app.get("/api/applications/{application_id}")
async def get_application_progress(
    application_id: str,
    auth0_user_id: str = Query(...)
):
    """Get loan application progress by application ID"""
    try:
        application = auth_service.get_application_progress(application_id)
        
        if not application:
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        
        # Verify user has access to this application
        if application['auth0_user_id'] != auth0_user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to this application"
            )
        
        return {
            "application_id": application['application_id'],
            "current_step": application['current_step'],
            "form_data": application['form_data'],
            "is_submitted": application['is_submitted'],
            "is_draft": application['is_draft'],
            "created_at": application['created_at'].isoformat() if application['created_at'] else None,
            "updated_at": application['updated_at'].isoformat() if application['updated_at'] else None,
            "submitted_at": application['submitted_at'].isoformat() if application['submitted_at'] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting application progress: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get application progress: {str(e)}"
        )

@app.get("/api/applications")
async def get_user_applications(auth0_user_id: str = Query(...)):
    """Get all loan applications for a user"""
    try:
        applications = auth_service.get_user_applications(auth0_user_id)
        
        return {
            "applications": [
                {
                    "application_id": app['application_id'],
                    "current_step": app['current_step'],
                    "form_data": app['form_data'],
                    "is_submitted": app['is_submitted'],
                    "is_draft": app['is_draft'],
                    "created_at": app['created_at'].isoformat() if app['created_at'] else None,
                    "updated_at": app['updated_at'].isoformat() if app['updated_at'] else None,
                    "submitted_at": app['submitted_at'].isoformat() if app['submitted_at'] else None
                }
                for app in applications
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting user applications: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get user applications: {str(e)}"
        )

@app.post("/api/applications/{application_id}/submit")
async def submit_application(
    application_id: str,
    auth0_user_id: str = Query(...)
):
    """Submit a completed loan application"""
    try:
        # Get the application
        application = auth_service.get_application_progress(application_id)
        
        if not application:
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )
        
        # Verify user has access
        if application['auth0_user_id'] != auth0_user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied to this application"
            )
        
        # Mark as submitted
        result = auth_service.save_application_progress(
            application_id=application_id,
            auth0_user_id=auth0_user_id,
            contact_id=application['contact_id'],
            current_step=application['current_step'],
            form_data=application['form_data'],
            is_submitted=True
        )
        
        if result['success']:
            return {
                "success": True,
                "message": "Application submitted successfully",
                "application_id": application_id,
                "submitted_at": datetime.now().isoformat()
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result['message']
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error submitting application: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit application: {str(e)}"
        )

# Add this helper function before the Plaid endpoint
async def get_contact_id_for_user(auth0_user_id: str, email: str = None, invitation_token: str = None) -> str:
    """Get contact ID for user from various sources"""
    try:
        logger.info(f"🔍 Getting contact ID for Auth0 user: {auth0_user_id}, email: {email}")
        
        # First priority: Check if we have an existing user mapping
        if auth0_user_id:
            # Try with both auth0_user_id and email first
            if email:
                user_mapping = auth_service.get_user_by_auth0_id(auth0_user_id, email)
                if user_mapping and user_mapping.get('salesforce_contact_id'):
                    logger.info(f"✅ Found user mapping with email validation: {auth0_user_id} -> {user_mapping['salesforce_contact_id']}")
                    return user_mapping['salesforce_contact_id']
            
            # If that fails, try with just auth0_user_id
            user_mapping = auth_service.get_user_by_auth0_id(auth0_user_id)
            if user_mapping and user_mapping.get('salesforce_contact_id'):
                logger.info(f"✅ Found user mapping: {auth0_user_id} -> {user_mapping['salesforce_contact_id']}")
                return user_mapping['salesforce_contact_id']
        
        # Second priority: Try invitation token
        if invitation_token:
            try:
                validation_result = auth_service.validate_invitation_token(invitation_token, email or "unknown@example.com")
                if validation_result.get('valid') and validation_result.get('contact_id'):
                    logger.info(f"✅ Found contact ID from invitation token: {validation_result['contact_id']}")
                    return validation_result['contact_id']
            except Exception as e:
                logger.warning(f"⚠️ Failed to validate invitation token: {str(e)}")
        
        # If we get here, no valid contact ID was found
        logger.error(f"❌ No valid contact ID found for Auth0 user: {auth0_user_id}, email: {email}")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error getting contact ID: {str(e)}")
        return None

@app.post("/api/plaid/identity-verification")
async def create_plaid_verification(
    auth0_user_id: str = Query(...),
    invitation_token: str = Query(None)
):
    """Create Plaid Identity Verification session"""
    try:
        logger.info(f"🔗 Creating Plaid verification for Auth0 user: {auth0_user_id}")
        
        # Get contact ID
        contact_id = await get_contact_id_for_user(auth0_user_id, None, invitation_token)
        if not contact_id:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        # Get contact details for user info
        contact_details = sfdc.get_contact(contact_id)
        if not contact_details:
            raise HTTPException(status_code=404, detail="Contact details not found")
        
        # Plaid API configuration
        plaid_url = "https://sandbox.plaid.com/identity_verification/create"
        plaid_headers = {
            "Content-Type": "application/json"
        }
        
        # Prepare Plaid request payload
        plaid_payload = {
            "client_id": "67d856e2586e0500223e231b",
            "secret": "7592b87336c9ba6a62a1fa152b2334",
            "client_user_id": auth0_user_id,
            "template_id": "idvtmp_8s6t7soyzn8xyf",
            "gave_consent": True,
            "is_shareable": True,
            "user": {
                "email_address": contact_details.get("email", ""),
                "phone_number": "+13234592129",  # Use a valid format for now
                "name": {
                    "given_name": contact_details.get("firstName", ""),
                    "family_name": contact_details.get("lastName", "")
                }
            }
        }
        
        logger.info(f"🔗 Calling Plaid API with payload: {json.dumps(plaid_payload, indent=2)}")
        
        # Make request to Plaid API
        response = requests.post(plaid_url, headers=plaid_headers, json=plaid_payload)
        
        if response.status_code != 200:
            logger.error(f"❌ Plaid API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail=f"Plaid API error: {response.text}")
        
        plaid_data = response.json()
        logger.info(f"✅ Plaid verification created: {plaid_data.get('id')}")
        
        # Extract important data
        verification_id = plaid_data.get("id")
        shareable_url = plaid_data.get("shareable_url")
        
        if not verification_id or not shareable_url:
            logger.error(f"❌ Missing required Plaid data: id={verification_id}, url={shareable_url}")
            raise HTTPException(status_code=500, detail="Invalid Plaid response")
        
        # Update contact in Salesforce with Plaid data
        try:
            # Only update basic Plaid verification status for now
            # Additional fields can be added when they exist in Salesforce
            update_data = {
                'Plaid_Verified__c': True  # Mark as verified when verification is created
            }
            
            # Use the salesforce connector to update the contact
            if sfdc.connected:
                result = sfdc.contact.update(contact_id, update_data)
                if result.get("success"):
                    logger.info(f"✅ Contact updated with Plaid verification status: {contact_id}")
                else:
                    logger.error(f"❌ Failed to update contact: {result}")
            else:
                logger.info(f"🔧 Mock mode: Would update contact {contact_id} with Plaid verification status")
            
        except Exception as e:
            logger.error(f"❌ Error updating contact with Plaid data: {str(e)}")
            # Don't fail the request if Salesforce update fails
        
        # Return the verification data
        return {
            "success": True,
            "verification_id": verification_id,
            "shareable_url": shareable_url,
            "status": plaid_data.get("status"),
            "steps": plaid_data.get("steps"),
            "message": "Plaid verification session created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error creating Plaid verification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Main entry point
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    
    print("🐍 Starting Ternus Python FastAPI Server")
    print(f"📡 Port: {port}")
    print(f"🌐 Client URL: {os.getenv('CLIENT_URL', 'http://localhost:3000')}")
    print(f"📊 Health: http://localhost:{port}/health")
    print(f"📖 Docs: http://localhost:{port}/docs")
    print("💰 Pricing: http://localhost:5000/api/pricing/")
    print("🚀 Ready for SFDC operations!")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )
