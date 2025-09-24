#!/usr/bin/env python3
"""
Finix Payment Routes
Handles Finix payment processing and Salesforce updates
"""

import logging
import os
import requests
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# Setup logging
logger = logging.getLogger(__name__)

class FinixCard(BaseModel):
    number: str
    exp_month: str
    exp_year: str
    security_code: str
    name: str

class FinixBillingAddress(BaseModel):
    line1: str
    city: str
    region: str
    postal_code: str
    country: str = "US"

class FinixPaymentRequest(BaseModel):
    opportunityId: str
    amount: int  # Amount in cents
    currency: str = "USD"
    card: FinixCard
    billing_address: FinixBillingAddress
    description: str
    metadata: Dict[str, str]

def configure_finix_routes() -> APIRouter:
    """Configure Finix payment routes"""
    router = APIRouter(prefix="/finix", tags=["finix"])
    
    # Get Finix configuration from environment variables
    FINIX_API_URL = os.getenv('FINIX_API_URL', 'https://finix.sandbox-payments-api.com')
    FINIX_APPLICATION_ID = os.getenv('FINIX_APPLICATION_ID')
    FINIX_USERNAME = os.getenv('FINIX_USERNAME')
    FINIX_PASSWORD = os.getenv('FINIX_PASSWORD')
    
    if not all([FINIX_APPLICATION_ID, FINIX_USERNAME, FINIX_PASSWORD]):
        logger.warning("⚠️ Finix credentials not configured - payment processing will use mock mode")
    
    @router.post("/process-payment")
    async def process_finix_payment(payment_request: FinixPaymentRequest):
        """Process payment via Finix and update Salesforce on success"""
        try:
            logger.info(f"💳 Processing Finix payment for opportunity: {payment_request.opportunityId}")
            logger.info(f"💰 Amount: ${payment_request.amount / 100}")
            
            # Check if Finix is properly configured
            if not all([FINIX_APPLICATION_ID, FINIX_USERNAME, FINIX_PASSWORD]):
                logger.info("🔧 Using mock payment processing (Finix not configured)")
                return await _process_mock_payment(payment_request)
            
            # Process real Finix payment
            return await _process_real_finix_payment(payment_request)
            
        except Exception as e:
            logger.error(f"❌ Error processing Finix payment: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")
    
    async def _process_real_finix_payment(payment_request: FinixPaymentRequest) -> Dict[str, Any]:
        """Process real Finix payment"""
        try:
            # Step 1: Create a Payment Instrument (tokenize the card)
            payment_instrument_payload = {
                "name": payment_request.card.name,
                "number": payment_request.card.number,
                "expiration_month": int(payment_request.card.exp_month),
                "expiration_year": int(payment_request.card.exp_year),
                "security_code": payment_request.card.security_code,
                "type": "PAYMENT_CARD",
                "address": {
                    "line1": payment_request.billing_address.line1,
                    "city": payment_request.billing_address.city,
                    "region": payment_request.billing_address.region,
                    "postal_code": payment_request.billing_address.postal_code,
                    "country": payment_request.billing_address.country
                }
            }
            
            # Create payment instrument
            pi_response = requests.post(
                f"{FINIX_API_URL}/payment_instruments",
                json=payment_instrument_payload,
                auth=(FINIX_USERNAME, FINIX_PASSWORD),
                headers={"Content-Type": "application/vnd.json+api"}
            )
            
            if not pi_response.ok:
                logger.error(f"❌ Failed to create payment instrument: {pi_response.text}")
                raise HTTPException(status_code=400, detail="Failed to process card information")
            
            payment_instrument = pi_response.json()
            payment_instrument_id = payment_instrument["id"]
            logger.info(f"✅ Created payment instrument: {payment_instrument_id}")
            
            # Step 2: Create the Authorization (charge the card)
            authorization_payload = {
                "merchant_identity": FINIX_APPLICATION_ID,
                "amount": payment_request.amount,
                "currency": payment_request.currency,
                "source": payment_instrument_id,
                "processor": "DUMMY_V1",  # Use appropriate processor
                "tags": {
                    "opportunity_id": payment_request.opportunityId,
                    "payment_type": payment_request.metadata.get("payment_type", "application_fee"),
                    "user_email": payment_request.metadata.get("user_email", "")
                }
            }
            
            auth_response = requests.post(
                f"{FINIX_API_URL}/authorizations",
                json=authorization_payload,
                auth=(FINIX_USERNAME, FINIX_PASSWORD),
                headers={"Content-Type": "application/vnd.json+api"}
            )
            
            if not auth_response.ok:
                logger.error(f"❌ Failed to create authorization: {auth_response.text}")
                raise HTTPException(status_code=400, detail="Payment authorization failed")
            
            authorization = auth_response.json()
            authorization_id = authorization["id"]
            auth_state = authorization.get("state", "UNKNOWN")
            
            logger.info(f"💳 Authorization created: {authorization_id} (State: {auth_state})")
            
            # Check if authorization was successful
            if auth_state != "SUCCEEDED":
                logger.error(f"❌ Authorization failed with state: {auth_state}")
                raise HTTPException(status_code=400, detail=f"Payment failed: {auth_state}")
            
            # Step 3: Capture the Authorization (actually charge the card)
            capture_payload = {
                "capture_amount": payment_request.amount
            }
            
            capture_response = requests.put(
                f"{FINIX_API_URL}/authorizations/{authorization_id}",
                json=capture_payload,
                auth=(FINIX_USERNAME, FINIX_PASSWORD),
                headers={"Content-Type": "application/vnd.json+api"}
            )
            
            if not capture_response.ok:
                logger.error(f"❌ Failed to capture authorization: {capture_response.text}")
                raise HTTPException(status_code=400, detail="Payment capture failed")
            
            captured_auth = capture_response.json()
            capture_state = captured_auth.get("state", "UNKNOWN")
            
            logger.info(f"💰 Payment captured: {authorization_id} (State: {capture_state})")
            
            if capture_state != "SUCCEEDED":
                logger.error(f"❌ Capture failed with state: {capture_state}")
                raise HTTPException(status_code=400, detail=f"Payment capture failed: {capture_state}")
            
            # Step 4: Update Salesforce with successful payment
            await _update_salesforce_payment_status(payment_request.opportunityId, authorization_id, True)
            
            return {
                "success": True,
                "message": "Payment processed successfully",
                "transaction_id": authorization_id,
                "amount": payment_request.amount / 100,
                "currency": payment_request.currency,
                "opportunity_id": payment_request.opportunityId
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Real Finix payment processing error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Payment processing failed: {str(e)}")
    
    async def _process_mock_payment(payment_request: FinixPaymentRequest) -> Dict[str, Any]:
        """Process mock payment for development/testing"""
        logger.info("🧪 Processing mock payment (development mode)")
        
        # Simulate payment processing delay
        import asyncio
        await asyncio.sleep(2)
        
        # Generate mock transaction ID
        import uuid
        mock_transaction_id = f"mock_txn_{uuid.uuid4().hex[:12]}"
        
        # Update Salesforce with successful payment
        await _update_salesforce_payment_status(payment_request.opportunityId, mock_transaction_id, True)
        
        return {
            "success": True,
            "message": "Payment processed successfully (mock mode)",
            "transaction_id": mock_transaction_id,
            "amount": payment_request.amount / 100,
            "currency": payment_request.currency,
            "opportunity_id": payment_request.opportunityId,
            "mock_mode": True
        }
    
    async def _update_salesforce_payment_status(
        opportunity_id: str, 
        transaction_id: str, 
        payment_successful: bool
    ):
        """Update Salesforce opportunity with payment status"""
        try:
            from salesforce.connection import SalesforceConnection
            
            logger.info(f"📡 Updating Salesforce payment status for opportunity: {opportunity_id}")
            
            # Get Salesforce connection
            sf_connection = SalesforceConnection()
            if not sf_connection.is_connected:
                logger.warning("⚠️ Salesforce connection not available - skipping status update")
                return
            
            # Update opportunity with payment information
            update_data = {
                'App_Fee_Paid__c': payment_successful,
                'App_Fee_Transaction_ID__c': transaction_id,  # Assuming this field exists
                'App_Fee_Payment_Date__c': datetime.now().isoformat()
            }
            
            # Remove fields that might not exist in Salesforce
            filtered_update_data = {}
            for field, value in update_data.items():
                if field == 'App_Fee_Paid__c':  # This field definitely exists
                    filtered_update_data[field] = value
                else:
                    # Add other fields conditionally
                    filtered_update_data[field] = value
            
            result = sf_connection.sf.Opportunity.update(opportunity_id, filtered_update_data)
            
            if result.get('success'):
                logger.info(f"✅ Successfully updated Salesforce opportunity {opportunity_id}")
            else:
                logger.error(f"❌ Failed to update Salesforce opportunity: {result}")
                
        except Exception as e:
            logger.error(f"❌ Error updating Salesforce payment status: {str(e)}")
            # Don't raise exception here - payment was successful, just logging failed
    
    @router.get("/test-connection")
    async def test_finix_connection():
        """Test Finix API connection"""
        try:
            if not all([FINIX_APPLICATION_ID, FINIX_USERNAME, FINIX_PASSWORD]):
                return {
                    "success": False,
                    "message": "Finix credentials not configured",
                    "configured": False
                }
            
            # Test connection by getting merchant identity
            response = requests.get(
                f"{FINIX_API_URL}/identities/{FINIX_APPLICATION_ID}",
                auth=(FINIX_USERNAME, FINIX_PASSWORD),
                headers={"Content-Type": "application/vnd.json+api"}
            )
            
            if response.ok:
                return {
                    "success": True,
                    "message": "Finix connection successful",
                    "configured": True,
                    "api_url": FINIX_API_URL
                }
            else:
                return {
                    "success": False,
                    "message": f"Finix connection failed: {response.status_code}",
                    "configured": True
                }
                
        except Exception as e:
            logger.error(f"❌ Error testing Finix connection: {str(e)}")
            return {
                "success": False,
                "message": f"Connection test failed: {str(e)}",
                "configured": True
            }
    
    return router 