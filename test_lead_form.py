#!/usr/bin/env python3
"""
Test script for Lead Form and Referral System
"""

import requests
import json
import time

API_BASE_URL = "http://localhost:5000/api"

def test_referral_generation():
    """Test referral token generation"""
    print("🧪 Testing referral token generation...")
    
    response = requests.post(f"{API_BASE_URL}/referrals/generate", json={
        "contact_id": "test_contact_456",
        "user_email": "referrer@example.com"
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Referral token generated: {data['token']['token']}")
        return data['token']['token']
    else:
        print(f"❌ Failed to generate referral token: {response.status_code}")
        print(response.text)
        return None

def test_referral_validation(token):
    """Test referral token validation"""
    print(f"🧪 Testing referral token validation for: {token}")
    
    response = requests.post(f"{API_BASE_URL}/referrals/validate", params={
        "referral_token": token
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Token validation: {data['valid']}")
        if data['valid']:
            print(f"   Referrer: {data['referrer']['user_email']}")
        return data['valid']
    else:
        print(f"❌ Failed to validate token: {response.status_code}")
        print(response.text)
        return False

def test_lead_creation(referral_token):
    """Test lead creation with referral token"""
    print(f"🧪 Testing lead creation with referral token...")
    
    lead_data = {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "phone": "(555) 123-4567",
        "company": "Test Company Inc",
        "title": "CEO",
        "industry": "Real Estate",
        "annualRevenue": 2500000,
        "numberOfEmployees": 25,
        "website": "https://testcompany.com",
        "street": "123 Main Street",
        "city": "San Francisco",
        "state": "CA",
        "postalCode": "94105",
        "country": "US",
        "interests": "Looking for commercial real estate loans for property acquisition",
        "notes": "Interested in competitive rates and quick turnaround",
        "referralToken": referral_token
    }
    
    response = requests.post(f"{API_BASE_URL}/leads/create", json=lead_data)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Lead created successfully!")
        print(f"   Lead ID: {data.get('leadId', 'N/A')}")
        print(f"   Lead Name: {data.get('leadName', 'N/A')}")
        print(f"   Referrer Contact ID: {data.get('referrerContactId', 'N/A')}")
        return data
    else:
        print(f"❌ Failed to create lead: {response.status_code}")
        print(response.text)
        return None

def test_referral_stats(token):
    """Test referral statistics"""
    print(f"🧪 Testing referral statistics...")
    
    response = requests.get(f"{API_BASE_URL}/referrals/stats", params={
        "referral_token": token
    })
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Referral stats retrieved:")
        print(f"   Uses count: {data.get('uses_count', 0)}")
        print(f"   Total referrals: {data.get('total_referrals', 0)}")
        return data
    else:
        print(f"❌ Failed to get referral stats: {response.status_code}")
        print(response.text)
        return None

def main():
    """Run all tests"""
    print("🚀 Starting Lead Form and Referral System Tests\n")
    
    # Test 1: Generate referral token
    referral_token = test_referral_generation()
    if not referral_token:
        print("❌ Cannot continue without referral token")
        return
    
    print()
    
    # Test 2: Validate referral token
    is_valid = test_referral_validation(referral_token)
    if not is_valid:
        print("❌ Cannot continue with invalid token")
        return
    
    print()
    
    # Test 3: Create lead with referral
    lead_result = test_lead_creation(referral_token)
    if not lead_result:
        print("❌ Lead creation failed")
        return
    
    print()
    
    # Test 4: Check referral stats
    stats_result = test_referral_stats(referral_token)
    
    print("\n🎉 All tests completed!")
    print(f"📋 Test Summary:")
    print(f"   - Referral token: {referral_token}")
    print(f"   - Lead created: {lead_result.get('success', False)}")
    print(f"   - Referral tracked: {bool(lead_result.get('referrerContactId'))}")
    
    print(f"\n🔗 Test the frontend at:")
    print(f"   http://localhost:3000/lead-form?referral_token={referral_token}")

if __name__ == "__main__":
    main() 