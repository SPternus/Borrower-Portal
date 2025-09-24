"""
Loan Type Mappings Configuration
Defines tasks, document categories, and requirements for different loan types
"""

from typing import Dict, List, Any
from enum import Enum

class LoanType(Enum):
    BRIDGE_LOAN = "bridge-loan"
    FIX_AND_FLIP_LOAN = "fix-and-flip-loan"
    GROUND_UP_CONSTRUCTION_LOAN = "ground-up-construction-loan"
    WHOLETAIL_LOAN = "wholetail-loan"
    LONG_TERM_RENTAL_LOANS = "long-term-rental-loans"

class DocumentCategory(Enum):
    INCOME = "income"
    ASSETS = "assets"
    PROPERTY = "property"
    IDENTITY = "identity"
    EMPLOYMENT = "employment"
    CREDIT = "credit"
    BUSINESS = "business"
    CONSTRUCTION_DOCS = "construction"
    RENTAL_DOCS = "rental"
    OTHER = "other"

class TaskCategory(Enum):
    APPLICATION = "application"
    DOCUMENTATION = "documentation"
    UNDERWRITING = "underwriting"
    PROPERTY_EVALUATION = "property_evaluation"
    APPROVAL = "approval"
    CLOSING = "closing"

# Document requirements by loan type
LOAN_TYPE_DOCUMENT_REQUIREMENTS = {
    LoanType.FIX_AND_FLIP_LOAN: {
        DocumentCategory.INCOME: {
            "required": True,
            "priority": "high",
            "documents": [
                "Bank statements (3 months)",
                "Proof of income/employment",
                "Tax returns (2 years)",
                "Asset verification"
            ]
        },
        DocumentCategory.ASSETS: {
            "required": True,
            "priority": "high",
            "documents": [
                "Proof of down payment funds",
                "Construction budget and timeline",
                "Contractor estimates",
                "Scope of work"
            ]
        },
        DocumentCategory.PROPERTY: {
            "required": True,
            "priority": "high",
            "documents": [
                "Purchase contract or property deed",
                "Property appraisal (as-is value)",
                "After Repair Value (ARV) appraisal",
                "Property insurance quote",
                "Renovation plans and permits"
            ]
        },
        DocumentCategory.IDENTITY: {
            "required": True,
            "priority": "medium",
            "documents": [
                "Government-issued photo ID",
                "Social Security card"
            ]
        },
        DocumentCategory.BUSINESS: {
            "required": False,
            "priority": "low",
            "documents": [
                "Business license (if applicable)",
                "Business bank statements"
            ]
        }
    },
    
    LoanType.LONG_TERM_RENTAL_LOANS: {
        DocumentCategory.INCOME: {
            "required": True,
            "priority": "high",
            "documents": [
                "Personal income documentation",
                "Tax returns (2 years)",
                "Bank statements (3 months)"
            ]
        },
        DocumentCategory.RENTAL_DOCS: {
            "required": True,
            "priority": "high",
            "documents": [
                "Current lease agreements",
                "Rent roll documentation",
                "Property management agreements",
                "Market rent analysis",
                "Property tax statements",
                "Insurance documentation"
            ]
        },
        DocumentCategory.PROPERTY: {
            "required": True,
            "priority": "high",
            "documents": [
                "Property appraisal",
                "Property deed or purchase contract",
                "Property insurance",
                "HOA documents (if applicable)",
                "Environmental reports (if required)"
            ]
        },
        DocumentCategory.ASSETS: {
            "required": True,
            "priority": "high",
            "documents": [
                "Proof of down payment",
                "Reserve funds verification",
                "Asset statements"
            ]
        },
        DocumentCategory.IDENTITY: {
            "required": True,
            "priority": "medium",
            "documents": [
                "Government-issued photo ID",
                "Social Security card"
            ]
        }
    },
    
    LoanType.BRIDGE_LOAN: {
        DocumentCategory.INCOME: {
            "required": True,
            "priority": "high",
            "documents": [
                "Income verification",
                "Bank statements (3 months)",
                "Tax returns (2 years)"
            ]
        },
        DocumentCategory.PROPERTY: {
            "required": True,
            "priority": "high",
            "documents": [
                "Current property appraisal",
                "Purchase contract (new property)",
                "Exit strategy documentation",
                "Property insurance",
                "Payoff statements (existing loans)"
            ]
        },
        DocumentCategory.ASSETS: {
            "required": True,
            "priority": "high",
            "documents": [
                "Proof of equity in current property",
                "Down payment verification",
                "Closing cost funds"
            ]
        },
        DocumentCategory.IDENTITY: {
            "required": True,
            "priority": "medium",
            "documents": [
                "Government-issued photo ID",
                "Social Security card"
            ]
        }
    },
    
    LoanType.GROUND_UP_CONSTRUCTION_LOAN: {
        DocumentCategory.INCOME: {
            "required": True,
            "priority": "high",
            "documents": [
                "Income documentation",
                "Tax returns (2 years)",
                "Bank statements (3 months)",
                "Financial statements"
            ]
        },
        DocumentCategory.CONSTRUCTION_DOCS: {
            "required": True,
            "priority": "high",
            "documents": [
                "Construction plans and specifications",
                "Building permits",
                "Contractor agreements",
                "Construction budget",
                "Construction timeline",
                "Contractor licenses and insurance",
                "Draw schedule"
            ]
        },
        DocumentCategory.PROPERTY: {
            "required": True,
            "priority": "high",
            "documents": [
                "Land deed or purchase contract",
                "Land appraisal",
                "As-completed appraisal",
                "Site survey",
                "Environmental reports"
            ]
        },
        DocumentCategory.ASSETS: {
            "required": True,
            "priority": "high",
            "documents": [
                "Construction loan down payment",
                "Contingency funds",
                "Asset verification"
            ]
        },
        DocumentCategory.IDENTITY: {
            "required": True,
            "priority": "medium",
            "documents": [
                "Government-issued photo ID",
                "Social Security card"
            ]
        }
    },
    
    LoanType.WHOLETAIL_LOAN: {
        DocumentCategory.INCOME: {
            "required": True,
            "priority": "high",
            "documents": [
                "Income verification",
                "Bank statements (3 months)",
                "Tax returns (2 years)"
            ]
        },
        DocumentCategory.PROPERTY: {
            "required": True,
            "priority": "high",
            "documents": [
                "Purchase contract",
                "Property appraisal (as-is)",
                "Comparative market analysis",
                "Property condition report",
                "Marketing plan"
            ]
        },
        DocumentCategory.ASSETS: {
            "required": True,
            "priority": "high",
            "documents": [
                "Down payment verification",
                "Renovation budget",
                "Marketing budget"
            ]
        },
        DocumentCategory.IDENTITY: {
            "required": True,
            "priority": "medium",
            "documents": [
                "Government-issued photo ID",
                "Social Security card"
            ]
        }
    }
}

# Task workflows by loan type
LOAN_TYPE_TASK_WORKFLOWS = {
    LoanType.FIX_AND_FLIP_LOAN: [
        {
            "title": "Submit Initial Application",
            "description": "Complete and submit loan application with basic property and borrower information",
            "category": TaskCategory.APPLICATION,
            "priority": "high",
            "estimated_days": 1,
            "dependencies": [],
            "required_documents": ["Application form", "Property details"]
        },
        {
            "title": "Property Evaluation",
            "description": "Obtain as-is appraisal and after-repair value (ARV) assessment",
            "category": TaskCategory.PROPERTY_EVALUATION,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Submit Initial Application"],
            "required_documents": ["Property appraisal", "ARV appraisal", "Renovation plans"]
        },
        {
            "title": "Submit Financial Documentation",
            "description": "Provide income, asset, and financial documentation",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Submit Initial Application"],
            "required_documents": ["Bank statements", "Tax returns", "Asset verification"]
        },
        {
            "title": "Construction Budget Review",
            "description": "Submit detailed construction budget and contractor estimates",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Property Evaluation"],
            "required_documents": ["Construction budget", "Contractor estimates", "Scope of work"]
        },
        {
            "title": "Underwriting Review",
            "description": "Loan underwriter reviews all documentation and property details",
            "category": TaskCategory.UNDERWRITING,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Submit Financial Documentation", "Construction Budget Review"],
            "required_documents": []
        },
        {
            "title": "Loan Approval",
            "description": "Final loan approval and commitment letter issuance",
            "category": TaskCategory.APPROVAL,
            "priority": "high",
            "estimated_days": 2,
            "dependencies": ["Underwriting Review"],
            "required_documents": ["Commitment letter"]
        },
        {
            "title": "Closing Preparation",
            "description": "Prepare closing documents and coordinate closing",
            "category": TaskCategory.CLOSING,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Loan Approval"],
            "required_documents": ["Closing documents", "Title insurance", "Property insurance"]
        }
    ],
    
    LoanType.LONG_TERM_RENTAL_LOANS: [
        {
            "title": "Submit Initial Application",
            "description": "Complete loan application with property and rental information",
            "category": TaskCategory.APPLICATION,
            "priority": "high",
            "estimated_days": 1,
            "dependencies": [],
            "required_documents": ["Application form", "Property details"]
        },
        {
            "title": "Property Appraisal",
            "description": "Order professional property appraisal",
            "category": TaskCategory.PROPERTY_EVALUATION,
            "priority": "high",
            "estimated_days": 7,
            "dependencies": ["Submit Initial Application"],
            "required_documents": ["Property appraisal"]
        },
        {
            "title": "Rental Income Analysis",
            "description": "Analyze rental income and market rent potential",
            "category": TaskCategory.PROPERTY_EVALUATION,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Submit Initial Application"],
            "required_documents": ["Rent roll", "Lease agreements", "Market rent analysis"]
        },
        {
            "title": "Financial Documentation",
            "description": "Submit personal financial documentation",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Submit Initial Application"],
            "required_documents": ["Bank statements", "Tax returns", "Asset statements"]
        },
        {
            "title": "DSCR Calculation",
            "description": "Calculate debt service coverage ratio based on rental income",
            "category": TaskCategory.UNDERWRITING,
            "priority": "high",
            "estimated_days": 2,
            "dependencies": ["Rental Income Analysis", "Property Appraisal"],
            "required_documents": []
        },
        {
            "title": "Underwriting Review",
            "description": "Complete underwriting review including DSCR analysis",
            "category": TaskCategory.UNDERWRITING,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Financial Documentation", "DSCR Calculation"],
            "required_documents": []
        },
        {
            "title": "Loan Approval",
            "description": "Final loan approval and terms confirmation",
            "category": TaskCategory.APPROVAL,
            "priority": "high",
            "estimated_days": 2,
            "dependencies": ["Underwriting Review"],
            "required_documents": ["Commitment letter"]
        },
        {
            "title": "Closing Process",
            "description": "Complete loan closing and funding",
            "category": TaskCategory.CLOSING,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Loan Approval"],
            "required_documents": ["Closing documents", "Title insurance", "Property insurance"]
        }
    ],
    
    LoanType.BRIDGE_LOAN: [
        {
            "title": "Submit Bridge Loan Application",
            "description": "Submit application with current and target property details",
            "category": TaskCategory.APPLICATION,
            "priority": "high",
            "estimated_days": 1,
            "dependencies": [],
            "required_documents": ["Application form", "Current property details", "Target property details"]
        },
        {
            "title": "Current Property Valuation",
            "description": "Appraise current property for equity determination",
            "category": TaskCategory.PROPERTY_EVALUATION,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Submit Bridge Loan Application"],
            "required_documents": ["Current property appraisal"]
        },
        {
            "title": "Target Property Evaluation",
            "description": "Evaluate target property for purchase",
            "category": TaskCategory.PROPERTY_EVALUATION,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Submit Bridge Loan Application"],
            "required_documents": ["Target property appraisal", "Purchase contract"]
        },
        {
            "title": "Exit Strategy Documentation",
            "description": "Document clear exit strategy for bridge loan repayment",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 2,
            "dependencies": ["Current Property Valuation", "Target Property Evaluation"],
            "required_documents": ["Exit strategy plan", "Timeline documentation"]
        },
        {
            "title": "Financial Review",
            "description": "Review borrower's financial capacity and documentation",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Submit Bridge Loan Application"],
            "required_documents": ["Bank statements", "Income documentation", "Asset verification"]
        },
        {
            "title": "Underwriting Analysis",
            "description": "Underwrite bridge loan with focus on exit strategy",
            "category": TaskCategory.UNDERWRITING,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Exit Strategy Documentation", "Financial Review"],
            "required_documents": []
        },
        {
            "title": "Bridge Loan Approval",
            "description": "Final approval with terms and conditions",
            "category": TaskCategory.APPROVAL,
            "priority": "high",
            "estimated_days": 2,
            "dependencies": ["Underwriting Analysis"],
            "required_documents": ["Commitment letter"]
        },
        {
            "title": "Coordinated Closing",
            "description": "Coordinate closing of current sale and new purchase",
            "category": TaskCategory.CLOSING,
            "priority": "high",
            "estimated_days": 7,
            "dependencies": ["Bridge Loan Approval"],
            "required_documents": ["Closing documents", "Title work", "Insurance policies"]
        }
    ],
    
    LoanType.GROUND_UP_CONSTRUCTION_LOAN: [
        {
            "title": "Submit Construction Loan Application",
            "description": "Submit application with construction plans and details",
            "category": TaskCategory.APPLICATION,
            "priority": "high",
            "estimated_days": 1,
            "dependencies": [],
            "required_documents": ["Application form", "Construction plans"]
        },
        {
            "title": "Land Appraisal",
            "description": "Appraise land value for construction",
            "category": TaskCategory.PROPERTY_EVALUATION,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Submit Construction Loan Application"],
            "required_documents": ["Land appraisal", "Site survey"]
        },
        {
            "title": "As-Completed Appraisal",
            "description": "Appraise projected value of completed construction",
            "category": TaskCategory.PROPERTY_EVALUATION,
            "priority": "high",
            "estimated_days": 7,
            "dependencies": ["Submit Construction Loan Application"],
            "required_documents": ["As-completed appraisal", "Construction specifications"]
        },
        {
            "title": "Construction Documentation Review",
            "description": "Review all construction plans, permits, and contractor agreements",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Submit Construction Loan Application"],
            "required_documents": ["Building permits", "Contractor agreements", "Construction budget", "Draw schedule"]
        },
        {
            "title": "Contractor Verification",
            "description": "Verify contractor licenses, insurance, and qualifications",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Construction Documentation Review"],
            "required_documents": ["Contractor licenses", "Insurance certificates", "References"]
        },
        {
            "title": "Financial Documentation",
            "description": "Submit borrower financial documentation",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Submit Construction Loan Application"],
            "required_documents": ["Financial statements", "Tax returns", "Bank statements"]
        },
        {
            "title": "Construction Loan Underwriting",
            "description": "Underwrite construction loan with focus on project viability",
            "category": TaskCategory.UNDERWRITING,
            "priority": "high",
            "estimated_days": 7,
            "dependencies": ["As-Completed Appraisal", "Contractor Verification", "Financial Documentation"],
            "required_documents": []
        },
        {
            "title": "Construction Loan Approval",
            "description": "Approve construction loan with draw schedule",
            "category": TaskCategory.APPROVAL,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Construction Loan Underwriting"],
            "required_documents": ["Commitment letter", "Draw schedule"]
        },
        {
            "title": "Construction Loan Closing",
            "description": "Close construction loan and establish draw procedures",
            "category": TaskCategory.CLOSING,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Construction Loan Approval"],
            "required_documents": ["Closing documents", "Title insurance", "Builder's risk insurance"]
        }
    ],
    
    LoanType.WHOLETAIL_LOAN: [
        {
            "title": "Submit Wholetail Application",
            "description": "Submit application with property purchase and resale strategy",
            "category": TaskCategory.APPLICATION,
            "priority": "high",
            "estimated_days": 1,
            "dependencies": [],
            "required_documents": ["Application form", "Purchase contract", "Marketing plan"]
        },
        {
            "title": "Property Valuation",
            "description": "Obtain as-is appraisal and market analysis",
            "category": TaskCategory.PROPERTY_EVALUATION,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Submit Wholetail Application"],
            "required_documents": ["Property appraisal", "Comparative market analysis"]
        },
        {
            "title": "Financial Documentation",
            "description": "Submit borrower financial documentation",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Submit Wholetail Application"],
            "required_documents": ["Bank statements", "Income verification", "Tax returns"]
        },
        {
            "title": "Marketing Strategy Review",
            "description": "Review property marketing and sale timeline",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "medium",
            "estimated_days": 2,
            "dependencies": ["Property Valuation"],
            "required_documents": ["Marketing plan", "Sale timeline", "Renovation budget"]
        },
        {
            "title": "Underwriting Review",
            "description": "Underwrite wholetail loan with focus on quick sale strategy",
            "category": TaskCategory.UNDERWRITING,
            "priority": "high",
            "estimated_days": 4,
            "dependencies": ["Financial Documentation", "Marketing Strategy Review"],
            "required_documents": []
        },
        {
            "title": "Loan Approval",
            "description": "Final loan approval with terms",
            "category": TaskCategory.APPROVAL,
            "priority": "high",
            "estimated_days": 2,
            "dependencies": ["Underwriting Review"],
            "required_documents": ["Commitment letter"]
        },
        {
            "title": "Closing Process",
            "description": "Complete loan closing and funding",
            "category": TaskCategory.CLOSING,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Loan Approval"],
            "required_documents": ["Closing documents", "Title insurance", "Property insurance"]
        }
    ],
    
    LoanType.LONG_TERM_RENTAL_LOANS: [
        {
            "title": "Submit Rental Loan Application",
            "description": "Submit application with rental property details",
            "category": TaskCategory.APPLICATION,
            "priority": "high",
            "estimated_days": 1,
            "dependencies": [],
            "required_documents": ["Application form", "Property details"]
        },
        {
            "title": "Property Valuation",
            "description": "Obtain property appraisal and rental market analysis",
            "category": TaskCategory.PROPERTY_EVALUATION,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Submit Rental Loan Application"],
            "required_documents": ["Property appraisal", "Market rent analysis"]
        },
        {
            "title": "Rental Documentation Review",
            "description": "Review existing leases and rental income documentation",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Submit Rental Loan Application"],
            "required_documents": ["Lease agreements", "Rent roll", "Property management agreements"]
        },
        {
            "title": "Financial Documentation",
            "description": "Submit borrower financial documentation",
            "category": TaskCategory.DOCUMENTATION,
            "priority": "high",
            "estimated_days": 3,
            "dependencies": ["Submit Rental Loan Application"],
            "required_documents": ["Bank statements", "Tax returns", "Personal income documentation"]
        },
        {
            "title": "DSCR Analysis",
            "description": "Analyze debt service coverage ratio and rental income",
            "category": TaskCategory.UNDERWRITING,
            "priority": "high",
            "estimated_days": 4,
            "dependencies": ["Property Valuation", "Rental Documentation Review", "Financial Documentation"],
            "required_documents": []
        },
        {
            "title": "Loan Approval",
            "description": "Final loan approval based on DSCR and property performance",
            "category": TaskCategory.APPROVAL,
            "priority": "high",
            "estimated_days": 2,
            "dependencies": ["DSCR Analysis"],
            "required_documents": ["Commitment letter"]
        },
        {
            "title": "Closing Process",
            "description": "Complete loan closing and funding",
            "category": TaskCategory.CLOSING,
            "priority": "high",
            "estimated_days": 5,
            "dependencies": ["Loan Approval"],
            "required_documents": ["Closing documents", "Title insurance", "Property insurance"]
        }
    ]
}

def get_document_requirements_by_loan_type(loan_type: str) -> Dict[str, Any]:
    """Get document requirements for a specific loan type"""
    loan_type_enum = LoanType(loan_type)
    return LOAN_TYPE_DOCUMENT_REQUIREMENTS.get(loan_type_enum, {})

def get_task_workflow_by_loan_type(loan_type: str) -> List[Dict[str, Any]]:
    """Get task workflow for a specific loan type"""
    loan_type_enum = LoanType(loan_type)
    return LOAN_TYPE_TASK_WORKFLOWS.get(loan_type_enum, [])

def get_all_loan_types() -> List[str]:
    """Get all available loan types"""
    return [loan_type.value for loan_type in LoanType]

def get_document_categories_by_loan_type(loan_type: str) -> List[str]:
    """Get required document categories for a specific loan type"""
    requirements = get_document_requirements_by_loan_type(loan_type)
    return [category.value for category in requirements.keys()] 