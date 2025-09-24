#!/usr/bin/env python3
"""
Quick script to get Plaid Link token for assets verification
"""
import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Plaid configuration
PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENVIRONMENT = os.getenv("PLAID_ENVIRONMENT", "sandbox")
PLAID_WEBHOOK_URL = os.getenv("PLAID_WEBHOOK_URL")

# Plaid API URLs
PLAID_URLS = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com"
}

PLAID_BASE_URL = PLAID_URLS.get(PLAID_ENVIRONMENT, PLAID_URLS["sandbox"])

def get_link_token():
    """Get Plaid Link token for assets verification"""
    
    if not PLAID_CLIENT_ID or not PLAID_SECRET:
        print("❌ Plaid credentials not found in .env file")
        return None
    
    print(f"🔧 Using Plaid environment: {PLAID_ENVIRONMENT}")
    print(f"🔗 Client ID: {PLAID_CLIENT_ID[:10]}...")
    
    # Contact ID for consistency (your test contact)
    contact_id = "003O200000jsBhKIAU"
    
    # Create Link token payload
    plaid_url = f"{PLAID_BASE_URL}/link/token/create"
    plaid_headers = {"Content-Type": "application/json"}
    
    plaid_payload = {
        "client_id": PLAID_CLIENT_ID,
        "secret": PLAID_SECRET,
        "client_name": "Ternus Lending",
        "country_codes": ["US"],
        "language": "en",
        "user": {
            "client_user_id": contact_id,
            "email_address": "test@example.com",  # Replace with actual email if needed
            "phone_number": "+1234567890",       # Replace with actual phone if needed
            "name": {
                "given_name": "Test",
                "family_name": "User"
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
    
    cleaned_payload = clean_dict(plaid_payload)
    
    print(f"🚀 Creating Link token for Contact ID: {contact_id}")
    print(f"📋 Products: {cleaned_payload.get('products', [])}")
    
    try:
        response = requests.post(plaid_url, headers=plaid_headers, json=cleaned_payload)
        
        if response.status_code == 200:
            data = response.json()
            link_token = data.get("link_token")
            expiration = data.get("expiration")
            
            print("\n✅ SUCCESS! Link token created:")
            print(f"🎯 Link Token: {link_token}")
            print(f"⏰ Expiration: {expiration}")
            print(f"🔗 Contact ID: {contact_id}")
            
            return {
                "link_token": link_token,
                "expiration": expiration,
                "contact_id": contact_id
            }
        else:
            print(f"\n❌ Plaid API Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return None

if __name__ == "__main__":
    print("🔗 Getting Plaid Link Token for Assets Verification")
    print("=" * 50)
    result = get_link_token()
    
    if result:
        print("\n🎉 You can now use this Link token for bank account linking!")
        print("💡 This token allows users to connect their bank accounts for asset verification.")
    else:
        print("\n❌ Failed to get Link token. Check your Plaid credentials and try again.")



