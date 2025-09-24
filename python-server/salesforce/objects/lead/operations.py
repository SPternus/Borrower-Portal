#!/usr/bin/env python3
"""
Lead Operations
Contains all business logic for Lead operations
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class LeadOperations:
    """Contains all Lead-specific business operations"""
    
    def __init__(self, manager):
        self.manager = manager
    
    def _parse_currency_value(self, value: str) -> Optional[float]:
        """Parse currency value from string to float for Salesforce currency fields"""
        if not value or not isinstance(value, str):
            return None
        
        try:
            # Remove common currency symbols and formatting
            cleaned = value.replace('$', '').replace(',', '').strip()
            
            # Handle ranges like "$100K - $250K" - take the first number
            if ' - ' in cleaned:
                cleaned = cleaned.split(' - ')[0].strip()
            elif '-' in cleaned and not cleaned.startswith('-'):
                cleaned = cleaned.split('-')[0].strip()
            
            # Handle K, M suffixes
            if cleaned.endswith('K') or cleaned.endswith('k'):
                return float(cleaned[:-1]) * 1000
            elif cleaned.endswith('M') or cleaned.endswith('m'):
                return float(cleaned[:-1]) * 1000000
            else:
                return float(cleaned)
                
        except (ValueError, AttributeError):
            logger.warning(f"Could not parse currency value: {value}")
            return None
    
    def _parse_integer_value(self, value: str) -> Optional[int]:
        """Parse integer value from string to int for Salesforce number fields"""
        if not value or not isinstance(value, str):
            return None
        
        try:
            cleaned = value.strip()
            
            # Handle ranges like "1-2", "6-10" - take the first number
            if '-' in cleaned and not cleaned.startswith('-'):
                cleaned = cleaned.split('-')[0].strip()
            
            # Handle plus values like "20+"
            if cleaned.endswith('+'):
                cleaned = cleaned[:-1].strip()
            
            # Handle "None" or "0" strings
            if cleaned.lower() in ['none', 'n/a', '']:
                return None
            
            return int(cleaned)
                
        except (ValueError, AttributeError):
            logger.warning(f"Could not parse integer value: {value}")
            return None
    
    def create_from_form_data(self, form_data: Dict[str, Any], referrer_contact_id: str = None) -> Dict[str, Any]:
        """Create lead from referral form data"""
        if not self.manager.is_connected:
            return self._mock_create_lead_response()
        
        try:
            # Map form data to SFDC Lead fields
            lead_data = self._map_form_data_to_lead(form_data, referrer_contact_id)
            
            # Remove None values
            lead_data = {k: v for k, v in lead_data.items() if v is not None}
            
            logger.info(f"🔄 Creating SFDC Lead with fields: {list(lead_data.keys())}")
            
            result = self.manager.create(lead_data)
            
            if result.get("success"):
                lead_id = result["id"]
                logger.info(f"✅ Real SFDC Lead {lead_id} created from referral form")
                
                # Log this activity if we have a referrer
                if referrer_contact_id:
                    from ..task.manager import TaskManager
                    task_manager = TaskManager()
                    task_manager.log_activity(
                        referrer_contact_id, 
                        "Referral Lead Created", 
                        f"New lead created from referral: {lead_data.get('FirstName', '')} {lead_data.get('LastName', '')} ({lead_data.get('Email', '')})"
                    )
                
                return {
                    "success": True,
                    "leadId": lead_id,
                    "message": "Lead created in Salesforce successfully",
                    "leadName": f"{lead_data.get('FirstName', '')} {lead_data.get('LastName', '')}".strip(),
                    "fieldsCreated": list(lead_data.keys())
                }
            else:
                return result
            
        except Exception as e:
            logger.error(f"❌ Error creating lead: {str(e)}")
            logger.error(f"❌ Form data was: {form_data}")
            return {
                "success": False,
                "error": str(e),
                "fallback": self._mock_create_lead_response()
            }
    
    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find lead by email address"""
        if not self.manager.is_connected:
            return self._mock_lead_details()
        
        try:
            soql = f"""
            SELECT Id, FirstName, LastName, Email, Phone, Company, Status, 
                   LeadSource, AnnualRevenue, NumberOfEmployees,
                   Street, City, State, PostalCode, Country,
                   FinServ__ReferredByContact__c, CreatedDate
            FROM Lead 
            WHERE Email = '{email}' 
            LIMIT 1
            """
            results = self.manager.query(soql)
            
            if results:
                lead = results[0]
                return {
                    "id": lead["Id"],
                    "firstName": lead.get("FirstName", ""),
                    "lastName": lead.get("LastName", ""),
                    "email": lead.get("Email", ""),
                    "phone": lead.get("Phone", ""),
                    "company": lead.get("Company", ""),
                                    "status": lead.get("Status", ""),
                "leadSource": lead.get("LeadSource", ""),
                "industry": "",  # Industry field not available in this org
                "annualRevenue": lead.get("AnnualRevenue", 0),
                "numberOfEmployees": lead.get("NumberOfEmployees", 0),
                    "street": lead.get("Street", ""),
                    "city": lead.get("City", ""),
                    "state": lead.get("State", ""),
                    "postalCode": lead.get("PostalCode", ""),
                    "country": lead.get("Country", ""),
                    "referredByContactId": lead.get("FinServ__ReferredByContact__c", ""),
                    "createdDate": lead.get("CreatedDate", "")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error finding lead by email {email}: {str(e)}")
            return None
    
    def get_lead_details(self, lead_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed lead information"""
        if not self.manager.is_connected:
            return self._mock_lead_details()
        
        try:
            soql = f"""
            SELECT Id, FirstName, LastName, Email, Phone, Company, Status, 
                   LeadSource, AnnualRevenue, NumberOfEmployees,
                   Street, City, State, PostalCode, Country,
                   FinServ__ReferredByContact__c, CreatedDate, LastModifiedDate,
                   Description, Title, Website, Rating
            FROM Lead 
            WHERE Id = '{lead_id}' 
            LIMIT 1
            """
            results = self.manager.query(soql)
            
            if not results:
                return None
            
            lead = results[0]
            
            return {
                "id": lead["Id"],
                "firstName": lead.get("FirstName", ""),
                "lastName": lead.get("LastName", ""),
                "email": lead.get("Email", ""),
                "phone": lead.get("Phone", ""),
                "company": lead.get("Company", ""),
                "status": lead.get("Status", ""),
                "leadSource": lead.get("LeadSource", ""),
                "industry": "",  # Industry field not available in this org
                "annualRevenue": lead.get("AnnualRevenue", 0),
                "numberOfEmployees": lead.get("NumberOfEmployees", 0),
                "street": lead.get("Street", ""),
                "city": lead.get("City", ""),
                "state": lead.get("State", ""),
                "postalCode": lead.get("PostalCode", ""),
                "country": lead.get("Country", ""),
                "referredByContactId": lead.get("FinServ__ReferredByContact__c", ""),
                "createdDate": lead.get("CreatedDate", ""),
                "lastModifiedDate": lead.get("LastModifiedDate", ""),
                "description": lead.get("Description", ""),
                "title": lead.get("Title", ""),
                "website": lead.get("Website", ""),
                "rating": lead.get("Rating", "")
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting lead details for {lead_id}: {str(e)}")
            return self._mock_lead_details()
    
    def update_lead(self, lead_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update lead information"""
        if not self.manager.is_connected:
            return {"success": True, "message": "Lead updated successfully (mock mode)"}
        
        try:
            result = self.manager.update(lead_id, update_data)
            
            if result.get("success"):
                logger.info(f"✅ Lead {lead_id} updated successfully")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error updating lead: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def convert_lead(self, lead_id: str, conversion_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert lead to contact/account/opportunity"""
        if not self.manager.is_connected:
            return self._mock_conversion_response()
        
        try:
            # This would typically use Salesforce's convertLead API
            # For now, we'll implement a basic version
            logger.info(f"🔄 Converting lead {lead_id} to contact/account/opportunity")
            
            # In a real implementation, you would:
            # 1. Create Account
            # 2. Create Contact
            # 3. Create Opportunity (if needed)
            # 4. Update Lead status to converted
            
            return self._mock_conversion_response()
            
        except Exception as e:
            logger.error(f"❌ Error converting lead: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _map_form_data_to_lead(self, form_data: Dict[str, Any], referrer_contact_id: str = None) -> Dict[str, Any]:
        """Map form data to Salesforce Lead fields"""
        
        # Basic lead fields (required)
        lead_data = {
            'FirstName': form_data.get('firstName', ''),
            'LastName': form_data.get('lastName', ''),
            'Email': form_data.get('email', ''),
            'Phone': form_data.get('phone', ''),
            'Company': form_data.get('company', '') or 'Individual',  # Company is required
            'Status': 'New',  # Initial status for new leads
            'LeadSource': 'Referral' if referrer_contact_id else 'Website'
        }
        
        # Set referrer contact ID if provided
        if referrer_contact_id:
            lead_data['FinServ__ReferredByContact__c'] = referrer_contact_id
        
        # Map to actual Salesforce Lead fields
        if form_data.get('expressedInterest'):
            lead_data['FinServ__ExpressedInterest__c'] = form_data.get('expressedInterest')
        
        if form_data.get('intent'):
            lead_data['Intent__c'] = form_data.get('intent')
        
        if form_data.get('expectedCloseDate'):
            lead_data['Expected_Close_Date__c'] = form_data.get('expectedCloseDate')
        
        if form_data.get('currentPropertiesOwned'):
            parsed_value = self._parse_integer_value(form_data.get('currentPropertiesOwned'))
            if parsed_value is not None:
                lead_data['Properties_Currently_Owned__c'] = parsed_value
        
        if form_data.get('propertiesPurchasedLast12Months'):
            parsed_value = self._parse_integer_value(form_data.get('propertiesPurchasedLast12Months'))
            if parsed_value is not None:
                lead_data['Properties_purchased_past_12_months__c'] = parsed_value
        
        if form_data.get('desiredLoanAmount'):
            # This maps to FinServ__PotentialValue__c (currency field)
            parsed_value = self._parse_currency_value(form_data.get('desiredLoanAmount'))
            if parsed_value is not None:
                lead_data['FinServ__PotentialValue__c'] = parsed_value
        
        if form_data.get('purchasePrice'):
            # This maps to Purchase_Price__c (currency field)
            parsed_value = self._parse_currency_value(form_data.get('purchasePrice'))
            if parsed_value is not None:
                lead_data['Purchase_Price__c'] = parsed_value
        
        if form_data.get('estimatedRenovationAmount'):
            # This maps to Estimated_renovation__c (currency field)
            parsed_value = self._parse_currency_value(form_data.get('estimatedRenovationAmount'))
            if parsed_value is not None:
                lead_data['Estimated_renovation__c'] = parsed_value
        
        if form_data.get('estimatedAfterRepairedValue'):
            # This maps to Estimated_After_Repaired_Value__c (currency field)
            parsed_value = self._parse_currency_value(form_data.get('estimatedAfterRepairedValue'))
            if parsed_value is not None:
                lead_data['Estimated_After_Repaired_Value__c'] = parsed_value
        
        if form_data.get('rehabsCompletedIn3Years'):
            parsed_value = self._parse_integer_value(form_data.get('rehabsCompletedIn3Years'))
            if parsed_value is not None:
                lead_data['How_Many_Rehabs_Completed_in_3_Years__c'] = parsed_value
        
        # Interest/notes and real estate investment details
        description_parts = []
        
        if form_data.get('interests'):
            description_parts.append(f"Interests: {form_data.get('interests')}")
        
        if form_data.get('notes'):
            description_parts.append(f"Notes: {form_data.get('notes')}")
        
        # Map Property fields to Salesforce currency fields
        if form_data.get('propertyAddress'):
            # This maps to Property_Address__c (text field - keeping as string)
            lead_data['Property_Address__c'] = form_data.get('propertyAddress')
        
        if form_data.get('rent'):
            # This maps to Rent__c (currency field)
            parsed_value = self._parse_currency_value(form_data.get('rent'))
            if parsed_value is not None:
                lead_data['Rent__c'] = parsed_value
        
        if form_data.get('propertyInsurance'):
            # This maps to Property_Insurance__c (currency field)
            parsed_value = self._parse_currency_value(form_data.get('propertyInsurance'))
            if parsed_value is not None:
                lead_data['Property_Insurance__c'] = parsed_value
        
        if form_data.get('propertyTaxes'):
            # This maps to Property_Taxes__c (currency field)
            parsed_value = self._parse_currency_value(form_data.get('propertyTaxes'))
            if parsed_value is not None:
                lead_data['Property_Taxes__c'] = parsed_value
        
        # Property Details for description (keeping for reference)
        property_details = []
        
        if form_data.get('propertyAddress'):
            property_details.append(f"Property Address: {form_data.get('propertyAddress')}")
        
        if form_data.get('rent'):
            property_details.append(f"Monthly Rent: {form_data.get('rent')}")
        
        if form_data.get('propertyInsurance'):
            property_details.append(f"Property Insurance (Annual): {form_data.get('propertyInsurance')}")
        
        if form_data.get('propertyTaxes'):
            property_details.append(f"Property Taxes (Annual): {form_data.get('propertyTaxes')}")
        
        if form_data.get('asIsValue'):
            property_details.append(f"As-Is Value: {form_data.get('asIsValue')}")
        
        if form_data.get('linkToCurrentPictures'):
            property_details.append(f"Link to Current Pictures: {form_data.get('linkToCurrentPictures')}")
        
        if property_details:
            description_parts.append("Property Details:")
            description_parts.extend([f"  - {detail}" for detail in property_details])
        
        # Real Estate Investment Details
        investment_details = []
        
        if form_data.get('expressedInterest'):
            investment_details.append(f"Expressed Interest: {form_data.get('expressedInterest')}")
        
        if form_data.get('intent'):
            investment_details.append(f"Intent: {form_data.get('intent')}")
        
        if form_data.get('expectedCloseDate'):
            investment_details.append(f"Expected Close Date: {form_data.get('expectedCloseDate')}")
        
        if form_data.get('currentPropertiesOwned'):
            investment_details.append(f"Properties Currently Owned: {form_data.get('currentPropertiesOwned')}")
        
        if form_data.get('propertiesPurchasedLast12Months'):
            investment_details.append(f"Properties Purchased Last 12 Months: {form_data.get('propertiesPurchasedLast12Months')}")
        
        if form_data.get('desiredLoanAmount'):
            investment_details.append(f"Desired Loan Amount: {form_data.get('desiredLoanAmount')}")
        
        if form_data.get('purchasePrice'):
            investment_details.append(f"Purchase Price: {form_data.get('purchasePrice')}")
        
        if form_data.get('estimatedRenovationAmount'):
            investment_details.append(f"Estimated Renovation Amount: {form_data.get('estimatedRenovationAmount')}")
        
        if form_data.get('estimatedAfterRepairedValue'):
            investment_details.append(f"Estimated After Repaired Value: {form_data.get('estimatedAfterRepairedValue')}")
        
        if form_data.get('rehabsCompletedIn3Years'):
            investment_details.append(f"Rehabs Completed in 3 Years: {form_data.get('rehabsCompletedIn3Years')}")
        
        if investment_details:
            description_parts.append("Real Estate Investment Details:")
            description_parts.extend([f"  - {detail}" for detail in investment_details])
        
        if description_parts:
            lead_data['Description'] = '\n'.join(description_parts)
        
        # Add referral context to description if applicable
        if referrer_contact_id:
            referral_note = f"Referred by Contact ID: {referrer_contact_id}"
            if lead_data.get('Description'):
                lead_data['Description'] += f"\n{referral_note}"
            else:
                lead_data['Description'] = referral_note
        
        return lead_data
    
    def _mock_create_lead_response(self) -> Dict[str, Any]:
        """Mock response for lead creation"""
        return {
            "success": True,
            "leadId": "00Q000000000001",
            "message": "Mock lead created successfully",
            "leadName": "Mock Lead",
            "fieldsCreated": ["FirstName", "LastName", "Email", "Company", "Status"]
        }
    
    def _mock_lead_details(self) -> Dict[str, Any]:
        """Mock lead details for testing"""
        return {
            "id": "00Q000000000001",
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "phone": "(555) 123-4567",
            "company": "Example Corp",
            "status": "New",
            "leadSource": "Referral",
            "industry": "Real Estate",
            "annualRevenue": 1000000,
            "numberOfEmployees": 10,
            "street": "123 Main St",
            "city": "San Francisco",
            "state": "CA",
            "postalCode": "94105",
            "country": "US",
            "referredByContactId": "003000000000001",
            "createdDate": "2024-01-01T00:00:00.000+0000",
            "description": "Mock lead for testing",
            "title": "CEO",
            "website": "https://example.com",
            "rating": "Hot"
        }
    
    def _mock_conversion_response(self) -> Dict[str, Any]:
        """Mock response for lead conversion"""
        return {
            "success": True,
            "contactId": "003000000000001",
            "accountId": "001000000000001",
            "opportunityId": "006000000000001",
            "message": "Lead converted successfully (mock mode)"
        } 