"""
Debug Routes for Folder Structure
Helps debug why folders are not showing up
"""

from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)

def configure_debug_folder_routes(auth_service, sfdc_connector):
    """Configure debug folder routes"""
    router = APIRouter()
    
    @router.get("/debug/folders/{opportunity_id}")
    async def debug_folder_query(opportunity_id: str):
        """Debug folder query to see what's actually in Salesforce"""
        try:
            logger.info(f"🔍 DEBUG: Checking folders for opportunity: {opportunity_id}")
            
            if not sfdc_connector.connection or not sfdc_connector.connection.is_connected:
                return {
                    "error": "No Salesforce connection",
                    "connected": False,
                    "opportunity_id": opportunity_id
                }
            
            # First, let's see if the opportunity exists
            opp_query = f"SELECT Id, Name FROM Opportunity WHERE Id = '{opportunity_id}' LIMIT 1"
            try:
                opp_result = sfdc_connector.connection.sf.query(opp_query)
                logger.info(f"🔍 Opportunity query result: {opp_result}")
            except Exception as opp_error:
                logger.error(f"❌ Opportunity query failed: {str(opp_error)}")
                return {
                    "error": f"Opportunity query failed: {str(opp_error)}",
                    "opportunity_id": opportunity_id
                }
            
            # Try to describe Folder_instance__c to see what fields exist
            try:
                describe_result = sfdc_connector.connection.sf.Folder_instance__c.describe()
                field_names = [field['name'] for field in describe_result['fields']]
                logger.info(f"🔍 Folder_instance__c fields: {field_names}")
            except Exception as describe_error:
                logger.error(f"❌ Describe Folder_instance__c failed: {str(describe_error)}")
                return {
                    "error": f"Folder_instance__c describe failed: {str(describe_error)}",
                    "opportunity_id": opportunity_id
                }
            
            # Try basic query first
            basic_query = f"SELECT Id, Name FROM Folder_instance__c LIMIT 5"
            try:
                basic_result = sfdc_connector.connection.sf.query(basic_query)
                logger.info(f"🔍 Basic Folder_instance__c query result: {basic_result}")
            except Exception as basic_error:
                logger.error(f"❌ Basic Folder_instance__c query failed: {str(basic_error)}")
                return {
                    "error": f"Basic Folder_instance__c query failed: {str(basic_error)}",
                    "opportunity_id": opportunity_id
                }
            
            # Try query with opportunity filter
            folder_query = f"SELECT Id, Name FROM Folder_instance__c WHERE Loan__c = '{opportunity_id}'"
            try:
                folder_result = sfdc_connector.connection.sf.query(folder_query)
                logger.info(f"🔍 Folder query for opportunity result: {folder_result}")
            except Exception as folder_error:
                logger.error(f"❌ Folder query for opportunity failed: {str(folder_error)}")
                return {
                    "error": f"Folder query failed: {str(folder_error)}",
                    "opportunity_id": opportunity_id
                }
            
            # Try to describe file_folder__c
            try:
                file_describe_result = sfdc_connector.connection.sf.file_folder__c.describe()
                file_field_names = [field['name'] for field in file_describe_result['fields']]
                logger.info(f"🔍 file_folder__c fields: {file_field_names}")
            except Exception as file_describe_error:
                logger.error(f"❌ Describe file_folder__c failed: {str(file_describe_error)}")
                file_field_names = ["Could not describe file_folder__c"]
            
            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "connected": True,
                "opportunity_exists": opp_result.get('totalSize', 0) > 0,
                "folder_instance_fields": field_names,
                "file_folder_fields": file_field_names,
                "basic_folders_count": basic_result.get('totalSize', 0),
                "opportunity_folders_count": folder_result.get('totalSize', 0),
                "basic_folders": basic_result.get('records', []),
                "opportunity_folders": folder_result.get('records', [])
            }
            
        except Exception as e:
            logger.error(f"❌ Debug folder query error: {str(e)}")
            return {
                "error": f"Debug failed: {str(e)}",
                "opportunity_id": opportunity_id
            }
    
    return router
