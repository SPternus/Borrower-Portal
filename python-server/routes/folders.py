"""
Folder Management API Routes
Handles Folder_instance operations for the new hierarchical folder structure
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

def configure_folder_routes(auth_service, sfdc_connector):
    """Configure folder management routes"""
    router = APIRouter()
    
    @router.get("/opportunities/{opportunity_id}/folders")
    async def get_folder_hierarchy(
        opportunity_id: str,
        loan_type: Optional[str] = Query(None, description="Filter by loan type")
    ):
        """Get complete folder hierarchy for an opportunity"""
        try:
            logger.info(f"📁 Getting folder hierarchy for opportunity: {opportunity_id}")
            
            # Get folder hierarchy using the new FolderManager
            folders = sfdc_connector.folder_manager.get_folder_hierarchy(opportunity_id, loan_type)
            
            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "loan_type": loan_type,
                "folder_count": len(folders),
                "folders": folders
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting folder hierarchy: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get folder hierarchy: {str(e)}")
    
    @router.post("/opportunities/{opportunity_id}/folders/create-structure")
    async def create_folder_structure(
        opportunity_id: str,
        loan_type: str
    ):
        """Create complete folder structure for an opportunity based on loan type"""
        try:
            logger.info(f"📁 Creating folder structure for opportunity: {opportunity_id}, loan type: {loan_type}")
            
            # Create folder structure using the new FolderManager
            result = sfdc_connector.folder_manager.create_folder_structure(opportunity_id, loan_type)
            
            if result.get('success'):
                logger.info(f"✅ Created {result['folders_created']} folders for opportunity {opportunity_id}")
                return result
            else:
                raise HTTPException(status_code=500, detail="Failed to create folder structure")
            
        except Exception as e:
            logger.error(f"❌ Error creating folder structure: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to create folder structure: {str(e)}")
    
    @router.get("/folders/instance/{instance_id}")
    async def get_folder_by_instance_id(instance_id: str):
        """Get folder details by instance ID"""
        try:
            logger.info(f"📁 Getting folder by instance ID: {instance_id}")
            
            folder = sfdc_connector.folder_manager.get_folder_by_instance_id(instance_id)
            
            if folder:
                return {
                    "success": True,
                    "folder": folder
                }
            else:
                raise HTTPException(status_code=404, detail=f"Folder not found with instance ID: {instance_id}")
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error getting folder by instance ID: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get folder: {str(e)}")
    
    @router.get("/opportunities/{opportunity_id}/folders/upload-target")
    async def get_upload_folder(
        opportunity_id: str,
        category: str = Query(..., description="Document category"),
        requirement_name: Optional[str] = Query(None, description="Specific requirement name")
    ):
        """Get the appropriate folder for file upload based on category and requirement"""
        try:
            logger.info(f"📁 Getting upload folder for opportunity: {opportunity_id}, category: {category}")
            
            folder = sfdc_connector.folder_manager.get_upload_folder(opportunity_id, category, requirement_name)
            
            if folder:
                return {
                    "success": True,
                    "upload_folder": folder
                }
            else:
                # If no specific folder found, we might need to create one or use a default
                logger.warning(f"⚠️ No upload folder found for category: {category}")
                raise HTTPException(
                    status_code=404, 
                    detail=f"No upload folder found for category: {category}. Please create folder structure first."
                )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error getting upload folder: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get upload folder: {str(e)}")
    
    @router.post("/folders/{folder_instance_id}/link-file")
    async def link_file_to_folder(
        folder_instance_id: str,
        file_data: Dict[str, Any]
    ):
        """Link an uploaded file to a specific folder instance using file_folder"""
        try:
            logger.info(f"📁 Linking file to folder instance: {folder_instance_id}")
            
            file_id = file_data.get('file_id')
            if not file_id:
                raise HTTPException(status_code=400, detail="file_id is required")
            
            # Extract file metadata
            file_metadata = {
                'filename': file_data.get('filename', 'Unknown'),
                'file_size': file_data.get('file_size', 0),
                'content_type': file_data.get('content_type', 'application/octet-stream'),
                's3_key': file_data.get('s3_key', ''),
                'description': file_data.get('description'),
                'uploaded_by': file_data.get('uploaded_by')
            }
            
            result = sfdc_connector.folder_manager.link_file_to_folder(
                file_id, folder_instance_id, file_metadata
            )
            
            if result.get('success'):
                logger.info(f"✅ Successfully linked file {file_id} to folder {folder_instance_id}")
                return result
            else:
                raise HTTPException(status_code=500, detail=result.get('error', 'Failed to link file to folder'))
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error linking file to folder: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to link file to folder: {str(e)}")
    
    @router.get("/opportunities/{opportunity_id}/files")
    async def get_opportunity_files(opportunity_id: str):
        """Get all files for an opportunity organized by folder structure"""
        try:
            logger.info(f"📁 Getting files for opportunity: {opportunity_id}")
            
            # First get the folder hierarchy
            folders = sfdc_connector.folder_manager.get_folder_hierarchy(opportunity_id)
            
            # Then get all file_folder records for this opportunity
            # This would require a query to file_folder__c joined with Folder_instance__c
            # For now, return the folder structure (files would be populated in a real implementation)
            
            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "folder_structure": folders,
                "total_files": 0,  # Would be calculated from file_folder records
                "message": "File listing implementation pending - folder structure ready"
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting opportunity files: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get opportunity files: {str(e)}")
    
    @router.get("/instance/{instance_id}/files")
    async def get_folder_files(instance_id: str):
        """Get all files in a specific folder instance"""
        try:
            logger.info(f"📁 Getting files for folder instance: {instance_id}")
            
            # Get files from file_folder__c object where Folder_Instance__c = instance_id
            files = sfdc_connector.folder_manager.get_folder_files(instance_id)
            
            return {
                "success": True,
                "files": files,
                "folder_instance_id": instance_id
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting folder files: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "files": []
            }

    return router
