# Salesforce Token Flow Implementation

## Overview

This document describes the comprehensive Salesforce (SFDC) token flow integration for the Ternus Borrower Portal. The implementation provides secure token-based authentication that validates users through Salesforce, integrates with Auth0 for authentication, and maintains real-time synchronization with Salesforce opportunities and contact data.

## Architecture

### Components

1. **Token Validation System** - Validates SFDC invitation tokens
2. **Auth0 Integration** - Handles user authentication and authorization
3. **Salesforce Context Provider** - Manages SFDC data and API calls
4. **User Record Enhancement** - Stores SFDC contact ID and token data
5. **Opportunity Synchronization** - Real-time sync with SFDC opportunities

### Flow Diagram

```
Salesforce → Generate Invitation → Email Link → Token Validation → Auth0 Login → Portal Access → SFDC Sync
```

## Implementation Details

### 1. Token Invitation Page (`/invite/[token]`)

**Location**: `client/app/invite/[token]/page.tsx`

**Features**:
- Token validation against backend API
- User information display from SFDC
- Auth0 login/signup integration
- Error handling for expired/invalid tokens
- Session storage for token context

**Key Functions**:
```typescript
validateToken() // Validates token with backend
completeRegistration() // Completes user setup after Auth0
handleLogin() // Initiates Auth0 login flow
handleSignup() // Initiates Auth0 signup flow
```

### 2. Salesforce Context Provider

**Location**: `client/src/contexts/SalesforceContext.tsx`

**Features**:
- Contact information management
- Opportunities data synchronization
- Activity logging to Salesforce
- Error handling and loading states
- Real-time data updates

**Key Functions**:
```typescript
initializeSalesforceData() // Loads contact and opportunities
refreshOpportunities() // Refreshes opportunity data
updateOpportunity() // Updates opportunity in SFDC
logActivity() // Logs portal activities to SFDC
```

### 3. Backend API Routes (Python FastAPI)

#### Core Routes (`python-server/main.py`)
- `GET /health` - Health check and status
- `GET /api/salesforce/contact` - Gets contact information from Salesforce
- `GET /api/salesforce/opportunities` - Gets opportunities for contact (using Contact_Primary_Guarantor__c)
- `POST /api/salesforce/activity` - Logs portal activity to Salesforce as Tasks

#### Salesforce Integration (`python-server/sfdc_connector.py`)
- `TernusSalesforceConnector` class - Handles all Salesforce operations
- Real Salesforce API integration using simple-salesforce library
- Graceful fallback to mock data when Salesforce is unavailable

### 4. Frontend API Routes (Next.js)

**Location**: `client/app/api/`

All frontend API routes act as proxies to the backend server:
- `auth/validate-token/route.ts`
- `auth/complete-registration/route.ts`
- `auth/generate-invitation/route.ts`
- `salesforce/contact/route.ts`
- `salesforce/opportunities/route.ts`
- `salesforce/opportunities/[id]/route.ts`
- `salesforce/activity/route.ts`

### 5. Enhanced Dashboard Integration

**Location**: `client/src/components/Dashboard.tsx`

**Features**:
- SFDC connection status indicator
- Real opportunities from Salesforce
- Automatic opportunity-to-application mapping
- Activity logging for dashboard access
- Contact information display

## Configuration

### Environment Variables

#### Backend Server (`.env`)
```env
# Salesforce Configuration
SALESFORCE_URL=https://test.salesforce.com
SALESFORCE_CLIENT_ID=your_connected_app_client_id
SALESFORCE_CLIENT_SECRET=your_connected_app_client_secret
SALESFORCE_USERNAME=your_salesforce_username
SALESFORCE_PASSWORD=your_salesforce_password
SALESFORCE_SECURITY_TOKEN=your_security_token

# Auth0 Configuration
AUTH0_DOMAIN=dev-ymgg3mramteweox8.us.auth0.com
AUTH0_AUDIENCE=your_auth0_api_identifier

# Database Configuration
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=ternus_borrower_portal
DB_HOST=localhost
DB_PORT=5432

# Application URLs
CLIENT_URL=http://localhost:3000
PORTAL_URL=http://localhost:3000
```

#### Frontend Client (`.env.local`)
```env
# Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=dev-ymgg3mramteweox8.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=W4oVxbOtGtWuVGHewbCtBtGZMpEOp29D
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000

# Backend API
BACKEND_URL=http://localhost:5000
```

### Salesforce Setup

1. **Connected App Configuration**:
   - Enable OAuth settings
   - Set callback URL to your domain
   - Enable "Perform requests on your behalf at any time"
   - Add required OAuth scopes

2. **Custom Fields** (recommended):
   - `Portal_User_ID__c` (Text) - Stores Auth0 user ID
   - `Portal_Last_Login__c` (DateTime) - Last portal login
   - `Portal_Access_Granted__c` (Checkbox) - Portal access flag
   - `Portal_Invitation_Sent__c` (DateTime) - Invitation timestamp
   - `Portal_Token_Generated__c` (Checkbox) - Token generation flag

3. **Opportunity Custom Fields**:
   - `Contact__c` (Lookup to Contact) - Links opportunity to contact
   - `Loan_Type__c` (Picklist) - Type of loan
   - `Property_Address__c` (Text) - Property address
   - `Loan_Amount__c` (Currency) - Loan amount
   - `Loan_Purpose__c` (Picklist) - Purpose of loan
   - `Property_Type__c` (Picklist) - Type of property
   - `Property_Value__c` (Currency) - Property value

## Usage

### 1. Generating Invitations

From Salesforce, call the invitation API:

```javascript
// Apex code example
Http http = new Http();
HttpRequest request = new HttpRequest();
request.setEndpoint('https://your-portal.com/api/auth/generate-invitation');
request.setMethod('POST');
request.setHeader('Content-Type', 'application/json');
request.setBody(JSON.serialize(new Map<String, Object>{
    'email' => contact.Email,
    'contactId' => contact.Id,
    'accountId' => contact.AccountId,
    'loanOfficerId' => UserInfo.getUserId()
}));
HttpResponse response = http.send(request);
```

### 2. Testing the Flow

1. **Use Test Page**: Navigate to `/test-invite` to generate test invitation links
2. **Fill Test Data**:
   - Email: `john.doe@example.com`
   - Contact ID: `003XX0000004DcW`
   - Account ID: `001XX000003DHP0`
3. **Generate Link**: Click "Generate Invitation Link"
4. **Test Flow**: Open the generated link in a new tab
5. **Authenticate**: Use Auth0 to sign in or create account
6. **Verify Integration**: Check dashboard for SFDC connection status

### 3. Monitoring

- **Dashboard Status**: Green indicator shows successful SFDC connection
- **Activity Logs**: All portal activities are logged to Salesforce as Tasks
- **Opportunity Sync**: Changes in portal reflect in Salesforce opportunities
- **Error Handling**: Yellow indicator shows when using demo data (SFDC unavailable)

## Security Features

1. **Token Validation**: All invitation tokens are validated server-side
2. **JWT Verification**: Auth0 tokens are verified using JWKS
3. **CORS Protection**: Configured for specific client domains
4. **Rate Limiting**: API endpoints are rate-limited
5. **Input Validation**: All inputs are validated and sanitized
6. **Session Management**: Secure session storage for token context

## Error Handling

### Common Scenarios

1. **Invalid Token**: Shows error page with contact information
2. **Expired Token**: Shows expiration page with re-request option
3. **SFDC Connection Error**: Falls back to demo data with warning
4. **Auth0 Error**: Redirects to error page with retry option
5. **Missing Contact**: Shows appropriate error message

### Debugging

1. **Check Browser Console**: Frontend errors and API responses
2. **Check Server Logs**: Backend API errors and SFDC responses
3. **Verify Environment Variables**: Ensure all required vars are set
4. **Test SFDC Connection**: Use Salesforce service directly
5. **Validate Auth0 Setup**: Check Auth0 dashboard for errors

## Future Enhancements

1. **Real-time Notifications**: WebSocket integration for live updates
2. **Document Sync**: Sync document uploads with Salesforce Files
3. **Advanced Analytics**: Track user behavior and portal usage
4. **Mobile App Support**: Extend token flow to mobile applications
5. **Multi-tenant Support**: Support multiple Salesforce orgs

## Support

For issues or questions:
- Check the error logs in browser console and server logs
- Verify Salesforce and Auth0 configurations
- Test with the `/test-invite` page
- Contact the development team with specific error messages

---

**Last Updated**: June 2024
**Version**: 1.0.0 