#!/usr/bin/env python3
"""
Opportunity Manager
Handles all Opportunity-related Salesforce operations
"""

import logging
from typing import Dict, List, Any, Optional
from ...base_manager import BaseSalesforceManager
from .operations import OpportunityOperations

logger = logging.getLogger(__name__)

class OpportunityManager(BaseSalesforceManager):
    """Manager for Opportunity operations in Salesforce"""
    
    def __init__(self):
        super().__init__('Opportunity')
        self.operations = OpportunityOperations(self)
    
    def get_opportunities_for_contact(self, contact_id: str) -> List[Dict[str, Any]]:
        """Get all opportunities for a contact"""
        return self.operations.get_opportunities_for_contact(contact_id)
    
    def create_from_form_data(self, contact_id: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create opportunity from application form data"""
        return self.operations.create_from_form_data(contact_id, form_data)
    
    def update_stage(self, opportunity_id: str, stage_name: str) -> Dict[str, Any]:
        """Update opportunity stage"""
        return self.operations.update_stage(opportunity_id, stage_name)
    
    def get_opportunity_fields(self) -> Dict[str, Any]:
        """Get opportunity field metadata"""
        return self.operations.get_opportunity_fields()
    
    def get_picklist_values(self, field_name: str) -> Dict[str, Any]:
        """Get picklist values for a field"""
        return self.operations.get_picklist_values(field_name)
    
    def _mock_query_response(self, soql: str) -> List[Dict[str, Any]]:
        """Override mock response for opportunities"""
        return [
            {
                "Id": "006000000000001",
                "Name": "123 Main St Investment",
                "StageName": "Above the Funnel",
                "Amount": 500000,
                "CloseDate": "2024-12-31",
                "CreatedDate": "2024-01-01T00:00:00.000+0000",
                "Product__c": "Fix and Flip Loan",
                "Property_Addresses__c": "123 Main St, Anytown, CA 90210",
                "Desired_Loan_Amount__c": 500000
            }
        ] 