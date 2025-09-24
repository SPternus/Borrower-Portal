"""
Salesforce routes for the Ternus Borrower Profile API
"""
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Query

from models.requests import ActivityRequest, OpportunityUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/salesforce", tags=["salesforce"])


def configure_salesforce_routes(auth_service, sfdc, contact_service):
    """Configure Salesforce routes with dependencies"""
    
    @router.get("/test-connection")
    async def test_salesforce_connection():
        """Test Salesforce connection and return basic info"""
        try:
            if sfdc.connected:
                org_info = sfdc.sf.query("SELECT Id, Name, OrganizationType FROM Organization LIMIT 1")
                return {
                    "status": "connected",
                    "message": "Successfully connected to Salesforce",
                    "instance": sfdc.sf.sf_instance,
                    "org_name": org_info['records'][0]['Name'] if org_info['records'] else "Unknown",
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

    @router.get("/opportunity-fields")
    async def get_opportunity_fields():
        """Get available Opportunity fields in Salesforce"""
        try:
            result = sfdc.get_opportunity_fields()
            return result
        except Exception as e:
            logger.error(f"Error getting opportunity fields: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/picklist-values/{object_name}/{field_name}")
    async def get_picklist_values(object_name: str, field_name: str):
        """Get picklist values for a specific SFDC field"""
        try:
            result = sfdc.get_picklist_values(object_name, field_name)
            return result
        except Exception as e:
            logger.error(f"Error getting picklist values: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/contact")
    async def get_contact(
        request: Request,
        auth0_user_id: str = Query(None),
        email: str = Query(None),
        invitation_token: str = Query(None)
    ):
        """Get Salesforce contact information"""
        try:
            logger.info(f"🔍 Getting contact for Auth0 user: {auth0_user_id}, email: {email}")
            
            contact_id = await contact_service.get_contact_id_for_user(auth0_user_id, email, invitation_token)
            if not contact_id:
                raise HTTPException(status_code=404, detail="Contact not found")
            
            contact_details = sfdc.get_contact(contact_id)
            if not contact_details:
                raise HTTPException(status_code=404, detail="Contact not found in Salesforce")
            
            logger.info(f"✅ Successfully retrieved contact data")
            return {
                "success": True,
                "contact": contact_details
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error getting contact: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get contact: {str(e)}")

    @router.get("/opportunities")
    async def get_opportunities(
        request: Request, 
        auth0_user_id: Optional[str] = Query(default=None), 
        email: Optional[str] = Query(default=None),
        invitation_token: Optional[str] = Query(default=None),
        contactId: Optional[str] = Query(default=None)
    ):
        """Get Salesforce opportunities"""
        try:
            logger.info(f"🔍 Getting opportunities for Auth0 user: {auth0_user_id}")
            
            contact_id = contactId
            if not contact_id:
                contact_id = await contact_service.get_contact_id_for_user(auth0_user_id, email, invitation_token)
            
            if not contact_id:
                raise HTTPException(status_code=404, detail="Contact not found")
            
            logger.info(f"📡 Fetching opportunities for contact ID: {contact_id}")
            opportunities = sfdc.get_opportunities(contact_id)
            
            logger.info(f"✅ Found {len(opportunities)} opportunities for contact {contact_id}")
            return {
                "success": True,
                "opportunities": opportunities,
                "contact_id": contact_id
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error getting opportunities: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get opportunities: {str(e)}")

    @router.post("/activity")
    async def log_activity(http_request: Request, request: ActivityRequest):
        """Log activity to Salesforce"""
        try:
            # Log activity using SFDC connector
            result = sfdc.log_activity(
                contact_id=request.contactId,
                activity_type=request.activityType,
                description=request.description
            )
            
            return {
                "success": True,
                "message": "Activity logged successfully",
                "activity_id": result.get("id")
            }
            
        except Exception as e:
            logger.error(f"❌ Error logging activity: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to log activity: {str(e)}")

    @router.post("/opportunities")
    async def create_opportunity_from_application(
        request: Request,
        auth0_user_id: Optional[str] = Query(None),
        email: Optional[str] = Query(None),
        invitation_token: Optional[str] = Query(None)
    ):
        """Create opportunity from application data"""
        try:
            logger.info(f"🚀 Creating opportunity for Auth0 user: {auth0_user_id}")
            
            contact_id = await contact_service.get_contact_id_for_user(auth0_user_id, email, invitation_token)
            if not contact_id:
                raise HTTPException(status_code=404, detail="Contact not found")
            
            try:
                form_data = await request.json()
            except:
                form_data = {}
            
            logger.info(f"🏗️ Creating opportunity with contact ID: {contact_id}")
            opportunity_result = sfdc.create_opportunity(contact_id, form_data)
            
            logger.info(f"✅ Opportunity created successfully")
            return {
                "success": True,
                "message": "Opportunity created successfully",
                "opportunity": opportunity_result
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error creating opportunity: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.put("/opportunities/{opportunity_id}")
    async def update_opportunity(
        opportunity_id: str, 
        updates: OpportunityUpdate,
        request: Request,
        auth0_user_id: Optional[str] = Query(None)
    ):
        """Update an opportunity"""
        try:
            # Verify user has access to this opportunity
            if auth0_user_id:
                contact_id = await contact_service.get_contact_id_for_user(auth0_user_id)
                # Add additional validation here if needed
            
            # Update opportunity
            result = sfdc.update_opportunity(opportunity_id, updates.dict(exclude_unset=True))
            
            return {
                "success": True,
                "message": "Opportunity updated successfully",
                "opportunity_id": opportunity_id,
                "updates": result
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error updating opportunity: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to update opportunity: {str(e)}")

    return router 