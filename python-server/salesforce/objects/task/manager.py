#!/usr/bin/env python3
"""
Task Manager
Handles all Task-related Salesforce operations (Activity logging)
"""

import logging
from typing import Dict, List, Any, Optional
from ...base_manager import BaseSalesforceManager
from .operations import TaskOperations

logger = logging.getLogger(__name__)

class TaskManager(BaseSalesforceManager):
    """Manager for Task operations in Salesforce"""
    
    def __init__(self):
        super().__init__('Task')
        self.operations = TaskOperations(self)
    
    def log_activity(self, contact_id: str, activity_type: str, description: str) -> Dict[str, Any]:
        """Log activity to Salesforce"""
        return self.operations.log_activity(contact_id, activity_type, description)
    
    def get_activities_for_contact(self, contact_id: str) -> List[Dict[str, Any]]:
        """Get all activities for a contact"""
        return self.operations.get_activities_for_contact(contact_id)
    
    def create_follow_up_task(self, contact_id: str, subject: str, due_date: str) -> Dict[str, Any]:
        """Create a follow-up task"""
        return self.operations.create_follow_up_task(contact_id, subject, due_date)
    
    def _mock_create_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Override mock response for tasks"""
        return {
            "success": True,
            "id": f"00T000000000001",
            "message": "Activity logged successfully (mock mode)"
        } 