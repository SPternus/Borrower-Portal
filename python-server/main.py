#!/usr/bin/env python3
"""
Ternus Borrower Profile - Python FastAPI Backend (Refactored)
Clean, modular structure replacing the monolithic main.py
"""

import os
import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv

# Import services
from salesforce_connector_v2 import TernusSalesforceConnectorV2
from auth_service import TernusAuthService
from pricing_api import pricing_router

# Import business logic services
from services.contact_service import ContactService

# Import route modules
from routes.auth import configure_auth_routes
from routes.plaid import configure_plaid_routes
from routes.salesforce import configure_salesforce_routes
from routes.applications import configure_applications_routes
from routes.referrals import configure_referrals_routes
from routes.leads import configure_leads_routes
from routes.documents import configure_documents_routes
from routes.folders import configure_folder_routes
from routes.debug_folders import configure_debug_folder_routes
from routes.debug_upload import configure_debug_upload_routes
from routes.messages import router as messages_router
from routes.health import router as health_router
from routes.loan_types import router as loan_types_router
from routes.finix import configure_finix_routes
from routes.draws import configure_draw_routes
from routes.tasks import configure_task_routes
from routes.plaid import configure_plaid_routes

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Ternus Borrower Profile API",
    description="Python FastAPI backend for SFDC loan management - Refactored",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Initialize services
sfdc = TernusSalesforceConnectorV2()
auth_service = TernusAuthService(salesforce_connector=sfdc)
contact_service = ContactService(auth_service)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        os.getenv("CLIENT_URL", "http://localhost:3000")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Configure for production
)

# Include route modules
app.include_router(pricing_router)
app.include_router(health_router)

# Configure and include routes that need dependencies
auth_router = configure_auth_routes(auth_service, sfdc)
app.include_router(auth_router)

plaid_router = configure_plaid_routes(auth_service, sfdc, contact_service)
app.include_router(plaid_router)

salesforce_router = configure_salesforce_routes(auth_service, sfdc, contact_service)
app.include_router(salesforce_router)

applications_router = configure_applications_routes(auth_service, contact_service)
app.include_router(applications_router)

referrals_router = configure_referrals_routes(auth_service)
app.include_router(referrals_router)

leads_router = configure_leads_routes(auth_service, sfdc)
app.include_router(leads_router)

documents_router = configure_documents_routes(auth_service, sfdc)
app.include_router(documents_router, prefix="/api/documents")

folders_router = configure_folder_routes(auth_service, sfdc)
app.include_router(folders_router, prefix="/api/folders")

debug_folders_router = configure_debug_folder_routes(auth_service, sfdc)
app.include_router(debug_folders_router, prefix="/api")

debug_upload_router = configure_debug_upload_routes(auth_service, sfdc)
app.include_router(debug_upload_router, prefix="/api")


app.include_router(messages_router, prefix="/api/messages")
app.include_router(loan_types_router, prefix="/api/config")

# Configure Finix payment routes
finix_router = configure_finix_routes()
app.include_router(finix_router, prefix="/api")

# Configure Draw management routes
draws_router = configure_draw_routes(auth_service, sfdc)
app.include_router(draws_router, prefix="/api")

# Configure Task management routes
tasks_router = configure_task_routes(auth_service, sfdc)
app.include_router(tasks_router, prefix="/api")

# Configure Plaid routes
plaid_router = configure_plaid_routes(auth_service, sfdc, contact_service)
app.include_router(plaid_router, prefix="/api")

# Main entry point
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    
    print("🐍 Starting Ternus Python FastAPI Server (Refactored)")
    print(f"📡 Port: {port}")
    print(f"🌐 Client URL: {os.getenv('CLIENT_URL', 'http://localhost:3000')}")
    print(f"📊 Health: http://localhost:{port}/health")
    print(f"📖 Docs: http://localhost:{port}/docs")
    print("💰 Pricing: http://localhost:5000/api/pricing/")
    print("🚀 Ready for SFDC operations!")
    
    uvicorn.run(
        "main:app",  # Fixed: Use the current main file
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    ) 