#!/usr/bin/env python3
"""
FeedItem Manager
Extends BaseManager for FeedItem (Chatter) specific functionality
"""

import logging
from typing import Dict, Any, Optional, List
from salesforce.base_manager import BaseSalesforceManager
from .operations import FeedItemOperations

logger = logging.getLogger(__name__)

class FeedItemManager(BaseSalesforceManager):
    """Manages Salesforce FeedItem (Chatter) objects with specific operations"""
    
    def __init__(self, sf_connection):
        super().__init__('FeedItem')
        self.operations = FeedItemOperations(self)
        logger.info("✅ FeedItem Manager initialized")
    
    def post_message(self, parent_id: str, message: str, mentioned_user_ids: List[str] = None) -> Dict[str, Any]:
        """Post a Chatter message with optional user mentions"""
        return self.operations.post_message(parent_id, message, mentioned_user_ids)
    
    def get_feed_items(self, parent_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get feed items for a specific record"""
        return self.operations.get_feed_items(parent_id, limit)
    
    def get_contact_feed(self, contact_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get feed items specifically for a contact"""
        return self.operations.get_contact_feed(contact_id, limit) 