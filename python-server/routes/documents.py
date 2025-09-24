"""
Document Upload API Routes
Handles file uploads to AWS S3 for opportunities
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.responses import StreamingResponse, RedirectResponse
from typing import Optional, List
import logging
import os
import io
import httpx
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

def get_document_type_for_evaluation(category: str, requirement_name: str = None) -> Optional[str]:
    """
    Map document category and requirement to document_type for evaluation API
    Based on the evaluation API endpoint pattern: document_type=property_appraisal
    
    Special handling for appraisal documents to enable property value extraction
    """
    category_lower = category.lower()
    requirement_lower = requirement_name.lower() if requirement_name else ""
    
    # Special case: If uploading to appraisal folder, always use property_appraisal
    if 'appraisal' in category_lower:
        return 'property_appraisal'
    
    # Special case: If uploading to incorporation/business folder, use articles_of_incorporation
    if any(term in category_lower for term in ['incorporation', 'articles', 'corporate']):
        return 'articles_of_incorporation'
    
    # Document type mapping for evaluation API
    document_type_mapping = {
        # Assets/Financial documents
        'assets': 'bank_statement',
        'income': 'bank_statement',
        'financial': 'bank_statement',
        
        # Property documents
        'property': 'property_document',
        'appraisal': 'property_appraisal',
        'contract': 'purchase_contract',
        
        # Identity documents
        'identity': 'identity_document',
        'id': 'identity_document',
        
        # Employment documents
        'employment': 'employment_verification',
        'paystub': 'paystub',
        
        # Tax documents
        'tax': 'tax_return',
        'w2': 'tax_return',
        '1099': 'tax_return',
        
        # Business documents
        'business': 'business_document',
        'articles_of_incorporation': 'articles_of_incorporation',
        'incorporation': 'articles_of_incorporation',
        'operating_agreement': 'operating_agreement',
        'bylaws': 'corporate_bylaws',
        'ein': 'ein_document',
        
        # Insurance documents
        'insurance': 'insurance_document',
        
        # Construction documents
        'construction': 'construction_document',
        'renovation': 'construction_document',
        
        # Rental documents
        'rental': 'lease_agreement',
        'lease': 'lease_agreement'
    }
    
    # First check for high-priority keywords that should override category mapping
    high_priority_keywords = {
        # Appraisal-related (for value extraction)
        'appraisal': 'property_appraisal',
        'valuation': 'property_appraisal',
        'bpo': 'property_appraisal',  # Broker Price Opinion
        'avm': 'property_appraisal',  # Automated Valuation Model
        'cma': 'property_appraisal',  # Comparative Market Analysis
        'market value': 'property_appraisal',
        'property value': 'property_appraisal',
        'arv': 'property_appraisal',  # After Repair Value
        'as-is value': 'property_appraisal',
        'repair value': 'property_appraisal',
        
        # Financial documents
        'bank_statement': 'bank_statement',
        'bank statement': 'bank_statement',
        'tax_return': 'tax_return',
        'tax return': 'tax_return',
        'w-2': 'tax_return',
        'w2': 'tax_return',
        '1099': 'tax_return',
        'paystub': 'paystub',
        'pay stub': 'paystub',
        
        # Business documents (higher priority than general agreements)
        'articles of incorporation': 'articles_of_incorporation',
        'articles_of_incorporation': 'articles_of_incorporation',
        'incorporation': 'articles_of_incorporation',
        'corporate charter': 'articles_of_incorporation',
        'certificate of incorporation': 'articles_of_incorporation',
        'operating agreement': 'operating_agreement',
        'operating_agreement': 'operating_agreement',
        'llc operating agreement': 'operating_agreement',
        'bylaws': 'corporate_bylaws',
        'corporate bylaws': 'corporate_bylaws',
        'company bylaws': 'corporate_bylaws',
        'ein': 'ein_document',
        'ein document': 'ein_document',
        'tax id': 'ein_document',
        'federal tax id': 'ein_document',
        
        # Contracts and agreements (lower priority)
        'purchase_contract': 'purchase_contract',
        'purchase contract': 'purchase_contract',
        'purchase agreement': 'purchase_contract',
        'contract': 'purchase_contract',
        'lease': 'lease_agreement',
        'rental': 'lease_agreement'
    }
    
    # Check for high-priority keywords first (these override category)
    for keyword, doc_type in high_priority_keywords.items():
        if keyword in requirement_lower:
            return doc_type
    
    # Then try to match by category
    if category_lower in document_type_mapping:
        return document_type_mapping[category_lower]
    
    # Then try to match by requirement name keywords for remaining mappings
    for keyword, doc_type in document_type_mapping.items():
        if keyword in requirement_lower:
            return doc_type
    
    # Additional fallback checks
    if any(term in requirement_lower for term in ['bank', 'statement', 'account']):
        return 'bank_statement'
    elif any(term in requirement_lower for term in ['id', 'license', 'passport', 'driver']):
        return 'identity_document'
    
    # Default fallback
    return 'bank_statement'  # Most common document type for financial documents

async def call_document_evaluation_api(file_folder_id: str, document_type: str) -> Optional[dict]:
    """
    Call the document evaluation API for text extraction and analysis
    """
    try:
        evaluation_url = f"http://localhost:7000/api/v1/salesforce/file-folder/{file_folder_id}/full-json"
        
        params = {
            'document_type': document_type
        }
        
        logger.info(f"🔍 Calling document evaluation API for file_folder_id: {file_folder_id}")
        logger.info(f"📋 Document type: {document_type}")
        logger.info(f"🌐 Base URL: {evaluation_url}")
        logger.info(f"📊 Parameters: {params}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:  # Increased timeout for evaluation
            response = await client.get(evaluation_url, params=params)
            
            # Log the actual URL that was called
            logger.info(f"🎯 Full URL called: {response.url}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ Document evaluation successful for {file_folder_id}")
                return result
            else:
                logger.error(f"❌ Document evaluation failed: {response.status_code} - {response.text}")
                return None
                
    except httpx.TimeoutException:
        logger.error(f"⏰ Document evaluation timeout for {file_folder_id}")
        return None
    except Exception as e:
        logger.error(f"❌ Error calling document evaluation API: {str(e)}")
        return None

async def process_document_evaluation_background(file_folder_id: str, document_type: str, category: str, requirement_name: str):
    """
    Background task to process document evaluation without blocking the upload response
    """
    try:
        logger.info(f"🚀 Starting background document evaluation for {file_folder_id}")
        logger.info(f"📋 Background task parameters - Document Type: '{document_type}', Category: '{category}', Requirement: '{requirement_name}'")
        
        # Call the evaluation API
        evaluation_result = await call_document_evaluation_api(file_folder_id, document_type)
        
        if evaluation_result:
            logger.info(f"✅ Background document evaluation completed successfully for {file_folder_id}")
            logger.info(f"📊 Evaluation result summary: {len(str(evaluation_result))} characters of data")
        else:
            logger.warning(f"⚠️ Background document evaluation failed for {file_folder_id}")
            
    except Exception as e:
        logger.error(f"❌ Background document evaluation error for {file_folder_id}: {str(e)}")

def start_background_evaluation(file_folder_id: str, document_type: str, category: str, requirement_name: str):
    """
    Start document evaluation as a background task
    """
    try:
        # Create and start the background task
        task = asyncio.create_task(
            process_document_evaluation_background(file_folder_id, document_type, category, requirement_name)
        )
        logger.info(f"🔄 Started background evaluation task for {file_folder_id}")
        return task
    except Exception as e:
        logger.error(f"❌ Failed to start background evaluation task: {str(e)}")
        return None

def configure_documents_routes(auth_service, sfdc_connector):
    router = APIRouter()
    
    # Import S3 service
    from services.s3_service import S3Service
    s3_service = S3Service()

    @router.post("/upload")
    async def upload_document_to_s3(
        file: UploadFile = File(...),
        opportunity_id: str = Form(...),
        category: str = Form(...),
        requirement_name: str = Form(...),
        requirement_id: Optional[str] = Form(None),
        document_description: Optional[str] = Form(None),
        folder_instance_id: Optional[str] = Form(None)
    ):
        """Upload a document to S3 and link to Folder_instance using file_folder (replaces DocumentApproval__c)"""
        try:
            logger.info(f"📤 Uploading document to S3 for opportunity: {opportunity_id}")
            logger.info(f"📁 Folder structure: {opportunity_id}/{category}/{requirement_name}/{file.filename}")
            
            # Validate file
            if not file.filename:
                raise HTTPException(status_code=400, detail="No file provided")
            
            # Read file content
            file_content = await file.read()
            if len(file_content) == 0:
                raise HTTPException(status_code=400, detail="Empty file provided")
            
            # Check if S3 is configured
            if not s3_service.is_configured():
                logger.warning("⚠️ S3 not configured, falling back to mock upload")
                # For development/testing when S3 is not configured
                mock_s3_key = s3_service.generate_s3_key(opportunity_id, category, requirement_name, file.filename)
                
                upload_result = {
                    'success': True,
                    's3_key': mock_s3_key,
                    's3_url': f"s3://mock-bucket/{mock_s3_key}",
                    'presigned_url': f"https://mock-bucket.s3.amazonaws.com/{mock_s3_key}",
                    'bucket': 'mock-bucket',
                    'file_size': len(file_content),
                    'etag': 'mock-etag',
                    'last_modified': datetime.now().isoformat(),
                    'metadata': {
                        'opportunity-id': opportunity_id,
                        'category': category,
                        'requirement-name': requirement_name,
                        'original-filename': file.filename,
                        'upload-timestamp': datetime.now().isoformat()
                    }
                }
            else:
                # Upload to S3
                upload_result = await s3_service.upload_file(
                    file_content=file_content,
                    opportunity_id=opportunity_id,
                    category=category,
                    requirement_name=requirement_name,
                    filename=file.filename,
                    content_type=file.content_type or 'application/octet-stream'
                )
            
            logger.info(f"✅ File uploaded successfully: {upload_result['s3_key']}")
            
            # NEW: Link file to Folder_instance using file_folder (replaces DocumentApproval__c)
            file_folder_id = None
            evaluation_result = None
            try:
                # Determine the target folder instance
                target_folder = None
                
                if folder_instance_id:
                    # Use provided folder instance ID
                    target_folder = sfdc_connector.folder_manager.get_folder_by_instance_id(folder_instance_id)
                    logger.info(f"📁 Using provided folder instance: {folder_instance_id}")
                else:
                    # Find appropriate folder based on category and requirement
                    target_folder = sfdc_connector.folder_manager.get_upload_folder(
                        opportunity_id, category, requirement_name
                    )
                    logger.info(f"📁 Found upload folder for category '{category}': {target_folder['instance_id'] if target_folder else 'None'}")
                
                if target_folder:
                    # Prepare file metadata for linking
                    file_metadata = {
                        'filename': file.filename,
                        'file_size': upload_result['file_size'],
                        'content_type': file.content_type or 'application/octet-stream',
                        's3_key': upload_result['s3_key'],
                        'category': category,  # Pass the category from the form
                        'description': document_description or f'Document for: {requirement_name}',
                        'uploaded_by': 'Borrower Portal User'  # TODO: Get actual user info
                    }
                    
                    # Create file_folder record to link file to folder instance
                    link_result = sfdc_connector.folder_manager.link_file_to_folder(
                        upload_result['s3_key'],  # Using S3 key as file ID for now
                        target_folder['id'],
                        file_metadata
                    )
                    
                    if link_result.get('success'):
                        file_folder_id = link_result['file_folder_id']
                        logger.info(f"✅ Created file_folder record: {file_folder_id}")
                        
                        # NEW: Start document evaluation as background task (non-blocking)
                        document_type = get_document_type_for_evaluation(category, requirement_name)
                        logger.info(f"🔍 Input parameters - Category: '{category}', Requirement: '{requirement_name}'")
                        logger.info(f"📋 Determined document type for evaluation: {document_type}")
                        
                        # Start background evaluation task - don't wait for it
                        evaluation_task = start_background_evaluation(file_folder_id, document_type, category, requirement_name)
                        if evaluation_task:
                            logger.info(f"🚀 Document evaluation started in background for {file_folder_id}")
                        else:
                            logger.warning(f"⚠️ Failed to start background evaluation for {file_folder_id}")
                        
                    else:
                        logger.error(f"❌ Failed to create file_folder record: {link_result.get('error', 'Unknown error')}")
                else:
                    logger.warning(f"⚠️ No target folder found for category '{category}' - file uploaded but not linked to folder structure")
                
            except Exception as e:
                logger.error(f"❌ Failed to link file to folder structure: {str(e)}")
                logger.error(f"❌ Full error details: {repr(e)}")
                # Continue anyway since file was uploaded to S3
                file_folder_id = None
            
            # Prepare response data
            response_data = {
                "success": True,
                "message": "Document uploaded successfully and linked to folder structure",
                "s3_key": upload_result['s3_key'],
                "s3_url": upload_result['s3_url'],
                "presigned_url": upload_result['presigned_url'],
                "file_folder_id": file_folder_id,  # NEW: file_folder record ID
                "folder_instance_id": target_folder['id'] if target_folder else None,  # NEW: folder instance ID
                "filename": file.filename,
                "file_size": upload_result['file_size'],
                "category": category,
                "requirement_name": requirement_name,
                "opportunity_id": opportunity_id,
                "upload_timestamp": upload_result['metadata']['upload-timestamp'],
                "folder_structure": f"{opportunity_id}/{category}/{requirement_name}/",
                "evaluation_status": "processing" if file_folder_id else "not_started",
                "document_type": get_document_type_for_evaluation(category, requirement_name) if file_folder_id else None
            }
            
            return response_data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error uploading document: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

    @router.get("/evaluation/status/{file_folder_id}")
    async def get_evaluation_status(file_folder_id: str):
        """Get the current status of document evaluation for a file_folder_id"""
        try:
            logger.info(f"📊 Checking evaluation status for file_folder_id: {file_folder_id}")
            
            # For now, we'll return a simple status based on whether the evaluation API is reachable
            # In a production system, you might store evaluation status in a database
            try:
                evaluation_url = f"http://localhost:7000/api/v1/salesforce/file-folder/{file_folder_id}/status"
                
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(evaluation_url)
                    
                    if response.status_code == 200:
                        result = response.json()
                        return {
                            "success": True,
                            "file_folder_id": file_folder_id,
                            "status": "completed",
                            "result": result
                        }
                    elif response.status_code == 202:
                        return {
                            "success": True,
                            "file_folder_id": file_folder_id,
                            "status": "processing",
                            "message": "Document evaluation in progress"
                        }
                    else:
                        return {
                            "success": False,
                            "file_folder_id": file_folder_id,
                            "status": "failed",
                            "error": f"Evaluation service returned {response.status_code}"
                        }
                        
            except httpx.ConnectError:
                return {
                    "success": False,
                    "file_folder_id": file_folder_id,
                    "status": "service_unavailable",
                    "error": "Document evaluation service is not available"
                }
            except httpx.TimeoutException:
                return {
                    "success": True,
                    "file_folder_id": file_folder_id,
                    "status": "processing",
                    "message": "Document evaluation is taking longer than expected"
                }
                
        except Exception as e:
            logger.error(f"❌ Error checking evaluation status: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to check evaluation status: {str(e)}")

    @router.get("/opportunity/{opportunity_id}")
    async def get_opportunity_documents(opportunity_id: str):
        """Get all documents for an opportunity from S3 via DocumentApproval__c records"""
        try:
            logger.info(f"📋 Getting S3 documents for opportunity: {opportunity_id}")
            
            # Query DocumentApproval__c records for this opportunity
            query = f"""
                SELECT Id, Name, DocumentFolder__c, S3_Key__c, UploadedDate__c, 
                       ApprovalStatus__c, ReviewNotes__c, DocumentRequirement__c
                FROM DocumentApproval__c
                WHERE Opportunity__c = '{opportunity_id}'
                ORDER BY UploadedDate__c DESC
            """
            
            result = sfdc_connector.connection.sf.query(query)
            documents = []
            
            for record in result['records']:
                s3_key = record.get('S3_Key__c', '')
                
                # Get S3 file info if available
                file_info = None
                if s3_key and s3_service.is_configured():
                    try:
                        file_info = await s3_service.get_file_info(s3_key)
                    except Exception as e:
                        logger.warning(f"⚠️ Could not get S3 file info for {s3_key}: {str(e)}")
                
                # Parse S3 key to extract folder structure
                category = record.get('DocumentFolder__c', 'Unknown')
                requirement_name = 'Unknown'
                if s3_key:
                    try:
                        # Extract from S3 key: opportunity_id/category/requirement_name/filename
                        parts = s3_key.split('/')
                        if len(parts) >= 3:
                            category = parts[1]
                            requirement_name = parts[2]
                    except:
                        pass
                
                document_data = {
                    "id": record['Id'],
                    "name": record['Name'],
                    "category": category,
                    "requirement_name": requirement_name,
                    "s3_key": s3_key,
                    "uploaded_date": record.get('UploadedDate__c'),
                    "status": record.get('ApprovalStatus__c', 'pending'),
                    "review_notes": record.get('ReviewNotes__c', ''),
                    "document_requirement_id": record.get('DocumentRequirement__c', ''),
                }
                
                # Add S3 file info if available
                if file_info:
                    document_data.update({
                        "file_size": file_info['file_size'],
                        "content_type": file_info['content_type'],
                        "presigned_url": file_info['presigned_url'],
                        "s3_url": file_info['s3_url'],
                        "last_modified": file_info['last_modified']
                    })
                
                documents.append(document_data)
            
            logger.info(f"✅ Found {len(documents)} S3 documents for opportunity {opportunity_id}")
            
            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "documents": documents,
                "total_count": len(documents)
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting opportunity documents: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to get documents: {str(e)}")

    @router.get("/download/{document_approval_id}")
    async def download_document_from_s3(document_approval_id: str):
        """Generate download URL for a document stored in S3"""
        try:
            logger.info(f"🔗 Generating download URL for document: {document_approval_id}")
            
            # Get DocumentApproval__c record to find S3 key
            doc_record = sfdc_connector.connection.sf.DocumentApproval__c.get(document_approval_id)
            s3_key = doc_record.get('S3_Key__c')
            
            if not s3_key:
                raise HTTPException(status_code=404, detail="S3 key not found for document")
            
            if not s3_service.is_configured():
                raise HTTPException(status_code=503, detail="S3 service not configured")
            
            # Generate presigned download URL (valid for 1 hour)
            download_url = s3_service.generate_presigned_url(s3_key, expires_in=3600)
            
            logger.info(f"✅ Generated download URL for document: {document_approval_id}")
            
            return {
                "success": True,
                "download_url": download_url,
                "s3_key": s3_key,
                "expires_in": 3600,
                "document_name": doc_record.get('Name', 'Unknown')
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error generating download URL: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {str(e)}")

    @router.delete("/{document_approval_id}")
    async def delete_document_from_s3(document_approval_id: str):
        """Delete a document from S3 and remove DocumentApproval__c record"""
        try:
            logger.info(f"🗑️ Deleting document: {document_approval_id}")
            
            # Get DocumentApproval__c record to find S3 key
            doc_record = sfdc_connector.connection.sf.DocumentApproval__c.get(document_approval_id)
            s3_key = doc_record.get('S3_Key__c')
            
            # Delete from S3 if key exists and S3 is configured
            if s3_key and s3_service.is_configured():
                try:
                    await s3_service.delete_file(s3_key)
                    logger.info(f"✅ Deleted file from S3: {s3_key}")
                except Exception as e:
                    logger.warning(f"⚠️ Could not delete from S3: {str(e)}")
            
            # Delete DocumentApproval__c record
            sfdc_connector.connection.sf.DocumentApproval__c.delete(document_approval_id)
            logger.info(f"✅ Deleted DocumentApproval record: {document_approval_id}")
            
            return {
                "success": True,
                "message": "Document deleted successfully",
                "document_approval_id": document_approval_id,
                "s3_key": s3_key
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error deleting document: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

    @router.get("/{document_id}/public-notes")
    async def get_document_public_notes(
        document_id: str,
        opportunity_id: str = Query(...)
    ):
        """Get public notes for a specific document from DocumentNote__c object"""
        try:
            logger.info(f"📝 Fetching public notes for document: {document_id}")
            
            # First try to use document_id as DocumentApproval ID directly
            approval_id = None
            
            try:
                # Query DocumentApproval__c using document_id as the ID
                approval_query = f"""
                SELECT Id, S3_Key__c, Name
                FROM DocumentApproval__c 
                WHERE Id = '{document_id}'
                AND Opportunity__c = '{opportunity_id}'
                LIMIT 1
                """
                
                approval_result = sfdc_connector.connection.sf.query(approval_query)
                
                if approval_result['records']:
                    approval_id = approval_result['records'][0]['Id']
                    logger.info(f"📋 Found DocumentApproval by ID: {approval_id}")
                else:
                    # Fallback: try to find by S3 key pattern
                    logger.info(f"📋 No DocumentApproval found by ID, trying S3 key pattern")
                    approval_query = f"""
                    SELECT Id, S3_Key__c, Name
                    FROM DocumentApproval__c 
                    WHERE S3_Key__c LIKE '%{document_id}%' 
                    AND Opportunity__c = '{opportunity_id}'
                    LIMIT 1
                    """
                    
                    approval_result = sfdc_connector.connection.sf.query(approval_query)
                    
                    if approval_result['records']:
                        approval_id = approval_result['records'][0]['Id']
                        logger.info(f"📋 Found DocumentApproval by S3 key pattern: {approval_id}")
            
            except Exception as e:
                logger.warning(f"⚠️ Error querying DocumentApproval: {str(e)}")
            
            if not approval_id:
                logger.warning(f"❌ No DocumentApproval record found for document: {document_id}")
                return {
                    "success": True,
                    "document_id": document_id,
                    "notes": []
                }
            
            # Query DocumentNote__c for public notes
            notes_query = f"""
            SELECT Id, NoteContent__c, CreatedDate, CreatedBy.Name, CreatedByType__c, LastModifiedById
            FROM DocumentNote__c 
            WHERE DocumentApproval__c = '{approval_id}' 
            AND IsPublic__c = true
            ORDER BY CreatedDate DESC
            """
            
            notes_result = sfdc_connector.connection.sf.query(notes_query)
            
            # Format the notes
            formatted_notes = []
            for note in notes_result['records']:
                formatted_notes.append({
                    "id": note['Id'],
                    "note": note['NoteContent__c'] or '',
                    "created_date": note['CreatedDate'],
                    "created_by": note['CreatedBy']['Name'] if note.get('CreatedBy') else 'System',
                    "created_by_type": note.get('CreatedByType__c', ''),
                    "last_modified_by_id": note.get('LastModifiedById', '')
                })
            
            logger.info(f"✅ Found {len(formatted_notes)} public notes for document")
            
            return {
                "success": True,
                "document_id": document_id,
                "approval_id": approval_id,
                "notes": formatted_notes
            }
            
        except Exception as e:
            logger.error(f"❌ Error fetching public notes: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch public notes: {str(e)}"
            )

    @router.get("/view/{document_id}")
    async def view_document(
        document_id: str,
        type: str = Query(..., description="Document type: pdf, image, etc.")
    ):
        """Serve document for viewing (PDF, images, etc.)"""
        try:
            logger.info(f"👁️ Viewing document: {document_id} (type: {type})")
            
            # Try to find DocumentApproval record by ID first
            try:
                doc_record = sfdc_connector.connection.sf.DocumentApproval__c.get(document_id)
                s3_key = doc_record.get('S3_Key__c')
                
                if not s3_key:
                    raise HTTPException(status_code=404, detail="S3 key not found for document")
                
                logger.info(f"📁 Found S3 key: {s3_key}")
                
            except Exception as e:
                logger.warning(f"⚠️ Could not find DocumentApproval record for ID {document_id}: {str(e)}")
                # Try treating document_id as S3 key directly
                s3_key = document_id
            
            if not s3_service.is_configured():
                logger.warning("⚠️ S3 not configured, returning mock response")
                return {
                    "success": False,
                    "message": "S3 service not configured",
                    "mock_url": f"https://mock-bucket.s3.amazonaws.com/{s3_key}"
                }
            
            # Generate presigned URL for viewing
            presigned_url = s3_service.generate_presigned_url(s3_key, expires_in=3600)
            
            if not presigned_url:
                raise HTTPException(status_code=404, detail="Document not found in S3")
            
            # For PDFs and images, redirect to the presigned URL
            return RedirectResponse(url=presigned_url)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error viewing document: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to view document: {str(e)}"
            )

    @router.get("/download/{document_id}")
    async def download_document(document_id: str):
        """Download a document from S3"""
        try:
            logger.info(f"⬇️ Downloading document: {document_id}")
            
            # Get S3 service
            s3_service = S3Service()
            
            # Generate presigned URL for download
            presigned_url = s3_service.generate_presigned_url(
                document_id, 
                expires_in=3600,  # 1 hour
                response_content_disposition='attachment'
            )
            
            if not presigned_url:
                raise HTTPException(status_code=404, detail="Document not found")
            
            return RedirectResponse(url=presigned_url)
            
        except Exception as e:
            logger.error(f"❌ Error downloading document: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to download document: {str(e)}"
            )

    @router.post("/{document_id}/notes")
    async def create_document_note(
        document_id: str,
        note_data: dict,
        opportunity_id: str = Query(...),
        auth0_user_id: str = Query(..., description="Auth0 user ID for the current user"),
        email: str = Query(..., description="Email of the current user")
    ):
        """Create a new public note for a specific document"""
        try:
            logger.info(f"📝 Creating note for document: {document_id}")
            
            # Extract note data
            note_content = note_data.get('note', '').strip()
            is_public = note_data.get('is_public', True)
            
            if not note_content:
                raise HTTPException(status_code=400, detail="Note content is required")
            
            # Get the contact ID for the current user from the database
            try:
                user_mapping = auth_service.get_user_by_auth0_id(auth0_user_id, email)
                if user_mapping and user_mapping.get('salesforce_contact_id'):
                    contact_id = user_mapping['salesforce_contact_id']
                    logger.info(f"📝 Retrieved contact ID for user {auth0_user_id}: {contact_id}")
                else:
                    logger.warning(f"⚠️ No user mapping found for Auth0 user: {auth0_user_id}")
                    contact_id = None
            except Exception as e:
                logger.warning(f"⚠️ Could not get contact ID for user {auth0_user_id}: {str(e)}")
                contact_id = None
            
            # Query DocumentApproval__c to get the approval record
            approval_query = f"""
            SELECT Id, Name, Opportunity__c
            FROM DocumentApproval__c 
            WHERE Id = '{document_id}'
            AND Opportunity__c = '{opportunity_id}'
            LIMIT 1
            """
            
            approval_result = sfdc_connector.connection.sf.query(approval_query)
            
            if not approval_result['records']:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Document approval not found: {document_id}"
                )
            
            approval_record = approval_result['records'][0]
            
            # Create DocumentNote__c record
            note_data_sf = {
                'DocumentApproval__c': document_id,
                'NoteContent__c': note_content,
                'IsPublic__c': is_public
            }
            
            # Add Contact__c if we found one
            if contact_id:
                note_data_sf['Contact__c'] = contact_id
                logger.info(f"📝 Adding Contact__c to note: {contact_id}")
            else:
                logger.warning(f"⚠️ No Contact__c found for user: {auth0_user_id}")
            
            # Insert the note
            result = sfdc_connector.connection.sf.DocumentNote__c.create(note_data_sf)
            
            if result.get('success'):
                logger.info(f"✅ Note created successfully: {result['id']}")
                return {
                    "success": True,
                    "message": "Note created successfully",
                    "note_id": result['id'],
                    "document_id": document_id,
                    "opportunity_id": opportunity_id,
                    "contact_id": contact_id
                }
            else:
                logger.error(f"❌ Failed to create note: {result}")
                raise HTTPException(status_code=500, detail="Failed to create note")
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Error creating note: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create note: {str(e)}"
            )

    return router 