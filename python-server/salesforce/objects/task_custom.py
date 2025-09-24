"""
Task management for Salesforce Task__c object
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from ..base_manager import BaseSalesforceManager

logger = logging.getLogger(__name__)


class TaskManager(BaseSalesforceManager):
    """Manager for Salesforce Task__c operations"""
    
    def __init__(self):
        super().__init__('LoanTask__c')
        self.operations = TaskOperations(self)
        
    
    def get_tasks_for_opportunity(self, opportunity_id: str) -> List[Dict[str, Any]]:
        """Get all tasks for an opportunity"""
        return self.operations.get_tasks_for_opportunity(opportunity_id)
    
    def create_task(self, opportunity_id: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task"""
        return self.operations.create_task(opportunity_id, task_data)
    
    def update_task_status(self, task_id: str, status: str, completion_notes: str = None) -> Dict[str, Any]:
        """Update task status"""
        return self.operations.update_task_status(task_id, status, completion_notes)
    
    def get_task_summary(self, opportunity_id: str) -> Dict[str, Any]:
        """Get task summary statistics for an opportunity"""
        return self.operations.get_task_summary(opportunity_id)
    


class TaskOperations:
    """Operations for Task__c object"""
    
    def __init__(self, manager):
        self.manager = manager
    
    def get_tasks_for_opportunity(self, opportunity_id: str) -> List[Dict[str, Any]]:
        """Get all tasks for an opportunity"""
        try:
            if not self.manager.is_connected:
                logger.warning("⚠️ Salesforce not connected, attempting to reconnect...")
                self.manager.connection.reconnect()

            if not self.manager.is_connected:
                logger.error("❌ Cannot connect to Salesforce")
                raise Exception("Failed to connect to Salesforce")

            # SOQL query to get tasks for opportunity - using actual field names
            soql = f"""
            SELECT Id, Name, Opportunity__c, Status__c, Priority__c, Due_Date__c, 
                   Completion_Date__c, Description__c, Task_Category__c, Assignment_Type__c,
                   Assigned_To__c, Assigned_Contact__c, Completed_By_Contact__c,
                   Borrower_Instructions__c, Borrower_Notes__c, Completion_Notes__c,
                   Department__c, Loan_Stage__c, Estimated_Hours__c, 
                   Required_For_Stage__c, Requires_Upload__c, Visible_To_Borrower__c,
                   Document_Category__c, Required_Folder__c, Folder_Instance__c,
                   Task_Template_Id__c, CreatedById, LastModifiedById, OwnerId
            FROM LoanTask__c 
            WHERE Opportunity__c = '{opportunity_id}'
            ORDER BY Due_Date__c ASC, Priority__c DESC
            """
            
            logger.info(f"🔍 Executing SOQL query for tasks: {soql}")
            query_result = self.manager.connection.query(soql)
            
            if not query_result or 'records' not in query_result:
                logger.warning(f"⚠️ No records returned for opportunity {opportunity_id}")
                return []

            results = query_result['records']
            tasks = []
            
            logger.info(f"📊 Found {len(results)} Task__c records for opportunity {opportunity_id}")
            
            for task in results:
                formatted_task = {
                    "id": task["Id"],
                    "name": task["Name"],
                    "opportunityId": task["Opportunity__c"],
                    "status": self._normalize_status(task["Status__c"]),
                    "priority": task["Priority__c"] or "Medium",
                    "dueDate": task["Due_Date__c"],
                    "completionDate": task["Completion_Date__c"],
                    "description": task["Description__c"] or "",
                    "taskCategory": task["Task_Category__c"] or "",
                    "assignmentType": task["Assignment_Type__c"] or "",
                    "assignedTo": task["Assigned_To__c"],
                    "assignedContact": task["Assigned_Contact__c"],
                    "completedByContact": task["Completed_By_Contact__c"],
                    "borrowerInstructions": task["Borrower_Instructions__c"] or "",
                    "borrowerNotes": task["Borrower_Notes__c"] or "",
                    "completionNotes": task["Completion_Notes__c"] or "",
                    "department": task["Department__c"] or "",
                    "loanStage": task["Loan_Stage__c"] or "",
                    "estimatedHours": float(task["Estimated_Hours__c"] or 0),
                    "requiredForStage": task["Required_For_Stage__c"] or False,
                    "requiresUpload": task["Requires_Upload__c"] or False,
                    "visibleToBorrower": task["Visible_To_Borrower__c"] or False,
                    "documentCategory": task["Document_Category__c"] or "",
                    "requiredFolder": task["Required_Folder__c"],
                    "folderInstance": task["Folder_Instance__c"],
                    "taskTemplateId": task["Task_Template_Id__c"] or "",
                    "createdById": task["CreatedById"],
                    "lastModifiedById": task["LastModifiedById"],
                    "ownerId": task["OwnerId"]
                }
                tasks.append(formatted_task)

            logger.info(f"✅ Retrieved {len(tasks)} tasks for opportunity {opportunity_id}")
            return tasks

        except Exception as e:
            logger.error(f"❌ Error getting tasks for opportunity {opportunity_id}: {str(e)}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            logger.error(f"❌ Salesforce connected: {self.manager.is_connected}")
            raise Exception(f"Failed to fetch LoanTask__c records from Salesforce: {str(e)}")
    
    def create_task(self, opportunity_id: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new task"""
        if not self.manager.is_connected:
            return self._mock_create_task()
        
        try:
            # Get current user ID from auth information
            current_user_id = self._get_salesforce_user_id(task_data.get("auth0_user_id"), task_data.get("email"))
            
            # Prepare task data for Salesforce using correct field names
            sf_data = {
                "Name": task_data.get("name", "New Task"),
                "Opportunity__c": opportunity_id,
                "Description__c": task_data.get("description", ""),
                "Status__c": "Not Started",
                "Priority__c": task_data.get("priority", "Medium"),
                "Due_Date__c": task_data.get("dueDate"),
                "Task_Category__c": task_data.get("taskCategory", ""),
                "Assignment_Type__c": task_data.get("assignmentType", "Internal"),
                "Assigned_To__c": current_user_id,
                "Department__c": task_data.get("department", ""),
                "Estimated_Hours__c": float(task_data.get("estimatedHours", 0)),
                "Required_For_Stage__c": task_data.get("requiredForStage", False),
                "Requires_Upload__c": task_data.get("requiresUpload", False),
                "Visible_To_Borrower__c": task_data.get("visibleToBorrower", False),
                "OwnerId": current_user_id
            }
            
            logger.info(f"🔍 Attempting to create Task__c with data: {sf_data}")
            result = self.manager.create(sf_data)
            logger.info(f"🔍 Salesforce create result: {result}")
            
            if result.get("success"):
                logger.info(f"✅ Created task: {result['id']}")
                return {
                    "success": True,
                    "taskId": result["id"],
                    "message": "Task created successfully"
                }
            else:
                logger.error(f"❌ Salesforce create failed: {result}")
                return {
                    "success": False,
                    "error": result.get("error", "Failed to create task")
                }
                
        except Exception as e:
            logger.error(f"❌ Error creating task: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_salesforce_user_id(self, auth0_user_id: str, email: str) -> str:
        """Get Salesforce User ID from auth0 user ID and email"""
        try:
            # Import auth service to get contact mapping
            from auth_service import TernusAuthService
            auth_service = TernusAuthService()
            
            # Get contact ID from user mapping
            user_mapping = auth_service.get_user_by_auth0_id(auth0_user_id, email)
            if not user_mapping or not user_mapping.get('salesforce_contact_id'):
                logger.warning(f"⚠️ No user mapping found for Auth0 user: {auth0_user_id}")
                return "005000000000001"  # Fallback to default user
            
            contact_id = user_mapping['salesforce_contact_id']
            logger.info(f"📝 Found contact ID for user {auth0_user_id}: {contact_id}")
            
            # Query Salesforce to get the User ID associated with this contact
            contact_query = f"""
            SELECT Id, OwnerId, Owner.Id 
            FROM Contact 
            WHERE Id = '{contact_id}'
            LIMIT 1
            """
            
            logger.info(f"🔍 Querying contact owner: {contact_query}")
            query_result = self.manager.connection.query(contact_query)
            
            if query_result and query_result.get('records'):
                contact = query_result['records'][0]
                owner_id = contact.get('OwnerId')
                if owner_id:
                    logger.info(f"✅ Found Salesforce User ID: {owner_id}")
                    return owner_id
            
            logger.warning(f"⚠️ Could not find User ID for contact {contact_id}, using default")
            return "005000000000001"  # Fallback to default user
            
        except Exception as e:
            logger.error(f"❌ Error getting Salesforce User ID: {str(e)}")
            return "005000000000001"  # Fallback to default user
    
    def update_task_status(self, task_id: str, status: str, completion_notes: str = None) -> Dict[str, Any]:
        """Update task status"""
        if not self.manager.is_connected:
            return {"success": True, "message": "Mock update successful"}
        
        try:
            update_data = {
                "Status__c": status
            }
            
            if status.lower() == "completed":
                update_data["Completion_Date__c"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000+0000")
            
            if completion_notes:
                update_data["Completion_Notes__c"] = completion_notes
            
            result = self.manager.update(task_id, update_data)
            
            if result.get("success"):
                logger.info(f"✅ Updated task {task_id} status to {status}")
                return {
                    "success": True,
                    "message": f"Task status updated to {status}"
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Failed to update task status")
                }
                
        except Exception as e:
            logger.error(f"❌ Error updating task status: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_task_summary(self, opportunity_id: str) -> Dict[str, Any]:
        """Get task summary statistics for an opportunity"""
        try:
            tasks = self.get_tasks_for_opportunity(opportunity_id)
            
            total_tasks = len(tasks)
            completed_tasks = len([t for t in tasks if t["status"].lower() == "completed"])
            in_progress_tasks = len([t for t in tasks if t["status"].lower() == "in progress"])
            overdue_tasks = len([t for t in tasks if t["dueDate"] and 
                               datetime.strptime(t["dueDate"], "%Y-%m-%d").date() < datetime.now().date() and 
                               t["status"].lower() != "completed"])
            
            return {
                "totalTasks": total_tasks,
                "completedTasks": completed_tasks,
                "inProgressTasks": in_progress_tasks,
                "overdueTasks": overdue_tasks,
                "completionRate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting task summary: {str(e)}")
            return {
                "totalTasks": 0,
                "completedTasks": 0,
                "inProgressTasks": 0,
                "overdueTasks": 0,
                "completionRate": 0
            }
    
    def _normalize_status(self, status: str) -> str:
        """Normalize status values"""
        if not status:
            return "Not Started"
        
        status_mapping = {
            "not started": "Not Started",
            "in progress": "In Progress", 
            "completed": "Completed",
            "on hold": "On Hold",
            "cancelled": "Cancelled"
        }
        
        return status_mapping.get(status.lower(), status)
    
    def _mock_create_task(self) -> Dict[str, Any]:
        """Mock task creation response"""
        return {
            "success": True,
            "taskId": "a0T000000000001",
            "message": "Task created successfully (mock mode)"
        }
