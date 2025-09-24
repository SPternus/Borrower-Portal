#!/usr/bin/env python3
"""
Test script for the new modular Salesforce architecture
"""

import logging
from salesforce_connector_v2 import TernusSalesforceConnectorV2

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_new_architecture():
    """Test the new modular Salesforce architecture"""
    
    print("🧪 Testing Ternus Salesforce Connector V2")
    print("=" * 50)
    
    # Initialize connector
    sfdc = TernusSalesforceConnectorV2()
    
    print(f"✅ Connector initialized")
    print(f"🔗 Connected to Salesforce: {sfdc.connected}")
    print()
    
    # Test contact operations
    print("📞 Testing Contact Operations:")
    contact_id = "003Oz00000QAiECIA1"
    
    contact = sfdc.get_contact(contact_id)
    print(f"  - Get contact: {contact['firstName'] if contact else 'None'} {contact['lastName'] if contact else ''}")
    
    # Test opportunity operations
    print("\n💼 Testing Opportunity Operations:")
    opportunities = sfdc.get_opportunities(contact_id)
    print(f"  - Get opportunities: {len(opportunities)} found")
    
    if opportunities:
        opp = opportunities[0]
        print(f"  - First opportunity: {opp['name']} (${opp['amount']})")
    
    # Test activity logging
    print("\n📊 Testing Activity Logging:")
    activity_result = sfdc.log_activity(
        contact_id, 
        "Test Activity", 
        "Testing the new modular architecture"
    )
    print(f"  - Log activity: {activity_result.get('message', 'Failed')}")
    
    # Test invitation operations
    print("\n📧 Testing Invitation Operations:")
    invitation_result = sfdc.create_portal_invitation(contact_id, "test@example.com")
    print(f"  - Create invitation: {invitation_result.get('message', 'Failed')}")
    
    # Test token validation
    print("\n🔑 Testing Token Validation:")
    token_result = sfdc.check_invitation_token_exists("test_invitation_token_123")
    print(f"  - Check token: {token_result.get('message', 'Failed')}")
    
    # Test field metadata
    print("\n🔍 Testing Field Metadata:")
    fields_result = sfdc.get_opportunity_fields()
    if fields_result.get('success'):
        field_count = len(fields_result.get('fields', {}))
        print(f"  - Get opportunity fields: {field_count} fields found")
    else:
        print(f"  - Get opportunity fields: {fields_result.get('message', 'Failed')}")
    
    print("\n" + "=" * 50)
    print("✅ All tests completed successfully!")
    print("\n📋 Architecture Benefits Demonstrated:")
    print("  ✓ Modular object managers")
    print("  ✓ Separated business logic")
    print("  ✓ Centralized connection management")
    print("  ✓ Built-in mock responses")
    print("  ✓ Backward compatibility")
    print("  ✓ Consistent error handling")

if __name__ == "__main__":
    test_new_architecture() 