"""
Task management routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
import logging
from typing import Dict, Any, List
from salesforce.objects.task_custom import TaskManager

logger = logging.getLogger(__name__)


def configure_task_routes(auth_service, sfdc_connector):
    """Configure task management routes"""
    router = APIRouter()
    task_manager = TaskManager()

    @router.get("/opportunities/{opportunity_id}/tasks")
    async def get_opportunity_tasks(opportunity_id: str):
        """Get all tasks for an opportunity"""
        try:
            logger.info(f"📋 Getting tasks for opportunity: {opportunity_id}")
            logger.info(f"📋 Salesforce connection status: {sfdc_connector.connected}")

            tasks = task_manager.get_tasks_for_opportunity(opportunity_id)
            logger.info(f"📋 Retrieved {len(tasks)} tasks from Salesforce")

            summary = task_manager.get_task_summary(opportunity_id)
            logger.info(f"📋 Generated summary: {summary}")

            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "tasks": tasks,
                "summary": summary,
                "total_tasks": len(tasks)
            }
        except Exception as e:
            logger.error(f"❌ Error getting tasks for opportunity: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get tasks: {str(e)}")

    @router.post("/opportunities/{opportunity_id}/tasks")
    async def create_task(
        opportunity_id: str,
        task_data: Dict[str, Any]
    ):
        """Create a new task"""
        try:
            logger.info(f"📋 Creating task for opportunity: {opportunity_id}")
            logger.info(f"Task data: {task_data}")
            
            # Extract auth info from request body
            auth0_user_id = task_data.get("auth0_user_id")
            email = task_data.get("email")
            
            logger.info(f"📋 User: {auth0_user_id}, Email: {email}")
            
            # Validate required fields
            required_fields = ["name", "description", "auth0_user_id", "email"]
            for field in required_fields:
                if field not in task_data:
                    raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
            
            result = task_manager.create_task(opportunity_id, task_data)
            
            if result.get("success"):
                logger.info(f"✅ Task created successfully: {result['taskId']}")
                return result
            else:
                raise HTTPException(status_code=500, detail=result.get("error", "Failed to create task"))
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error creating task: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

    @router.get("/tasks/{task_id}")
    async def get_task_details(task_id: str):
        """Get detailed information for a specific task"""
        try:
            logger.info(f"📋 Getting task details: {task_id}")
            
            # Get task details using the base manager
            task = task_manager.get(task_id)
            
            if not task:
                raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")
            
            return {
                "success": True,
                "task": task
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error getting task details: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get task details: {str(e)}")

    @router.put("/tasks/{task_id}/status")
    async def update_task_status(
        task_id: str,
        status_data: Dict[str, Any]
    ):
        """Update task status (complete, start, hold, etc.)"""
        try:
            logger.info(f"📋 Updating task status: {task_id}")
            
            status = status_data.get("status")
            completion_notes = status_data.get("completionNotes", "")
            
            if not status:
                raise HTTPException(status_code=400, detail="Status is required")
            
            # Validate status values
            valid_statuses = ["not started", "in progress", "completed", "on hold", "cancelled"]
            if status.lower() not in valid_statuses:
                raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
            
            result = task_manager.update_task_status(task_id, status, completion_notes)
            
            if result.get("success"):
                logger.info(f"✅ Task status updated successfully: {task_id}")
                return result
            else:
                raise HTTPException(status_code=500, detail=result.get("error", "Failed to update task status"))
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error updating task status: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to update task status: {str(e)}")

    @router.get("/opportunities/{opportunity_id}/tasks/summary")
    async def get_task_summary(opportunity_id: str):
        """Get task summary statistics for an opportunity"""
        try:
            logger.info(f"📋 Getting task summary for opportunity: {opportunity_id}")
            
            summary = task_manager.get_task_summary(opportunity_id)
            
            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "summary": summary
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting task summary: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get task summary: {str(e)}")

    @router.get("/opportunities/{opportunity_id}/tasks/by-category")
    async def get_tasks_by_category(opportunity_id: str):
        """Get tasks grouped by category for an opportunity"""
        try:
            logger.info(f"📋 Getting tasks by category for opportunity: {opportunity_id}")
            
            tasks = task_manager.get_tasks_for_opportunity(opportunity_id)
            
            # Group tasks by category
            tasks_by_category = {}
            for task in tasks:
                category = task.get("taskCategory", "Uncategorized")
                if category not in tasks_by_category:
                    tasks_by_category[category] = []
                tasks_by_category[category].append(task)
            
            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "tasks_by_category": tasks_by_category,
                "categories": list(tasks_by_category.keys())
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting tasks by category: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get tasks by category: {str(e)}")

    @router.get("/opportunities/{opportunity_id}/tasks/overdue")
    async def get_overdue_tasks(opportunity_id: str):
        """Get overdue tasks for an opportunity"""
        try:
            logger.info(f"📋 Getting overdue tasks for opportunity: {opportunity_id}")
            
            tasks = task_manager.get_tasks_for_opportunity(opportunity_id)
            
            # Filter overdue tasks
            from datetime import datetime
            overdue_tasks = []
            for task in tasks:
                if (task.get("dueDate") and 
                    task.get("status", "").lower() != "completed" and
                    datetime.strptime(task["dueDate"], "%Y-%m-%d").date() < datetime.now().date()):
                    overdue_tasks.append(task)
            
            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "overdue_tasks": overdue_tasks,
                "count": len(overdue_tasks)
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting overdue tasks: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get overdue tasks: {str(e)}")

    return router
