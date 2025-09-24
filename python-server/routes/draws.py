"""
Draw Management API Routes
Handles construction loan draw requests and management
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

def configure_draw_routes(auth_service, sfdc_connector):
    """Configure draw management routes"""
    router = APIRouter()
    
    # Import the DrawManager
    from salesforce.objects.draw import DrawManager
    draw_manager = DrawManager()
    
    @router.get("/opportunities/{opportunity_id}/draws")
    async def get_opportunity_draws(opportunity_id: str):
        """Get all draws for an opportunity"""
        try:
            logger.info(f"💰 Getting draws for opportunity: {opportunity_id}")
            logger.info(f"💰 Salesforce connection status: {sfdc_connector.connected}")
            
            draws = draw_manager.get_draws_for_opportunity(opportunity_id)
            logger.info(f"💰 Retrieved {len(draws)} draws from Salesforce")
            
            summary = draw_manager.get_draw_summary(opportunity_id)
            logger.info(f"💰 Generated summary: {summary}")
            
            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "draws": draws,
                "summary": summary,
                "total_draws": len(draws)
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting draws for opportunity: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get draws: {str(e)}")
    
    @router.post("/opportunities/{opportunity_id}/draws")
    async def create_draw_request(
        opportunity_id: str,
        draw_data: Dict[str, Any]
    ):
        """Create a new draw request"""
        try:
            logger.info(f"💰 Creating draw request for opportunity: {opportunity_id}")
            logger.info(f"Draw data: {draw_data}")
            
            # Extract auth info from request body
            auth0_user_id = draw_data.get("auth0_user_id")
            email = draw_data.get("email")
            
            logger.info(f"💰 User: {auth0_user_id}, Email: {email}")
            
            # Validate required fields
            required_fields = ["requestedAmount", "description", "auth0_user_id", "email"]
            for field in required_fields:
                if field not in draw_data:
                    raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
            
            result = draw_manager.create_draw_request(opportunity_id, draw_data)
            
            if result.get("success"):
                logger.info(f"✅ Draw request created successfully: {result['drawId']}")
                return result
            else:
                raise HTTPException(status_code=500, detail=result.get("error", "Failed to create draw request"))
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error creating draw request: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create draw request: {str(e)}")
    
    @router.get("/draws/{draw_id}")
    async def get_draw_details(draw_id: str):
        """Get detailed information for a specific draw"""
        try:
            logger.info(f"💰 Getting draw details: {draw_id}")
            
            # Get draw details using the base manager
            draw = draw_manager.get(draw_id)
            
            if not draw:
                raise HTTPException(status_code=404, detail=f"Draw not found: {draw_id}")
            
            return {
                "success": True,
                "draw": draw
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error getting draw details: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get draw details: {str(e)}")
    
    @router.put("/draws/{draw_id}/status")
    async def update_draw_status(
        draw_id: str,
        status_data: Dict[str, Any]
    ):
        """Update draw status (approve, reject, release)"""
        try:
            logger.info(f"💰 Updating draw status: {draw_id}")
            
            status = status_data.get("status")
            notes = status_data.get("notes", "")
            
            if not status:
                raise HTTPException(status_code=400, detail="Status is required")
            
            # Validate status values
            valid_statuses = ["pending", "approved", "rejected", "released", "disbursed"]
            if status.lower() not in valid_statuses:
                raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
            
            result = draw_manager.update_draw_status(draw_id, status, notes)
            
            if result.get("success"):
                logger.info(f"✅ Draw status updated successfully: {draw_id}")
                return result
            else:
                raise HTTPException(status_code=500, detail=result.get("error", "Failed to update draw status"))
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error updating draw status: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to update draw status: {str(e)}")
    
    @router.get("/opportunities/{opportunity_id}/draws/summary")
    async def get_draw_summary(opportunity_id: str):
        """Get draw summary statistics for an opportunity"""
        try:
            logger.info(f"💰 Getting draw summary for opportunity: {opportunity_id}")
            
            summary = draw_manager.get_draw_summary(opportunity_id)
            
            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "summary": summary
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting draw summary: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get draw summary: {str(e)}")
    
    @router.get("/draws/{draw_id}/documents")
    async def get_draw_documents(draw_id: str):
        """Get documents associated with a draw"""
        try:
            logger.info(f"💰 Getting documents for draw: {draw_id}")
            
            # This would query Document__c or ContentDocument objects
            # related to the draw through a junction object or lookup field
            # For now, return mock data
            
            documents = [
                {
                    "id": "doc1",
                    "name": "Progress Photos.pdf",
                    "type": "Progress Documentation",
                    "uploadDate": "2024-09-05",
                    "status": "approved",
                    "url": "/api/documents/doc1/download"
                },
                {
                    "id": "doc2",
                    "name": "Contractor Invoice.pdf",
                    "type": "Invoice",
                    "uploadDate": "2024-09-05",
                    "status": "approved",
                    "url": "/api/documents/doc2/download"
                }
            ]
            
            return {
                "success": True,
                "draw_id": draw_id,
                "documents": documents,
                "total_documents": len(documents)
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting draw documents: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get draw documents: {str(e)}")
    
    return router
