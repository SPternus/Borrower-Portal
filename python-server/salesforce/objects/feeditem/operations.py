#!/usr/bin/env python3
"""
FeedItem Operations
Contains all business logic for FeedItem (Chatter) operations
"""

import logging
import requests
import re
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class FeedItemOperations:
    """Contains all FeedItem-specific business operations"""
    
    def __init__(self, manager):
        self.manager = manager
    
    def post_message(self, parent_id: str, message: str, mentioned_user_ids: List[str] = None) -> Dict[str, Any]:
        """Post a Chatter message with optional user mentions using Chatter REST API"""
        if not self.manager.is_connected:
            return self._mock_post_message(parent_id, message, mentioned_user_ids)
        
        try:
            # Build message segments for Chatter API
            message_segments = self._build_message_segments(message, mentioned_user_ids)
            
            # Create the Chatter feed element payload
            payload = {
                "body": {
                    "messageSegments": message_segments
                },
                "feedElementType": "FeedItem",
                "subjectId": parent_id
            }
            
            # Use Chatter REST API to post the message
            result = self._post_to_chatter_api(payload)
            
            if result.get("success"):
                logger.info(f"✅ Chatter message posted to {parent_id}: {result['id']}")
                return {
                    "success": True,
                    "id": result["id"],
                    "message": "Message posted successfully"
                }
            else:
                logger.error(f"❌ Failed to post Chatter message: {result}")
                return {"success": False, "error": "Failed to post message"}
            
        except Exception as e:
            logger.error(f"❌ Error posting Chatter message: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_feed_items(self, parent_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get feed items for a specific record with comments"""
        # Use our detailed mock data for demo purposes
        if parent_id in ['MOCK_CONTACT', 'DEMO_CONTACT', 'test_contact', 'demo']:
            return self._mock_feed_items(parent_id, limit)
        
        if not self.manager.is_connected:
            return self._mock_feed_items(parent_id, limit)
        
        try:
            soql = f"""
            SELECT Id, ParentId, Type, CreatedById, CreatedBy.Name,
                   CreatedDate, Body, LikeCount, CommentCount, InsertedById
            FROM FeedItem 
            WHERE ParentId = '{parent_id}'
            ORDER BY CreatedDate DESC
            LIMIT {limit}
            """
            results = self.manager.query(soql)
            
            feed_items = []
            for item in results:
                # Clean HTML tags from body
                clean_body = self._clean_html_tags(item.get("Body", ""))
                
                feed_item = {
                    "id": item["Id"],
                    "parentId": item.get("ParentId", ""),
                    "type": item.get("Type", ""),
                    "body": clean_body,
                    "createdDate": item.get("CreatedDate", ""),
                    "likeCount": item.get("LikeCount", 0),
                    "commentCount": item.get("CommentCount", 0),
                    "createdBy": {
                        "id": item.get("CreatedById", ""),
                        "name": item.get("CreatedBy", {}).get("Name", "") if item.get("CreatedBy") else "",
                        "photoUrl": ""
                    }
                }
                
                # Fetch comments for this feed item
                if item.get("CommentCount", 0) > 0:
                    feed_item["comments"] = self._get_feed_comments(item["Id"])
                else:
                    feed_item["comments"] = []
                
                feed_items.append(feed_item)
            
            return feed_items
            
        except Exception as e:
            logger.error(f"❌ Error getting feed items for {parent_id}: {str(e)}")
            return self._mock_feed_items(parent_id, limit)
    
    def _get_feed_comments(self, feed_item_id: str) -> List[Dict[str, Any]]:
        """Get comments for a specific feed item"""
        try:
            soql = f"""
            SELECT Id, FeedItemId, CommentBody, CreatedById, CreatedBy.Name,
                   CreatedDate, CommentType
            FROM FeedComment 
            WHERE FeedItemId = '{feed_item_id}'
            ORDER BY CreatedDate ASC
            LIMIT 50
            """
            results = self.manager.query(soql)
            
            comments = []
            for comment in results:
                # Clean HTML tags from comment body
                clean_body = self._clean_html_tags(comment.get("CommentBody", ""))
                
                comments.append({
                    "id": comment["Id"],
                    "feedItemId": comment.get("FeedItemId", ""),
                    "body": clean_body,
                    "createdDate": comment.get("CreatedDate", ""),
                    "commentType": comment.get("CommentType", ""),
                    "createdBy": {
                        "id": comment.get("CreatedById", ""),
                        "name": comment.get("CreatedBy", {}).get("Name", "") if comment.get("CreatedBy") else "",
                        "photoUrl": ""
                    }
                })
            
            return comments
            
        except Exception as e:
            logger.error(f"❌ Error getting comments for {feed_item_id}: {str(e)}")
            return []
    
    def _clean_html_tags(self, text: str) -> str:
        """Remove HTML tags and decode HTML entities from text"""
        if not text:
            return ""
        
        # Remove HTML tags
        clean_text = re.sub(r'<[^>]+>', '', text)
        
        # Decode common HTML entities
        html_entities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&nbsp;': ' ',
            '&hellip;': '...',
            '&mdash;': '—',
            '&ndash;': '–'
        }
        
        for entity, replacement in html_entities.items():
            clean_text = clean_text.replace(entity, replacement)
        
        # Clean up extra whitespace
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        return clean_text

    def get_contact_feed(self, contact_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get feed items specifically for a contact"""
        return self.get_feed_items(contact_id, limit)
    
    def _build_message_segments(self, message: str, mentioned_user_ids: List[str] = None) -> List[Dict[str, Any]]:
        """Build message segments for Chatter API with mentions and text"""
        segments = []
        
        # Add mentions first
        if mentioned_user_ids:
            for user_id in mentioned_user_ids:
                segments.append({
                    "type": "Mention",
                    "id": user_id
                })
                # Add a space after each mention
                segments.append({
                    "type": "Text",
                    "text": " "
                })
        
        # Add the main message text
        segments.append({
            "type": "Text", 
            "text": message
        })
        
        return segments
    
    def _post_to_chatter_api(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Post to Chatter REST API endpoint"""
        try:
            
            # Get the Salesforce instance URL and access token from the connection
            sf_instance = self.manager.connection.sf
            if not sf_instance:
                raise Exception("Salesforce connection not available")
                
            instance_url = sf_instance.sf_instance
            access_token = sf_instance.session_id
            
            # Ensure URL has https:// scheme
            if not instance_url.startswith('http'):
                instance_url = f"https://{instance_url}"
            
            # Chatter API endpoint
            chatter_url = f"{instance_url}/services/data/v59.0/chatter/feed-elements"
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(chatter_url, json=payload, headers=headers)
            
            if response.status_code == 201:
                result = response.json()
                return {
                    "success": True,
                    "id": result.get("id"),
                    "data": result
                }
            else:
                logger.error(f"❌ Chatter API error: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"❌ Error calling Chatter API: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _mock_post_message(self, parent_id: str, message: str, mentioned_user_ids: List[str] = None) -> Dict[str, Any]:
        """Mock posting a message for development/testing"""
        mock_id = f"0D5000000{len(message):06d}"
        logger.info(f"🔧 Mock: Posted Chatter message to {parent_id}: {mock_id}")
        return {
            "success": True,
            "id": mock_id,
            "message": "Message posted successfully (mock mode)"
        }
    
    def _mock_feed_items(self, parent_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Return mock feed items for development/testing"""
        return [
            {
                "id": "0D5000000000001",
                "parentId": parent_id,
                "type": "TextPost",
                "body": "Hi! I've reviewed your application. Could you please upload your most recent pay stubs?",
                "createdDate": "2024-01-15T10:30:00.000+0000",
                "likeCount": 0,
                "commentCount": 2,
                "createdBy": {
                    "id": "005000000000001",
                    "name": "Sanjay Prajapati",
                    "photoUrl": "/public/images/team/cody-sento.jpg"
                },
                "comments": [
                    {
                        "id": "0D7000000000001",
                        "feedItemId": "0D5000000000001",
                        "body": "Sure, I'll upload them today.",
                        "createdDate": "2024-01-15T11:15:00.000+0000",
                        "commentType": "TextComment",
                        "createdBy": {
                            "id": "003000000000001",
                            "name": "John Borrower",
                            "photoUrl": ""
                        }
                    },
                    {
                        "id": "0D7000000000002",
                        "feedItemId": "0D5000000000001",
                        "body": "Perfect! That will help speed up the process.",
                        "createdDate": "2024-01-15T11:45:00.000+0000",
                        "commentType": "TextComment",
                        "createdBy": {
                            "id": "005000000000001",
                            "name": "Sanjay Prajapati",
                            "photoUrl": "/public/images/team/cody-sento.jpg"
                        }
                    }
                ]
            },
            {
                "id": "0D5000000000002",
                "parentId": parent_id,
                "type": "TextPost",
                "body": "Thank you for submitting your application. I'll review it and get back to you within 24 hours.",
                "createdDate": "2024-01-14T15:45:00.000+0000",
                "likeCount": 1,
                "commentCount": 1,
                "createdBy": {
                    "id": "005000000000001",
                    "name": "Sanjay Prajapati",
                    "photoUrl": "/public/images/team/cody-sento.jpg"
                },
                "comments": [
                    {
                        "id": "0D7000000000003",
                        "feedItemId": "0D5000000000002",
                        "body": "Thank you! Looking forward to hearing from you.",
                        "createdDate": "2024-01-14T16:00:00.000+0000",
                        "commentType": "TextComment",
                        "createdBy": {
                            "id": "003000000000001",
                            "name": "John Borrower",
                            "photoUrl": ""
                        }
                    }
                ]
            },
            {
                "id": "0D5000000000003",
                "parentId": parent_id,
                "type": "TextPost",
                "body": "Welcome to Ternus! I'm your assigned loan officer and will be helping you through the process.",
                "createdDate": "2024-01-14T09:15:00.000+0000",
                "likeCount": 2,
                "commentCount": 0,
                "createdBy": {
                    "id": "005000000000001",
                    "name": "Sanjay Prajapati",
                    "photoUrl": "/public/images/team/cody-sento.jpg"
                },
                "comments": []
            },
            {
                "id": "0D5000000000004",
                "parentId": parent_id,
                "type": "TextPost",
                "body": "I just wanted to check in and see how everything is going with your loan application. Do you have any questions?",
                "createdDate": "2024-01-13T14:20:00.000+0000",
                "likeCount": 0,
                "commentCount": 1,
                "createdBy": {
                    "id": "003000000000001",
                    "name": "John Borrower",
                    "photoUrl": ""
                },
                "comments": [
                    {
                        "id": "0D7000000000004",
                        "feedItemId": "0D5000000000004",
                        "body": "Everything looks good so far! I'll reach out if I have any questions.",
                        "createdDate": "2024-01-13T15:30:00.000+0000",
                        "commentType": "TextComment",
                        "createdBy": {
                            "id": "005000000000001",
                            "name": "Sanjay Prajapati",
                            "photoUrl": "/public/images/team/cody-sento.jpg"
                        }
                    }
                ]
            }
        ] 