"""
Ternus Salesforce Integration Package
Modular architecture for Salesforce operations
"""

from .connection import SalesforceConnection
from .objects.contact.manager import ContactManager
from .objects.opportunity.manager import OpportunityManager
from .objects.task.manager import TaskManager
from .objects.invitation.manager import InvitationManager
from .objects.folder.manager import FolderManager

__all__ = [
    'SalesforceConnection',
    'ContactManager',
    'OpportunityManager', 
    'TaskManager',
    'InvitationManager',
    'FolderManager'
] 