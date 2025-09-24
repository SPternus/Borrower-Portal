"""
Cache utilities for the Ternus Borrower Profile API
"""
import logging
from typing import Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# In-memory cache for contact IDs
TOKEN_CACHE = {}
CACHE_DURATION = 5 * 60  # 5 minutes


def get_cached_contact_id(token: str) -> Optional[str]:
    """Get cached contact ID for a token"""
    if token in TOKEN_CACHE:
        cache_entry = TOKEN_CACHE[token]
        if datetime.now() < cache_entry['expires']:
            logger.info(f"✅ Cache hit for token")
            return cache_entry['contact_id']
        else:
            # Remove expired entry
            del TOKEN_CACHE[token]
            logger.info(f"🕒 Cache expired for token")
    
    return None


def cache_contact_id(token: str, contact_id: str):
    """Cache contact ID for a token"""
    TOKEN_CACHE[token] = {
        'contact_id': contact_id,
        'expires': datetime.now() + timedelta(seconds=CACHE_DURATION)
    }
    logger.info(f"💾 Cached contact ID for token")


def clear_cache():
    """Clear all cached entries"""
    global TOKEN_CACHE
    TOKEN_CACHE = {}
    logger.info("🧹 Cache cleared")


def get_cache_stats():
    """Get cache statistics"""
    now = datetime.now()
    active_entries = sum(1 for entry in TOKEN_CACHE.values() if now < entry['expires'])
    expired_entries = len(TOKEN_CACHE) - active_entries
    
    return {
        "total_entries": len(TOKEN_CACHE),
        "active_entries": active_entries,
        "expired_entries": expired_entries
    } 