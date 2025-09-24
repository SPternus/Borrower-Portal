"""
Invitation Object Package
Handles all Portal Invitation-related Salesforce operations
"""

from .manager import InvitationManager
from .operations import InvitationOperations

__all__ = ['InvitationManager', 'InvitationOperations'] 