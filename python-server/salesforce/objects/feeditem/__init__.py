#!/usr/bin/env python3
"""
FeedItem Object Package
Manages Salesforce FeedItem (Chatter) objects and operations
"""

from .manager import FeedItemManager
from .operations import FeedItemOperations

__all__ = ['FeedItemManager', 'FeedItemOperations'] 