#!/usr/bin/env python3
"""
Messages API Routes - Real-time webhook-based messaging
Handles messaging between borrowers and loan officers via Salesforce Chatter
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Request
from pydantic import BaseModel
import asyncio
import json
from salesforce_connector_v2 import get_global_connector

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter()

# Global connector instance
connector = get_global_connector()

# In-memory message cache and real-time updates
# In production, use Redis or similar
message_cache = {}
active_websocket_connections = []
last_message_timestamps = {}

# Pydantic models for request/response
class SendMessageRequest(BaseModel):
    contact_id: str
    message: str
    notify_loan_officer: bool = False

class MessageResponse(BaseModel):
    id: str
    contact_id: str
    body: str
    created_date: str
    created_by: Dict[str, Any]

class WebhookPayload(BaseModel):
    """Salesforce Platform Event webhook payload"""
    event_type: str
    record_id: str
    parent_id: str
    created_by_id: str
    created_date: str
    body: str

@router.post("/webhook/new-message")
async def receive_new_message_webhook(payload: WebhookPayload):
    """Receive webhook notifications for new Chatter messages from Salesforce"""
    try:
        logger.info(f"🔔 Received webhook for new message: {payload.record_id}")
        
        # Update message cache with new message
        contact_id = payload.parent_id
        new_message = {
            "id": payload.record_id,
            "parentId": contact_id,
            "body": payload.body,
            "createdDate": payload.created_date,
            "createdBy": {
                "id": payload.created_by_id,
                "name": "Salesforce User",  # Will be enhanced
                "photoUrl": ""
            },
            "type": "TextPost",
            "likeCount": 0,
            "commentCount": 0
        }
        
        # Add to cache
        if contact_id not in message_cache:
            message_cache[contact_id] = []
        message_cache[contact_id].insert(0, new_message)
        
        # Update last message timestamp
        last_message_timestamps[contact_id] = datetime.now().isoformat()
        
        # Notify connected clients (WebSocket would be ideal here)
        logger.info(f"✅ New message cached for contact {contact_id}")
        
        return {"success": True, "message": "Webhook processed successfully"}
        
    except Exception as e:
        logger.error(f"❌ Error processing webhook: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/contact-owner")
async def get_contact_owner(contact_id: str = Query(...)):
    """Get the loan officer (contact owner) details - CACHED"""
    try:
        logger.info(f"🔍 Getting contact owner for contact: {contact_id}")
        
        # Return demo data for demo contacts
        if contact_id in ['MOCK_CONTACT', 'DEMO_CONTACT', 'test_contact', 'demo']:
            return {
                "success": True,
                "loan_officer": {
                    "id": "005000000000001",
                    "name": "Sanjay Prajapati",
                    "email": "sprajapati@ternus.com",
                    "phone": "(555) 123-4567",
                    "title": "Senior Loan Officer"
                }
            }
        
        # Check cache first
        cache_key = f"owner_{contact_id}"
        if cache_key in message_cache and message_cache[cache_key].get('expires', 0) > datetime.now().timestamp():
            logger.info("✅ Returning cached contact owner")
            return message_cache[cache_key]['data']
        
        # Get contact details with owner information (only if not cached)
        contact_manager = connector.contact_manager
        contact_details = contact_manager.get_contact_with_owner(contact_id)
        
        if not contact_details:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        owner_info = contact_details.get("owner", {})
        logger.info(f"✅ Found contact owner: {owner_info.get('name')} ({owner_info.get('email')})")
        
        response = {
            "success": True,
            "loan_officer": {
                "id": owner_info.get("id"),
                "name": owner_info.get("name"),
                "email": owner_info.get("email"),
                "phone": owner_info.get("phone"),
                "title": owner_info.get("title", "Loan Officer")
            }
        }
        
        # Cache for 1 hour
        message_cache[cache_key] = {
            'data': response,
            'expires': (datetime.now() + timedelta(hours=1)).timestamp()
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting contact owner: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/feed")
async def get_message_feed(
    contact_id: str = Query(...),
    limit: int = Query(20, ge=1, le=100),
    force_refresh: bool = Query(False)
):
    """Get message feed with smart caching"""
    try:
        logger.info(f"📨 Getting messages for contact: {contact_id}")
        
        # Check cache first (unless force refresh)
        cache_key = f"feed_{contact_id}"
        if not force_refresh and cache_key in message_cache:
            cached_data = message_cache[cache_key]
            if cached_data.get('expires', 0) > datetime.now().timestamp():
                logger.info("✅ Returning cached message feed")
                return cached_data['data']
        
        # Get fresh data from Salesforce
        feeditem_manager = connector.feeditem_manager
        messages = feeditem_manager.get_feed_items(contact_id, limit)
        
        response = {
            "success": True,
            "messages": messages,
            "total": len(messages),
            "contact_id": contact_id
        }
        
        # Cache for 5 minutes
        message_cache[cache_key] = {
            'data': response,
            'expires': (datetime.now() + timedelta(minutes=5)).timestamp()
        }
        
        logger.info(f"✅ Retrieved {len(messages)} messages for contact {contact_id}")
        return response
        
    except Exception as e:
        logger.error(f"❌ Error getting message feed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send")
async def send_message(request: SendMessageRequest):
    """Send a message via Chatter API"""
    try:
        logger.info(f"📤 Sending message to contact: {request.contact_id}")
        
        mentioned_user_ids = []
        if request.notify_loan_officer:
            # Get loan officer ID from cached contact owner
            owner_response = await get_contact_owner(request.contact_id)
            if owner_response.get("success"):
                loan_officer_id = owner_response["loan_officer"]["id"]
                mentioned_user_ids = [loan_officer_id]
                logger.info(f"👤 Mentioning loan officer: {loan_officer_id}")
        
        # Send message via Chatter API
        feeditem_manager = connector.feeditem_manager
        result = feeditem_manager.post_message(
            parent_id=request.contact_id,
            message=request.message,
            mentioned_user_ids=mentioned_user_ids
        )
        
        if result.get("success"):
            message_id = result.get("message_id")
            logger.info(f"✅ Message sent successfully: {message_id}")
            
            # Invalidate cache to force refresh
            cache_key = f"feed_{request.contact_id}"
            if cache_key in message_cache:
                del message_cache[cache_key]
            
            return {
                "success": True,
                "message_id": message_id,
                "message": "Message sent successfully"
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to send message"))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error sending message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-updates")
async def check_for_updates(contact_id: str = Query(...)):
    """Check for new messages since last check - OPTIMIZED"""
    try:
        # Check if there are cached updates
        last_check = last_message_timestamps.get(contact_id)
        
        if last_check:
            # Return timestamp of last known message
            return {
                "success": True,
                "has_updates": True,
                "last_message_time": last_check,
                "message": "Updates available - refresh feed"
            }
        
        return {
            "success": True,
            "has_updates": False,
            "message": "No new updates"
        }
        
    except Exception as e:
        logger.error(f"❌ Error checking updates: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/mark-read")
async def mark_messages_read(contact_id: str = Query(...)):
    """Mark messages as read for a contact"""
    try:
        logger.info(f"✅ Marking messages as read for contact: {contact_id}")
        
        # Reset the update timestamp for this contact
        if contact_id in last_message_timestamps:
            del last_message_timestamps[contact_id]
        
        return {
            "success": True,
            "message": "Messages marked as read"
        }
        
    except Exception as e:
        logger.error(f"❌ Error marking messages read: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/stats")
async def get_message_stats(contact_id: str = Query(...)):
    """Get message statistics with caching"""
    try:
        logger.info(f"📊 Getting message stats for contact: {contact_id}")
        
        # Get cached feed data if available
        cache_key = f"feed_{contact_id}"
        messages = []
        
        if cache_key in message_cache:
            cached_data = message_cache[cache_key]
            if cached_data.get('expires', 0) > datetime.now().timestamp():
                messages = cached_data['data'].get('messages', [])
        
        # If no cached data, get fresh (but don't cache stats)
        if not messages:
            feeditem_manager = connector.feeditem_manager
            messages = feeditem_manager.get_feed_items(contact_id, 50)
        
        # Calculate stats
        total_messages = len(messages)
        
        # Get loan officer ID
        owner_response = await get_contact_owner(contact_id)
        loan_officer_id = None
        if owner_response.get("success"):
            loan_officer_id = owner_response["loan_officer"]["id"]
        
        loan_officer_messages = 0
        if loan_officer_id:
            loan_officer_messages = len([m for m in messages if m.get("createdBy", {}).get("id") == loan_officer_id])
        
        # Check for unread (messages since last check)
        unread_messages = 1 if contact_id in last_message_timestamps else 0
        
        last_message_date = messages[0].get("createdDate", "") if messages else ""
        
        return {
            "success": True,
            "stats": {
                "total_messages": total_messages,
                "loan_officer_messages": loan_officer_messages,
                "unread_messages": unread_messages,
                "last_message_date": last_message_date
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting message stats: {str(e)}")
        return {"success": False, "error": str(e)}

# Cleanup task to prevent memory leaks
@router.on_event("startup")
async def setup_cleanup_task():
    """Setup periodic cleanup of expired cache entries"""
    async def cleanup_cache():
        while True:
            try:
                current_time = datetime.now().timestamp()
                expired_keys = [
                    key for key, value in message_cache.items()
                    if isinstance(value, dict) and value.get('expires', 0) < current_time
                ]
                
                for key in expired_keys:
                    del message_cache[key]
                
                if expired_keys:
                    logger.info(f"🧹 Cleaned up {len(expired_keys)} expired cache entries")
                
                # Sleep for 10 minutes before next cleanup
                await asyncio.sleep(600)
                
            except Exception as e:
                logger.error(f"❌ Cache cleanup error: {str(e)}")
                await asyncio.sleep(300)  # Retry in 5 minutes
    
    # Start cleanup task in background
    asyncio.create_task(cleanup_cache())

# Legacy endpoints for backward compatibility (but optimized)
@router.get("/poll-new")
async def poll_new_messages_legacy(contact_id: str = Query(...)):
    """Legacy polling endpoint - now just checks for updates"""
    return await check_for_updates(contact_id)

@router.get("/notification-check")
async def notification_check_legacy(contact_id: str = Query(...)):
    """Legacy notification check - now optimized"""
    return await check_for_updates(contact_id) 