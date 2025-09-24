# Ternus Borrower Profile System

A comprehensive loan management and borrower profile system built with modern web technologies, featuring Salesforce integration, Plaid financial data collection, and automated document processing.

## 🚀 Features

### Core Functionality
- **Modern Dashboard**: Clean, responsive UI with Ternus brand styling
- **Application Management**: Track loan applications with detailed views
- **Task Management**: Paginated task tracking with status updates
- **Draw Management**: Construction loan draw tracking and approval workflow
- **Document Management**: S3-based document storage with automated evaluation
- **Plaid Integration**: Bank account linking and financial data collection
- **Salesforce Integration**: Complete CRM integration with custom objects

### Technical Highlights
- **Frontend**: React/Next.js with TypeScript and Tailwind CSS
- **Backend**: FastAPI with async processing
- **Database**: Salesforce as primary data store
- **File Storage**: AWS S3 with automated document processing
- **Financial Data**: Plaid API for bank account verification and asset collection
- **Authentication**: Auth0 integration with invitation-based access

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   FastAPI       │    │   Salesforce    │
│   Frontend      │◄──►│   Backend       │◄──►│   CRM           │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Plaid Link    │    │   AWS S3        │    │   Document      │
│   SDK           │    │   Storage       │    │   Evaluation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- Salesforce Developer Account
- AWS S3 Bucket
- Plaid Developer Account

### Frontend Setup
```bash
cd client
npm install
cp env.example .env.local
# Configure environment variables
npm run dev
```

### Backend Setup
```bash
cd python-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env
# Configure environment variables
python main.py
```

## 🔧 Configuration

### Environment Variables

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-auth0-client-id
```

#### Backend (.env)
```bash
# Salesforce Configuration
SALESFORCE_USERNAME=your-sf-username
SALESFORCE_PASSWORD=your-sf-password
SALESFORCE_SECURITY_TOKEN=your-sf-token
SALESFORCE_DOMAIN=your-sf-domain

# AWS Configuration
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket

# Plaid Configuration
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENVIRONMENT=sandbox
PLAID_WEBHOOK_URL=https://your-domain.com/api/plaid/webhook

# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
```

## 🗄️ Database Schema

### Salesforce Custom Objects

#### Contact Fields
- `Plaid_Id__c`: Plaid user identifier
- `Plaid_Indentity_Submitted__c`: Identity verification status
- `Plaid_Verification_URL__c`: Plaid verification URL
- `Plaid_Identity_Verification_Data__c`: Identity verification data
- `Plaid_Asset_Token__c`: Plaid access token for assets
- `Plaid_Asset_Data__c`: Asset verification data
- `Send_Plaid_Verification_Email__c`: Email notification flag

#### LoanTask__c (Custom Object)
- `Name`: Task name
- `Status__c`: Task status (Pending, In Progress, Completed)
- `Priority__c`: Task priority
- `Due_Date__c`: Task due date
- `Opportunity__c`: Related opportunity

#### Draw__c (Custom Object)
- `Name`: Draw name
- `Status__c`: Draw status
- `Amount__c`: Draw amount
- `Opportunity__c`: Related opportunity

#### file_folder__c (Custom Object)
- `Name`: Folder name
- `Document_Type__c`: Document category
- `S3_Key__c`: S3 object key
- `Evaluation_Status__c`: Processing status

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/verify-invitation` - Invitation verification

### Applications
- `GET /api/opportunities` - List opportunities
- `GET /api/opportunities/{id}` - Get opportunity details
- `GET /api/opportunities/{id}/tasks` - Get opportunity tasks
- `POST /api/opportunities/{id}/tasks` - Create new task

### Documents
- `POST /api/documents/upload` - Upload document to S3
- `GET /api/documents/evaluation/status/{id}` - Check evaluation status

### Plaid Integration
- `POST /api/plaid/create-verification` - Create identity verification
- `POST /api/plaid/assets-verification` - Create assets verification
- `POST /api/plaid/exchange-public-token` - Exchange public token
- `POST /api/plaid/webhook` - Handle Plaid webhooks

## 🎨 UI Components

### Dashboard Components
- **ModernDashboard**: Main dashboard with application overview
- **ApplicationDetailView**: Detailed application view with tabs
- **TaskManagement**: Paginated task list with status controls
- **DrawManagement**: Draw tracking with approval workflow
- **ModernTopNavigation**: Navigation bar with user context

### Styling
- **Ternus Brand Colors**: Custom color palette matching brand guidelines
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Consistent UI**: Unified styling across all components

## 🔄 Workflows

### Document Processing
1. User uploads document via UI
2. File stored in S3 with metadata
3. Background task calls evaluation API
4. Document type determined automatically
5. Extraction results stored in Salesforce

### Plaid Integration
1. User clicks "Connect Bank" button
2. Plaid Link token created with user context
3. Plaid popup opens for account selection
4. Public token exchanged for access token
5. Account data stored in Salesforce

### Task Management
1. Tasks created automatically or manually
2. Status updates tracked in real-time
3. Pagination for large task lists
4. Priority-based sorting and filtering

## 🚀 Deployment

### Production Checklist
- [ ] Configure production environment variables
- [ ] Set up SSL certificates
- [ ] Configure Plaid production environment
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Set up CI/CD pipeline

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🧪 Testing

### Frontend Testing
```bash
cd client
npm test
npm run test:e2e
```

### Backend Testing
```bash
cd python-server
pytest
python -m pytest tests/
```

## 📝 Development Notes

### Document Type Mapping
The system automatically maps documents to evaluation types:
- `appraisal` folder → `property_appraisal`
- `incorporation` documents → `articles_of_incorporation`
- `bank_statement` → Financial document processing
- Custom mapping based on keywords and folder structure

### Plaid Integration Details
- Identity verification uses separate flow from asset collection
- Webhook handling for real-time status updates
- Proper error handling and retry logic
- Salesforce field mapping for all Plaid data

### Performance Optimizations
- Async document processing in background
- Pagination for large data sets
- Efficient Salesforce SOQL queries
- Client-side caching where appropriate

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software developed for Ternus. All rights reserved.

## 🆘 Support

For technical support or questions:
- Create an issue in this repository
- Contact the development team
- Check the documentation in `/docs` folder

## 🔄 Version History

### v1.0.0 (Current)
- Initial release with complete feature set
- Salesforce integration
- Plaid financial data collection
- Document processing with AI evaluation
- Modern responsive UI
- Task and draw management
- Comprehensive error handling and logging

---

Built with ❤️ for Ternus by the Development Team