"""
Lead routes for the Ternus Borrower Profile API
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Query, Form
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/leads", tags=["leads"])

class LeadFormData(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    phone: str
    company: Optional[str] = None
    
    # Property Details
    propertyAddress: Optional[str] = None
    rent: Optional[str] = None
    propertyInsurance: Optional[str] = None
    linkToCurrentPictures: Optional[str] = None
    asIsValue: Optional[str] = None
    propertyTaxes: Optional[str] = None
    interests: Optional[str] = None
    notes: Optional[str] = None
    
    # Real Estate Investment Details
    expressedInterest: Optional[str] = None
    intent: Optional[str] = None
    expectedCloseDate: Optional[str] = None
    currentPropertiesOwned: Optional[str] = None
    propertiesPurchasedLast12Months: Optional[str] = None
    desiredLoanAmount: Optional[str] = None
    purchasePrice: Optional[str] = None
    estimatedRenovationAmount: Optional[str] = None
    estimatedAfterRepairedValue: Optional[str] = None
    rehabsCompletedIn3Years: Optional[str] = None
    
    referralToken: Optional[str] = None

def configure_leads_routes(auth_service, salesforce_connector):
    """Configure Lead routes with dependencies"""
    
    @router.post("/create")
    async def create_lead_from_form(lead_data: LeadFormData):
        """Create a new lead from referral form submission"""
        try:
            logger.info(f"🎯 Creating lead from form: {lead_data.firstName} {lead_data.lastName} ({lead_data.email})")
            
            referrer_contact_id = None
            
            # If referral token is provided, validate it and get referrer info
            if lead_data.referralToken:
                logger.info(f"🔍 Validating referral token: {lead_data.referralToken}")
                
                token_data = auth_service.validate_referral_token(lead_data.referralToken)
                if token_data:
                    referrer_contact_id = token_data.get('contact_id')
                    logger.info(f"✅ Valid referral token from contact: {referrer_contact_id}")
                    
                    # Mark the referral token as used
                    use_result = auth_service.use_referral_token(
                        lead_data.referralToken, 
                        f"LEAD_{lead_data.email}",  # Temporary ID until lead is created
                        lead_data.email
                    )
                    
                    if use_result.get('success'):
                        logger.info(f"✅ Referral token marked as used")
                    else:
                        logger.warning(f"⚠️ Failed to mark referral token as used: {use_result.get('message')}")
                else:
                    logger.warning(f"❌ Invalid referral token: {lead_data.referralToken}")
                    # Continue creating lead even if token is invalid
            
            # Convert Pydantic model to dict for processing
            form_data = lead_data.model_dump()
            
            # Create lead in Salesforce
            from salesforce.objects.lead.manager import LeadManager
            lead_manager = LeadManager()
            
            result = lead_manager.create_from_form_data(form_data, referrer_contact_id)
            
            if result.get('success'):
                lead_id = result.get('leadId')
                logger.info(f"✅ Lead created successfully: {lead_id}")
                
                # Update referral usage with actual lead ID if we have a referrer
                if referrer_contact_id and lead_data.referralToken:
                    # Update the referral use record with the actual lead ID
                    # This would require updating the referral_uses table
                    logger.info(f"📝 Lead {lead_id} created from referral by contact {referrer_contact_id}")
                
                return {
                    "success": True,
                    "message": "Lead created successfully",
                    "leadId": lead_id,
                    "leadName": result.get('leadName'),
                    "referrerContactId": referrer_contact_id
                }
            else:
                logger.error(f"❌ Failed to create lead: {result.get('error')}")
                raise HTTPException(
                    status_code=500,
                    detail=result.get('error', 'Failed to create lead')
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error creating lead: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create lead: {str(e)}")

    @router.get("/{lead_id}")
    async def get_lead_details(lead_id: str):
        """Get lead details by ID"""
        try:
            logger.info(f"🔍 Getting lead details for: {lead_id}")
            
            from salesforce.objects.lead.manager import LeadManager
            lead_manager = LeadManager()
            
            lead = lead_manager.get_lead_details(lead_id)
            
            if lead:
                logger.info(f"✅ Found lead: {lead.get('firstName')} {lead.get('lastName')}")
                return {
                    "success": True,
                    "lead": lead
                }
            else:
                logger.warning(f"❌ Lead not found: {lead_id}")
                raise HTTPException(status_code=404, detail="Lead not found")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error getting lead details: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get lead details: {str(e)}")

    @router.get("/email/{email}")
    async def find_lead_by_email(email: str):
        """Find lead by email address"""
        try:
            logger.info(f"🔍 Finding lead by email: {email}")
            
            from salesforce.objects.lead.manager import LeadManager
            lead_manager = LeadManager()
            
            lead = lead_manager.find_by_email(email)
            
            if lead:
                logger.info(f"✅ Found lead: {lead.get('firstName')} {lead.get('lastName')}")
                return {
                    "success": True,
                    "lead": lead
                }
            else:
                logger.info(f"❌ No lead found for email: {email}")
                return {
                    "success": False,
                    "message": "No lead found for this email"
                }
                
        except Exception as e:
            logger.error(f"❌ Error finding lead by email: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to find lead: {str(e)}")

    @router.put("/{lead_id}")
    async def update_lead(lead_id: str, update_data: dict):
        """Update lead information"""
        try:
            logger.info(f"📝 Updating lead: {lead_id}")
            
            from salesforce.objects.lead.manager import LeadManager
            lead_manager = LeadManager()
            
            result = lead_manager.update_lead(lead_id, update_data)
            
            if result.get('success'):
                logger.info(f"✅ Lead updated successfully: {lead_id}")
                return {
                    "success": True,
                    "message": "Lead updated successfully"
                }
            else:
                logger.error(f"❌ Failed to update lead: {result.get('error')}")
                raise HTTPException(
                    status_code=500,
                    detail=result.get('error', 'Failed to update lead')
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error updating lead: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to update lead: {str(e)}")

    @router.post("/{lead_id}/convert")
    async def convert_lead(lead_id: str, conversion_data: dict):
        """Convert lead to contact/account/opportunity"""
        try:
            logger.info(f"🔄 Converting lead: {lead_id}")
            
            from salesforce.objects.lead.manager import LeadManager
            lead_manager = LeadManager()
            
            result = lead_manager.convert_lead(lead_id, conversion_data)
            
            if result.get('success'):
                logger.info(f"✅ Lead converted successfully: {lead_id}")
                return {
                    "success": True,
                    "message": "Lead converted successfully",
                    "contactId": result.get('contactId'),
                    "accountId": result.get('accountId'),
                    "opportunityId": result.get('opportunityId')
                }
            else:
                logger.error(f"❌ Failed to convert lead: {result.get('error')}")
                raise HTTPException(
                    status_code=500,
                    detail=result.get('error', 'Failed to convert lead')
                )
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error converting lead: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to convert lead: {str(e)}")

    return router 