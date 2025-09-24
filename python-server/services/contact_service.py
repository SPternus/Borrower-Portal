"""
Contact service for handling contact-related business logic
"""
import logging
from typing import Optional
from fastapi import Request, HTTPException

# Import these will be resolved when we update the imports
from auth_service import TernusAuthService
from utils.cache import get_cached_contact_id, cache_contact_id

logger = logging.getLogger(__name__)


class ContactService:
    def __init__(self, auth_service: TernusAuthService):
        self.auth_service = auth_service

    def get_contact_id_from_request(self, request: Request, auth0_user_id: str = None, email: str = None) -> str:
        """Get contact ID from request headers or user mapping"""
        try:
            # First, try to get from Authorization header
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:]  # Remove "Bearer " prefix
                
                # Check if it's a cached contact ID
                cached_contact_id = get_cached_contact_id(token)
                if cached_contact_id:
                    logger.info(f"✅ Found cached contact ID: {cached_contact_id}")
                    return cached_contact_id
                
                # Validate token and get contact ID
                try:
                    validation_result = self.auth_service.validate_invitation_token(token, email or "unknown@example.com")
                    if validation_result.get('exists') and validation_result.get('contact_id'):
                        contact_id = validation_result['contact_id']
                        # Cache for future use
                        cache_contact_id(token, contact_id)
                        logger.info(f"✅ Found contact ID from token: {contact_id}")
                        return contact_id
                except Exception as e:
                    logger.warning(f"⚠️ Token validation failed: {str(e)}")
            
            # Second, try to get from user mapping if Auth0 user ID is provided
            if auth0_user_id:
                user_mapping = self.auth_service.get_user_by_auth0_id(auth0_user_id, email)
                if user_mapping and user_mapping.get('salesforce_contact_id'):
                    logger.info(f"✅ Found contact ID from user mapping: {user_mapping['salesforce_contact_id']}")
                    return user_mapping['salesforce_contact_id']
            
            # If we get here, no valid contact ID was found
            raise HTTPException(
                status_code=401,
                detail="No valid contact ID found. Please provide valid Auth0 user ID or invitation token."
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error getting contact ID from request: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get contact ID: {str(e)}"
            )

    async def get_contact_id_for_user(self, auth0_user_id: str, email: str = None, invitation_token: str = None) -> str:
        """Get contact ID for user - prioritize PostgreSQL user mapping over invitation tokens"""
        try:
            logger.info(f"🔍 NEW FLOW: Getting contact ID for Auth0 user: {auth0_user_id}, email: {email}")
            
            # PRIORITY 1: PostgreSQL user mapping (for returning users)
            if auth0_user_id:
                logger.info(f"🗄️ Checking PostgreSQL user mapping for Auth0 user: {auth0_user_id}")
                
                # Try with both auth0_user_id and email first
                if email:
                    user_mapping = self.auth_service.get_user_by_auth0_id(auth0_user_id, email)
                    if user_mapping and user_mapping.get('salesforce_contact_id'):
                        logger.info(f"✅ Found PostgreSQL user mapping with email validation: {auth0_user_id} -> {user_mapping['salesforce_contact_id']}")
                        return user_mapping['salesforce_contact_id']
                
                # If that fails, try with just auth0_user_id
                user_mapping = self.auth_service.get_user_by_auth0_id(auth0_user_id)
                if user_mapping and user_mapping.get('salesforce_contact_id'):
                    logger.info(f"✅ Found PostgreSQL user mapping: {auth0_user_id} -> {user_mapping['salesforce_contact_id']}")
                    return user_mapping['salesforce_contact_id']
                
                logger.info(f"❌ No PostgreSQL user mapping found for Auth0 user: {auth0_user_id}")
            
            # PRIORITY 2: Invitation token (only for first-time users or unauthenticated users)
            if invitation_token:
                logger.info(f"🎫 No user mapping found, checking invitation token for first-time setup")
                try:
                    validation_result = self.auth_service.validate_invitation_token(invitation_token, email or "unknown@example.com")
                    if validation_result.get('exists') and validation_result.get('contact_id'):
                        logger.info(f"✅ Found contact ID from invitation token: {validation_result['contact_id']}")
                        return validation_result['contact_id']
                except Exception as e:
                    logger.warning(f"⚠️ Failed to validate invitation token: {str(e)}")
            
            # If we get here, no valid contact ID was found
            if auth0_user_id:
                logger.error(f"❌ Authenticated user {auth0_user_id} has no user mapping and no valid invitation token")
            else:
                logger.error(f"❌ Unauthenticated user has no valid invitation token")
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting contact ID: {str(e)}")
            return None 