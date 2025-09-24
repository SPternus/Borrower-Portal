#!/usr/bin/env python3
"""
Contact Operations
Contains all business logic for Contact operations
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class ContactOperations:
    """Contains all Contact-specific business operations"""
    
    def __init__(self, manager):
        self.manager = manager
    
    def get_contact_details(self, contact_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed contact information with formatted response"""
        if not self.manager.is_connected:
            return self._mock_contact_details()
        
        try:
            # Use SOQL query to get specific fields including Plaid fields (both identity and asset)
            soql = f"""
            SELECT Id, FirstName, LastName, Email, Phone, AccountId, OwnerId, 
                   Founders_Club_Member__c, Plaid_Id__c, Plaid_Indentity_Submitted__c, 
                   Plaid_Verification_URL__c, Plaid_Identity_Verification_Data__c,
                   Plaid_Asset_Token__c, Plaid_Asset_Data__c
            FROM Contact 
            WHERE Id = '{contact_id}'
            LIMIT 1
            """
            results = self.manager.query(soql)
            
            if not results:
                return None
            
            contact = results[0]
            
            account_name = contact.get("Account", {}).get("Name", "") if contact.get("Account") else ""
            
            return {
                "id": contact["Id"],
                "firstName": contact.get("FirstName", ""),
                "lastName": contact.get("LastName", ""),
                "email": contact.get("Email", ""),
                "phone": contact.get("Phone", ""),
                "accountId": contact.get("AccountId", ""),
                "accountName": account_name,
                "ownerId": contact.get("OwnerId", ""),
                "foundersClubMember": contact.get('Founders_Club_Member__c', False),
                "plaidVerified": contact.get('Plaid_Indentity_Submitted__c', False),
                "plaidAssetToken": contact.get('Plaid_Asset_Token__c'),
                "plaidAssetData": contact.get('Plaid_Asset_Data__c'),
                "mailingAddress": {
                    "street": "123 Main St",
                    "city": "San Francisco", 
                    "state": "California",
                    "stateCode": "CA",
                    "postalCode": "94105",
                    "country": "United States",
                    "countryCode": "US"
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting contact details for {contact_id}: {str(e)}")
            return self._mock_contact_details()
    
    def get_contact_with_owner(self, contact_id: str) -> Optional[Dict[str, Any]]:
        """Get contact details with owner (loan officer) information"""
        if not self.manager.is_connected:
            return self._mock_contact_with_owner()
        
        try:
            # SOQL query to get contact with owner details
            soql = f"""
            SELECT Id, FirstName, LastName, Email, Phone, AccountId, OwnerId,
                   Owner.Id, Owner.Name, Owner.Email, Owner.Phone, Owner.Title
            FROM Contact 
            WHERE Id = '{contact_id}'
            LIMIT 1
            """
            results = self.manager.query(soql)
            
            if not results:
                return None
            
            contact = results[0]
            owner = contact.get("Owner", {})
            
            return {
                "id": contact["Id"],
                "firstName": contact.get("FirstName", ""),
                "lastName": contact.get("LastName", ""),
                "email": contact.get("Email", ""),
                "phone": contact.get("Phone", ""),
                "accountId": contact.get("AccountId", ""),
                "ownerId": contact.get("OwnerId", ""),
                "owner": {
                    "id": owner.get("Id", contact.get("OwnerId", "")),
                    "name": owner.get("Name", ""),
                    "email": owner.get("Email", ""),
                    "phone": owner.get("Phone", ""),
                    "title": owner.get("Title", "Loan Officer")
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting contact with owner for {contact_id}: {str(e)}")
            return self._mock_contact_with_owner()
    
    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find contact by email address"""
        if not self.manager.is_connected:
            return self._mock_contact_details()
        
        try:
            soql = f"SELECT Id, FirstName, LastName, Email, Phone, AccountId, OwnerId, Founders_Club_Member__c, Plaid_Id__c, Plaid_Indentity_Submitted__c, Plaid_Verification_URL__c, Plaid_Asset_Token__c, Plaid_Asset_Data__c FROM Contact WHERE Email = '{email}' LIMIT 1"
            results = self.manager.query(soql)
            
            if results:
                contact = results[0]
                return {
                    "id": contact["Id"],
                    "firstName": contact.get("FirstName", ""),
                    "lastName": contact.get("LastName", ""),
                    "email": contact.get("Email", ""),
                    "phone": contact.get("Phone", ""),
                    "accountId": contact.get("AccountId", ""),
                    "ownerId": contact.get("OwnerId", ""),
                    "foundersClubMember": contact.get("Founders_Club_Member__c", False),
                    "plaidVerified": contact.get("Plaid_Indentity_Submitted__c", False),
                    "plaidAssetToken": contact.get("Plaid_Asset_Token__c"),
                    "plaidAssetData": contact.get("Plaid_Asset_Data__c")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error finding contact by email {email}: {str(e)}")
            return None
    
    def update_portal_access(self, contact_id: str, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Update contact with portal access information"""
        if not self.manager.is_connected:
            logger.info(f"🔧 Mock mode: Updating portal access for {contact_id}")
            return {"success": True, "message": "Portal access updated (mock mode)"}
        
        try:
            update_data = {
                'Portal_User_ID__c': auth0_user_id,
                'Portal_Email__c': email,
                'Portal_Access_Granted__c': True,
                'Portal_Last_Login__c': datetime.now().isoformat()
            }
            
            result = self.manager.update(contact_id, update_data)
            
            if result.get("success"):
                logger.info(f"✅ Portal access updated for contact {contact_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error updating portal access for {contact_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def store_invitation_token(self, contact_id: str, invitation_token: str, email: str) -> Dict[str, Any]:
        """Store invitation token on contact record"""
        if not self.manager.is_connected:
            logger.info(f"🔧 Mock mode: Storing token {invitation_token} for contact {contact_id}")
            return {"success": True, "message": "Token stored (mock mode)"}
        
        try:
            update_data = {
                'Invitation_Token__c': invitation_token,
                'Portal_Invitation_Email__c': email,
                'Portal_Invitation_Created__c': datetime.now().isoformat(),
                'Portal_Invitation_Expires__c': (datetime.now() + timedelta(days=7)).isoformat(),
                'Portal_Invitation_Used__c': False
            }
            
            result = self.manager.update(contact_id, update_data)
            
            if result.get("success"):
                logger.info(f"✅ Invitation token stored for contact {contact_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error storing invitation token for {contact_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def validate_invitation_token(self, invitation_token: str, email: str) -> Dict[str, Any]:
        """Validate invitation token from contact record"""
        if not self.manager.is_connected:
            return {
                "valid": True,
                "contact_id": "003000000000001",
                "account_id": "001000000000001",
                "email": email,
                "message": "Token validated (mock mode)"
            }
        
        try:
            # Query for contact with matching invitation token
            soql = f"""
            SELECT Id, FirstName, LastName, Email, Invitation_Token__c, AccountId,
                   Portal_Invitation_Email__c, Portal_Invitation_Expires__c, Portal_Invitation_Used__c
            FROM Contact 
            WHERE Invitation_Token__c = '{invitation_token}'
            AND Portal_Invitation_Used__c = false
            LIMIT 1
            """
            
            results = self.manager.query(soql)
            
            if not results:
                return {"valid": False, "error": "Invalid or expired invitation token"}
            
            contact = results[0]
            
            # Check if token has expired
            expires_str = contact.get('Portal_Invitation_Expires__c')
            if expires_str:
                expires_date = datetime.fromisoformat(expires_str.replace('Z', '+00:00'))
                if datetime.now() > expires_date.replace(tzinfo=None):
                    return {"valid": False, "error": "Invitation token has expired"}
            
            # Validate email if provided
            stored_email = contact.get('Portal_Invitation_Email__c') or contact.get('Email')
            if email != "unknown@example.com" and stored_email and email.lower() != stored_email.lower():
                return {"valid": False, "error": "Email does not match invitation"}
            
            return {
                "valid": True,
                "contact_id": contact["Id"],
                "account_id": contact.get("AccountId", ""),
                "email": stored_email,
                "firstName": contact.get("FirstName", ""),
                "lastName": contact.get("LastName", ""),
                "message": "Token validated successfully"
            }
            
        except Exception as e:
            logger.error(f"❌ Error validating invitation token: {str(e)}")
            return {"valid": False, "error": str(e)}
    
    def check_invitation_token_exists(self, invitation_token: str) -> Dict[str, Any]:
        """Check if invitation token exists"""
        if not self.manager.is_connected:
            return {
                "exists": True,
                "contact_name": "John Doe",
                "contact_email": "john.doe@example.com",
                "account_id": "001000000000001",
                "message": "Token found (mock mode)"
            }
        
        try:
            soql = f"""
            SELECT Id, FirstName, LastName, Email, Invitation_Token__c, AccountId, Founders_Club_Member__c, Plaid_Id__c, Plaid_Indentity_Submitted__c, Plaid_Verification_URL__c, Plaid_Asset_Token__c, Plaid_Asset_Data__c
            FROM Contact 
            WHERE Invitation_Token__c = '{invitation_token}'
            LIMIT 1
            """
            logger.info(f"🔍 Checking invitation token: {soql}")
            results = self.manager.query(soql)
            logger.info(f"🔍 Results: {results}")
            if results:
                contact = results[0]
                logger.info(f"🔍 Contact: {contact}")
                full_name = f"{contact.get('FirstName', '')} {contact.get('LastName', '')}".strip()
                logger.info(f"🔍 Full name: {full_name}")
                return {
                    "exists": True,
                    "contact_id": contact["Id"],
                    "account_id": contact.get("AccountId", ""),
                    "contact_name": full_name,
                    "contact_email": contact.get("Email", ""),
                    "first_name": contact.get("FirstName", ""),
                    "last_name": contact.get("LastName", ""),
                    "foundersClubMember": contact.get("Founders_Club_Member__c", False),
                    "plaidVerified": contact.get("Plaid_Indentity_Submitted__c", False),
                    "plaidVerificationId": contact.get("Plaid_Id__c"),
                    "plaidShareableLink": contact.get("Plaid_Verification_URL__c"),
                    "plaidVerificationStatus": "completed" if contact.get("Plaid_Indentity_Submitted__c") else "pending",
                    "plaidAssetToken": contact.get("Plaid_Asset_Token__c"),
                    "plaidAssetData": contact.get("Plaid_Asset_Data__c"),
                    "message": "Token found"
                }
            
            return {"exists": False, "message": "Token not found"}
            
        except Exception as e:
            logger.error(f"❌ Error checking invitation token: {str(e)}")
            return {"exists": False, "error": str(e)}
    
    def mark_invitation_as_used(self, contact_id: str) -> Dict[str, Any]:
        """Mark invitation token as used"""
        if not self.manager.is_connected:
            logger.info(f"🔧 Mock mode: Marking invitation as used for {contact_id}")
            return {"success": True, "message": "Invitation marked as used (mock mode)"}
        
        try:
            update_data = {
                'Portal_Invitation_Used__c': True,
                'Portal_Invitation_Used_Date__c': datetime.now().isoformat()
            }
            
            result = self.manager.update(contact_id, update_data)
            
            if result.get("success"):
                logger.info(f"✅ Invitation marked as used for contact {contact_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error marking invitation as used for {contact_id}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def check_portal_access(self, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Check if user has portal access"""
        if not self.manager.is_connected:
            return {
                "hasAccess": True,
                "contact_id": "003000000000001",
                "message": "Access granted (mock mode)"
            }
        
        try:
            # Query for contact with matching Auth0 user ID or email
            soql = f"""
            SELECT Id, FirstName, LastName, Email, Portal_User_ID__c, Portal_Access_Granted__c
            FROM Contact 
            WHERE (Portal_User_ID__c = '{auth0_user_id}' OR Email = '{email}')
            AND Portal_Access_Granted__c = true
            LIMIT 1
            """
            
            results = self.manager.query(soql)
            
            if results:
                contact = results[0]
                return {
                    "hasAccess": True,
                    "contact_id": contact["Id"],
                    "email": contact.get("Email", ""),
                    "message": "Portal access granted"
                }
            
            return {"hasAccess": False, "message": "No portal access found"}
            
        except Exception as e:
            logger.error(f"❌ Error checking portal access: {str(e)}")
            return {"hasAccess": False, "error": str(e)}
    
    def link_to_auth0_user(self, contact_id: str, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Link contact to Auth0 user"""
        if not self.manager.is_connected:
            logger.info(f"🔧 Mock mode: Linking contact {contact_id} to Auth0 user {auth0_user_id}")
            return {"success": True, "message": "Contact linked to Auth0 user (mock mode)"}
        
        try:
            update_data = {
                'Portal_User_ID__c': auth0_user_id,
                'Portal_Email__c': email,
                'Portal_Access_Granted__c': True,
                'Portal_Linked_Date__c': datetime.now().isoformat()
            }
            
            result = self.manager.update(contact_id, update_data)
            
            if result.get("success"):
                logger.info(f"✅ Contact {contact_id} linked to Auth0 user {auth0_user_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error linking contact to Auth0 user: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _mock_contact_details(self) -> Dict[str, Any]:
        """Return mock contact details for testing"""
        return {
            "id": "003000000000001",
            "firstName": "John",
            "lastName": "Doe", 
            "email": "john.doe@example.com",
            "phone": "(555) 123-4567",
            "accountId": "001000000000001",
            "accountName": "Doe Family Trust",
            "foundersClubMember": True,
            "plaidVerified": False,
            "mailingAddress": {
                "street": "123 Main St",
                "city": "San Francisco", 
                "state": "California",
                "stateCode": "CA",
                "postalCode": "94105",
                "country": "United States",
                "countryCode": "US"
            }
        }
    
    def _mock_contact_with_owner(self) -> Dict[str, Any]:
        """Return mock contact details with owner for testing"""
        return {
            "id": "003000000000001",
            "firstName": "John",
            "lastName": "Doe", 
            "email": "john.doe@example.com",
            "phone": "(555) 123-4567",
            "accountId": "001000000000001",
            "ownerId": "005000000000001",
            "owner": {
                "id": "005000000000001",
                "name": "Sarah Johnson",
                "email": "sarah.johnson@ternus.com",
                "phone": "(555) 987-6543",
                "title": "Senior Loan Officer"
            }
        } 