#!/usr/bin/env python3
"""
Draw Manager for Salesforce Draw__c Object
Handles construction loan draw requests and management
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from ..base_manager import BaseSalesforceManager

logger = logging.getLogger(__name__)

class DrawManager(BaseSalesforceManager):
    """Manager for Draw__c Salesforce object"""
    
    def __init__(self):
        super().__init__('Draw__c')
        self.operations = DrawOperations(self)
    
    def get_draws_for_opportunity(self, opportunity_id: str) -> List[Dict[str, Any]]:
        """Get all draws for an opportunity"""
        return self.operations.get_draws_for_opportunity(opportunity_id)
    
    def create_draw_request(self, opportunity_id: str, draw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new draw request"""
        return self.operations.create_draw_request(opportunity_id, draw_data)
    
    def update_draw_status(self, draw_id: str, status: str, notes: str = None) -> Dict[str, Any]:
        """Update draw status"""
        return self.operations.update_draw_status(draw_id, status, notes)
    
    def get_draw_summary(self, opportunity_id: str) -> Dict[str, Any]:
        """Get draw summary statistics for an opportunity"""
        return self.operations.get_draw_summary(opportunity_id)

class DrawOperations:
    """Contains all Draw-specific business operations"""
    
    def __init__(self, manager):
        self.manager = manager
    
    def get_draws_for_opportunity(self, opportunity_id: str) -> List[Dict[str, Any]]:
        """Get all draws for an opportunity with formatted response"""
        try:
            # Always try to connect to Salesforce first
            if not self.manager.is_connected:
                logger.warning("⚠️ Salesforce not connected, attempting to reconnect...")
                self.manager.connection.reconnect()
            
            if not self.manager.is_connected:
                logger.error("❌ Cannot connect to Salesforce - using mock data")
                return self._mock_draws()
            
            # SOQL query to get draws for opportunity - using actual field names
            soql = f"""
            SELECT Id, Name, Opportunity__c, Requested_Amount__c, Approved_Amount__c, 
                   Released_Amount__c, Status__c, Requested_Date__c, Disbursement_Date__c,
                   Description__c, Draw_Fee__c, Notes__c, Rejection_Reason__c,
                   Verified_By__c, Authorized_By__c, Released_By__c, Requested_By__c,
                   CreatedById, LastModifiedById
            FROM Draw__c 
            WHERE Opportunity__c = '{opportunity_id}'
            ORDER BY Requested_Date__c DESC
            """
            
            logger.info(f"🔍 Executing SOQL query for draws: {soql}")
            query_result = self.manager.connection.query(soql)
            
            if not query_result or 'records' not in query_result:
                logger.warning(f"⚠️ No records returned for opportunity {opportunity_id}")
                return []
            
            results = query_result['records']
            draws = []
            
            logger.info(f"📊 Found {len(results)} Draw__c records for opportunity {opportunity_id}")
            
            for draw in results:
                formatted_draw = {
                    "id": draw["Id"],
                    "name": draw["Name"],
                    "drawNumber": self._extract_draw_number(draw["Name"]),
                    "requestedAmount": float(draw["Requested_Amount__c"] or 0),
                    "approvedAmount": float(draw["Approved_Amount__c"] or 0) if draw["Approved_Amount__c"] else None,
                    "releasedAmount": float(draw["Released_Amount__c"] or 0) if draw["Released_Amount__c"] else None,
                    "status": self._normalize_status(draw["Status__c"]),
                    "requestDate": draw["Requested_Date__c"],
                    "disbursementDate": draw["Disbursement_Date__c"],
                    "description": draw["Description__c"] or "",
                    "drawFee": float(draw["Draw_Fee__c"] or 0),
                    "notes": draw["Notes__c"] or "",
                    "rejectionReason": draw["Rejection_Reason__c"] or "",
                    "verifiedBy": draw["Verified_By__c"],
                    "authorizedBy": draw["Authorized_By__c"],
                    "releasedBy": draw["Released_By__c"],
                    "requestedBy": draw["Requested_By__c"],
                    "createdById": draw["CreatedById"],
                    "lastModifiedById": draw["LastModifiedById"]
                }
                draws.append(formatted_draw)
            
            logger.info(f"✅ Retrieved {len(draws)} draws for opportunity {opportunity_id}")
            return draws
            
        except Exception as e:
            logger.error(f"❌ Error getting draws for opportunity {opportunity_id}: {str(e)}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            logger.error(f"❌ Salesforce connected: {self.manager.is_connected}")
            
            # Don't return mock data - return empty list or raise the error
            raise Exception(f"Failed to fetch Draw__c records from Salesforce: {str(e)}")
    
    def create_draw_request(self, opportunity_id: str, draw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new draw request"""
        if not self.manager.is_connected:
            return self._mock_create_draw()
        
        try:
            # Get the next draw number
            draw_number = self._get_next_draw_number(opportunity_id)
            
            # Get current user ID from auth information
            current_user_id = self._get_salesforce_user_id(draw_data.get("auth0_user_id"), draw_data.get("email"))
            
            # Prepare draw data for Salesforce using correct field names
            sf_data = {
                "Opportunity__c": opportunity_id,
                "Requested_Amount__c": float(draw_data.get("requestedAmount", 0)),
                "Description__c": draw_data.get("description", ""),
                "Status__c": "Pending",
                "Requested_Date__c": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000+0000"),
                "Requested_By__c": current_user_id,  # Required field
                "Authorized_By__c": current_user_id,  # Required field - can be same as requester initially
                "Released_By__c": current_user_id     # Required field - can be same as requester initially
            }
            
            logger.info(f"🔍 Attempting to create Draw__c with data: {sf_data}")
            result = self.manager.create(sf_data)
            logger.info(f"🔍 Salesforce create result: {result}")
            
            if result.get("success"):
                logger.info(f"✅ Created draw request: {result['id']}")
                return {
                    "success": True,
                    "drawId": result["id"],
                    "drawNumber": draw_number,
                    "message": "Draw request created successfully"
                }
            else:
                logger.error(f"❌ Salesforce create failed: {result}")
                return {
                    "success": False,
                    "error": result.get("error", "Failed to create draw request")
                }
                
        except Exception as e:
            logger.error(f"❌ Error creating draw request: {str(e)}")
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
            # For now, we'll use the contact's Owner (which should be a User)
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
    
    def update_draw_status(self, draw_id: str, status: str, notes: str = None) -> Dict[str, Any]:
        """Update draw status"""
        if not self.manager.is_connected:
            return {"success": True, "message": "Mock update successful"}
        
        try:
            update_data = {
                "Status__c": status
            }
            
            if status.lower() == "disbursed" or status.lower() == "released":
                update_data["Disbursement_Date__c"] = datetime.now().strftime("%Y-%m-%dT%H:%M:%S.000+0000")
            
            if notes:
                update_data["Notes__c"] = notes
            
            if status.lower() == "rejected" and notes:
                update_data["Rejection_Reason__c"] = notes
            
            result = self.manager.update(draw_id, update_data)
            
            if result.get("success"):
                logger.info(f"✅ Updated draw {draw_id} status to {status}")
                return {
                    "success": True,
                    "message": f"Draw status updated to {status}"
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Failed to update draw status")
                }
                
        except Exception as e:
            logger.error(f"❌ Error updating draw status: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_draw_summary(self, opportunity_id: str) -> Dict[str, Any]:
        """Get draw summary statistics for an opportunity"""
        draws = self.get_draws_for_opportunity(opportunity_id)
        
        total_requested = sum(draw["requestedAmount"] for draw in draws)
        total_approved = sum(draw["approvedAmount"] for draw in draws if draw["approvedAmount"])
        total_released = sum(draw["releasedAmount"] for draw in draws if draw["releasedAmount"])
        
        # Get escrow information (this would come from Opportunity or related objects)
        escrow_hold_back = 50000.00  # This should come from Opportunity__c
        available_amount = escrow_hold_back - total_released
        usage_percentage = (total_released / escrow_hold_back * 100) if escrow_hold_back > 0 else 0
        
        return {
            "escrowHoldBack": escrow_hold_back,
            "availableAmount": available_amount,
            "usagePercentage": usage_percentage,
            "currentStage": "Closed Won",  # This should come from Opportunity
            "budgetUsed": total_released,
            "totalDrawRequests": len(draws),
            "totalRequested": total_requested,
            "totalApproved": total_approved,
            "totalReleased": total_released
        }
    
    def _extract_draw_number(self, draw_name: str) -> int:
        """Extract draw number from draw name (e.g., DRAW-0007 -> 7)"""
        try:
            if "DRAW-" in draw_name:
                return int(draw_name.split("DRAW-")[1])
            return 1
        except:
            return 1
    
    def _get_next_draw_number(self, opportunity_id: str) -> int:
        """Get the next draw number for an opportunity"""
        if not self.manager.is_connected:
            return 1
        
        try:
            soql = f"""
            SELECT Name FROM Draw__c 
            WHERE Opportunity__c = '{opportunity_id}'
            ORDER BY Name DESC
            LIMIT 1
            """
            
            results = self.manager.query(soql)
            if results:
                last_draw_number = self._extract_draw_number(results[0]["Name"])
                return last_draw_number + 1
            return 1
            
        except Exception as e:
            logger.error(f"Error getting next draw number: {str(e)}")
            return 1
    
    def _normalize_status(self, status: str) -> str:
        """Normalize status values"""
        if not status:
            return "pending"
        
        status_lower = status.lower()
        if status_lower in ["released", "disbursed"]:
            return "disbursed"
        elif status_lower in ["approved"]:
            return "approved"
        elif status_lower in ["rejected", "denied"]:
            return "rejected"
        else:
            return "pending"
    
    def _mock_draws(self) -> List[Dict[str, Any]]:
        """Mock draw data for testing"""
        return [
            {
                "id": "a0X000000001",
                "name": "DRAW-0007",
                "drawNumber": 7,
                "requestedAmount": 10000.00,
                "approvedAmount": 8000.00,
                "releasedAmount": 7800.00,
                "status": "disbursed",
                "requestDate": "2024-09-05",
                "approvalDate": "2024-09-06",
                "releaseDate": "2024-09-07",
                "purpose": "I completed HVAC",
                "description": "HVAC system installation completed",
                "fee": 200.00,
                "verifiedBy": "Sanjay Prajapati",
                "authorizedBy": "Sanjay Prajapati",
                "releasedBy": "Sanjay Prajapati",
                "notes": "Sep 05, 2025 14:55 - This is not completed yet there are few things left\n\nSep 05, 2025 14:57 - Good to go we have initiated ACH",
                "inspectionRequired": True,
                "inspectionCompleted": True,
                "inspectionDate": "2024-09-06",
                "currentStage": "Closed Won",
                "usagePercentage": 90.0,
                "budgetUsed": 38000.00
            },
            {
                "id": "a0X000000002",
                "name": "DRAW-0006",
                "drawNumber": 6,
                "requestedAmount": 10000.00,
                "approvedAmount": 5000.00,
                "releasedAmount": 4750.00,
                "status": "disbursed",
                "requestDate": "2024-09-01",
                "approvalDate": "2024-09-02",
                "releaseDate": "2024-09-03",
                "purpose": "Paying for kitchen",
                "description": "Kitchen renovation payment",
                "fee": 250.00,
                "verifiedBy": "Sanjay Prajapati",
                "authorizedBy": "Sanjay Prajapati",
                "releasedBy": "Sanjay Prajapati",
                "notes": "",
                "inspectionRequired": True,
                "inspectionCompleted": True,
                "inspectionDate": "2024-09-02",
                "currentStage": "Closed Won",
                "usagePercentage": 90.0,
                "budgetUsed": 38000.00
            }
        ]
    
    def _mock_create_draw(self) -> Dict[str, Any]:
        """Mock create draw response"""
        return {
            "success": True,
            "drawId": "a0X000000003",
            "drawNumber": 8,
            "message": "Draw request created successfully (mock)"
        }
