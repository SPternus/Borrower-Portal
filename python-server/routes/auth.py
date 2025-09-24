"""
Authentication routes for the Ternus Borrower Profile API
"""
import os
import time
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse

import sys
import os
sys.path.append(os.path.dirname(__file__))
from models.requests import RegistrationRequest

logger = logging.getLogger(__name__)

# Router will be configured with dependencies in main.py
router = APIRouter(prefix="/api/auth", tags=["auth"])


def configure_auth_routes(auth_service, sfdc):
    """Configure Auth routes with dependencies"""
    
    @router.get("/validate-token")
    async def validate_token(token: str = Query(...), email: str = Query(...)):
        """Validate invitation token"""
        try:
            logger.info(f"🔍 Validating token for email: {email}")
            
            result = auth_service.validate_invitation_token(token, email)
            
            if result.get('exists'):
                logger.info(f"✅ Token validation successful for: {email}")
                return {
                    "valid": True,
                    "message": "Token is valid",
                    "contact": result
                }
            else:
                logger.warning(f"❌ Token validation failed for: {email}")
                return {
                    "valid": False,
                    "message": "Invalid or expired token"
                }
                
        except Exception as e:
            logger.error(f"❌ Token validation error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Token validation failed: {str(e)}")

    @router.post("/complete-registration")
    async def complete_registration(request: RegistrationRequest):
        """Complete user registration"""
        try:
            logger.info(f"📝 Completing registration for: {request.email}")
            
            result = auth_service.complete_registration(
                token=request.token,
                email=request.email,
                first_name=request.firstName,
                last_name=request.lastName
            )
            
            if result.get('success'):
                logger.info(f"✅ Registration completed for: {request.email}")
                return {
                    "success": True,
                    "message": "Registration completed successfully",
                    "user": result.get('user')
                }
            else:
                raise HTTPException(status_code=400, detail=result.get('message', 'Registration failed'))
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Registration error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

    @router.post("/logout")
    async def logout(request: Request):
        """Logout user"""
        try:
            logger.info("🔓 User logout")
            
            # Clear any session data if needed
            return {
                "success": True,
                "message": "Logged out successfully"
            }
            
        except Exception as e:
            logger.error(f"❌ Logout error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Logout failed: {str(e)}")

    @router.get("/check-access")
    async def check_portal_access(auth0_user_id: str = Query(...), email: str = Query(...)):
        """Check user portal access"""
        try:
            logger.info(f"🔍 Checking access for Auth0 user: {auth0_user_id}")
            
            user_mapping = auth_service.get_user_by_auth0_id(auth0_user_id, email)
            
            if user_mapping and user_mapping.get('salesforce_contact_id'):
                contact_id = user_mapping['salesforce_contact_id']
                
                # Get contact details from Salesforce
                contact_details = sfdc.get_contact(contact_id)
                
                return {
                    "access": True,
                    "message": "User has portal access",
                    "contact": contact_details,
                    "user_mapping": user_mapping
                }
            else:
                return {
                    "access": False,
                    "message": "No portal access found. Please use invitation link."
                }
                
        except Exception as e:
            logger.error(f"❌ Access check error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Access check failed: {str(e)}")

    @router.get("/user-mapping")
    async def get_user_mapping(auth0_user_id: str = Query(...)):
        """Get user mapping"""
        try:
            logger.info(f"🔍 Getting user mapping for: {auth0_user_id}")
            
            user_mapping = auth_service.get_user_by_auth0_id(auth0_user_id)
            
            if user_mapping:
                return {
                    "success": True,
                    "mapping": user_mapping
                }
            else:
                return {
                    "success": False,
                    "message": "No user mapping found"
                }
                
        except Exception as e:
            logger.error(f"❌ Error getting user mapping: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get user mapping: {str(e)}")


    @router.post("/link-user")
    async def link_auth0_user_with_invitation(
        auth0_user_id: str = Query(...), 
        email: str = Query(...), 
        invitation_token: str = Query(...)
    ):
        """Link Auth0 user with Salesforce contact using invitation token (1-to-1 validation)"""
        try:
            logger.info(f"🔗 Linking Auth0 user {auth0_user_id} with invitation token")
            
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

    return router 