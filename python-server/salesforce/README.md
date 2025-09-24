# Ternus Salesforce Integration - Modular Architecture

This directory contains the new modular, object-oriented Salesforce integration for the Ternus Borrower Portal.

## Architecture Overview

The new architecture separates concerns into distinct layers:

```
salesforce/
├── __init__.py                 # Package exports
├── connection.py               # Connection management (singleton)
├── base_manager.py            # Base class for all managers
├── objects/                   # Object-specific modules
│   ├── contact/              # Contact operations
│   │   ├── __init__.py
│   │   ├── manager.py        # ContactManager
│   │   └── operations.py     # Contact business logic
│   ├── opportunity/          # Opportunity operations
│   │   ├── __init__.py
│   │   ├── manager.py        # OpportunityManager
│   │   └── operations.py     # Opportunity business logic
│   ├── task/                 # Task/Activity operations
│   │   ├── __init__.py
│   │   ├── manager.py        # TaskManager
│   │   └── operations.py     # Task business logic
│   └── invitation/           # Portal invitation operations
│       ├── __init__.py
│       ├── manager.py        # InvitationManager
│       └── operations.py     # Invitation business logic
├── operations/               # Future: CRUD operation components
└── utils/                    # Future: Utility functions
```

## Key Benefits

### 1. **Separation of Concerns**
- **Connection Management**: Centralized in `SalesforceConnection` (singleton)
- **Object Management**: Each Salesforce object has its own manager
- **Business Logic**: Separated into operations classes
- **CRUD Operations**: Standardized in base manager

### 2. **Maintainability**
- Easy to find and modify object-specific logic
- Clear separation between data access and business logic
- Consistent patterns across all objects

### 3. **Testability**
- Each component can be tested independently
- Built-in mock responses for offline testing
- Clear interfaces for dependency injection

### 4. **Scalability**
- Easy to add new Salesforce objects
- Simple to extend existing functionality
- Modular design supports team development

## Usage Examples

### Basic Usage

```python
from salesforce import ContactManager, OpportunityManager

# Initialize managers
contact_mgr = ContactManager()
opportunity_mgr = OpportunityManager()

# Get contact details
contact = contact_mgr.get_contact_details("003Oz00000QAiECIA1")

# Get opportunities for contact
opportunities = opportunity_mgr.get_opportunities_for_contact("003Oz00000QAiECIA1")

# Create new opportunity
result = opportunity_mgr.create_from_form_data("003Oz00000QAiECIA1", form_data)
```

### Using the Main Connector (Backward Compatible)

```python
from salesforce_connector_v2 import TernusSalesforceConnectorV2

# Initialize connector
sfdc = TernusSalesforceConnectorV2()

# All the same methods as the old connector
contact = sfdc.get_contact("003Oz00000QAiECIA1")
opportunities = sfdc.get_opportunities("003Oz00000QAiECIA1")
```

## Component Details

### Connection Management (`connection.py`)

- **Singleton Pattern**: Ensures single connection instance
- **Environment-based Configuration**: Uses environment variables
- **Automatic Reconnection**: Handles connection failures
- **Mock Mode Support**: Falls back gracefully when credentials unavailable

### Base Manager (`base_manager.py`)

Provides common functionality for all object managers:
- Standard CRUD operations (Create, Read, Update, Delete)
- Query execution
- Error handling with fallback to mock responses
- Consistent logging

### Object Managers

Each object has a dedicated manager that:
- Inherits from `BaseSalesforceManager`
- Provides object-specific methods
- Delegates business logic to operations classes
- Handles object-specific mock responses

### Operations Classes

Contains all business logic for each object:
- Data transformation and mapping
- Complex business rules
- Field validation
- Response formatting

## Adding New Objects

To add a new Salesforce object (e.g., Account):

1. **Create the directory structure**:
   ```
   salesforce/objects/account/
   ├── __init__.py
   ├── manager.py
   └── operations.py
   ```

2. **Create the manager** (`manager.py`):
   ```python
   from ...base_manager import BaseSalesforceManager
   from .operations import AccountOperations
   
   class AccountManager(BaseSalesforceManager):
       def __init__(self):
           super().__init__('Account')
           self.operations = AccountOperations(self)
   ```

3. **Create the operations** (`operations.py`):
   ```python
   class AccountOperations:
       def __init__(self, manager):
           self.manager = manager
       
       def get_account_details(self, account_id: str):
           # Business logic here
           pass
   ```

4. **Update the main package** (`__init__.py`):
   ```python
   from .objects.account.manager import AccountManager
   __all__.append('AccountManager')
   ```

## Migration from Old Connector

The new connector is designed to be backward compatible. You can:

1. **Drop-in Replacement**: Replace `TernusSalesforceConnector` with `TernusSalesforceConnectorV2`
2. **Gradual Migration**: Use new object managers alongside old connector
3. **Mixed Approach**: Migrate object by object as needed

## Testing

Each component includes mock responses for testing:

```python
# Mock mode automatically activates when no SFDC credentials
contact_mgr = ContactManager()
contact = contact_mgr.get_contact_details("test_id")  # Returns mock data
```

## Performance Considerations

- **Connection Pooling**: Single connection instance shared across managers
- **Lazy Loading**: Managers only initialize when needed
- **Efficient Queries**: SOQL queries optimized for each use case
- **Caching**: Built-in caching in operations classes where appropriate

## Error Handling

- **Graceful Degradation**: Falls back to mock responses on errors
- **Comprehensive Logging**: All operations logged with appropriate levels
- **Exception Handling**: Salesforce errors caught and handled appropriately
- **Retry Logic**: Built into connection management

## Future Enhancements

1. **Operation Components**: Break down CRUD operations further
2. **Caching Layer**: Add Redis/memory caching for frequently accessed data
3. **Async Support**: Add async/await support for better performance
4. **Field Mapping**: Centralized field mapping configuration
5. **Validation**: Schema validation for data integrity
6. **Metrics**: Performance monitoring and metrics collection

## Configuration

The connector uses environment variables for configuration:

```bash
SALESFORCE_USERNAME=your_username
SALESFORCE_PASSWORD=your_password
SALESFORCE_SECURITY_TOKEN=your_token
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com
```

## Logging

All components use Python's standard logging module:

```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
```

Log levels:
- **INFO**: Successful operations
- **WARNING**: Fallback to mock mode
- **ERROR**: Operation failures
- **DEBUG**: Detailed operation information 