"""
Debug Upload Routes
Test file upload functionality step by step
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def configure_debug_upload_routes(auth_service, sfdc_connector):
    """Configure debug upload routes"""
    router = APIRouter()
    
    @router.post("/debug/upload-test")
    async def debug_upload_test(
        file: UploadFile = File(...),
        opportunity_id: str = Form(...),
        folder_instance_id: str = Form(...)
    ):
        """Debug upload test to isolate issues"""
        try:
            logger.info(f"🔍 DEBUG: Testing upload for opportunity: {opportunity_id}")
            logger.info(f"🔍 DEBUG: Folder instance ID: {folder_instance_id}")
            logger.info(f"🔍 DEBUG: File: {file.filename}")
            
            # Step 1: Test Salesforce connection
            if not sfdc_connector.connection or not sfdc_connector.connection.is_connected:
                return {
                    "step": "connection_test",
                    "success": False,
                    "error": "No Salesforce connection"
                }
            
            # Step 2: Test folder lookup
            try:
                folder = sfdc_connector.folder_manager.get_folder_by_instance_id(folder_instance_id)
                logger.info(f"🔍 DEBUG: Found folder: {folder}")
            except Exception as folder_error:
                return {
                    "step": "folder_lookup",
                    "success": False,
                    "error": str(folder_error),
                    "folder_instance_id": folder_instance_id
                }
            
            if not folder:
                return {
                    "step": "folder_lookup",
                    "success": False,
                    "error": "Folder not found",
                    "folder_instance_id": folder_instance_id
                }
            
            # Step 3: Test file reading
            try:
                file_content = await file.read()
                if len(file_content) == 0:
                    return {
                        "step": "file_reading",
                        "success": False,
                        "error": "Empty file"
                    }
            except Exception as file_error:
                return {
                    "step": "file_reading",
                    "success": False,
                    "error": str(file_error)
                }
            
            # Step 4: Test file_folder record creation
            try:
                file_metadata = {
                    'filename': file.filename,
                    'file_size': len(file_content),
                    'content_type': file.content_type or 'application/octet-stream',
                    's3_key': f"debug/{opportunity_id}/{file.filename}",
                    'category': 'Debug',
                    'uploaded_by': 'Debug User'
                }
                
                link_result = sfdc_connector.folder_manager.link_file_to_folder(
                    f"debug_{datetime.now().timestamp()}",  # Mock file ID
                    folder_instance_id,
                    file_metadata
                )
                
                logger.info(f"🔍 DEBUG: Link result: {link_result}")
                
            except Exception as link_error:
                return {
                    "step": "file_folder_creation",
                    "success": False,
                    "error": str(link_error),
                    "error_type": type(link_error).__name__
                }
            
            return {
                "step": "complete",
                "success": True,
                "folder": folder,
                "file_size": len(file_content),
                "link_result": link_result,
                "message": "Debug upload test completed successfully"
            }
            
        except Exception as e:
            logger.error(f"❌ Debug upload test error: {str(e)}")
            return {
                "step": "general_error",
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    return router




