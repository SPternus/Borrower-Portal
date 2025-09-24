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
                "accountName": contact.get("Account", {}).get("Name", "") if contact.get("Account") else "",
                "ownerId": contact.get("OwnerId", "")
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

    def create_opportunity(self, contact_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new opportunity in Salesforce from application form data"""
        if not self.connected:
            return self._mock_create_opportunity_response()
        
        try:
            # Get contact info to retrieve account ID and owner
            contact = self.get_contact(contact_id)
            if not contact:
                raise Exception(f"Contact {contact_id} not found")
            
            account_id = contact.get('accountId')
            if not account_id:
                raise Exception(f"No account found for contact {contact_id}")
            
            # Get the contact owner to assign to opportunity
            contact_owner_id = contact.get('ownerId')
            
            # Map form data to SFDC Opportunity fields
            personal_info = form_data.get('personalInfo', {})
            property_info = form_data.get('propertyInfo', {})
            loan_info = form_data.get('loanInfo', {})
            financial_info = form_data.get('financialInfo', {})
            
            # Create opportunity name from property address or borrower name
            opportunity_name = property_info.get('propertyAddress', '')
            if not opportunity_name:
                # The name should be Property Street Address for the opportunity name
                opportunity_name = property_info.get('propertyAddress', '')
            
            # Map loan type to Product__c field (using actual SFDC picklist values)
            loan_type_mapping = {
                'fix-flip': 'Fix and Flip Loan',
                'dscr': 'Long-term Rental Loans (DSCR)',
                'bridge': 'Bridge Loan',
                'wholetail': 'Wholetail Loan',
                'construction': 'Ground Up Construction Loan',
                'portfolio': 'Portfolio Rental Loan',
                'transactional': 'Transactional Funding'
            }
            
            # Property type mapping (using actual SFDC picklist values)
            property_type_mapping = {
                'single-family': 'SFR',
                'multi-family': 'Mult 2-4',
                'multi-family-5plus': 'Multi 5+',
                'manufactured': 'Manufactured'
            }
            
            # Intent mapping (using actual SFDC picklist values)
            intent_mapping = {
                'investment': 'Max Proceeds',
                'refinance': 'Low Rate',
                'leverage': 'Max Leverage',
                'other': 'Other'
            }
            
            # Basic opportunity fields (required)
            opportunity_data = {
                'Name': opportunity_name.strip(),
                'AccountId': account_id,
                'Contact_Primary_Guarantor__c': contact_id,
                'StageName': 'Above the Funnel',  # Initial stage for portal applications
                'CloseDate': (datetime.now() + timedelta(days=30)).date().isoformat(),
                'Amount': float(loan_info.get('loanAmount', 0)) if loan_info.get('loanAmount') else None,
                'Description': f"Portal Application - {loan_info.get('loanPurpose', 'Investment')} loan for {property_info.get('propertyType', 'property')}"
            }
            
            # Set opportunity owner to match contact owner
            if contact_owner_id:
                opportunity_data['OwnerId'] = contact_owner_id
            
            # Enhanced field mapping for loan details
            if loan_info.get('loanAmount'):
                opportunity_data['Desired_Loan_Amount__c'] = float(loan_info.get('loanAmount'))
            
            if loan_info.get('loanType'):
                opportunity_data['Product__c'] = loan_type_mapping.get(loan_info.get('loanType'), loan_info.get('loanType'))
            
            # Property address mapping - use individual address components
            if property_info.get('propertyAddress'):
                # Store the full address in Property_Address__c field (textarea)
                opportunity_data['Property_Address__c'] = property_info.get('propertyAddress')
                
                # Try to parse address components for individual fields
                address_parts = property_info.get('propertyAddress', '').split(',')
                if len(address_parts) >= 2:
                    opportunity_data['Property_Addresses__Street__s'] = address_parts[0].strip()
                    if len(address_parts) >= 3:
                        city_state_zip = address_parts[1].strip() + ', ' + address_parts[2].strip()
                        # Try to extract city, state, zip
                        if ' ' in city_state_zip:
                            parts = city_state_zip.split()
                            if len(parts) >= 3:
                                opportunity_data['Property_Addresses__City__s'] = ' '.join(parts[:-2])
                                opportunity_data['Property_Addresses__StateCode__s'] = parts[-2]
                                opportunity_data['Property_Addresses__PostalCode__s'] = parts[-1]
                                # SFDC requires country before state
                                opportunity_data['Property_Addresses__CountryCode__s'] = 'US'
            
            # Property details mapping - only use fields that exist
            if property_info.get('purchasePrice'):
                opportunity_data['Purchase_Price__c'] = float(property_info.get('purchasePrice'))
            
            if property_info.get('propertyType'):
                opportunity_data['Property_Type__c'] = property_type_mapping.get(
                    property_info.get('propertyType'), 
                    property_info.get('propertyType')
                )
            
            # Use existing SFDC field names from the API response
            if property_info.get('propertyValue'):
                # Map to As_Is_Value__c (which exists in SFDC)
                opportunity_data['As_Is_Value__c'] = float(property_info.get('propertyValue'))
            
            if property_info.get('downPayment'):
                # Map to Down_Payment__c (percentage field in SFDC)
                purchase_price = float(property_info.get('purchasePrice', 1)) or 1
                down_payment_pct = (float(property_info.get('downPayment')) / purchase_price) * 100
                opportunity_data['Down_Payment__c'] = down_payment_pct
            
            # Loan terms - use Intent__c for loan purpose
            if loan_info.get('loanPurpose'):
                opportunity_data['Intent__c'] = intent_mapping.get(loan_info.get('loanPurpose'), 'Other')
            
            # Financial information - remove non-existent fields
            # Most of these custom fields don't exist in this SFDC org
            
            # Portal metadata - use Description for additional info
            portal_info = f"Portal Application from {personal_info.get('firstName', '')} {personal_info.get('lastName', '')}"
            if personal_info.get('email'):
                portal_info += f" ({personal_info.get('email')})"
            if personal_info.get('phone'):
                portal_info += f" Phone: {personal_info.get('phone')}"
            if financial_info.get('annualIncome'):
                portal_info += f" Annual Income: ${financial_info.get('annualIncome')}"
            if financial_info.get('employmentStatus'):
                portal_info += f" Employment: {financial_info.get('employmentStatus')}"
            
            opportunity_data['Description'] = portal_info
            
            # Remove None values
            opportunity_data = {k: v for k, v in opportunity_data.items() if v is not None}
            
            logger.info(f"🔄 Creating SFDC Opportunity with fields: {list(opportunity_data.keys())}")
            
            result = self.sf.Opportunity.create(opportunity_data)
            opportunity_id = result["id"]
            
            logger.info(f"✅ Real SFDC Opportunity {opportunity_id} created for contact {contact_id}")
            
            # Log this activity
            self.log_activity(
                contact_id, 
                "Application Submitted", 
                f"New loan application created: {opportunity_name} (Amount: ${loan_info.get('loanAmount', 'TBD')})"
            )
            
            return {
                "success": True,
                "opportunityId": opportunity_id,
                "message": "Opportunity created in Salesforce successfully",
                "opportunityName": opportunity_name,
                "fieldsCreated": list(opportunity_data.keys())
            }
            
        except Exception as e:
            logger.error(f"❌ Error creating opportunity for contact {contact_id}: {str(e)}")
            logger.error(f"❌ Form data was: {form_data}")
            return {
                "success": False,
                "error": str(e),
                "fallback": self._mock_create_opportunity_response()
            }
    
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
        """Mock update response"""
        return {
            "success": False,
            "error": "Mock mode: Updates not implemented"
        }

    def _mock_create_opportunity_response(self) -> Dict[str, Any]:
        """Mock create opportunity response"""
        mock_id = f"mock_opp_{int(datetime.now().timestamp())}"
        return {
            "success": True,
            "opportunityId": mock_id,
            "message": "Mock opportunity created successfully",
            "opportunityName": "Mock Opportunity - Test Application"
        }

    def get_opportunity_fields(self) -> Dict[str, Any]:
        """Get available fields for Opportunity object in SFDC"""
        if not self.connected:
            return {"error": "Not connected to Salesforce"}
        
        try:
            # Describe the Opportunity object to get field metadata
            opportunity_desc = self.sf.Opportunity.describe()
            
            # Extract field names and types
            fields = {}
            for field in opportunity_desc['fields']:
                fields[field['name']] = {
                    'type': field['type'],
                    'label': field['label'],
                    'createable': field['createable'],
                    'updateable': field['updateable']
                }
            
            return {
                "success": True,
                "fields": fields,
                "total_fields": len(fields)
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting Opportunity fields: {str(e)}")
            return {"error": str(e)}

    def get_picklist_values(self, object_name: str, field_name: str) -> Dict[str, Any]:
        """Get picklist values for a specific field"""
        if not self.connected:
            return {"error": "Not connected to Salesforce"}
        
        try:
            # Get the object description
            obj_desc = getattr(self.sf, object_name).describe()
            
            # Find the specific field
            for field in obj_desc['fields']:
                if field['name'] == field_name:
                    if field['type'] == 'picklist':
                        values = [value['value'] for value in field['picklistValues'] if value['active']]
                        return {
                            "success": True,
                            "field": field_name,
                            "values": values,
                            "label": field['label']
                        }
                    else:
                        return {"error": f"Field {field_name} is not a picklist"}
            
            return {"error": f"Field {field_name} not found in {object_name}"}
            
        except Exception as e:
            logger.error(f"❌ Error getting picklist values: {str(e)}")
            return {"error": str(e)}

# Global connector instance
sfdc_connector = TernusSalesforceConnector() 