"""
Folder Operations for Salesforce Folder_instance
Replaces the old DocumentFolder__c system with hierarchical folder structure
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class FolderOperations:
    """
    Operations for Salesforce Folder_instance management
    
    New Structure:
    - Folder_instance: Hierarchical folder structure with parent-child relationships
    - file_folder: Links files to folder instances (replaces DocumentApproval__c)
    """
    
    def __init__(self, connection):
        self.connection = connection
        logger.info("✅ FolderOperations initialized")
    
    def get_folder_hierarchy(self, opportunity_id: str, loan_type: str = None) -> List[Dict[str, Any]]:
        """Get complete folder hierarchy for an opportunity using Folder_instance"""
        try:
            if not self.connection or not self.connection.is_connected:
                logger.warning("❌ No Salesforce connection - returning empty folder structure")
                return []
            
            # Query Folder_instance with hierarchical structure (using ACTUAL field names from debug)
            folder_query = f"""
                SELECT Id, Name, Parent_Instance__c, Loan__c, Required__c, 
                       Path__c, Template__c, Allowed_Doc_Categories__c, 
                       CreatedDate, Min_Files__c
                FROM Folder_instance__c 
                WHERE Loan__c = '{opportunity_id}'
                ORDER BY Parent_Instance__c NULLS FIRST, Name ASC
            """
            
            result = self.connection.sf.query(folder_query)
            folders = result['records']
            
            logger.info(f"📁 Found {len(folders)} folder instances for opportunity {opportunity_id}")
            
            # Get file counts for each folder by querying file_folder records
            file_counts = {}
            if folders:
                folder_ids = [f['Id'] for f in folders]
                folder_ids_str = "', '".join(folder_ids)
                
                file_count_query = f"""
                    SELECT Folder_Instance__c, COUNT(Id) file_count
                    FROM file_folder__c 
                    WHERE Folder_Instance__c IN ('{folder_ids_str}')
                    GROUP BY Folder_Instance__c
                """
                
                try:
                    file_result = self.connection.sf.query(file_count_query)
                    for record in file_result['records']:
                        folder_id = record['Folder_Instance__c']
                        count = record['file_count']
                        file_counts[folder_id] = count
                    logger.info(f"📊 Found file counts for {len(file_counts)} folders")
                except Exception as count_error:
                    logger.warning(f"⚠️ Could not get file counts: {str(count_error)}")
            
            # Build hierarchical structure with file counts
            hierarchy = self._build_hierarchy(folders, file_counts)
            return hierarchy
            
        except Exception as e:
            logger.error(f"❌ Error getting folder hierarchy: {str(e)}")
            return []
    
    def get_folder_by_instance_id(self, instance_id: str) -> Optional[Dict[str, Any]]:
        """Get folder details by instance ID"""
        try:
            if not self.connection or not self.connection.is_connected:
                logger.warning("❌ No Salesforce connection")
                return None
            
            # Use actual field names from your Salesforce schema
            folder_query = f"""
                SELECT Id, Name, Parent_Instance__c, Loan__c, Required__c, 
                       Path__c, Template__c, Allowed_Doc_Categories__c, 
                       CreatedDate, Min_Files__c
                FROM Folder_instance__c 
                WHERE Id = '{instance_id}'
                LIMIT 1
            """
            
            result = self.connection.sf.query(folder_query)
            if result['totalSize'] > 0:
                folder = result['records'][0]
                return self._format_folder_record(folder)
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting folder by instance ID {instance_id}: {str(e)}")
            return None
    
    def get_upload_folder(self, opportunity_id: str, category: str, requirement_name: str = None) -> Optional[Dict[str, Any]]:
        """Get the appropriate folder for file upload based on category and requirement"""
        try:
            if not self.connection or not self.connection.is_connected:
                logger.warning("❌ No Salesforce connection")
                return None
            
            # Build query to find matching folder using actual field names
            folder_query = f"""
                SELECT Id, Name, Parent_Instance__c, Loan__c, Required__c, 
                       Path__c, Template__c, Allowed_Doc_Categories__c, 
                       CreatedDate, Min_Files__c
                FROM Folder_instance__c 
                WHERE Loan__c = '{opportunity_id}'
            """
            
            # If requirement name is provided, try to find specific folder
            if requirement_name:
                folder_query += f" AND Name LIKE '%{requirement_name}%'"
            
            folder_query += " ORDER BY Name ASC LIMIT 1"
            
            result = self.connection.sf.query(folder_query)
            if result['totalSize'] > 0:
                folder = result['records'][0]
                return self._format_folder_record(folder)
            
            # If no specific folder found, try to find category folder
            if requirement_name:
                return self.get_upload_folder(opportunity_id, category, None)
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting upload folder: {str(e)}")
            return None
    
    def link_file_to_folder(self, file_id: str, folder_instance_id: str, file_metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Link an uploaded file to a specific folder instance using file_folder"""
        try:
            if not self.connection or not self.connection.is_connected:
                logger.warning("❌ No Salesforce connection - cannot link file")
                return {'success': False, 'error': 'No Salesforce connection'}
            
            # Map to EXACT API names from Salesforce picklist
            category_mapping = {
                'General': 'PropertyDocs',
                'general': 'PropertyDocs', 
                'income': 'W-2',
                'Income': 'W-2',
                'assets': 'BankStmt',
                'Assets': 'BankStmt',
                'property': 'PropertyDocs',
                'Property': 'PropertyDocs',
                'identity': 'DriversLicense',
                'Identity': 'DriversLicense',
                'employment': 'VOE',
                'Employment': 'VOE',
                'rental': 'LeaseAgreement',
                'Rental': 'LeaseAgreement'
            }
            
            raw_category = file_metadata.get('category', 'General')
            mapped_category = category_mapping.get(raw_category, 'PropertyDocs')
            
            file_folder_data = {
                'Category__c': mapped_category,
                'Uploaded_On__c': datetime.now().isoformat(),
                'S3_File_Key__c': file_metadata.get('s3_key', ''),
                'Folder_Instance__c': folder_instance_id,
                'Approval_Status__c': 'Pending'
            }
            
            result = self.connection.sf.file_folder__c.create(file_folder_data)
            
            if result.get('success'):
                logger.info(f"✅ Linked file {file_id} to folder instance {folder_instance_id}")
                return {
                    'success': True,
                    'file_folder_id': result['id'],
                    'file_id': file_id,
                    'folder_instance_id': folder_instance_id
                }
            else:
                logger.error(f"❌ Failed to link file to folder: {result}")
                return {'success': False, 'error': 'Failed to create file_folder record'}
            
        except Exception as e:
            logger.error(f"❌ Error linking file to folder: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_folder_files(self, folder_instance_id: str) -> List[Dict[str, Any]]:
        """Get all files in a specific folder instance from file_folder__c"""
        try:
            if not self.connection or not self.connection.is_connected:
                logger.warning("❌ No Salesforce connection - returning empty file list")
                return []
            
            # Query file_folder__c records for this folder instance
            files_query = f"""
                SELECT Id, Name, Category__c, S3_File_Key__c, 
                       Uploaded_On__c, Approval_Status__c, CreatedDate
                FROM file_folder__c
                WHERE Folder_Instance__c = '{folder_instance_id}'
                ORDER BY CreatedDate DESC
            """
            
            sf = self.connection.sf
            files_result = sf.query(files_query)
            
            files = []
            for record in files_result['records']:
                files.append({
                    'id': record['Id'],
                    'name': record.get('Name', 'Unknown'),
                    'category': record.get('Category__c', 'General'),
                    's3_key': record.get('S3_File_Key__c', ''),
                    'uploaded_on': record.get('Uploaded_On__c', record.get('CreatedDate', '')),
                    'approval_status': record.get('Approval_Status__c', 'Pending')
                })
            
            logger.info(f"📄 Found {len(files)} files in folder {folder_instance_id}")
            return files
            
        except Exception as e:
            logger.error(f"❌ Error getting folder files: {str(e)}")
            return []
    
    def _build_hierarchy(self, folders: List[Dict[str, Any]], file_counts: Dict[str, int] = None) -> List[Dict[str, Any]]:
        """Build hierarchical folder structure from flat list with file counts"""
        if file_counts is None:
            file_counts = {}
            
        folder_map = {}
        root_folders = []
        
        # First pass: create folder map
        for folder in folders:
            formatted_folder = self._format_folder_record(folder)
            # Add file count
            formatted_folder['file_count'] = file_counts.get(folder['Id'], 0)
            folder_map[folder['Id']] = formatted_folder
            formatted_folder['children'] = []
        
        # Second pass: build hierarchy
        for folder in folders:
            folder_id = folder['Id']
            parent_id = folder.get('Parent_Instance__c')
            
            if parent_id and parent_id in folder_map:
                # Add to parent's children
                folder_map[parent_id]['children'].append(folder_map[folder_id])
            else:
                # Root level folder
                root_folders.append(folder_map[folder_id])
        
        return root_folders
    
    def _format_folder_record(self, folder: Dict[str, Any]) -> Dict[str, Any]:
        """Format folder record for consistent API response using ACTUAL field names"""
        return {
            'id': folder['Id'],
            'instance_id': folder['Id'],  # The Id IS the instance_id
            'name': folder['Name'],
            'parent_id': folder.get('Parent_Instance__c'),
            'opportunity_id': folder.get('Loan__c'),
            'required': folder.get('Required__c', False),
            'path': folder.get('Path__c', ''),
            'template': folder.get('Template__c', ''),
            'allowed_categories': folder.get('Allowed_Doc_Categories__c', ''),
            'min_files': folder.get('Min_Files__c', 0),
            'created_date': folder.get('CreatedDate'),
            'active': True
        }