"""
Referral routes for the Ternus Borrower Profile API
"""
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/referrals", tags=["referrals"])

class ReferralTokenRequest(BaseModel):
    contact_id: str
    user_email: str
    max_uses: int = 999999  # Essentially unlimited

def configure_referrals_routes(auth_service):
    """Configure Referrals routes with dependencies"""
    
    @router.post("/generate")
    async def generate_referral_token(request: ReferralTokenRequest):
        """Generate a new referral token for a user"""
        try:
            logger.info(f"🎯 Generating referral token for contact: {request.contact_id}")
            
            # Check if user already has an active referral token
            existing_token = auth_service.get_user_referral_token(request.contact_id)
            if existing_token and existing_token.get('is_active'):
                logger.info(f"✅ Returning existing active token for contact: {request.contact_id}")
                return {
                    "success": True,
                    "message": "Active referral token already exists",
                    "token": existing_token
                }
            
            # Generate new unique token
            token_value = f"ref_{uuid.uuid4().hex[:16]}"
            
            # Set expiration date (90 days from now)
            expires_at = datetime.utcnow() + timedelta(days=90)
            
            # Create referral token in database
            token_data = {
                "token": token_value,
                "contact_id": request.contact_id,
                "user_email": request.user_email,
                "max_uses": request.max_uses,
                "uses_count": 0,
                "is_active": True,
                "expires_at": expires_at,
                "created_at": datetime.utcnow()
            }
            
            # Save to database
            saved_token = auth_service.create_referral_token(token_data)
            
            logger.info(f"✅ Referral token created successfully: {token_value}")
            return {
                "success": True,
                "message": "Referral token generated successfully",
                "token": saved_token
            }
            
        except Exception as e:
            logger.error(f"❌ Error generating referral token: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate referral token: {str(e)}")

    @router.get("/token")
    async def get_referral_token(contact_id: str = Query(...)):
        """Get existing referral token for a user"""
        try:
            logger.info(f"🔍 Getting referral token for contact: {contact_id}")
            
            token = auth_service.get_user_referral_token(contact_id)
            
            if token:
                logger.info(f"✅ Found referral token for contact: {contact_id}")
                return {
                    "success": True,
                    "token": token
                }
            else:
                logger.info(f"❌ No referral token found for contact: {contact_id}")
                return {
                    "success": False,
                    "message": "No referral token found"
                }
                
        except Exception as e:
            logger.error(f"❌ Error getting referral token: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get referral token: {str(e)}")

    @router.post("/validate")
    async def validate_referral_token(referral_token: str = Query(...)):
        """Validate a referral token and get referrer information"""
        try:
            logger.info(f"🔍 Validating referral token: {referral_token}")
            
            token_data = auth_service.validate_referral_token(referral_token)
            
            if token_data:
                logger.info(f"✅ Valid referral token from contact: {token_data.get('contact_id')}")
                return {
                    "success": True,
                    "valid": True,
                    "referrer": token_data,
                    "message": "Valid referral token"
                }
            else:
                logger.warning(f"❌ Invalid referral token: {referral_token}")
                return {
                    "success": True,
                    "valid": False,
                    "message": "Invalid or expired referral token"
                }
                
        except Exception as e:
            logger.error(f"❌ Error validating referral token: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to validate referral token: {str(e)}")

    @router.post("/use")
    async def use_referral_token(
        referral_token: str = Query(...),
        new_contact_id: str = Query(...),
        new_user_email: str = Query(...)
    ):
        """Mark a referral token as used when someone signs up"""
        try:
            logger.info(f"🎯 Using referral token: {referral_token} for new contact: {new_contact_id}")
            
            # Validate and increment usage
            result = auth_service.use_referral_token(referral_token, new_contact_id, new_user_email)
            
            if result.get('success'):
                logger.info(f"✅ Referral token used successfully")
                return {
                    "success": True,
                    "message": "Referral token used successfully",
                    "referrer_contact_id": result.get('referrer_contact_id'),
                    "uses_remaining": result.get('uses_remaining')
                }
            else:
                logger.warning(f"❌ Failed to use referral token: {result.get('message')}")
                raise HTTPException(status_code=400, detail=result.get('message', 'Failed to use referral token'))
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error using referral token: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to use referral token: {str(e)}")

    @router.get("/stats")
    async def get_referral_stats(contact_id: str = Query(...)):
        """Get referral statistics for a user"""
        try:
            logger.info(f"📊 Getting referral stats for contact: {contact_id}")
            
            stats = auth_service.get_referral_stats(contact_id)
            
            logger.info(f"✅ Retrieved referral stats for contact: {contact_id}")
            return {
                "success": True,
                "stats": stats
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting referral stats: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get referral stats: {str(e)}")

    return router 