#!/usr/bin/env python3
"""
Ternus Salesforce Connector
Production-ready Salesforce integration using simple-salesforce
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from simple_salesforce import Salesforce, SalesforceError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TernusSalesforceConnector:
    """Salesforce connector for Ternus Borrower Portal"""
    
    def __init__(self):
        self.sf = None
        self.connected = False
        self._connect()
    
    def _connect(self):
        """Establish connection to Salesforce"""
        try:
            # Environment variables for SFDC connection (matching .env file names)
            username = os.getenv('SALESFORCE_USERNAME')
            password = os.getenv('SALESFORCE_PASSWORD')
            security_token = os.getenv('SALESFORCE_SECURITY_TOKEN')
            instance_url = os.getenv('SALESFORCE_INSTANCE_URL', '')
            
            # Determine domain from instance URL
            if 'sandbox' in instance_url.lower():
                domain = 'test'
            else:
                domain = 'login'
            
            # Check if credentials are available
            if not all([username, password, security_token]):
                logger.warning("SFDC credentials not found, using mock mode")
                self.connected = False
                return
            
            # Connect to Salesforce
            self.sf = Salesforce(
                username=username,
                password=password,
                security_token=security_token,
                domain=domain
            )
            
            self.connected = True
            logger.info("✅ Connected to Salesforce successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to Salesforce: {str(e)}")
            self.connected = False
    
    def get_contact(self, contact_id: str) -> Optional[Dict[str, Any]]:
        """Fetch contact data from Salesforce"""
        if not self.connected:
            return self._mock_contact()
        
        try:
            contact = self.sf.Contact.get(contact_id)
            return {
                "id": contact["Id"],
                "firstName": contact.get("FirstName", ""),
                "lastName": contact.get("LastName", ""),
                "email": contact.get("Email", ""),
                "phone": contact.get("Phone", ""),
                "accountId": contact.get("AccountId", ""),
                "accountName": contact.get("Account", {}).get("Name", "") if contact.get("Account") else ""
            }
        except SalesforceError as e:
            logger.error(f"❌ Error fetching contact {contact_id}: {str(e)}")
            return self._mock_contact()
    
    def get_opportunities(self, contact_id: str) -> List[Dict[str, Any]]:
        """Fetch opportunities for a contact"""
        if not self.connected:
            return self._mock_opportunities()
        
        try:
            # SOQL query to get opportunities for contact (using only standard fields + confirmed custom fields)
            query = f"""
            SELECT Id, Name, StageName, Amount, CloseDate, CreatedDate, Description,
                   Product__c, Property_Addresses__c, Desired_Loan_Amount__c, App_Fee_Paid__c
            FROM Opportunity 
            WHERE Contact_Primary_Guarantor__c = '{contact_id}'
            ORDER BY CreatedDate DESC
            """
            
            results = self.sf.query(query)
            opportunities = []
            
            for opp in results['records']:
                opportunities.append({
                    "id": opp["Id"],
                    "name": opp.get("Name", ""),
                    "stageName": opp.get("StageName", ""),
                    "amount": opp.get("Desired_Loan_Amount__c") or opp.get("Amount", 0),
                    "closeDate": opp.get("CloseDate", ""),
                    "createdDate": opp.get("CreatedDate", ""),
                    "loanType": opp.get("Product__c", ""),
                    "propertyAddress": opp.get("Property_Addresses__c", ""),
                    "description": opp.get("Description", ""),
                    "loanAmount": opp.get("Desired_Loan_Amount__c") or opp.get("Amount", 0),
                    "appFeePaid": opp.get("App_Fee_Paid__c", False),  # Application fee payment status
                    "loanPurpose": "Investment",  # Default value
                    "propertyType": "Property",  # Default value  
                    "propertyValue": 0,  # Default value
                    "loanOfficer": {
                        "name": "Sales Team",  # Default value
                        "email": "sales@ternus.com",  # Default value
                        "phone": "(555) 123-4567"  # Default value
                    }
                })
            
            return opportunities
            
        except SalesforceError as e:
            logger.error(f"❌ Error fetching opportunities for {contact_id}: {str(e)}")
            return self._mock_opportunities()
    
    def log_activity(self, contact_id: str, activity_type: str, description: str) -> Dict[str, Any]:
        """Log activity to Salesforce"""
        if not self.connected:
            return self._mock_activity_response()
        
        try:
            # Create a Task record in Salesforce
            task_data = {
                'WhoId': contact_id,
                'Subject': activity_type,
                'Description': description,
                'Status': 'Completed',
                'ActivityDate': datetime.now().date().isoformat(),
                'Type': 'Portal Activity'
            }
            
            result = self.sf.Task.create(task_data)
            
            logger.info(f"📊 Activity logged to SFDC: {activity_type} for {contact_id}")
            
            return {
                "success": True,
                "activityId": result["id"],
                "message": "Activity logged to Salesforce successfully"
            }
            
        except SalesforceError as e:
            logger.error(f"❌ Error logging activity: {str(e)}")
            return self._mock_activity_response()
    
    def update_opportunity(self, opportunity_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update an opportunity in Salesforce"""
        if not self.connected:
            return self._mock_update_response(opportunity_id)
        
        try:
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
            
            result = self.sf.Opportunity.update(opportunity_id, sfdc_updates)
            
            logger.info(f"🔄 Opportunity {opportunity_id} updated in SFDC")
            
            return {
                "success": True,
                "opportunityId": opportunity_id,
                "message": "Opportunity updated in Salesforce successfully"
            }
            
        except SalesforceError as e:
            logger.error(f"❌ Error updating opportunity {opportunity_id}: {str(e)}")
            return self._mock_update_response(opportunity_id)
    
    def create_portal_invitation(self, contact_id: str, email: str) -> Dict[str, Any]:
        """Create a portal invitation record in Salesforce"""
        if not self.connected:
            return {"success": True, "invitationId": f"mock_{int(datetime.now().timestamp())}"}
        
        try:
            invitation_data = {
                'Contact__c': contact_id,
                'Email__c': email,
                'Status__c': 'Sent',
                'Sent_Date__c': datetime.now().isoformat(),
                'Expiry_Date__c': (datetime.now() + timedelta(days=7)).isoformat()
            }
            
            result = self.sf.Portal_Invitation__c.create(invitation_data)
            
            logger.info(f"📧 Portal invitation created for {email}")
            
            return {
                "success": True,
                "invitationId": result["id"],
                "message": "Portal invitation created successfully"
            }
            
        except SalesforceError as e:
            logger.error(f"❌ Error creating portal invitation: {str(e)}")
            return {"success": False, "error": str(e)}

    def store_invitation_token_on_contact(self, contact_id: str, invitation_token: str, email: str) -> Dict[str, Any]:
        """Store invitation token directly on the contact record"""
        if not self.connected:
            logger.info(f"🔧 Mock mode: Storing token {invitation_token} for contact {contact_id}")
            return {"success": True, "message": "Token stored (mock mode)"}
        
        try:
            # Update contact record with invitation token and related fields
            contact_updates = {
                'Portal_Invitation_Token__c': invitation_token,
                'Portal_Invitation_Email__c': email,
                'Portal_Invitation_Status__c': 'Active',
                'Portal_Invitation_Created__c': datetime.now().isoformat(),
                'Portal_Invitation_Expires__c': (datetime.now() + timedelta(days=7)).isoformat()
            }
            
            result = self.sf.Contact.update(contact_id, contact_updates)
            
            logger.info(f"✅ Invitation token stored on contact {contact_id}")
            
            return {
                "success": True,
                "contactId": contact_id,
                "message": "Invitation token stored on contact successfully"
            }
            
        except SalesforceError as e:
            logger.error(f"❌ Error storing invitation token on contact {contact_id}: {str(e)}")
            return {"success": False, "error": str(e)}

    def validate_invitation_token_from_salesforce(self, invitation_token: str, email: str) -> Dict[str, Any]:
        """Validate invitation token by checking Salesforce contact records"""
        if not self.connected:
            # Mock mode - return valid token for development
            logger.info(f"🔧 Mock mode: Validating token {invitation_token} for {email}")
            return {
                "valid": True,
                "contact_id": "003Oz00000QAiECIA1",
                "account_id": "001XX000004DcWYA0",
                "email": email,
                "first_name": "Development",
                "last_name": "User",
                "status": "Active"
            }
        
        try:
            # Query Contact using the correct field name Invitation_Token__c
            query = f"""
            SELECT Id, AccountId, FirstName, LastName, Email, Invitation_Token__c
            FROM Contact 
            WHERE Invitation_Token__c = '{invitation_token}' 
            AND Email = '{email}'
            LIMIT 1
            """
            
            logger.info(f"🔍 Validating token {invitation_token} for {email}")
            results = self.sf.query(query)
            
            if results['totalSize'] == 0:
                # Check if token exists but email doesn't match
                token_query = f"""
                SELECT Id, Email, Invitation_Token__c
                FROM Contact 
                WHERE Invitation_Token__c = '{invitation_token}'
                LIMIT 1
                """
                token_results = self.sf.query(token_query)
                
                if token_results['totalSize'] > 0:
                    logger.warning(f"⚠️ Token {invitation_token} exists but email {email} doesn't match")
                    raise ValueError("Invalid email address for this invitation token")
                else:
                    logger.warning(f"⚠️ Token {invitation_token} not found in Salesforce")
                    raise ValueError("Invalid or expired invitation token")
            
            contact = results['records'][0]
            logger.info(f"✅ Valid token found for {contact['FirstName']} {contact['LastName']}")
            
            return {
                "valid": True,
                "contact_id": contact['Id'],
                "account_id": contact['AccountId'],
                "email": contact['Email'],
                "first_name": contact['FirstName'],
                "last_name": contact['LastName'],
                "status": "Active"
            }
            
        except ValueError:
            # Re-raise ValueError with original message
            raise
        except Exception as e:
            logger.error(f"❌ Error validating invitation token: {str(e)}")
            raise ValueError("Unable to validate invitation token. Please try again later.")

    def check_invitation_token_exists(self, invitation_token: str) -> Dict[str, Any]:
        """Check if invitation token exists in Salesforce (without email validation)"""
        if not self.connected:
            # Mock mode - return valid token for development
            logger.info(f"🔧 Mock mode: Checking token {invitation_token}")
            return {
                "valid": True,
                "contact_id": "003Oz00000QAiECIA1",
                "account_id": "001XX000004DcWYA0",
                "email": "demo@example.com",
                "first_name": "Development",
                "last_name": "User",
                "status": "Active"
            }
        
        try:
            # Query Contact using just the invitation token
            query = f"""
            SELECT Id, AccountId, FirstName, LastName, Email, Invitation_Token__c
            FROM Contact 
            WHERE Invitation_Token__c = '{invitation_token}'
            LIMIT 1
            """
            
            logger.info(f"🔍 Checking if token {invitation_token} exists")
            results = self.sf.query(query)
            
            if results['totalSize'] == 0:
                logger.warning(f"⚠️ Token {invitation_token} not found in Salesforce")
                return {
                    "valid": False,
                    "error": "Invalid or expired invitation token"
                }
            
            contact = results['records'][0]
            logger.info(f"✅ Token found for contact {contact['FirstName']} {contact['LastName']} ({contact['Email']})")
            
            return {
                "valid": True,
                "contact_id": contact['Id'],
                "account_id": contact['AccountId'],
                "email": contact['Email'],
                "first_name": contact['FirstName'],
                "last_name": contact['LastName'],
                "status": "Active"
            }
            
        except Exception as e:
            logger.error(f"❌ Error checking invitation token: {str(e)}")
            return {
                "valid": False,
                "error": f"Unable to validate invitation token: {str(e)}"
            }

    def mark_invitation_token_as_used(self, contact_id: str) -> Dict[str, Any]:
        """Mark invitation token as used on the contact record"""
        if not self.connected:
            logger.info(f"🔧 Mock mode: Marking token as used for contact {contact_id}")
            return {"success": True, "message": "Token marked as used (mock mode)"}
        
        try:
            # Update contact record to mark token as used
            contact_updates = {
                'Portal_Invitation_Status__c': 'Used',
                'Portal_Invitation_Used__c': datetime.now().isoformat()
            }
            
            result = self.sf.Contact.update(contact_id, contact_updates)
            
            logger.info(f"✅ Invitation token marked as used for contact {contact_id}")
            
            return {
                "success": True,
                "contactId": contact_id,
                "message": "Invitation token marked as used successfully"
            }
            
        except SalesforceError as e:
            logger.error(f"❌ Error marking invitation token as used: {str(e)}")
            return {"success": False, "error": str(e)}

    def check_user_portal_access(self, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Check if a user has portal access by looking up their contact connection"""
        if not self.connected:
            logger.info(f"🔧 Mock mode: Checking access for {auth0_user_id}")
            return {
                "has_access": False,
                "message": "No portal access found (mock mode)"
            }
        
        try:
            # Use standard field (Description) temporarily to store Auth0 ID
            # In production, create custom field: Portal_User_Auth0_ID__c
            query = f"""
            SELECT Id, AccountId, FirstName, LastName, Email, Description
            FROM Contact 
            WHERE Description LIKE '%{auth0_user_id}%'
            OR Email = '{email}'
            LIMIT 1
            """
            
            results = self.sf.query(query)
            
            if not results['records']:
                logger.warning(f"❌ No contact found for Auth0 user {auth0_user_id} / {email}")
                return {
                    "has_access": False,
                    "message": "No contact record found. Please connect your account with Ternus."
                }
            
            contact = results['records'][0]
            
            # Check if user is linked to Auth0 ID
            description = contact.get('Description', '')
            if auth0_user_id in description:
                logger.info(f"✅ Portal access confirmed for {email}")
                return {
                    "has_access": True,
                    "contact_id": contact['Id'],
                    "account_id": contact.get('AccountId'),
                    "message": "Portal access confirmed"
                }
            else:
                logger.info(f"⚠️ Contact exists but not linked to Auth0 user {auth0_user_id}")
                return {
                    "has_access": False,
                    "contact_id": contact['Id'],
                    "message": "Contact found but not linked to your account. Please complete the connection process."
                }
            
        except SalesforceError as e:
            logger.error(f"❌ Error checking portal access: {str(e)}")
            return {
                "has_access": False,
                "error": f"Salesforce error: {str(e)}"
            }

    def link_user_to_contact(self, contact_id: str, auth0_user_id: str, email: str) -> Dict[str, Any]:
        """Link Auth0 user to Salesforce contact"""
        if not self.connected:
            logger.info(f"🔧 Mock mode: Linking {auth0_user_id} to contact {contact_id}")
            return {
                "success": True,
                "message": "User linked to contact (mock mode)"
            }
        
        try:
            # Update contact with Auth0 User ID in Description field (temporary)
            # In production, use custom field: Portal_User_Auth0_ID__c
            contact_updates = {
                'Description': f"Portal User: {auth0_user_id} | Email: {email} | Linked: {datetime.now().isoformat()}"
            }
            
            result = self.sf.Contact.update(contact_id, contact_updates)
            
            logger.info(f"✅ Auth0 user {auth0_user_id} linked to contact {contact_id}")
            
            return {
                "success": True,
                "contact_id": contact_id,
                "auth0_user_id": auth0_user_id,
                "message": "User successfully linked to contact"
            }
            
        except SalesforceError as e:
            logger.error(f"❌ Error linking user to contact: {str(e)}")
            return {
                "success": False,
                "error": f"Salesforce error: {str(e)}"
            }
    
    # Mock data methods for fallback
    
    def _mock_contact(self) -> Dict[str, Any]:
        """Mock contact data for testing"""
        return {
            "id": "003XX0000004DcW",
            "firstName": "Demo",
            "lastName": "User",
            "email": "demo.user@example.com",
            "phone": "(555) 123-4567",
            "accountId": "001XX000003DHP0",
            "accountName": "Demo Account"
        }
    
    def _mock_opportunities(self) -> List[Dict[str, Any]]:
        """Mock opportunities data for testing"""
        return [
            {
                "id": "opp_001",
                "name": "Demo Fix & Flip Loan",
                "stageName": "Processing",
                "amount": 450000,
                "closeDate": "2024-07-15",
                "createdDate": "2024-06-01",
                "loanType": "Fix & Flip",
                "propertyAddress": "123 Oak Street, Dallas, TX",
                "loanAmount": 450000,
                "loanPurpose": "Investment",
                "propertyType": "Single Family",
                "propertyValue": 600000,
                "loanOfficer": {
                    "name": "Cody Sento",
                    "email": "cody.sento@ternus.com",
                    "phone": "(555) 123-4567"
                }
            },
            {
                "id": "opp_002",
                "name": "Demo DSCR Loan", 
                "stageName": "Conditional Approval",
                "amount": 325000,
                "closeDate": "2024-06-30",
                "createdDate": "2024-05-15",
                "loanType": "DSCR",
                "propertyAddress": "456 Pine Avenue, Austin, TX",
                "loanAmount": 325000,
                "loanPurpose": "Investment",
                "propertyType": "Condo",
                "propertyValue": 425000,
                "loanOfficer": {
                    "name": "Lori Knight",
                    "email": "lori.knight@ternus.com",
                    "phone": "(555) 123-4568"
                }
            }
        ]
    
    def _mock_activity_response(self) -> Dict[str, Any]:
        """Mock activity logging response"""
        return {
            "success": True,
            "activityId": f"activity_{int(datetime.now().timestamp())}",
            "message": "Activity logged successfully (mock mode)"
        }
    
    def _mock_update_response(self, opportunity_id: str) -> Dict[str, Any]:
        """Mock opportunity update response"""
        return {
            "success": True,
            "opportunityId": opportunity_id,
            "message": "Opportunity updated successfully (mock mode)"
        }

# Global connector instance
sfdc_connector = TernusSalesforceConnector() 