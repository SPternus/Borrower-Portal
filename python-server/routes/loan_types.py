"""
Loan Type Configuration API Routes
Provides loan type mappings for tasks and document categories
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List, Any, Optional
import logging
from config.loan_type_mappings import (
    get_document_requirements_by_loan_type,
    get_task_workflow_by_loan_type,
    get_all_loan_types,
    get_document_categories_by_loan_type,
    LoanType,
    DocumentCategory,
    TaskCategory
)
import json

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/loan-types")
async def get_loan_types():
    """Get all available loan types"""
    try:
        loan_types = get_all_loan_types()
        return {
            "success": True,
            "loan_types": loan_types,
            "count": len(loan_types)
        }
    except Exception as e:
        logger.error(f"❌ Error getting loan types: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get loan types: {str(e)}")

@router.get("/loan-types/{loan_type}/documents")
async def get_document_requirements(loan_type: str):
    """Get document requirements for a specific loan type"""
    try:
        logger.info(f"📋 Getting document requirements for loan type: {loan_type}")
        
        if loan_type not in get_all_loan_types():
            raise HTTPException(status_code=404, detail=f"Loan type '{loan_type}' not found")
        
        requirements = get_document_requirements_by_loan_type(loan_type)
        
        # Format the response as a flat list of documents for frontend consumption
        documents = []
        for category, details in requirements.items():
            category_name = category.value if hasattr(category, 'value') else str(category)
            category_display = category_name.replace('_', ' ').title()
            
            # Create individual document entries for each document in the category
            for doc_name in details["documents"]:
                documents.append({
                    "name": doc_name,
                    "category": category_name,
                    "category_display": category_display,
                    "required": details["required"],
                    "priority": details["priority"],
                    "description": f"{doc_name} for {category_display}"
                })
        
        return {
            "success": True,
            "loan_type": loan_type,
            "documents": documents,
            "total_documents": len(documents),
            "categories": list(set(doc["category"] for doc in documents))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting document requirements for {loan_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get document requirements: {str(e)}")

@router.get("/loan-types/{loan_type}/tasks")
async def get_task_workflow(loan_type: str):
    """Get task workflow for a specific loan type"""
    try:
        logger.info(f"📝 Getting task workflow for loan type: {loan_type}")
        
        if loan_type not in get_all_loan_types():
            raise HTTPException(status_code=404, detail=f"Loan type '{loan_type}' not found")
        
        workflow = get_task_workflow_by_loan_type(loan_type)
        
        # Add sequential order and format for frontend
        formatted_workflow = []
        for index, task in enumerate(workflow):
            formatted_task = {
                "id": f"{loan_type}-task-{index + 1}",
                "order": index + 1,
                "title": task["title"],
                "description": task["description"],
                "category": task["category"].value if hasattr(task["category"], 'value') else str(task["category"]),
                "priority": task["priority"],
                "estimated_days": task["estimated_days"],
                "dependencies": task["dependencies"],
                "required_documents": task["required_documents"],
                "status": "pending"  # Default status
            }
            formatted_workflow.append(formatted_task)
        
        return {
            "success": True,
            "loan_type": loan_type,
            "task_workflow": formatted_workflow,
            "total_tasks": len(formatted_workflow),
            "estimated_total_days": sum(task["estimated_days"] for task in workflow)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting task workflow for {loan_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get task workflow: {str(e)}")

@router.get("/loan-types/{loan_type}/complete")
async def get_complete_loan_type_config(loan_type: str):
    """Get complete configuration (documents + tasks) for a specific loan type"""
    try:
        logger.info(f"🔧 Getting complete configuration for loan type: {loan_type}")
        
        if loan_type not in get_all_loan_types():
            raise HTTPException(status_code=404, detail=f"Loan type '{loan_type}' not found")
        
        # Get document requirements
        doc_requirements = get_document_requirements_by_loan_type(loan_type)
        formatted_docs = {}
        for category, details in doc_requirements.items():
            category_name = category.value if hasattr(category, 'value') else str(category)
            formatted_docs[category_name] = {
                "required": details["required"],
                "priority": details["priority"],
                "documents": details["documents"],
                "category_display_name": category_name.replace('_', ' ').title()
            }
        
        # Get task workflow
        workflow = get_task_workflow_by_loan_type(loan_type)
        formatted_tasks = []
        for index, task in enumerate(workflow):
            formatted_task = {
                "id": f"{loan_type}-task-{index + 1}",
                "order": index + 1,
                "title": task["title"],
                "description": task["description"],
                "category": task["category"].value if hasattr(task["category"], 'value') else str(task["category"]),
                "priority": task["priority"],
                "estimated_days": task["estimated_days"],
                "dependencies": task["dependencies"],
                "required_documents": task["required_documents"],
                "status": "pending"
            }
            formatted_tasks.append(formatted_task)
        
        # Calculate summary statistics
        total_required_docs = sum(
            len(details["documents"]) 
            for details in doc_requirements.values() 
            if details["required"]
        )
        
        high_priority_categories = sum(
            1 for details in doc_requirements.values() 
            if details["priority"] == "high"
        )
        
        return {
            "success": True,
            "loan_type": loan_type,
            "loan_type_display_name": loan_type.replace('-', ' ').title(),
            "document_requirements": formatted_docs,
            "task_workflow": formatted_tasks,
            "summary": {
                "total_document_categories": len(formatted_docs),
                "total_required_documents": total_required_docs,
                "high_priority_categories": high_priority_categories,
                "total_tasks": len(formatted_tasks),
                "estimated_total_days": sum(task["estimated_days"] for task in workflow)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting complete configuration for {loan_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get complete configuration: {str(e)}")

@router.get("/document-categories")
async def get_all_document_categories():
    """Get all available document categories"""
    try:
        categories = [category.value for category in DocumentCategory]
        formatted_categories = []
        
        for category in categories:
            formatted_categories.append({
                "id": category,
                "name": category.replace('_', ' ').title(),
                "description": _get_category_description(category)
            })
        
        return {
            "success": True,
            "document_categories": formatted_categories,
            "count": len(formatted_categories)
        }
    except Exception as e:
        logger.error(f"❌ Error getting document categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get document categories: {str(e)}")

@router.get("/task-categories")
async def get_all_task_categories():
    """Get all available task categories"""
    try:
        categories = [category.value for category in TaskCategory]
        formatted_categories = []
        
        for category in categories:
            formatted_categories.append({
                "id": category,
                "name": category.replace('_', ' ').title(),
                "description": _get_task_category_description(category)
            })
        
        return {
            "success": True,
            "task_categories": formatted_categories,
            "count": len(formatted_categories)
        }
    except Exception as e:
        logger.error(f"❌ Error getting task categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get task categories: {str(e)}")

def _get_category_description(category: str) -> str:
    """Get description for document category"""
    descriptions = {
        "income": "Income verification documents including pay stubs, tax returns, and employment letters",
        "assets": "Asset documentation including bank statements, investment accounts, and property equity",
        "property": "Property-related documents including appraisals, purchase contracts, and insurance",
        "identity": "Identity verification documents including government-issued ID and SSN",
        "employment": "Employment verification including letters, contracts, and business documentation",
        "credit": "Credit-related documents including reports and explanation letters",
        "business": "Business documentation for self-employed borrowers",
        "construction": "Construction-specific documents including plans, permits, and contractor agreements",
        "rental": "Rental property documentation including leases, rent rolls, and market analysis",
        "other": "Additional documentation as requested by underwriter"
    }
    return descriptions.get(category, "Additional documentation")

def _get_task_category_description(category: str) -> str:
    """Get description for task category"""
    descriptions = {
        "application": "Initial application submission and setup tasks",
        "documentation": "Document collection and verification tasks",
        "underwriting": "Loan underwriting and analysis tasks",
        "property_evaluation": "Property appraisal and evaluation tasks",
        "approval": "Loan approval and commitment tasks",
        "closing": "Loan closing and funding tasks"
    }
    return descriptions.get(category, "General loan processing task")

@router.get("/loan-types/{loan_type}/salesforce-folders")
async def get_salesforce_document_folders(loan_type: str):
    """Get document folder structure from Salesforce for a specific loan type"""
    try:
        from salesforce.connection import SalesforceConnection
        
        logger.info(f"📁 Getting Salesforce document folders for loan type: {loan_type}")
        
        # Get Salesforce connection
        sf_connection = SalesforceConnection()
        if not sf_connection.is_connected:
            raise HTTPException(status_code=500, detail="Salesforce connection not available")
        
        # First, get the LoanType__c record to get the ID
        loan_type_query = f"""
            SELECT Id, Name 
            FROM LoanType__c 
            WHERE Name = '{loan_type}' 
            LIMIT 1
        """
        
        try:
            # Get loan type ID
            loan_type_result = sf_connection.sf.query(loan_type_query)
            if not loan_type_result['records']:
                logger.warning(f"⚠️ Loan type '{loan_type}' not found in Salesforce")
                raise Exception(f"Loan type '{loan_type}' not found")
            
            loan_type_id = loan_type_result['records'][0]['Id']
            logger.info(f"📋 Found loan type ID: {loan_type_id}")
            
            # Query DocumentNeedsList__c using the loan type ID
            document_needs_query = f"""
                SELECT Id, Name, Loan_Document__r.Category__c, LoanType__c
                FROM DocumentNeedsList__c 
                WHERE LoanType__c = '{loan_type_id}' 
                ORDER BY Loan_Document__r.Category__c ASC, Name ASC
            """
            
            result = sf_connection.sf.query(document_needs_query)
            document_needs = result['records']
            
            logger.info(f"📄 Found {len(document_needs)} document needs for loan type")
            
            # Organize documents by category (first level)
            categories = {}
            folders = []
            
            for record in document_needs:
                category = record.get('Category__c', 'Other') or 'Other'
                doc_name = record['Name']
                
                # Create category if it doesn't exist
                if category not in categories:
                    categories[category] = {
                        "category": category,
                        "category_display": category.replace('_', ' ').title(),
                        "documents": [],
                        "required": True,  # Default to required since we don't have Required__c field
                        "priority": "medium",  # Default priority since we don't have Priority__c field
                        "folders": []
                    }
                
                # Add document to category
                doc_info = {
                    "id": record['Id'],
                    "name": doc_name,
                    "category": category,
                    "loan_type_id": loan_type_id,
                    "required": True,  # Default to required since IsRequired__c field doesn't exist
                    "priority": "medium",  # Default since no Priority field exists
                    "description": "",  # Empty since no Description field exists
                    "type": "",  # Default since Type__c field doesn't exist
                    "sort_order": 0  # Default since no Sort_Order field exists
                }
                
                categories[category]["documents"].append(doc_info)
                
                # Update category properties based on documents (simplified since no Required__c/Priority__c)
                categories[category]["required"] = True
                categories[category]["priority"] = "medium"
            
            # Create flat document list for backward compatibility
            documents = []
            for category_data in categories.values():
                for doc in category_data["documents"]:
                    documents.append({
                        "name": doc["name"],
                        "category": doc["category"],
                        "category_display": category_data["category_display"],
                        "required": doc["required"],
                        "priority": doc["priority"],
                        "description": doc["description"] or f"{doc['name']} for {category_data['category_display']}",
                        "folder_id": doc["id"],
                        "sort_order": doc["sort_order"]
                    })
                    
                # Create folder structure for each category
                folder_info = {
                    "id": f"category-{category_data['category']}",
                    "name": category_data["category_display"],
                    "category": category_data["category"],
                    "loan_type": loan_type,
                    "loan_type_id": loan_type_id,
                    "required": category_data["required"],
                    "priority": category_data["priority"],
                    "description": f"Documents for {category_data['category_display']}",
                    "sort_order": 0,
                    "documents": [doc["name"] for doc in category_data["documents"]]
                }
                folders.append(folder_info)
            
            # Group folders by category for easier frontend consumption
            categories = {}
            for folder in folders:
                category = folder['category']
                if category not in categories:
                    categories[category] = {
                        "category": category,
                        "category_display": category.replace('_', ' ').title(),
                        "folders": [],
                        "required": False,
                        "priority": "medium"
                    }
                
                categories[category]["folders"].append(folder)
                # Set category as required if any folder in it is required
                if folder['required']:
                    categories[category]["required"] = True
                # Set highest priority for the category
                if folder['priority'] == 'high':
                    categories[category]["priority"] = 'high'
                elif folder['priority'] == 'medium' and categories[category]["priority"] != 'high':
                    categories[category]["priority"] = 'medium'
            
            # Convert to flat document list for backward compatibility
            documents = []
            for folder in folders:
                for doc_name in folder['documents']:
                    documents.append({
                        "name": doc_name,
                        "category": folder['category'],
                        "category_display": (folder['category'] or 'Other').replace('_', ' ').title(),
                        "required": folder['required'],
                        "priority": folder['priority'],
                        "description": folder['description'] or f"{doc_name} for {(folder['category'] or 'Other').replace('_', ' ').title()}",
                        "folder_id": folder['id'],
                        "sort_order": folder['sort_order']
                    })
            
            logger.info(f"✅ Found {len(folders)} folders and {len(documents)} documents for loan type {loan_type}")
            
            return {
                "success": True,
                "loan_type": loan_type,
                "source": "salesforce",
                "folders": folders,
                "categories": categories,
                "documents": documents,
                "total_folders": len(folders),
                "total_documents": len(documents),
                "total_categories": len(categories)
            }
            
        except Exception as sf_error:
            logger.warning(f"⚠️ Salesforce query failed: {str(sf_error)}")
            # Fall back to hardcoded mappings if Salesforce query fails
            logger.info("📋 Falling back to hardcoded document requirements")
            
            if loan_type not in get_all_loan_types():
                raise HTTPException(status_code=404, detail=f"Loan type '{loan_type}' not found")
            
            requirements = get_document_requirements_by_loan_type(loan_type)
            
            # Format fallback response to match Salesforce structure
            folders = []
            documents = []
            categories = {}
            
            for category, details in requirements.items():
                category_name = category.value if hasattr(category, 'value') else str(category)
                category_display = category_name.replace('_', ' ').title()
                
                # Create a folder for each category
                folder_info = {
                    "id": f"fallback-{category_name}",
                    "name": category_display,
                    "category": category_name,
                    "loan_type": loan_type,
                    "required": details["required"],
                    "priority": details["priority"],
                    "description": f"Documents for {category_display}",
                    "sort_order": 0,
                    "documents": details["documents"]
                }
                folders.append(folder_info)
                
                categories[category_name] = {
                    "category": category_name,
                    "category_display": category_display,
                    "folders": [folder_info],
                    "required": details["required"],
                    "priority": details["priority"]
                }
                
                # Create individual document entries
                for doc_name in details["documents"]:
                    documents.append({
                        "name": doc_name,
                        "category": category_name,
                        "category_display": category_display,
                        "required": details["required"],
                        "priority": details["priority"],
                        "description": f"{doc_name} for {category_display}",
                        "folder_id": folder_info["id"],
                        "sort_order": 0
                    })
            
            return {
                "success": True,
                "loan_type": loan_type,
                "source": "fallback",
                "folders": folders,
                "categories": categories,
                "documents": documents,
                "total_folders": len(folders),
                "total_documents": len(documents),
                "total_categories": len(categories)
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting Salesforce document folders for {loan_type}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get document folders: {str(e)}")

@router.get("/opportunities/{opportunity_id}/document-approvals")
async def get_opportunity_document_approvals(opportunity_id: str):
    """Get document approvals with S3 keys and public notes for an opportunity"""
    try:
        from salesforce.connection import SalesforceConnection
        
        logger.info(f"📄 Getting document approvals for opportunity: {opportunity_id}")
        
        # Get Salesforce connection
        sf_connection = SalesforceConnection()
        if not sf_connection.is_connected:
            raise HTTPException(status_code=500, detail="Salesforce connection not available")
        
        # Get document approvals for this opportunity
        document_approvals = []
        try:
            document_approvals_query = f"""
                SELECT Id, Name, Opportunity__c, DocumentFolder__c, ContentDocumentId__c, S3_Key__c, 
                       ApprovalStatus__c, UploadedDate__c, ReviewNotes__c, ReviewedBy__c, DocumentRequirement__c
                FROM DocumentApproval__c 
                WHERE Opportunity__c = '{opportunity_id}' 
                ORDER BY DocumentFolder__c ASC, UploadedDate__c DESC
            """
            
            approvals_result = sf_connection.sf.query(document_approvals_query)
            document_approvals = approvals_result['records']
        except Exception as approval_error:
            logger.warning(f"⚠️ Could not query DocumentApproval__c: {str(approval_error)}")
            logger.info("📋 Using empty document approvals list")
            document_approvals = []
        
        logger.info(f"📋 Found {len(document_approvals)} document approvals")
        
        # For each document approval, get public notes
        documents_with_notes = []
        
        for approval in document_approvals:
            # Query public notes for this document approval
            notes_query = f"""
                SELECT Id, Name, DocumentApproval__c, Note__c, 
                       Created_Date__c, CreatedBy.Name, IsPublic__c
                FROM DocumentNote__c 
                WHERE DocumentApproval__c = '{approval['Id']}' 
                AND IsPublic__c = true
                AND IsActive__c = true
                ORDER BY Created_Date__c DESC
            """
            
            notes_result = sf_connection.sf.query(notes_query)
            public_notes = notes_result['records']
            
            # Format document approval data
            document_data = {
                "id": approval['Id'],
                "name": approval.get('Name', ''),
                "opportunity_id": approval.get('Opportunity__c'),
                "document_needs_id": None,  # Since DocumentNeedsList__c field doesn't exist
                "category": approval.get('Category__c', ''),
                "document_name": approval.get('Document_Name__c', ''),
                "s3_key": approval.get('S3_Key__c', ''),
                "status": approval.get('Status__c', 'pending'),
                "approved_date": approval.get('Approved_Date__c'),
                "rejected_date": approval.get('Rejected_Date__c'),
                "upload_date": approval.get('Upload_Date__c'),
                "file_size": approval.get('File_Size__c', 0),
                "file_type": approval.get('File_Type__c', ''),
                "is_active": True,  # Default since IsActive__c field doesn't exist
                
                # Document needs information (simplified since lookup doesn't exist)
                "document_needs": {
                    "name": "",
                    "category": approval.get('Category__c', ''),
                    "required": True,
                    "priority": "medium"
                },
                
                # Public notes
                "public_notes": [
                    {
                        "id": note['Id'],
                        "name": note.get('Name', ''),
                        "note": note.get('Note__c', ''),
                        "created_date": note.get('Created_Date__c'),
                        "created_by": note.get('CreatedBy', {}).get('Name', '') if note.get('CreatedBy') else '',
                        "is_public": note.get('IsPublic__c', False)
                    }
                    for note in public_notes
                ]
            }
            
            documents_with_notes.append(document_data)
        
        # Group documents by category for better organization
        categories = {}
        for doc in documents_with_notes:
            category = doc['category'] or 'Other'
            if category not in categories:
                categories[category] = {
                    "category": category,
                    "category_display": category.replace('_', ' ').title(),
                    "documents": []
                }
            categories[category]["documents"].append(doc)
        
        logger.info(f"✅ Successfully retrieved document approvals with notes")
        
        return {
            "success": True,
            "opportunity_id": opportunity_id,
            "source": "salesforce",
            "documents": documents_with_notes,
            "categories": categories,
            "total_documents": len(documents_with_notes),
            "total_categories": len(categories),
            "summary": {
                "approved": len([doc for doc in documents_with_notes if doc['status'] == 'approved']),
                "pending": len([doc for doc in documents_with_notes if doc['status'] == 'pending']),
                "rejected": len([doc for doc in documents_with_notes if doc['status'] == 'rejected']),
                "with_s3_files": len([doc for doc in documents_with_notes if doc['s3_key']]),
                "with_public_notes": len([doc for doc in documents_with_notes if doc['public_notes']])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting document approvals for {opportunity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get document approvals: {str(e)}")

def _get_file_type_from_filename(filename: str) -> str:
    """Extract file type from filename"""
    if not filename:
        return ""
    
    # Get file extension
    if '.' in filename:
        extension = filename.split('.')[-1].lower()
        
        # Map common extensions to readable types
        type_mapping = {
            'pdf': 'PDF',
            'doc': 'Word Document',
            'docx': 'Word Document', 
            'xls': 'Excel Spreadsheet',
            'xlsx': 'Excel Spreadsheet',
            'jpg': 'Image',
            'jpeg': 'Image',
            'png': 'Image',
            'gif': 'Image',
            'txt': 'Text File',
            'csv': 'CSV File',
            'zip': 'Archive',
            'rar': 'Archive'
        }
        
        return type_mapping.get(extension, extension.upper())
    
    return "Unknown"

@router.get("/opportunities/{opportunity_id}/interactive-documents")
async def get_interactive_document_structure(opportunity_id: str):
    """Get interactive folder structure with document needs and uploaded documents for an opportunity"""
    try:
        from salesforce.connection import SalesforceConnection
        
        logger.info(f"🗂️ Getting interactive document structure for opportunity: {opportunity_id}")
        
        # Get Salesforce connection
        sf_connection = SalesforceConnection()
        if not sf_connection.is_connected:
            raise HTTPException(status_code=500, detail="Salesforce connection not available")
        
        # First, get the opportunity and its loan type
        opportunity_query = f"""
            SELECT Id, Name, LoanType__c, LoanType__r.Name
            FROM Opportunity 
            WHERE Id = '{opportunity_id}'
            LIMIT 1
        """
        
        opp_result = sf_connection.sf.query(opportunity_query)
        if not opp_result['records']:
            raise HTTPException(status_code=404, detail=f"Opportunity '{opportunity_id}' not found")
        
        opportunity = opp_result['records'][0]
        loan_type_id = opportunity.get('LoanType__c')
        loan_type_name = opportunity.get('LoanType__r', {}).get('Name', '') if opportunity.get('LoanType__r') else ''
        
        if not loan_type_id:
            logger.warning(f"⚠️ Opportunity {opportunity_id} does not have a loan type assigned, using basic structure")
            
            # Return basic structure with just uploaded documents
            document_approvals = []
            try:
                document_approvals_query = f"""
                    SELECT Id, Name, Opportunity__c, DocumentFolder__c, ContentDocumentId__c, S3_Key__c, 
                           ApprovalStatus__c, UploadedDate__c, ReviewNotes__c, ReviewedBy__c
                    FROM DocumentApproval__c 
                    WHERE Opportunity__c = '{opportunity_id}' 
                    ORDER BY DocumentFolder__c ASC, UploadedDate__c DESC
                """
                
                approvals_result = sf_connection.sf.query(document_approvals_query)
                document_approvals = approvals_result['records']
            except Exception as approval_error:
                logger.warning(f"⚠️ Could not query DocumentApproval__c: {str(approval_error)}")
                document_approvals = []
            
            # Create basic folder structure from uploaded documents only
            folder_structure = {}
            
            for approval in document_approvals:
                category = approval.get('DocumentFolder__c', 'Other')
                
                if category not in folder_structure:
                    folder_structure[category] = {
                        "category": category,
                        "category_display": category.replace('_', ' ').title() if category else 'Other',
                        "required_documents": [],
                        "uploaded_documents": [],
                        "summary": {
                            "total_required": 0,
                            "total_uploaded": 0,
                            "approved": 0,
                            "pending": 0,
                            "rejected": 0
                        }
                    }
                
                # Get public notes for this document
                public_notes = []
                try:
                    notes_query = f"""
                        SELECT Id, Name, DocumentApproval__c, NoteContent__c, 
                               CreatedDate, CreatedById, IsPublic__c
                        FROM DocumentNote__c 
                        WHERE DocumentApproval__c = '{approval['Id']}' 
                        AND IsPublic__c = true
                        ORDER BY CreatedDate DESC
                    """
                    
                    notes_result = sf_connection.sf.query(notes_query)
                    public_notes = [
                        {
                            "id": note['Id'],
                            "note": note.get('NoteContent__c', ''),
                            "created_date": note.get('CreatedDate'),
                            "created_by": note.get('CreatedById', ''),
                        }
                        for note in notes_result['records']
                    ]
                except Exception as notes_error:
                    logger.warning(f"⚠️ Could not query DocumentNote__c: {str(notes_error)}")
                    public_notes = []
                
                # Create uploaded document info
                s3_key = approval.get('S3_Key__c', '')
                
                # Extract actual filename from S3 key
                actual_filename = approval.get('Name', '')  # Fallback to record name
                if s3_key:
                    try:
                        # S3 key format: loan-documents/opportunity_id/category/requirement/filename
                        filename_from_s3 = s3_key.split('/')[-1]  # Get last part (filename)
                        if filename_from_s3:
                            actual_filename = filename_from_s3
                    except:
                        pass  # Keep fallback name if parsing fails
                
                uploaded_doc = {
                    "id": approval['Id'],
                    "name": actual_filename,  # Use actual filename from S3
                    "document_name": actual_filename,  # Use actual filename
                    "content_document_id": approval.get('ContentDocumentId__c', ''),
                    "s3_key": s3_key,
                    "status": approval.get('ApprovalStatus__c', 'pending'),
                    "approved_date": None,
                    "rejected_date": None,
                    "upload_date": approval.get('UploadedDate__c'),
                    "file_size": 0,
                    "file_type": _get_file_type_from_filename(actual_filename),  # Extract file type
                    "document_needs_id": None,
                    "review_notes": approval.get('ReviewNotes__c', ''),
                    "public_notes": public_notes
                }
                
                folder_structure[category]["uploaded_documents"].append(uploaded_doc)
                folder_structure[category]["summary"]["total_uploaded"] += 1
                
                # Update status counts
                status = uploaded_doc["status"]
                if status == "approved":
                    folder_structure[category]["summary"]["approved"] += 1
                elif status == "rejected":
                    folder_structure[category]["summary"]["rejected"] += 1
                else:
                    folder_structure[category]["summary"]["pending"] += 1
            
            # Convert to list format and calculate overall summary
            categories_list = list(folder_structure.values())
            overall_summary = {
                "total_categories": len(folder_structure),
                "total_required": 0,
                "total_uploaded": sum(cat["summary"]["total_uploaded"] for cat in categories_list),
                "approved": sum(cat["summary"]["approved"] for cat in categories_list),
                "pending": sum(cat["summary"]["pending"] for cat in categories_list),
                "rejected": sum(cat["summary"]["rejected"] for cat in categories_list),
                "completion_percentage": 0
            }
            
            logger.info(f"✅ Created basic document structure with {len(categories_list)} categories")
            
            return {
                "success": True,
                "opportunity_id": opportunity_id,
                "loan_type": None,
                "loan_type_name": "No Loan Type Assigned",
                "categories": categories_list,
                "summary": overall_summary,
                "message": "Basic document structure (no loan type assigned)"
            }
        
        logger.info(f"📋 Opportunity loan type: {loan_type_name} (ID: {loan_type_id})")
        
        # Get document needs for this loan type
        document_needs_query = f"""
            SELECT Id, Name, Loan_Document__r.Category__c, LoanType__c
            FROM DocumentNeedsList__c 
            WHERE LoanType__c = '{loan_type_id}' 
            ORDER BY Loan_Document__r.Category__c ASC, Name ASC
        """
        
        needs_result = sf_connection.sf.query(document_needs_query)
        document_needs = needs_result['records']
        #logger.info(f"📋 Found {len(document_needs)} document needs")
        # Get document approvals for this opportunity
        document_approvals = []
        try:
            document_approvals_query = f"""
                SELECT Id, Name, Opportunity__c, DocumentFolder__c, ContentDocumentId__c, S3_Key__c, 
                       ApprovalStatus__c, UploadedDate__c, ReviewNotes__c, ReviewedBy__c, DocumentRequirement__c
                FROM DocumentApproval__c 
                WHERE Opportunity__c = '{opportunity_id}' 
                ORDER BY DocumentFolder__c ASC, UploadedDate__c DESC
            """
            
            approvals_result = sf_connection.sf.query(document_approvals_query)
            document_approvals = approvals_result['records']
        except Exception as approval_error:
            logger.warning(f"⚠️ Could not query DocumentApproval__c: {str(approval_error)}")
            logger.info("📋 Using empty document approvals list")
            document_approvals = []
        
        logger.info(f"📄 Found {len(document_needs)} document needs and {len(document_approvals)} uploaded documents")
        
        # Create interactive folder structure
        folder_structure = {}
        
        # First, create the structure based on document needs
        for need in document_needs:
            LoanDocument = need.get('Loan_Document__r', {})
            category = LoanDocument.get('Category__c', 'Other') or 'Other'
            if category not in folder_structure:
                folder_structure[category] = {
                    "category": category,
                    "category_display": category.replace('_', ' ').title(),
                    "required_documents": [],
                    "uploaded_documents": [],
                    "summary": {
                        "total_required": 0,
                        "total_uploaded": 0,
                        "approved": 0,
                        "pending": 0,
                        "rejected": 0
                    }
                }
            
            # Add document need
            document_need = {
                "id": need['Id'],
                "name": need['Name'],
                "category": category,
                "required": True,  # Default to required since IsRequired__c field doesn't exist
                "priority": "medium",  # Default since no Priority field exists
                "description": "",  # Empty since no Description field exists
                "type": "",  # Default since Type__c field doesn't exist
                "sort_order": 0,  # Default since no Sort_Order field exists
                "uploaded_files": [],  # Will be populated below
                "has_uploads": False,
                "latest_status": None,
                "public_notes": []
            }
            
            folder_structure[category]["required_documents"].append(document_need)
            folder_structure[category]["summary"]["total_required"] += 1
        
        # Now, match uploaded documents to document needs and get their notes
        processed_document_ids = set()  # Track processed documents to avoid duplicates
        
        for approval in document_approvals:
            category = approval.get('DocumentFolder__c', 'Other') or 'Other'  # Using DocumentFolder__c instead of Category__c
            document_needs_id = approval.get('DocumentRequirement__c')  # Now we have the DocumentRequirement__c field!
            
            # Ensure category exists in structure
            if category not in folder_structure:
                folder_structure[category] = {
                    "category": category,
                    "category_display": category.replace('_', ' ').title() if category else 'Other',
                    "required_documents": [],
                    "uploaded_documents": [],
                    "summary": {
                        "total_required": 0,
                        "total_uploaded": 0,
                        "approved": 0,
                        "pending": 0,
                        "rejected": 0
                    }
                }
            
            # Skip if we've already processed this document
            if approval['Id'] in processed_document_ids:
                continue
                
            processed_document_ids.add(approval['Id'])
            
            # Get public notes for this document
            public_notes = []
            try:
                notes_query = f"""
                    SELECT Id, Name, DocumentApproval__c, NoteContent__c, 
                           CreatedDate, CreatedById, IsPublic__c
                    FROM DocumentNote__c 
                    WHERE DocumentApproval__c = '{approval['Id']}' 
                    AND IsPublic__c = true
                    ORDER BY CreatedDate DESC
                """
                
                notes_result = sf_connection.sf.query(notes_query)
                public_notes = [
                    {
                        "id": note['Id'],
                        "note": note.get('NoteContent__c', ''),  # Correct field name
                        "created_date": note.get('CreatedDate'),
                        "created_by": note.get('CreatedById', ''),
                    }
                    for note in notes_result['records']
                ]
            except Exception as notes_error:
                logger.warning(f"⚠️ Could not query DocumentNote__c: {str(notes_error)}")
                public_notes = []
            
            # Create uploaded document info
            s3_key = approval.get('S3_Key__c', '')
            
            # Extract actual filename from S3 key
            actual_filename = approval.get('Name', '')  # Fallback to record name
            if s3_key:
                try:
                    # S3 key format: loan-documents/opportunity_id/category/requirement/filename
                    filename_from_s3 = s3_key.split('/')[-1]  # Get last part (filename)
                    if filename_from_s3:
                        actual_filename = filename_from_s3
                except:
                    pass  # Keep fallback name if parsing fails
            
            uploaded_doc = {
                "id": approval['Id'],
                "name": actual_filename,  # Use actual filename from S3
                "document_name": actual_filename,  # Use actual filename
                "content_document_id": approval.get('ContentDocumentId__c', ''),
                "s3_key": s3_key,
                "status": approval.get('ApprovalStatus__c', 'pending'),
                "approved_date": None,
                "rejected_date": None,
                "upload_date": approval.get('UploadedDate__c'),
                "file_size": 0,
                "file_type": _get_file_type_from_filename(actual_filename),  # Extract file type
                "document_needs_id": document_needs_id,
                "review_notes": approval.get('ReviewNotes__c', ''),
                "public_notes": public_notes
            }
            
            # Update counts for this category (only once per document)
            folder_structure[category]["summary"]["total_uploaded"] += 1
            status = uploaded_doc["status"]
            if status == "approved":
                folder_structure[category]["summary"]["approved"] += 1
            elif status == "rejected":
                folder_structure[category]["summary"]["rejected"] += 1
            else:
                folder_structure[category]["summary"]["pending"] += 1
            
            # Link uploaded document to corresponding document need if it has one
            if document_needs_id:
                # Add to specific requirement's uploaded_files
                for req_doc in folder_structure[category]["required_documents"]:
                    if req_doc["id"] == document_needs_id:
                        req_doc["uploaded_files"].append(uploaded_doc)
                        req_doc["has_uploads"] = True
                        req_doc["latest_status"] = status
                        req_doc["public_notes"].extend(public_notes)
                        break
            else:
                # Add to category's general uploaded documents (no specific requirement)
                folder_structure[category]["uploaded_documents"].append(uploaded_doc)
        
        # Convert to list format and calculate overall summary
        categories_list = []
        overall_summary = {
            "total_categories": len(folder_structure),
            "total_required": 0,
            "total_uploaded": 0,
            "approved": 0,
            "pending": 0,
            "rejected": 0,
            "completion_percentage": 0
        }
        
        for category_data in folder_structure.values():
            categories_list.append(category_data)
            overall_summary["total_required"] += category_data["summary"]["total_required"]
            overall_summary["total_uploaded"] += category_data["summary"]["total_uploaded"]
            overall_summary["approved"] += category_data["summary"]["approved"]
            overall_summary["pending"] += category_data["summary"]["pending"]
            overall_summary["rejected"] += category_data["summary"]["rejected"]
        
        # Calculate completion percentage
        if overall_summary["total_required"] > 0:
            completed_requirements = len([
                req_doc for category in folder_structure.values() 
                for req_doc in category["required_documents"] 
                if req_doc["has_uploads"] and req_doc["latest_status"] == "approved"
            ])
            overall_summary["completion_percentage"] = round(
                (completed_requirements / overall_summary["total_required"]) * 100, 1
            )
        
        logger.info(f"✅ Successfully created interactive document structure")
        
        return {
            "success": True,
            "opportunity_id": opportunity_id,
            "opportunity_name": opportunity.get('Name', ''),
            "loan_type": loan_type_name,
            "loan_type_id": loan_type_id,
            "source": "salesforce",
            "folder_structure": categories_list,
            "overall_summary": overall_summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting interactive document structure for {opportunity_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get interactive document structure: {str(e)}") 