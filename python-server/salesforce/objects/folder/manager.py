"""
Folder Manager for Salesforce Folder_instance operations
"""

import logging
from typing import Dict, List, Any, Optional
from salesforce.base_manager import BaseSalesforceManager
from .operations import FolderOperations

logger = logging.getLogger(__name__)

class FolderManager(BaseSalesforceManager):
    """
    Manager for Salesforce Folder_instance operations
    
    Handles the new folder structure with:
    - Hierarchical folder organization (parent-child relationships)
    - Instance ID connections to file_folder objects
    - Proper folder structure for file uploads
    """
    
    def __init__(self, connection=None):
        super().__init__(connection)
        self.operations = FolderOperations(self.connection)
        logger.info("✅ FolderManager initialized")
    
    def get_folder_hierarchy(self, opportunity_id: str, loan_type: str = None) -> List[Dict[str, Any]]:
        """Get complete folder hierarchy for an opportunity"""
        return self.operations.get_folder_hierarchy(opportunity_id, loan_type)
    
    def create_folder_structure(self, opportunity_id: str, loan_type: str) -> Dict[str, Any]:
        """Create complete folder structure for an opportunity based on loan type"""
        return self.operations.create_folder_structure(opportunity_id, loan_type)
    
    def get_folder_by_instance_id(self, instance_id: str) -> Optional[Dict[str, Any]]:
        """Get folder details by instance ID"""
        return self.operations.get_folder_by_instance_id(instance_id)
    
    def create_folder(self, folder_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new folder instance"""
        return self.operations.create_folder(folder_data)
    
    def update_folder(self, folder_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update folder details"""
        return self.operations.update_folder(folder_id, update_data)
    
    def get_upload_folder(self, opportunity_id: str, category: str, requirement_name: str = None) -> Optional[Dict[str, Any]]:
        """Get the appropriate folder for file upload based on category and requirement"""
        return self.operations.get_upload_folder(opportunity_id, category, requirement_name)
    
    def link_file_to_folder(self, file_id: str, folder_instance_id: str, file_metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Link an uploaded file to a specific folder instance"""
        return self.operations.link_file_to_folder(file_id, folder_instance_id, file_metadata)
    
    def get_folder_files(self, folder_instance_id: str) -> List[Dict[str, Any]]:
        """Get all files in a specific folder instance"""
        return self.operations.get_folder_files(folder_instance_id)
