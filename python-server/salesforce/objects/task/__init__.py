"""
Task Object Package
Handles all Task-related Salesforce operations (Activity logging)
"""

from .manager import TaskManager
from .operations import TaskOperations

__all__ = ['TaskManager', 'TaskOperations'] 