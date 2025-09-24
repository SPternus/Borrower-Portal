#!/usr/bin/env python3
"""
Salesforce Connection Manager
Handles authentication and connection management for Salesforce
"""

import os
import logging
from typing import Optional
from simple_salesforce import Salesforce, SalesforceError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class SalesforceConnection:
    """Manages Salesforce connection and authentication"""
    
    _instance = None
    _sf = None
    _connected = False
    
    def __new__(cls):
        """Singleton pattern to ensure single connection instance"""
        if cls._instance is None:
            cls._instance = super(SalesforceConnection, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize connection if not already done"""
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self._connect()
    
    def _connect(self):
        """Establish connection to Salesforce"""
        try:
            # Environment variables for SFDC connection
            username = os.getenv('SALESFORCE_USERNAME')
            password = os.getenv('SALESFORCE_PASSWORD')
            security_token = os.getenv('SALESFORCE_SECURITY_TOKEN')
            instance_url = os.getenv('SALESFORCE_INSTANCE_URL', '')
            
            # Determine domain from instance URL
            if 'sandbox' in instance_url.lower():
                domain = 'test'
            else:
                domain = 'login'
            
            # Check if credentials are available
            if not all([username, password, security_token]):
                logger.warning("SFDC credentials not found, using mock mode")
                self._connected = False
                return
            
            # Connect to Salesforce
            self._sf = Salesforce(
                username=username,
                password=password,
                security_token=security_token,
                domain=domain
            )
            
            self._connected = True
            logger.info("✅ Connected to Salesforce successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to connect to Salesforce: {str(e)}")
            self._connected = False
    
    @property
    def sf(self) -> Optional[Salesforce]:
        """Get the Salesforce connection instance"""
        return self._sf
    
    @property
    def is_connected(self) -> bool:
        """Check if connected to Salesforce"""
        return self._connected
    
    def reconnect(self):
        """Reconnect to Salesforce"""
        self._connect()
    
    def query(self, soql: str):
        """Execute SOQL query"""
        if not self._connected:
            raise Exception("Not connected to Salesforce")
        return self._sf.query(soql)
    
    def query_all(self, soql: str):
        """Execute SOQL query including deleted records"""
        if not self._connected:
            raise Exception("Not connected to Salesforce")
        return self._sf.query_all(soql)
    
    def get_sobject(self, sobject_type: str):
        """Get SObject instance for operations"""
        if not self._connected:
            raise Exception("Not connected to Salesforce")
        return getattr(self._sf, sobject_type) 