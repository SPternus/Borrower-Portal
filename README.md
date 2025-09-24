# Ternus Borrower Profile Portal

A secure, enterprise-grade digital portal for borrowers to manage loan applications, upload documents, track progress, and communicate with their lending team.

## 🌟 Features

### 🔐 User Authentication & Security
- **Auth0 Integration**: Enterprise-grade authentication with MFA support
- **SOC2 & HIPAA Compliance**: Built for financial industry standards
- **Role-based Access Control**: Secure borrower, loan officer, and admin roles
- **Audit Logging**: Complete audit trail for compliance requirements

### 📋 Loan Application Management
- **Multi-step Forms**: Guided loan application process
- **Draft Saving**: Save progress and continue later
- **Pre-fill Data**: Auto-populate from previous applications
- **Multiple Loan Types**: Support for various loan products

### 📄 Document Upload Center
- **Secure File Storage**: AWS S3 with encryption
- **Drag & Drop Interface**: Modern file upload experience
- **Auto-categorization**: Smart document tagging
- **File Validation**: Type and size restrictions for security

### ✅ Task Management & Milestones
- **Real-time Status**: Live updates on task completion
- **Priority System**: Color-coded task priorities
- **Due Date Tracking**: Automated reminders via email/SMS
- **Progress Visualization**: Visual timeline of loan process

### 📊 Loan Status Tracking
- **Timeline View**: Complete loan lifecycle visibility
- **Status Indicators**: Color-coded progress markers
- **Activity Log**: Timestamped history of all actions
- **Loan Officer Contact**: Direct access to assigned team member

### 💬 Communication Hub
- **Secure Messaging**: In-portal chat with loan officers
- **Message History**: Complete conversation archive
- **Real-time Notifications**: Email/SMS alerts for new messages
- **File Sharing**: Secure document sharing within messages

### 👤 Profile & Preferences
- **Account Management**: Update personal information
- **Notification Settings**: Customize alert preferences
- **E-signature**: Digital document signing capabilities
- **Consent Management**: Privacy and disclosure handling

## 🏗️ Architecture

### Frontend (Client)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Authentication**: Auth0 React SDK
- **State Management**: React Query for server state
- **UI Components**: Custom component library with accessibility

### Backend (Server)
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Auth0 JWT validation
- **File Storage**: AWS S3 with presigned URLs
- **Email/SMS**: Nodemailer + Twilio integration
- **Security**: Helmet, rate limiting, input sanitization

### Integration Layer
- **Salesforce LOS**: Direct integration with loan origination system
- **Document Processing**: Automated categorization and validation
- **Audit System**: Comprehensive logging and compliance tracking
- **Notification Engine**: Multi-channel alert system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB database
- Auth0 account
- AWS account (for file storage)
- (Optional) Twilio account for SMS notifications

### 1. Environment Setup

**Client Environment Variables** (`client/env.example` → `client/.env.local`):
```env
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://your-api-identifier
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Python Server Environment Variables** (`python-server/.env`):
```env
# Salesforce Configuration
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret
SALESFORCE_USERNAME=your-salesforce-username
SALESFORCE_PASSWORD=your-salesforce-password
SALESFORCE_SECURITY_TOKEN=your-salesforce-security-token
SALESFORCE_INSTANCE_URL=https://your-instance.salesforce.com

# Server Configuration
PORT=5000
ENVIRONMENT=development
```

### 2. Installation

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Set up Python server environment
npm run python:setup

# Or manually:
cd python-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Auth0 Configuration

1. Create an Auth0 application (Single Page Application)
2. Set allowed callback URLs: `http://localhost:3000`
3. Set allowed logout URLs: `http://localhost:3000`
4. Create an API identifier for your backend
5. Enable RBAC and add custom claims if needed

### 4. Database Setup

```bash
# Start MongoDB (if using local installation)
mongod

# Or use MongoDB Atlas for cloud database
```

### 5. AWS S3 Setup

1. Create an S3 bucket for document storage
2. Configure CORS policy for file uploads
3. Set up IAM user with S3 access permissions
4. Enable server-side encryption

### 6. Run the Application

```bash
# Start both client and Python server concurrently
npm run dev

# Or start individually:
# Client: http://localhost:3000
cd client && npm run dev

# Python FastAPI Server: http://localhost:5000
cd python-server && source venv/bin/activate && python main.py
```

## 🔧 Development

### Project Structure

```
ternus-borrower-profile/
├── client/                 # Next.js frontend
│   ├── app/               # App router pages & API routes
│   │   ├── api/          # Next.js API routes (proxy to Python)
│   │   ├── components/   # React components
│   │   ├── lib/          # Utility libraries
│   │   └── types/        # TypeScript definitions
│   ├── src/              # Source components
│   └── public/           # Static assets
├── python-server/         # FastAPI backend
│   ├── main.py           # FastAPI application entry point
│   ├── sfdc_connector.py # Salesforce integration
│   ├── requirements.txt  # Python dependencies
│   ├── .env              # Environment configuration
│   └── venv/             # Python virtual environment
└── docs/                 # Documentation
```

### Key Components

**Frontend**:
- `LandingPage.tsx` - Unauthenticated landing page
- `Dashboard.tsx` - Main borrower dashboard
- `LoanApplication.tsx` - Multi-step application form
- `DocumentUpload.tsx` - File upload interface
- `TaskList.tsx` - Task management component
- `MessageCenter.tsx` - Communication hub

**Backend (Python FastAPI)**:
- `main.py` - FastAPI application with health, contact, opportunities, and activity endpoints
- `sfdc_connector.py` - Salesforce integration using simple-salesforce library
- Next.js API routes in `client/app/api/` - Proxy requests to Python backend

### Security Features

- **Input Validation**: Joi schema validation on all endpoints
- **Rate Limiting**: Protection against brute force attacks
- **SQL Injection Prevention**: MongoDB query sanitization
- **XSS Protection**: Content Security Policy headers
- **File Upload Security**: Type validation and virus scanning
- **Audit Logging**: Complete action tracking for compliance

## 📱 Mobile Responsive

The portal is fully responsive and optimized for:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Tablet devices (iPad, Android tablets)
- Mobile phones (iOS, Android)

## 🔒 Compliance & Security

### SOC2 Type II Ready
- Access controls and user authentication
- System availability and processing integrity
- Confidentiality controls for sensitive data

### HIPAA Compliance
- Encryption at rest and in transit
- Access logging and audit trails
- Secure file handling and storage

### Financial Industry Standards
- PCI DSS considerations for payment data
- Bank-level encryption (AES-256)
- Multi-factor authentication support

## 🧪 Testing

```bash
# Run client tests
cd client && npm test

# Run Python server tests (if implemented)
cd python-server && pytest

# Run all tests
npm test
```

## 📦 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Configuration

Update production environment variables:
- Set secure JWT secrets
- Configure production Auth0 settings
- Set up production database
- Configure production AWS resources

### Recommended Hosting

- **Frontend**: Vercel, Netlify, or AWS Amplify
- **Backend**: AWS EC2, Google Cloud Run, or Railway
- **Database**: MongoDB Atlas or AWS DocumentDB
- **File Storage**: AWS S3 with CloudFront CDN

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `/docs` folder

---

**Ternus Borrower Profile Portal** - Simplifying the loan journey with enterprise-grade security and user experience. 