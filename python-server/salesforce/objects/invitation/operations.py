#!/usr/bin/env python3
"""
Invitation Operations
Contains all business logic for Portal Invitation operations
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class InvitationOperations:
    """Contains all Portal Invitation-specific business operations"""
    
    def __init__(self, manager):
        self.manager = manager
    
    def create_portal_invitation(self, contact_id: str, email: str) -> Dict[str, Any]:
        """Create a portal invitation record in Salesforce"""
        if not self.manager.is_connected:
            return {"success": True, "invitationId": f"mock_{int(datetime.now().timestamp())}"}
        
        try:
            invitation_data = {
                'Contact__c': contact_id,
                'Email__c': email,
                'Status__c': 'Sent',
                'Sent_Date__c': datetime.now().isoformat(),
                'Expiry_Date__c': (datetime.now() + timedelta(days=7)).isoformat()
            }
            
            result = self.manager.create(invitation_data)
            
            if result.get("success"):
                logger.info(f"📧 Portal invitation created for {email}")
                
                return {
                    "success": True,
                    "invitationId": result["id"],
                    "message": "Portal invitation created successfully"
                }
            else:
                return result
            
        except Exception as e:
            logger.error(f"❌ Error creating portal invitation: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_invitations_for_contact(self, contact_id: str) -> List[Dict[str, Any]]:
        """Get all invitations for a contact"""
        if not self.manager.is_connected:
            return self._mock_invitations()
        
        try:
            soql = f"""
            SELECT Id, Email__c, Status__c, Sent_Date__c, Expiry_Date__c, Used_Date__c
            FROM Portal_Invitation__c 
            WHERE Contact__c = '{contact_id}'
            ORDER BY Sent_Date__c DESC
            """
            
            results = self.manager.query(soql)
            invitations = []
            
            for invitation in results:
                invitations.append({
                    "id": invitation["Id"],
                    "email": invitation.get("Email__c", ""),
                    "status": invitation.get("Status__c", ""),
                    "sentDate": invitation.get("Sent_Date__c", ""),
                    "expiryDate": invitation.get("Expiry_Date__c", ""),
                    "usedDate": invitation.get("Used_Date__c", "")
                })
            
            return invitations
            
        except Exception as e:
            logger.error(f"❌ Error fetching invitations for {contact_id}: {str(e)}")
            return self._mock_invitations()
    
    def mark_invitation_as_used(self, invitation_id: str) -> Dict[str, Any]:
        """Mark invitation as used"""
        if not self.manager.is_connected:
            return {"success": True, "message": "Invitation marked as used (mock mode)"}
        
        try:
            update_data = {
                'Status__c': 'Used',
                'Used_Date__c': datetime.now().isoformat()
            }
            
            result = self.manager.update(invitation_id, update_data)
            
            if result.get("success"):
                logger.info(f"✅ Invitation {invitation_id} marked as used")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error marking invitation as used: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _mock_invitations(self) -> List[Dict[str, Any]]:
        """Mock invitations for testing"""
        return [
            {
                "id": "a00000000000001",
                "email": "sanju.comp@gmail.com",
                "status": "Used",
                "sentDate": "2024-01-01T00:00:00.000+0000",
                "expiryDate": "2024-01-08T00:00:00.000+0000",
                "usedDate": "2024-01-01T12:00:00.000+0000"
            }
        ] 