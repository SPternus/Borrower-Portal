#!/usr/bin/env python3
"""
Opportunity Operations
Contains all business logic for Opportunity operations
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class OpportunityOperations:
    """Contains all Opportunity-specific business operations"""
    
    def __init__(self, manager):
        self.manager = manager
    
    def get_opportunities_for_contact(self, contact_id: str) -> List[Dict[str, Any]]:
        """Get all opportunities for a contact with formatted response"""
        if not self.manager.is_connected:
            return self._mock_opportunities()
        
        try:
            # SOQL query to get opportunities for contact
            soql = f"""
            SELECT Id, Name, StageName, Amount, CloseDate, CreatedDate, Description,
                   Product__c, Property_Addresses__c, Desired_Loan_Amount__c, App_Fee_Paid__c
            FROM Opportunity 
            WHERE Contact_Primary_Guarantor__c = '{contact_id}'
            ORDER BY CreatedDate DESC
            """
            
            results = self.manager.query(soql)
            opportunities = []
            
            for opp in results:
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
            
        except Exception as e:
            logger.error(f"❌ Error fetching opportunities for {contact_id}: {str(e)}")
            return self._mock_opportunities()
    
    def create_from_form_data(self, contact_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create opportunity from application form data"""
        if not self.manager.is_connected:
            return self._mock_create_opportunity_response()
        
        try:
            # Get contact info to retrieve account ID and owner
            from ..contact.manager import ContactManager
            contact_manager = ContactManager()
            contact = contact_manager.get_contact_details(contact_id)
            
            if not contact:
                raise Exception(f"Contact {contact_id} not found")
            
            account_id = contact.get('accountId')
            if not account_id:
                raise Exception(f"No account found for contact {contact_id}")
            
            # Get the contact owner to assign to opportunity
            contact_owner_id = contact.get('ownerId')
            
            # Map form data to SFDC Opportunity fields
            opportunity_data = self._map_form_data_to_opportunity(form_data, contact_id, account_id, contact_owner_id)
            
            # Remove None values
            opportunity_data = {k: v for k, v in opportunity_data.items() if v is not None}
            
            logger.info(f"🔄 Creating SFDC Opportunity with fields: {list(opportunity_data.keys())}")
            
            result = self.manager.create(opportunity_data)
            
            if result.get("success"):
                opportunity_id = result["id"]
                logger.info(f"✅ Real SFDC Opportunity {opportunity_id} created for contact {contact_id}")
                
                # Log this activity
                from ..task.manager import TaskManager
                task_manager = TaskManager()
                task_manager.log_activity(
                    contact_id, 
                    "Application Submitted", 
                    f"New loan application created: {opportunity_data.get('Name', 'Unknown')} (Amount: ${form_data.get('loanInfo', {}).get('loanAmount', 'TBD')})"
                )
                
                return {
                    "success": True,
                    "opportunityId": opportunity_id,
                    "message": "Opportunity created in Salesforce successfully",
                    "opportunityName": opportunity_data.get('Name', ''),
                    "fieldsCreated": list(opportunity_data.keys())
                }
            else:
                return result
            
        except Exception as e:
            logger.error(f"❌ Error creating opportunity for contact {contact_id}: {str(e)}")
            logger.error(f"❌ Form data was: {form_data}")
            return {
                "success": False,
                "error": str(e),
                "fallback": self._mock_create_opportunity_response()
            }
    
    def update_stage(self, opportunity_id: str, stage_name: str) -> Dict[str, Any]:
        """Update opportunity stage"""
        update_data = {'StageName': stage_name}
        return self.manager.update(opportunity_id, update_data)
    
    def get_opportunity_fields(self) -> Dict[str, Any]:
        """Get opportunity field metadata"""
        if not self.manager.is_connected:
            return self._mock_field_metadata()
        
        try:
            # Get field metadata from Salesforce
            describe_result = self.manager.sobject.describe()
            
            fields = {}
            for field in describe_result['fields']:
                fields[field['name']] = {
                    'label': field['label'],
                    'type': field['type'],
                    'required': not field['nillable'],
                    'picklistValues': [pv['value'] for pv in field.get('picklistValues', [])]
                }
            
            return {
                "success": True,
                "fields": fields
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting opportunity fields: {str(e)}")
            return self._mock_field_metadata()
    
    def get_picklist_values(self, field_name: str) -> Dict[str, Any]:
        """Get picklist values for a specific field"""
        if not self.manager.is_connected:
            return self._mock_picklist_values(field_name)
        
        try:
            describe_result = self.manager.sobject.describe()
            
            for field in describe_result['fields']:
                if field['name'] == field_name:
                    return {
                        "success": True,
                        "field": field_name,
                        "values": [pv['value'] for pv in field.get('picklistValues', [])]
                    }
            
            return {"success": False, "error": f"Field {field_name} not found"}
            
        except Exception as e:
            logger.error(f"❌ Error getting picklist values for {field_name}: {str(e)}")
            return self._mock_picklist_values(field_name)
    
    def _map_form_data_to_opportunity(self, form_data: Dict[str, Any], contact_id: str, account_id: str, contact_owner_id: str) -> Dict[str, Any]:
        """Map form data to Salesforce Opportunity fields"""
        personal_info = form_data.get('personalInfo', {})
        property_info = form_data.get('propertyInfo', {})
        loan_info = form_data.get('loanInfo', {})
        financial_info = form_data.get('financialInfo', {})
        
        # Create opportunity name from property address or borrower name
        opportunity_name = property_info.get('propertyAddress', '')
        if not opportunity_name:
            opportunity_name = f"{personal_info.get('firstName', '')} {personal_info.get('lastName', '')} - Loan Application".strip()
        
        # Field mappings
        loan_type_mapping = {
            'fix-flip': 'Fix and Flip Loan',
            'dscr': 'Long-term Rental Loans (DSCR)',
            'bridge': 'Bridge Loan',
            'wholetail': 'Wholetail Loan',
            'construction': 'Ground Up Construction Loan',
            'portfolio': 'Portfolio Rental Loan',
            'transactional': 'Transactional Funding'
        }
        
        property_type_mapping = {
            'single-family': 'SFR',
            'multi-family': 'Mult 2-4',
            'multi-family-5plus': 'Multi 5+',
            'manufactured': 'Manufactured'
        }
        
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
        
        # Property address mapping
        if property_info.get('propertyAddress'):
            opportunity_data['Property_Address__c'] = property_info.get('propertyAddress')
            
            # Try to parse address components
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
                            opportunity_data['Property_Addresses__CountryCode__s'] = 'US'
        
        # Property details mapping
        if property_info.get('purchasePrice'):
            opportunity_data['Purchase_Price__c'] = float(property_info.get('purchasePrice'))
        
        if property_info.get('propertyType'):
            opportunity_data['Property_Type__c'] = property_type_mapping.get(
                property_info.get('propertyType'), 
                property_info.get('propertyType')
            )
        
        if property_info.get('propertyValue'):
            opportunity_data['As_Is_Value__c'] = float(property_info.get('propertyValue'))
        
        if property_info.get('downPayment'):
            purchase_price = float(property_info.get('purchasePrice', 1)) or 1
            down_payment_pct = (float(property_info.get('downPayment')) / purchase_price) * 100
            opportunity_data['Down_Payment__c'] = down_payment_pct
        
        # Loan terms
        if loan_info.get('loanPurpose'):
            opportunity_data['Intent__c'] = intent_mapping.get(loan_info.get('loanPurpose'), 'Other')
        
        # Portal metadata in description
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
        
        return opportunity_data
    
    def _mock_opportunities(self) -> List[Dict[str, Any]]:
        """Mock opportunities for testing"""
        return [
            {
                "id": "006000000000001",
                "name": "123 Main St Investment",
                "stageName": "Above the Funnel",
                "amount": 500000,
                "closeDate": "2024-12-31",
                "createdDate": "2024-01-01T00:00:00.000+0000",
                "loanType": "Fix and Flip Loan",
                "propertyAddress": "123 Main St, Anytown, CA 90210",
                "description": "Mock opportunity for testing",
                "loanAmount": 500000,
                "loanPurpose": "Investment",
                "propertyType": "Single Family",
                "propertyValue": 600000,
                "loanOfficer": {
                    "name": "Cody Sento",
                    "email": "cody.sento@ternus.com",
                    "phone": "(555) 123-4567"
                }
            }
        ]
    
    def _mock_create_opportunity_response(self) -> Dict[str, Any]:
        """Mock response for opportunity creation"""
        return {
            "success": True,
            "opportunityId": "006000000000001",
            "message": "Mock opportunity created successfully",
            "opportunityName": "Mock Opportunity",
            "fieldsCreated": ["Name", "StageName", "Amount", "CloseDate"]
        }
    
    def _mock_field_metadata(self) -> Dict[str, Any]:
        """Mock field metadata"""
        return {
            "success": True,
            "fields": {
                "Name": {"label": "Opportunity Name", "type": "string", "required": True},
                "StageName": {"label": "Stage", "type": "picklist", "required": True, "picklistValues": ["Above the Funnel", "Quote", "Application"]},
                "Amount": {"label": "Amount", "type": "currency", "required": False}
            }
        }
    
    def _mock_picklist_values(self, field_name: str) -> Dict[str, Any]:
        """Mock picklist values"""
        mock_values = {
            "StageName": ["Above the Funnel", "Quote", "Application", "Processing", "Underwriting", "Closed Won", "Closed Lost"],
            "Product__c": ["Fix and Flip Loan", "DSCR Loan", "Bridge Loan", "Construction Loan"]
        }
        
        return {
            "success": True,
            "field": field_name,
            "values": mock_values.get(field_name, [])
        } 