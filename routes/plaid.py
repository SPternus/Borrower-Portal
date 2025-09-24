"""
Plaid routes for the Ternus Borrower Profile API
"""
import json
import logging
import requests
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/plaid", tags=["plaid"])


def configure_plaid_routes(auth_service, sfdc, contact_service):
    """Configure Plaid routes with dependencies"""
    
    @router.post("/identity-verification")
    async def create_plaid_verification(
        auth0_user_id: str = Query(...),
        invitation_token: str = Query(None)
    ):
        """Create Plaid Identity Verification session"""
        try:
            logger.info(f"🔗 Creating Plaid verification for Auth0 user: {auth0_user_id}")
            
            # Get contact ID
            contact_id = await contact_service.get_contact_id_for_user(auth0_user_id, None, invitation_token)
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

    return router 