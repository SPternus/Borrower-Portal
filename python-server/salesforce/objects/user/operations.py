#!/usr/bin/env python3
"""
User Operations
Contains all business logic for User operations
"""

import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class UserOperations:
    """Contains all User-specific business operations"""
    
    def __init__(self, manager):
        self.manager = manager
    
    def get_user_details(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed user information"""
        if not self.manager.is_connected:
            return self._mock_user_details(user_id)
        
        try:
            # Use SOQL query to get specific User fields
            soql = f"""
            SELECT Id, FirstName, LastName, Email, Phone, Title, Department, 
                   IsActive, UserRole.Name, Profile.Name, SmallPhotoUrl, FullPhotoUrl
            FROM User 
            WHERE Id = '{user_id}'
            LIMIT 1
            """
            results = self.manager.query(soql)
            
            if not results:
                return None
            
            user = results[0]
            
            return {
                "id": user["Id"],
                "firstName": user.get("FirstName", ""),
                "lastName": user.get("LastName", ""),
                "fullName": f"{user.get('FirstName', '')} {user.get('LastName', '')}".strip(),
                "email": user.get("Email", ""),
                "phone": user.get("Phone", ""),
                "title": user.get("Title", ""),
                "department": user.get("Department", ""),
                "isActive": user.get("IsActive", False),
                "roleName": user.get("UserRole", {}).get("Name", "") if user.get("UserRole") else "",
                "profileName": user.get("Profile", {}).get("Name", "") if user.get("Profile") else "",
                "photoUrl": user.get("SmallPhotoUrl", ""),
                "fullPhotoUrl": user.get("FullPhotoUrl", "")
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting user details for {user_id}: {str(e)}")
            return self._mock_user_details(user_id)
    
    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find user by email address"""
        if not self.manager.is_connected:
            return self._mock_user_details("005000000000001")
        
        try:
            soql = f"""
            SELECT Id, FirstName, LastName, Email, Phone, Title, Department, 
                   IsActive, UserRole.Name, Profile.Name, SmallPhotoUrl, FullPhotoUrl
            FROM User 
            WHERE Email = '{email}' AND IsActive = true
            LIMIT 1
            """
            results = self.manager.query(soql)
            
            if results:
                user = results[0]
                return {
                    "id": user["Id"],
                    "firstName": user.get("FirstName", ""),
                    "lastName": user.get("LastName", ""),
                    "fullName": f"{user.get('FirstName', '')} {user.get('LastName', '')}".strip(),
                    "email": user.get("Email", ""),
                    "phone": user.get("Phone", ""),
                    "title": user.get("Title", ""),
                    "department": user.get("Department", ""),
                    "isActive": user.get("IsActive", False),
                    "roleName": user.get("UserRole", {}).get("Name", "") if user.get("UserRole") else "",
                    "profileName": user.get("Profile", {}).get("Name", "") if user.get("Profile") else "",
                    "photoUrl": user.get("SmallPhotoUrl", ""),
                    "fullPhotoUrl": user.get("FullPhotoUrl", "")
                }
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error finding user by email {email}: {str(e)}")
            return None
    
    def get_users_by_ids(self, user_ids: List[str]) -> List[Dict[str, Any]]:
        """Get multiple users by their IDs"""
        if not self.manager.is_connected:
            return [self._mock_user_details(user_id) for user_id in user_ids]
        
        if not user_ids:
            return []
        
        try:
            # Convert list to SOQL IN clause
            ids_string = "','".join(user_ids)
            soql = f"""
            SELECT Id, FirstName, LastName, Email, Phone, Title, Department, 
                   IsActive, UserRole.Name, Profile.Name, SmallPhotoUrl, FullPhotoUrl
            FROM User 
            WHERE Id IN ('{ids_string}') AND IsActive = true
            """
            results = self.manager.query(soql)
            
            users = []
            for user in results:
                users.append({
                    "id": user["Id"],
                    "firstName": user.get("FirstName", ""),
                    "lastName": user.get("LastName", ""),
                    "fullName": f"{user.get('FirstName', '')} {user.get('LastName', '')}".strip(),
                    "email": user.get("Email", ""),
                    "phone": user.get("Phone", ""),
                    "title": user.get("Title", ""),
                    "department": user.get("Department", ""),
                    "isActive": user.get("IsActive", False),
                    "roleName": user.get("UserRole", {}).get("Name", "") if user.get("UserRole") else "",
                    "profileName": user.get("Profile", {}).get("Name", "") if user.get("Profile") else "",
                    "photoUrl": user.get("SmallPhotoUrl", ""),
                    "fullPhotoUrl": user.get("FullPhotoUrl", "")
                })
            
            return users
            
        except Exception as e:
            logger.error(f"❌ Error getting users by IDs: {str(e)}")
            return [self._mock_user_details(user_id) for user_id in user_ids]
    
    def _mock_user_details(self, user_id: str = "005000000000001") -> Dict[str, Any]:
        """Return mock user data for development/testing"""
        return {
            "id": user_id,
            "firstName": "Cody",
            "lastName": "Sento",
            "fullName": "Cody Sento",
            "email": "cody.sento@ternus.com",
            "phone": "(555) 123-4567",
            "title": "Senior Loan Officer",
            "department": "Lending",
            "isActive": True,
            "roleName": "Loan Officer",
            "profileName": "Standard User",
            "photoUrl": "/public/images/team/cody-sento.jpg",
            "fullPhotoUrl": "/public/images/team/cody-sento.jpg"
        } 