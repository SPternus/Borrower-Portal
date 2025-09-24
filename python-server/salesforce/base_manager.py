#!/usr/bin/env python3
"""
Base Manager for Salesforce Objects
Provides common functionality for all object managers
"""

import logging
from typing import Dict, List, Any, Optional
from simple_salesforce import SalesforceError
from .connection import SalesforceConnection

logger = logging.getLogger(__name__)

class BaseSalesforceManager:
    """Base class for all Salesforce object managers"""
    
    def __init__(self, sobject_type: str):
        """Initialize with SObject type"""
        self.sobject_type = sobject_type
        self.connection = SalesforceConnection()
    
    @property
    def is_connected(self) -> bool:
        """Check if connected to Salesforce"""
        return self.connection.is_connected
    
    @property
    def sobject(self):
        """Get the SObject instance"""
        if not self.is_connected:
            return None
        return self.connection.get_sobject(self.sobject_type)
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new record"""
        if not self.is_connected:
            return self._mock_create_response(data)
        
        try:
            # Remove None values
            clean_data = {k: v for k, v in data.items() if v is not None}
            result = self.sobject.create(clean_data)
            
            logger.info(f"✅ Created {self.sobject_type} record: {result['id']}")
            
            return {
                "success": True,
                "id": result["id"],
                "message": f"{self.sobject_type} created successfully"
            }
            
        except SalesforceError as e:
            logger.error(f"❌ Error creating {self.sobject_type}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "fallback": self._mock_create_response(data)
            }
    
    def get(self, record_id: str) -> Optional[Dict[str, Any]]:
        """Get a record by ID"""
        if not self.is_connected:
            return self._mock_get_response(record_id)
        
        try:
            result = self.sobject.get(record_id)
            return dict(result)
            
        except SalesforceError as e:
            logger.error(f"❌ Error fetching {self.sobject_type} {record_id}: {str(e)}")
            return self._mock_get_response(record_id)
    
    def update(self, record_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a record"""
        if not self.is_connected:
            return self._mock_update_response(record_id, data)
        
        try:
            # Remove None values and Id field
            clean_data = {k: v for k, v in data.items() if v is not None and k.lower() != 'id'}
            result = self.sobject.update(record_id, clean_data)
            
            logger.info(f"✅ Updated {self.sobject_type} record: {record_id}")
            
            return {
                "success": True,
                "id": record_id,
                "message": f"{self.sobject_type} updated successfully"
            }
            
        except SalesforceError as e:
            logger.error(f"❌ Error updating {self.sobject_type} {record_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "fallback": self._mock_update_response(record_id, data)
            }
    
    def delete(self, record_id: str) -> Dict[str, Any]:
        """Delete a record"""
        if not self.is_connected:
            return self._mock_delete_response(record_id)
        
        try:
            result = self.sobject.delete(record_id)
            
            logger.info(f"✅ Deleted {self.sobject_type} record: {record_id}")
            
            return {
                "success": True,
                "id": record_id,
                "message": f"{self.sobject_type} deleted successfully"
            }
            
        except SalesforceError as e:
            logger.error(f"❌ Error deleting {self.sobject_type} {record_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def query(self, soql: str) -> List[Dict[str, Any]]:
        """Execute SOQL query"""
        if not self.is_connected:
            return self._mock_query_response(soql)
        
        try:
            result = self.connection.query(soql)
            return result['records']
            
        except SalesforceError as e:
            logger.error(f"❌ Error executing query: {str(e)}")
            return self._mock_query_response(soql)
    
    # Mock methods for offline/testing mode
    def _mock_create_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mock response for create operation"""
        return {
            "success": True,
            "id": f"mock_{self.sobject_type}_{hash(str(data)) % 1000000}",
            "message": f"Mock {self.sobject_type} created"
        }
    
    def _mock_get_response(self, record_id: str) -> Dict[str, Any]:
        """Mock response for get operation"""
        return {
            "Id": record_id,
            "Name": f"Mock {self.sobject_type}",
            "CreatedDate": "2024-01-01T00:00:00.000+0000"
        }
    
    def _mock_update_response(self, record_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Mock response for update operation"""
        return {
            "success": True,
            "id": record_id,
            "message": f"Mock {self.sobject_type} updated"
        }
    
    def _mock_delete_response(self, record_id: str) -> Dict[str, Any]:
        """Mock response for delete operation"""
        return {
            "success": True,
            "id": record_id,
            "message": f"Mock {self.sobject_type} deleted"
        }
    
    def _mock_query_response(self, soql: str) -> List[Dict[str, Any]]:
        """Mock response for query operation"""
        return [
            {
                "Id": f"mock_{self.sobject_type}_001",
                "Name": f"Mock {self.sobject_type} 1"
            }
        ] 