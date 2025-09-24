#!/usr/bin/env python3

from routes.auth import configure_auth_routes
from auth_service import TernusAuthService
from salesforce_connector_v2 import TernusSalesforceConnectorV2

# Mock services
sfdc = TernusSalesforceConnectorV2()
auth_service = TernusAuthService(salesforce_connector=sfdc)

# Configure routes
router = configure_auth_routes(auth_service, sfdc)

print("=== AUTH ROUTES ===")
for route in router.routes:
    if hasattr(route, 'path'):
        print(f"{list(route.methods)} {route.path}")
        
print(f"\nTotal routes: {len(router.routes)}") 