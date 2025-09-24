"""
Applications routes for the Ternus Borrower Profile API
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Query

from models.requests import ApplicationSaveRequest, ApplicationProgressResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/applications", tags=["applications"])


def configure_applications_routes(auth_service, contact_service):
    """Configure Applications routes with dependencies"""
    
    @router.post("/save")
    async def save_application_progress(
        request: ApplicationSaveRequest,
        http_request: Request,
        auth0_user_id: str = Query(...),
        email: str = Query(default=None),
        invitation_token: str = Query(default=None),
        contact_id: str = Query(default=None)
    ):
        """Save application progress"""
        try:
            logger.info(f"💾 Saving application for Auth0 user: {auth0_user_id}, email: {email}")
            
            if not contact_id:
                contact_id = await contact_service.get_contact_id_for_user(auth0_user_id, email, invitation_token)
                if not contact_id:
                    raise HTTPException(status_code=404, detail="Contact not found")
                logger.info(f"✅ Found contact ID from user mapping: {contact_id}")
            
            # Save application progress
            result = auth_service.save_application_progress(
                application_id=request.application_id,
                auth0_user_id=auth0_user_id,
                current_step=request.current_step,
                form_data=request.form_data,
                is_submitted=request.is_submitted
            )
            
            if result["success"]:
                logger.info(f"✅ Application saved successfully: {request.application_id}")
                return {
                    "success": True,
                    "message": "Application saved successfully",
                    "application_id": request.application_id,
                    "current_step": request.current_step
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to save application")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error saving application: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save application: {str(e)}")

    @router.get("/{application_id}")
    async def get_application_progress(
        application_id: str,
        auth0_user_id: str = Query(...)
    ):
        """Get application progress"""
        try:
            logger.info(f"🔍 Getting application progress for {application_id}")
            
            result = auth_service.get_application_progress(application_id, auth0_user_id)
            
            if result["success"]:
                return {
                    "success": True,
                    "application": result["application"]
                }
            else:
                raise HTTPException(status_code=404, detail="Application not found")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error getting application: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get application: {str(e)}")

    @router.get("")
    async def get_user_applications(auth0_user_id: str = Query(...)):
        """Get all applications for a user"""
        try:
            logger.info(f"🔍 Getting applications for user: {auth0_user_id}")
            
            applications = auth_service.get_user_applications(auth0_user_id)
            
            return {
                "success": True,
                "applications": applications
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting user applications: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get applications: {str(e)}")

    @router.post("/{application_id}/submit")
    async def submit_application(
        application_id: str,
        auth0_user_id: str = Query(...)
    ):
        """Submit an application"""
        try:
            logger.info(f"📋 Submitting application: {application_id}")
            
            result = auth_service.submit_application(application_id, auth0_user_id)
            
            if result["success"]:
                return {
                    "success": True,
                    "message": "Application submitted successfully",
                    "application_id": application_id
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to submit application")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error submitting application: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to submit application: {str(e)}")

    return router 