#!/usr/bin/env python3
"""
Invitation Manager
Handles all Portal Invitation-related Salesforce operations
"""

import logging
from typing import Dict, List, Any, Optional
from ...base_manager import BaseSalesforceManager
from .operations import InvitationOperations

logger = logging.getLogger(__name__)

class InvitationManager(BaseSalesforceManager):
    """Manager for Portal Invitation operations in Salesforce"""
    
    def __init__(self):
        super().__init__('Portal_Invitation__c')
        self.operations = InvitationOperations(self)
    
    def create_portal_invitation(self, contact_id: str, email: str) -> Dict[str, Any]:
        """Create a portal invitation record"""
        return self.operations.create_portal_invitation(contact_id, email)
    
    def get_invitations_for_contact(self, contact_id: str) -> List[Dict[str, Any]]:
        """Get all invitations for a contact"""
        return self.operations.get_invitations_for_contact(contact_id)
    
    def mark_invitation_as_used(self, invitation_id: str) -> Dict[str, Any]:
        """Mark invitation as used"""
        return self.operations.mark_invitation_as_used(invitation_id)
    
    def _mock_create_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Override mock response for invitations"""
        return {
            "success": True,
            "id": f"a00000000000001",
            "message": "Portal invitation created successfully (mock mode)"
        } 