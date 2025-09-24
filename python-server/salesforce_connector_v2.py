#!/usr/bin/env python3
"""
Ternus Salesforce Connector V2
Modular, object-oriented Salesforce integration
"""

import logging
from typing import Dict, List, Any, Optional
from salesforce import (
    SalesforceConnection,
    ContactManager,
    OpportunityManager,
    TaskManager,
    InvitationManager,
    FolderManager
)
from salesforce.objects.user import UserManager
from salesforce.objects.feeditem import FeedItemManager
from salesforce.objects.draw import DrawManager
from salesforce.objects.task_custom import TaskManager

logger = logging.getLogger(__name__)

class TernusSalesforceConnectorV2:
    """
    Modern, modular Salesforce connector for Ternus Borrower Portal
    
    This connector uses a clean object-oriented architecture where:
    - Each Salesforce object has its own manager
    - Business logic is separated into operations classes
    - Connection management is centralized
    - Mock responses are built-in for testing
    """
    
    def __init__(self):
        """Initialize the connector with all object managers"""
        self.connection = SalesforceConnection()
        self.contact_manager = ContactManager()
        self.opportunity_manager = OpportunityManager()
        self.invitation_manager = InvitationManager()
        self.folder_manager = FolderManager()
        self.user_manager = UserManager(None)  # BaseSalesforceManager handles connection internally
        self.feeditem_manager = FeedItemManager(None)  # BaseSalesforceManager handles connection internally
        self.draw_manager = DrawManager()
        self.task_manager = TaskManager()  # Custom Task__c manager
        
        # Legacy aliases for backward compatibility
        self.contact = self.contact_manager
        self.opportunity = self.opportunity_manager
        self.task = self.task_manager
        self.invitation = self.invitation_manager
        self.folder = self.folder_manager
        
        logger.info("✅ Ternus Salesforce Connector V2 initialized")
    
    @property
    def connected(self) -> bool:
        """Check if connected to Salesforce"""
        return self.connection.is_connected
    
    # Contact Operations
    def get_contact(self, contact_id: str) -> Optional[Dict[str, Any]]:
        """Get contact details"""
        return self.contact.get_contact_details(contact_id)
    
    def find_contact_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find contact by email"""
        return self.contact.find_by_email(email)
    
    def store_invitation_token_on_contact(self, contact_id: str, invitation_token: str, email: str) -> Dict[str, Any]:
        """Store invitation token on contact"""
        return self.contact.store_invitation_token(contact_id, invitation_token, email)
    
    def validate_invitation_token_from_salesforce(self, invitation_token: str, email: str) -> Dict[str, Any]:
        """Validate invitation token"""
        return self.contact.validate_invitation_token(invitation_token, email)
    
    def check_invitation_token_exists(self, invitation_token: str) -> Dict[str, Any]:
        """Check if invitation token exists"""
        return self.contact.check_invitation_token_exists(invitation_token)
    
    def mark_invitation_token_as_used(self, contact_id: str) -> Dict[str, Any]:
        """Mark invitation as used"""
        return self.contact.mark_invitation_as_used(contact_id)
    
    def check_user_portal_access(self, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Check user portal access"""
        return self.contact.check_portal_access(auth0_user_id, email)
    
    def link_user_to_contact(self, contact_id: str, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Link user to contact"""
        return self.contact.link_to_auth0_user(contact_id, auth0_user_id, email)
    
    # Opportunity Operations
    def get_opportunities(self, contact_id: str) -> List[Dict[str, Any]]:
        """Get opportunities for contact"""
        return self.opportunity.get_opportunities_for_contact(contact_id)
    
    def create_opportunity(self, contact_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create opportunity from form data"""
        return self.opportunity.create_from_form_data(contact_id, form_data)
    
    def update_opportunity(self, opportunity_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update opportunity"""
        # Map common fields to SFDC field names
        field_mapping = {
            'stageName': 'StageName',
            'amount': 'Amount',
            'notes': 'Description'
        }
        
        sfdc_updates = {}
        for key, value in updates.items():
            sfdc_field = field_mapping.get(key, key)
            sfdc_updates[sfdc_field] = value
        
        return self.opportunity.update(opportunity_id, sfdc_updates)
    
    def get_opportunity_fields(self) -> Dict[str, Any]:
        """Get opportunity field metadata"""
        return self.opportunity.get_opportunity_fields()
    
    def get_picklist_values(self, object_name: str, field_name: str) -> Dict[str, Any]:
        """Get picklist values for a field"""
        if object_name.lower() == 'opportunity':
            return self.opportunity.get_picklist_values(field_name)
        else:
            return {"success": False, "error": f"Object {object_name} not supported"}
    
    # Activity/Task Operations
    def log_activity(self, contact_id: str, activity_type: str, description: str) -> Dict[str, Any]:
        """Log activity to Salesforce"""
        return self.task.log_activity(contact_id, activity_type, description)
    
    def get_activities_for_contact(self, contact_id: str) -> List[Dict[str, Any]]:
        """Get activities for contact"""
        return self.task.get_activities_for_contact(contact_id)
    
    # Portal Invitation Operations
    def create_portal_invitation(self, contact_id: str, email: str) -> Dict[str, Any]:
        """Create portal invitation"""
        return self.invitation.create_portal_invitation(contact_id, email)
    
    def get_invitations_for_contact(self, contact_id: str) -> List[Dict[str, Any]]:
        """Get invitations for contact"""
        return self.invitation.get_invitations_for_contact(contact_id)
    
    # Utility Methods (for backward compatibility)
    def reconnect(self):
        """Reconnect to Salesforce"""
        self.connection.reconnect()
    
    def query(self, soql: str):
        """Execute SOQL query"""
        return self.connection.query(soql)
    
    # Legacy method aliases for backward compatibility
    def _mock_contact(self) -> Dict[str, Any]:
        """Legacy mock contact method"""
        return self.contact.operations._mock_contact_details()
    
    def _mock_opportunities(self) -> List[Dict[str, Any]]:
        """Legacy mock opportunities method"""
        return self.opportunity.operations._mock_opportunities()
    
    def _mock_activity_response(self) -> Dict[str, Any]:
        """Legacy mock activity response"""
        return self.task.operations._mock_activity_response()
    
    def _mock_update_response(self, opportunity_id: str) -> Dict[str, Any]:
        """Legacy mock update response"""
        return {
            "success": True,
            "opportunityId": opportunity_id,
            "message": "Opportunity updated successfully (mock mode)"
        }
    
    def _mock_create_opportunity_response(self) -> Dict[str, Any]:
        """Legacy mock create opportunity response"""
        return self.opportunity.operations._mock_create_opportunity_response()


# For backward compatibility, create an alias
TernusSalesforceConnector = TernusSalesforceConnectorV2

# Create a global instance for use in routes
connector = TernusSalesforceConnectorV2()

def get_global_connector() -> TernusSalesforceConnectorV2:
    """Get the global connector instance"""
    return connector 