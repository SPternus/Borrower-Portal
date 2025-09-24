#!/usr/bin/env python3
"""
Contact Manager
Handles all Contact-related Salesforce operations
"""

import logging
from typing import Dict, List, Any, Optional
from ...base_manager import BaseSalesforceManager
from .operations import ContactOperations

logger = logging.getLogger(__name__)

class ContactManager(BaseSalesforceManager):
    """Manager for Contact operations in Salesforce"""
    
    def __init__(self):
        super().__init__('Contact')
        self.operations = ContactOperations(self)
    
    def get_contact_details(self, contact_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed contact information"""
        return self.operations.get_contact_details(contact_id)
    
    def get_contact_with_owner(self, contact_id: str) -> Optional[Dict[str, Any]]:
        """Get contact details with owner (loan officer) information"""
        return self.operations.get_contact_with_owner(contact_id)
    
    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find contact by email address"""
        return self.operations.find_by_email(email)
    
    def update_portal_access(self, contact_id: str, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Update contact with portal access information"""
        return self.operations.update_portal_access(contact_id, auth0_user_id, email)
    
    def store_invitation_token(self, contact_id: str, invitation_token: str, email: str) -> Dict[str, Any]:
        """Store invitation token on contact record"""
        return self.operations.store_invitation_token(contact_id, invitation_token, email)
    
    def validate_invitation_token(self, invitation_token: str, email: str) -> Dict[str, Any]:
        """Validate invitation token from contact record"""
        return self.operations.validate_invitation_token(invitation_token, email)
    
    def check_invitation_token_exists(self, invitation_token: str) -> Dict[str, Any]:
        """Check if invitation token exists"""
        return self.operations.check_invitation_token_exists(invitation_token)
    
    def mark_invitation_as_used(self, contact_id: str) -> Dict[str, Any]:
        """Mark invitation token as used"""
        return self.operations.mark_invitation_as_used(contact_id)
    
    def check_portal_access(self, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Check if user has portal access"""
        return self.operations.check_portal_access(auth0_user_id, email)
    
    def link_to_auth0_user(self, contact_id: str, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Link contact to Auth0 user"""
        return self.operations.link_to_auth0_user(contact_id, auth0_user_id, email)
    
    def _mock_get_response(self, record_id: str) -> Dict[str, Any]:
        """Override mock response for contacts"""
        return {
            "Id": record_id,
            "FirstName": "John",
            "LastName": "Doe",
            "Email": "john.doe@example.com",
            "Phone": "(555) 123-4567",
            "AccountId": "001000000000001",
            "OwnerId": "005000000000001"
        } 