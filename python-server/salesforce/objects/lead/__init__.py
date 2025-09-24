"""
Lead Object Package
Handles all Lead-related Salesforce operations
"""

from .manager import LeadManager
from .operations import LeadOperations

__all__ = ['LeadManager', 'LeadOperations'] 