"""
Opportunity Object Package
Handles all Opportunity-related Salesforce operations
"""

from .manager import OpportunityManager
from .operations import OpportunityOperations

__all__ = ['OpportunityManager', 'OpportunityOperations'] 