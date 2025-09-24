#!/usr/bin/env python3
"""
User Manager
Extends BaseManager for User-specific functionality
"""

import logging
from typing import Dict, Any, Optional, List
from salesforce.base_manager import BaseSalesforceManager
from .operations import UserOperations

logger = logging.getLogger(__name__)

class UserManager(BaseSalesforceManager):
    """Manages Salesforce User objects with specific operations"""
    
    def __init__(self, sf_connection):
        super().__init__('User')
        self.operations = UserOperations(self)
        logger.info("✅ User Manager initialized")
    
    def get_user_details(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed user information"""
        return self.operations.get_user_details(user_id)
    
    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find user by email address"""
        return self.operations.find_by_email(email)
    
    def get_users_by_ids(self, user_ids: List[str]) -> List[Dict[str, Any]]:
        """Get multiple users by their IDs"""
        return self.operations.get_users_by_ids(user_ids) 