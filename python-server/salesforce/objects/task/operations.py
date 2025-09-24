#!/usr/bin/env python3
"""
Task Operations
Contains all business logic for Task operations (Activity logging)
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class TaskOperations:
    """Contains all Task-specific business operations"""
    
    def __init__(self, manager):
        self.manager = manager
    
    def log_activity(self, contact_id: str, activity_type: str, description: str) -> Dict[str, Any]:
        """Log activity to Salesforce"""
        if not self.manager.is_connected:
            return self._mock_activity_response()
        
        try:
            # Create a Task record in Salesforce
            task_data = {
                'WhoId': contact_id,
                'Subject': activity_type,
                'Description': description,
                'Status': 'Completed',
                'ActivityDate': datetime.now().date().isoformat(),
                'Type': 'Portal Activity'
            }
            
            result = self.manager.create(task_data)
            
            if result.get("success"):
                logger.info(f"📊 Activity logged to SFDC: {activity_type} for {contact_id}")
                
                return {
                    "success": True,
                    "activityId": result["id"],
                    "message": "Activity logged to Salesforce successfully"
                }
            else:
                return result
            
        except Exception as e:
            logger.error(f"❌ Error logging activity: {str(e)}")
            return self._mock_activity_response()
    
    def get_activities_for_contact(self, contact_id: str) -> List[Dict[str, Any]]:
        """Get all activities for a contact"""
        if not self.manager.is_connected:
            return self._mock_activities()
        
        try:
            soql = f"""
            SELECT Id, Subject, Description, ActivityDate, Status, Type, CreatedDate
            FROM Task 
            WHERE WhoId = '{contact_id}'
            ORDER BY CreatedDate DESC
            LIMIT 50
            """
            
            results = self.manager.query(soql)
            activities = []
            
            for task in results:
                activities.append({
                    "id": task["Id"],
                    "subject": task.get("Subject", ""),
                    "description": task.get("Description", ""),
                    "activityDate": task.get("ActivityDate", ""),
                    "status": task.get("Status", ""),
                    "type": task.get("Type", ""),
                    "createdDate": task.get("CreatedDate", "")
                })
            
            return activities
            
        except Exception as e:
            logger.error(f"❌ Error fetching activities for {contact_id}: {str(e)}")
            return self._mock_activities()
    
    def create_follow_up_task(self, contact_id: str, subject: str, due_date: str) -> Dict[str, Any]:
        """Create a follow-up task"""
        if not self.manager.is_connected:
            return self._mock_activity_response()
        
        try:
            task_data = {
                'WhoId': contact_id,
                'Subject': subject,
                'Status': 'Not Started',
                'ActivityDate': due_date,
                'Type': 'Follow Up',
                'Priority': 'Normal'
            }
            
            result = self.manager.create(task_data)
            
            if result.get("success"):
                logger.info(f"📅 Follow-up task created for {contact_id}: {subject}")
                
                return {
                    "success": True,
                    "taskId": result["id"],
                    "message": "Follow-up task created successfully"
                }
            else:
                return result
            
        except Exception as e:
            logger.error(f"❌ Error creating follow-up task: {str(e)}")
            return self._mock_activity_response()
    
    def _mock_activity_response(self) -> Dict[str, Any]:
        """Mock response for activity logging"""
        return {
            "success": True,
            "activityId": "00T000000000001",
            "message": "Activity logged successfully (mock mode)"
        }
    
    def _mock_activities(self) -> List[Dict[str, Any]]:
        """Mock activities for testing"""
        return [
            {
                "id": "00T000000000001",
                "subject": "Application Submitted",
                "description": "New loan application created via portal",
                "activityDate": "2024-01-01",
                "status": "Completed",
                "type": "Portal Activity",
                "createdDate": "2024-01-01T00:00:00.000+0000"
            },
            {
                "id": "00T000000000002",
                "subject": "Portal Access Granted",
                "description": "User granted access to borrower portal",
                "activityDate": "2024-01-01",
                "status": "Completed",
                "type": "Portal Activity",
                "createdDate": "2024-01-01T00:00:00.000+0000"
            }
        ] 