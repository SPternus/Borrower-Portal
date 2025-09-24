"""
Plaid routes for the Ternus Borrower Profile API
"""
import json
import logging
import os
import requests
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/plaid", tags=["plaid"])

# Plaid configuration from environment
PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENVIRONMENT = os.getenv("PLAID_ENVIRONMENT", "sandbox")
PLAID_WEBHOOK_URL = os.getenv("PLAID_WEBHOOK_URL")

# Plaid API URLs based on environment
PLAID_URLS = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com"
}

PLAID_BASE_URL = PLAID_URLS.get(PLAID_ENVIRONMENT, PLAID_URLS["sandbox"])

class PlaidWebhookPayload(BaseModel):
    webhook_type: str
    webhook_code: str
    item_id: str = None
    user_id: str = None
    verification_id: str = None
    error: Dict[str, Any] = None


def configure_plaid_routes(auth_service, sfdc, contact_service):
    """Configure Plaid routes with dependencies"""
    
    def validate_plaid_config():
        """Validate Plaid configuration"""
        if not PLAID_CLIENT_ID or not PLAID_SECRET:
            logger.error("❌ Plaid configuration missing: CLIENT_ID or SECRET not set")
            raise HTTPException(status_code=500, detail="Plaid configuration incomplete")
    
    @router.post("/identity-verification")
    async def create_plaid_verification(
        auth0_user_id: str = Query(...),
        invitation_token: str = Query(None)
    ):
        """Create Plaid Identity Verification session with Assets & Income collection"""
        try:
            validate_plaid_config()
            logger.info(f"🔗 Creating comprehensive Plaid verification for Auth0 user: {auth0_user_id}")
            
            # Get contact ID
            contact_id = await contact_service.get_contact_id_for_user(auth0_user_id, None, invitation_token)
            if not contact_id:
                raise HTTPException(status_code=404, detail="Contact not found")
            
            # Get contact details for user info
            contact_details = sfdc.get_contact(contact_id)
            if not contact_details:
                raise HTTPException(status_code=404, detail="Contact details not found")
            
            # Extract and format contact information
            first_name = contact_details.get("firstName", "").strip()
            last_name = contact_details.get("lastName", "").strip()
            email = contact_details.get("email", "").strip()
            phone = contact_details.get("phone", "").strip()
            
            # Format phone number (basic formatting - should be enhanced)
            formatted_phone = phone if phone and phone.startswith('+') else f"+1{phone.replace('-', '').replace('(', '').replace(')', '').replace(' ', '')}" if phone else None
            
            logger.info(f"📋 Contact info - Name: {first_name} {last_name}, Email: {email}, Phone: {formatted_phone}")
            
            # Plaid API configuration
            plaid_url = f"{PLAID_BASE_URL}/identity_verification/create"
            plaid_headers = {
                "Content-Type": "application/json",
                "Plaid-Version": "2020-09-14"
            }
            
            logger.info(f"🔗 Creating Plaid verification with Contact ID as client_user_id: {contact_id}")
            
            # Prepare comprehensive Plaid request payload for Identity + Assets + Income
            plaid_payload = {
                "client_id": PLAID_CLIENT_ID,
                "secret": PLAID_SECRET,
                "client_user_id": contact_id,
                "template_id": "idvtmp_8s6t7soyzn8xyf",  # You may need to update this template ID
                "gave_consent": True,
                "is_shareable": True,
                "user": {
                    "email_address": email,
                    "phone_number": formatted_phone,
                    "name": {
                        "given_name": first_name,
                        "family_name": last_name
                    },
                    "address": {
                        "street": contact_details.get("mailingStreet", ""),
                        "city": contact_details.get("mailingCity", ""),
                        "region": contact_details.get("mailingState", ""),
                        "postal_code": contact_details.get("mailingPostalCode", ""),
                        "country": contact_details.get("mailingCountry", "US")
                    }
                },
                # Add webhook URL for status updates
                "webhook": PLAID_WEBHOOK_URL if PLAID_WEBHOOK_URL else None,
                # Request additional data products
                "steps": {
                    "verify_sms": True,
                    "kyc_check": True,
                    "documentary_verification": True,
                    "selfie_check": True
                }
            }
            
            # Remove None values and empty strings
            def clean_dict(d):
                if isinstance(d, dict):
                    return {k: clean_dict(v) for k, v in d.items() if v is not None and v != ""}
                return d
            
            plaid_payload = clean_dict(plaid_payload)
            
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
            status = plaid_data.get("status", "pending")
            
            if not verification_id or not shareable_url:
                logger.error(f"❌ Missing required Plaid data: id={verification_id}, url={shareable_url}")
                raise HTTPException(status_code=500, detail="Invalid Plaid response")
            
            # Update contact in Salesforce with Plaid session data (NOT verified yet)
            try:
                update_data = {
                    'Plaid_Id__c': verification_id,
                    'Plaid_Verification_URL__c': shareable_url,
                    'Plaid_Indentity_Submitted__c': False,  # Only mark True when webhook confirms completion
                    'Send_Plaid_Verification_Email__c': True  # Trigger email notification
                }
                
                # Use the salesforce connector to update the contact
                if sfdc.connected:
                    result = sfdc.contact.update(contact_id, update_data)
                    if result.get("success"):
                        logger.info(f"✅ Contact updated with Plaid session data: {contact_id}")
                    else:
                        logger.error(f"❌ Failed to update contact: {result}")
                else:
                    logger.info(f"🔧 Mock mode: Would update contact {contact_id} with Plaid session data")
                
            except Exception as e:
                logger.error(f"❌ Error updating contact with Plaid data: {str(e)}")
                # Don't fail the request if Salesforce update fails
            
            # Return the verification data
            return {
                "success": True,
                "verification_id": verification_id,
                "shareable_url": shareable_url,
                "status": status,
                "steps": plaid_data.get("steps"),
                "message": "Plaid verification session created successfully. Complete verification to update status."
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error creating Plaid verification: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/webhook")
    async def plaid_webhook(request: Request):
        """Handle Plaid webhook events for verification status updates"""
        try:
            # Get raw body for signature verification (if implemented)
            body = await request.body()
            payload = await request.json()
            
            logger.info(f"🔔 Received Plaid webhook: {json.dumps(payload, indent=2)}")
            
            webhook_type = payload.get("webhook_type")
            webhook_code = payload.get("webhook_code")
            verification_id = payload.get("verification_id")
            
            if webhook_type == "IDENTITY_VERIFICATION":
                if webhook_code == "STEP_UPDATED":
                    logger.info(f"📋 Identity verification step updated: {verification_id}")
                    await handle_verification_step_update(payload, sfdc)
                elif webhook_code == "STATUS_UPDATED":
                    logger.info(f"✅ Identity verification status updated: {verification_id}")
                    await handle_verification_status_update(payload, sfdc)
                else:
                    logger.info(f"ℹ️ Unhandled webhook code: {webhook_code}")
            
            return {"status": "success", "message": "Webhook processed"}
            
        except Exception as e:
            logger.error(f"❌ Error processing Plaid webhook: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/verification/{verification_id}/status")
    async def get_verification_status(verification_id: str):
        """Get current status of a Plaid verification"""
        try:
            validate_plaid_config()
            
            plaid_url = f"{PLAID_BASE_URL}/identity_verification/get"
            plaid_headers = {
                "Content-Type": "application/json",
                "Plaid-Version": "2020-09-14"
            }
            plaid_payload = {
                "client_id": PLAID_CLIENT_ID,
                "secret": PLAID_SECRET,
                "identity_verification_id": verification_id
            }
            
            response = requests.post(plaid_url, headers=plaid_headers, json=plaid_payload)
            
            if response.status_code != 200:
                logger.error(f"❌ Plaid API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail=f"Plaid API error: {response.text}")
            
            plaid_data = response.json()
            
            return {
                "success": True,
                "verification_id": verification_id,
                "status": plaid_data.get("status"),
                "steps": plaid_data.get("steps"),
                "created_at": plaid_data.get("created_at"),
                "completed_at": plaid_data.get("completed_at")
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error getting verification status: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def handle_verification_step_update(payload: Dict[str, Any], sfdc):
        """Handle verification step updates"""
        try:
            verification_id = payload.get("verification_id")
            if not verification_id:
                return
            
            # Find contact by verification ID and update status
            if sfdc.connected:
                # Query for contact with this verification ID
                soql = f"SELECT Id FROM Contact WHERE Plaid_Id__c = '{verification_id}' LIMIT 1"
                results = sfdc.connection.query(soql)
                
                if results and results.get('records'):
                    contact_id = results['records'][0]['Id']
                    # Store verification step data in the long text field
                    verification_data = {
                        'step_updated': True,
                        'timestamp': datetime.now().isoformat(),
                        'verification_id': verification_id,
                        'status': 'in_progress'
                    }
                    update_data = {
                        'Plaid_Identity_Verification_Data__c': str(verification_data)
                    }
                    sfdc.contact.update(contact_id, update_data)
                    logger.info(f"✅ Updated contact {contact_id} verification step status")
            
        except Exception as e:
            logger.error(f"❌ Error handling verification step update: {str(e)}")

    async def handle_verification_status_update(payload: Dict[str, Any], sfdc):
        """Handle verification status completion"""
        try:
            verification_id = payload.get("verification_id")
            status = payload.get("status", "unknown")
            
            if not verification_id:
                return
            
            logger.info(f"🔄 Processing verification status update: {verification_id} -> {status}")
            
            # Find contact by verification ID and update final status
            if sfdc.connected:
                soql = f"SELECT Id FROM Contact WHERE Plaid_Id__c = '{verification_id}' LIMIT 1"
                results = sfdc.connection.query(soql)
                
                if results and results.get('records'):
                    contact_id = results['records'][0]['Id']
                    
                    # Update based on final status
                    is_verified = status.lower() in ['success', 'approved', 'completed']
                    
                    # Store complete verification data in the long text field
                    verification_data = {
                        'final_status': status,
                        'verified': is_verified,
                        'timestamp': datetime.now().isoformat(),
                        'verification_id': verification_id,
                        'webhook_payload': payload
                    }
                    
                    update_data = {
                        'Plaid_Indentity_Submitted__c': is_verified,
                        'Plaid_Identity_Verification_Data__c': str(verification_data)
                    }
                    
                    result = sfdc.contact.update(contact_id, update_data)
                    if result.get("success"):
                        logger.info(f"✅ Contact {contact_id} verification status updated: verified={is_verified}")
                    else:
                        logger.error(f"❌ Failed to update contact verification status: {result}")
                else:
                    logger.warning(f"⚠️ No contact found with verification ID: {verification_id}")
            else:
                logger.info(f"🔧 Mock mode: Would update verification status for {verification_id} to {status}")
            
        except Exception as e:
            logger.error(f"❌ Error handling verification status update: {str(e)}")

    @router.post("/assets-income-verification")
    async def create_assets_income_verification(
        auth0_user_id: str = Query(...),
        invitation_token: str = Query(None)
    ):
        """Create Plaid Assets verification session (Bank Account Linking)
        Note: Income verification requires additional user_token flow - simplified to assets only"""
        try:
            validate_plaid_config()
            logger.info(f"💰 Creating Assets & Income verification for Auth0 user: {auth0_user_id}")
            
            # Get contact ID and details (same as identity verification)
            contact_id = await contact_service.get_contact_id_for_user(auth0_user_id, None, invitation_token)
            if not contact_id:
                raise HTTPException(status_code=404, detail="Contact not found")
            
            contact_details = sfdc.get_contact(contact_id)
            if not contact_details:
                raise HTTPException(status_code=404, detail="Contact details not found")
            
            # Extract contact information
            first_name = contact_details.get("firstName", "").strip()
            last_name = contact_details.get("lastName", "").strip()
            email = contact_details.get("email", "").strip()
            phone = contact_details.get("phone", "").strip()
            formatted_phone = phone if phone and phone.startswith('+') else f"+1{phone.replace('-', '').replace('(', '').replace(')', '').replace(' ', '')}" if phone else None
            
            # Create Link token for Assets (Bank Account Linking)
            plaid_url = f"{PLAID_BASE_URL}/link/token/create"
            plaid_headers = {
                "Content-Type": "application/json",
                "Plaid-Version": "2020-09-14"
            }
            
            logger.info(f"🔗 Creating Plaid Link token with Contact ID as client_user_id: {contact_id}")
            logger.info(f"💰 Creating Link token for Assets (Bank Account Linking)")
            
            plaid_payload = {
                "client_id": PLAID_CLIENT_ID,
                "secret": PLAID_SECRET,
                "client_name": "Ternus Lending",
                "country_codes": ["US"],
                "language": "en",
                "user": {
                    "client_user_id": contact_id,
                    "email_address": email,
                    "phone_number": formatted_phone,
                    "name": {
                        "given_name": first_name,
                        "family_name": last_name
                    }
                },
                "products": ["assets"],
                "webhook": PLAID_WEBHOOK_URL if PLAID_WEBHOOK_URL else None
            }
            
            # Remove None values
            def clean_dict(d):
                if isinstance(d, dict):
                    return {k: clean_dict(v) for k, v in d.items() if v is not None and v != ""}
                return d
            
            plaid_payload = clean_dict(plaid_payload)
            
            logger.info(f"💰 Creating Link token for Assets & Income")
            logger.info(f"📋 Payload products: {plaid_payload.get('products', [])}")
            
            response = requests.post(plaid_url, headers=plaid_headers, json=plaid_payload)
            
            if response.status_code != 200:
                logger.error(f"❌ Plaid Link token error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail=f"Plaid API error: {response.text}")
            
            plaid_data = response.json()
            link_token = plaid_data.get("link_token")
            
            if not link_token:
                logger.error(f"❌ Missing Link token in Plaid response")
                raise HTTPException(status_code=500, detail="Invalid Plaid response")
            
            logger.info(f"✅ Link token created for Assets verification (Bank Account Linking)")
            
            # Store Link token info in the dedicated asset fields
            try:
                # Store link token data in the asset data field
                link_data = {
                    'link_token': link_token,
                    'status': 'pending',
                    'type': 'assets',
                    'products': ['assets'],
                    'timestamp': datetime.now().isoformat(),
                    'expiration': plaid_data.get("expiration")
                }
                
                if sfdc.connected:
                    update_data = {
                        'Plaid_Asset_Data__c': str(link_data)
                    }
                    result = sfdc.contact.update(contact_id, update_data)
                    if result.get("success"):
                        logger.info(f"✅ Contact updated with Asset Link token: {contact_id}")
                    else:
                        logger.error(f"❌ Failed to update contact: {result}")
                else:
                    logger.info(f"🔧 Mock mode: Would update contact {contact_id} with Asset Link token")
                
            except Exception as e:
                logger.error(f"❌ Error updating contact with Asset Link token: {str(e)}")
            
            return {
                "success": True,
                "link_token": link_token,
                "expiration": plaid_data.get("expiration"),
                "message": "Assets & Income verification Link token created successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error creating Assets & Income verification: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/exchange-public-token")
    async def exchange_public_token(
        request: Request,
        auth0_user_id: str = Query(...),
        invitation_token: str = Query(None)
    ):
        """Exchange public_token for access_token and store account data in Salesforce"""
        try:
            validate_plaid_config()
            
            # Get request body
            request_body = await request.json()
            public_token = request_body.get('public_token')
            metadata = request_body.get('metadata', {})
            
            if not public_token:
                raise HTTPException(status_code=400, detail="public_token is required")
            
            logger.info(f"🔄 Exchanging public token for Auth0 user: {auth0_user_id}")
            
            # Get contact ID and details
            contact_id = await contact_service.get_contact_id_for_user(auth0_user_id, invitation_token)
            if not contact_id:
                raise HTTPException(status_code=404, detail="Contact not found for user")
            
            # Exchange public_token for access_token
            plaid_url = f"{PLAID_BASE_URL}/item/public_token/exchange"
            plaid_headers = {
                "Content-Type": "application/json",
                "Plaid-Version": "2020-09-14"
            }
            
            exchange_payload = {
                "client_id": PLAID_CLIENT_ID,
                "secret": PLAID_SECRET,
                "public_token": public_token
            }
            
            logger.info(f"🔄 Exchanging public token with Plaid...")
            response = requests.post(plaid_url, headers=plaid_headers, json=exchange_payload)
            
            if response.status_code != 200:
                logger.error(f"❌ Plaid token exchange error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail=f"Plaid API error: {response.text}")
            
            plaid_data = response.json()
            access_token = plaid_data.get("access_token")
            item_id = plaid_data.get("item_id")
            
            if not access_token or not item_id:
                logger.error(f"❌ Missing access_token or item_id in Plaid response")
                raise HTTPException(status_code=500, detail="Invalid Plaid response")
            
            logger.info(f"✅ Successfully exchanged public token for access token")
            
            # Get account information
            accounts_url = f"{PLAID_BASE_URL}/accounts/get"
            accounts_payload = {
                "client_id": PLAID_CLIENT_ID,
                "secret": PLAID_SECRET,
                "access_token": access_token
            }
            
            accounts_response = requests.post(accounts_url, headers=plaid_headers, json=accounts_payload)
            accounts_data = accounts_response.json() if accounts_response.status_code == 200 else {}
            accounts = accounts_data.get("accounts", [])
            
            # Store account data in Salesforce using dedicated asset fields
            try:
                account_data = {
                    'item_id': item_id,
                    'accounts': accounts,
                    'metadata': metadata,
                    'status': 'connected',
                    'timestamp': datetime.now().isoformat(),
                    'institution': metadata.get('institution', {})
                }
                
                if sfdc.connected:
                    update_data = {
                        'Plaid_Asset_Token__c': access_token,  # Store access token separately
                        'Plaid_Asset_Data__c': str(account_data)  # Store account data separately
                    }
                    result = sfdc.contact.update(contact_id, update_data)
                    if result.get("success"):
                        logger.info(f"✅ Contact updated with bank account data in dedicated asset fields: {contact_id}")
                    else:
                        logger.error(f"❌ Failed to update contact: {result}")
                else:
                    logger.info(f"🔧 Mock mode: Would update contact {contact_id} with bank account data in asset fields")
                
            except Exception as e:
                logger.error(f"❌ Error updating contact with bank account data: {str(e)}")
            
            return {
                "success": True,
                "item_id": item_id,
                "accounts": [
                    {
                        "account_id": acc.get("account_id"),
                        "name": acc.get("name"),
                        "type": acc.get("type"),
                        "subtype": acc.get("subtype"),
                        "mask": acc.get("mask")
                    } for acc in accounts
                ],
                "institution": metadata.get('institution', {}),
                "message": "Bank account successfully connected and stored in Salesforce"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Unexpected error exchanging public token: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    return router 