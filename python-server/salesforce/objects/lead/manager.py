#!/usr/bin/env python3
"""
Lead Manager
Handles all Lead-related Salesforce operations
"""

import logging
from typing import Dict, List, Any, Optional
from ...base_manager import BaseSalesforceManager
from .operations import LeadOperations

logger = logging.getLogger(__name__)

class LeadManager(BaseSalesforceManager):
    """Manager for Lead operations in Salesforce"""
    
    def __init__(self):
        super().__init__('Lead')
        self.operations = LeadOperations(self)
    
    def create_from_form_data(self, form_data: Dict[str, Any], referrer_contact_id: str = None) -> Dict[str, Any]:
        """Create lead from referral form data"""
        return self.operations.create_from_form_data(form_data, referrer_contact_id)
    
    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find lead by email address"""
        return self.operations.find_by_email(email)
    
    def update_lead(self, lead_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update lead information"""
        return self.operations.update_lead(lead_id, update_data)
    
    def get_lead_details(self, lead_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed lead information"""
        return self.operations.get_lead_details(lead_id)
    
    def convert_lead(self, lead_id: str, conversion_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert lead to contact/account/opportunity"""
        return self.operations.convert_lead(lead_id, conversion_data) 