"""
Contact Object Package
Handles all Contact-related Salesforce operations
"""

from .manager import ContactManager
from .operations import ContactOperations

__all__ = ['ContactManager', 'ContactOperations'] 