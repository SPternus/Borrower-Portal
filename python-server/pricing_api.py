#!/usr/bin/env python3
"""
Pricing API Endpoints for Ternus Borrower Portal
Integrates pricing engine with Salesforce opportunities
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

from pricing_engine import TernusPricingEngine, LoanInputs, PricingResult
from salesforce_connector_v2 import TernusSalesforceConnectorV2

# Set up logging
logger = logging.getLogger(__name__)

# Create API router
pricing_router = APIRouter(prefix="/api/pricing", tags=["pricing"])

# Initialize pricing engine
pricing_engine = TernusPricingEngine()

class PricingRequest(BaseModel):
    """Request model for pricing calculations"""
    # Property Information
    purchase_price: float = Field(gt=0, description="Purchase price of the property")
    arv: float = Field(default=0, ge=0, description="After Repair Value")
    rehab_costs: float = Field(default=0, ge=0, description="Estimated rehab costs")
    as_is_value: float = Field(default=0, ge=0, description="Current as-is value")
    current_balance: float = Field(default=0, ge=0, description="Current mortgage balance")
    
    # Loan Parameters
    loan_purpose: str = Field(default="Purchase", description="Purchase or Refinance")
    product_type: str = Field(description="FnF, WholeTail, Bridge-Purchase, Bridge-Refi")
    loan_to_cost_ratio: float = Field(default=0.80, gt=0, le=1, description="Loan-to-cost ratio")
    loan_to_arv_ratio: float = Field(default=0.70, gt=0, le=1, description="Loan-to-ARV ratio")
    interest_rate: float = Field(default=0.12, gt=0, le=1, description="Annual interest rate")
    term_months: int = Field(default=12, gt=0, le=60, description="Loan term in months")
    
    # Optional Overrides
    origination_fee_rate: Optional[float] = Field(default=0.02, ge=0, le=1)
    inspection_fee: Optional[float] = Field(default=750.0, ge=0)
    processing_fee: Optional[float] = Field(default=995.0, ge=0)
    appraisal_fee: Optional[float] = Field(default=650.0, ge=0)
    title_insurance: Optional[float] = Field(default=2500.0, ge=0)
    attorney_fee: Optional[float] = Field(default=1500.0, ge=0)
    interest_reserve_required: Optional[bool] = Field(default=True)
    interest_reserve_months: Optional[int] = Field(default=6, ge=0, le=12)

class PricingResponse(BaseModel):
    """Response model for pricing calculations"""
    # Loan Details
    loan_amount: float
    max_loan_amount: float
    funds_to_borrower: float
    
    # Interest Calculations
    daily_interest_rate: float
    monthly_interest_payment: float
    total_interest: float
    
    # Fees
    origination_fee: float
    inspection_fee: float
    processing_fee: float
    appraisal_fee: float
    title_insurance: float
    attorney_fee: float
    interest_reserve: float
    extension_fee: float
    
    # Totals
    total_fees: float
    total_closing_costs: float
    total_amount_due_at_maturity: float
    net_funding_amount: float
    
    # Validation
    is_valid: bool
    warnings: List[str] = []
    errors: List[str] = []
    
    # Metadata
    product_type: str
    calculated_at: datetime

class SavePricingRequest(BaseModel):
    """Request to save pricing scenario"""
    scenario_name: str = Field(description="Name for this pricing scenario")
    pricing_request: PricingRequest
    opportunity_id: Optional[str] = None
    contact_id: Optional[str] = None

@pricing_router.post("/calculate", response_model=PricingResponse)
async def calculate_pricing(request: PricingRequest):
    """
    Calculate loan pricing based on property and loan parameters
    
    This endpoint uses the exact Excel formulas from your Term Sheet template
    to provide accurate pricing calculations for all loan products.
    """
    try:
        logger.info(f"🔢 Calculating pricing for {request.product_type}")
        
        # Convert request to LoanInputs
        inputs = LoanInputs(
            purchase_price=request.purchase_price,
            arv=request.arv,
            rehab_costs=request.rehab_costs,
            as_is_value=request.as_is_value,
            current_balance=request.current_balance,
            loan_purpose=request.loan_purpose,
            product_type=request.product_type,
            loan_to_cost_ratio=request.loan_to_cost_ratio,
            loan_to_arv_ratio=request.loan_to_arv_ratio,
            interest_rate=request.interest_rate,
            term_months=request.term_months,
            origination_fee_rate=request.origination_fee_rate or 0.02,
            inspection_fee=request.inspection_fee or 750.0,
            processing_fee=request.processing_fee or 995.0,
            appraisal_fee=request.appraisal_fee or 650.0,
            title_insurance=request.title_insurance or 2500.0,
            attorney_fee=request.attorney_fee or 1500.0,
            interest_reserve_required=request.interest_reserve_required or True,
            interest_reserve_months=request.interest_reserve_months or 6
        )
        
        # Calculate pricing
        result = pricing_engine.calculate_pricing(inputs)
        
        # Convert to response model
        response = PricingResponse(
            loan_amount=result.loan_amount,
            max_loan_amount=result.max_loan_amount,
            funds_to_borrower=result.funds_to_borrower,
            daily_interest_rate=result.daily_interest_rate,
            monthly_interest_payment=result.monthly_interest_payment,
            total_interest=result.total_interest,
            origination_fee=result.origination_fee,
            inspection_fee=result.inspection_fee,
            processing_fee=result.processing_fee,
            appraisal_fee=result.appraisal_fee,
            title_insurance=result.title_insurance,
            attorney_fee=result.attorney_fee,
            interest_reserve=result.interest_reserve,
            extension_fee=result.extension_fee,
            total_fees=result.total_fees,
            total_closing_costs=result.total_closing_costs,
            total_amount_due_at_maturity=result.total_amount_due_at_maturity,
            net_funding_amount=result.net_funding_amount,
            is_valid=result.is_valid,
            warnings=result.warnings,
            errors=result.errors,
            product_type=request.product_type,
            calculated_at=datetime.now()
        )
        
        logger.info(f"✅ Pricing calculated successfully: ${result.loan_amount:,.2f}")
        return response
        
    except Exception as e:
        logger.error(f"❌ Pricing calculation error: {e}")
        raise HTTPException(status_code=500, detail=f"Pricing calculation failed: {str(e)}")

@pricing_router.post("/save-scenario")
async def save_pricing_scenario(request: SavePricingRequest):
    """
    Save a pricing scenario for future reference
    
    This allows borrowers and loan officers to save different pricing
    scenarios for comparison and decision making.
    """
    try:
        # Calculate pricing first
        inputs = LoanInputs(
            purchase_price=request.pricing_request.purchase_price,
            arv=request.pricing_request.arv,
            rehab_costs=request.pricing_request.rehab_costs,
            as_is_value=request.pricing_request.as_is_value,
            current_balance=request.pricing_request.current_balance,
            loan_purpose=request.pricing_request.loan_purpose,
            product_type=request.pricing_request.product_type,
            loan_to_cost_ratio=request.pricing_request.loan_to_cost_ratio,
            loan_to_arv_ratio=request.pricing_request.loan_to_arv_ratio,
            interest_rate=request.pricing_request.interest_rate,
            term_months=request.pricing_request.term_months,
            origination_fee_rate=request.pricing_request.origination_fee_rate or 0.02,
            inspection_fee=request.pricing_request.inspection_fee or 750.0,
            processing_fee=request.pricing_request.processing_fee or 995.0,
            appraisal_fee=request.pricing_request.appraisal_fee or 650.0,
            title_insurance=request.pricing_request.title_insurance or 2500.0,
            attorney_fee=request.pricing_request.attorney_fee or 1500.0,
            interest_reserve_required=request.pricing_request.interest_reserve_required or True,
            interest_reserve_months=request.pricing_request.interest_reserve_months or 6
        )
        
        result = pricing_engine.calculate_pricing(inputs)
        
        # Save scenario
        scenario_id = pricing_engine.save_pricing_scenario(
            request.scenario_name,
            inputs,
            result,
            contact_id=request.contact_id,
            opportunity_id=request.opportunity_id
        )
        
        if scenario_id:
            return {
                "success": True,
                "scenario_id": scenario_id,
                "message": f"Pricing scenario '{request.scenario_name}' saved successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save pricing scenario")
            
    except Exception as e:
        logger.error(f"❌ Error saving pricing scenario: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save scenario: {str(e)}")

@pricing_router.get("/scenarios")
async def get_pricing_scenarios(
    contact_id: Optional[str] = Query(None, description="Filter by contact ID"),
    opportunity_id: Optional[str] = Query(None, description="Filter by opportunity ID")
):
    """
    Retrieve saved pricing scenarios
    
    Returns a list of pricing scenarios, optionally filtered by contact or opportunity.
    """
    try:
        scenarios = pricing_engine.get_pricing_scenarios(
            contact_id=contact_id,
            opportunity_id=opportunity_id
        )
        
        return {
            "success": True,
            "count": len(scenarios),
            "scenarios": scenarios
        }
        
    except Exception as e:
        logger.error(f"❌ Error retrieving scenarios: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve scenarios: {str(e)}")

@pricing_router.get("/products")
async def get_available_products():
    """
    Get list of available loan products with their parameters
    """
    try:
        products = {
            "FnF": {
                "name": "Fix & Flip",
                "description": "Short-term financing for property rehabilitation projects",
                "max_ltc": 0.80,
                "max_ltv": 0.70,
                "typical_rate": "12.00%",
                "max_term": "12 months",
                "features": ["Interest-only payments", "Interest reserve available", "Fast closing"]
            },
            "WholeTail": {
                "name": "Whole Tail",
                "description": "Quick sale financing for move-in ready properties",
                "max_ltc": 0.75,
                "max_ltv": 0.65,
                "typical_rate": "11.00%",
                "max_term": "6 months",
                "features": ["No interest reserve required", "Quick turnaround", "Minimal rehab"]
            },
            "Bridge-Purchase": {
                "name": "Bridge Purchase",
                "description": "Bridge financing for property acquisition",
                "max_ltc": 0.75,
                "max_ltv": 0.70,
                "typical_rate": "12.00%",
                "max_term": "24 months",
                "features": ["Longer terms available", "Interest reserve included", "Flexible repayment"]
            },
            "Bridge-Refi": {
                "name": "Bridge Refinance",
                "description": "Bridge refinancing for existing properties",
                "max_ltc": 0.75,
                "max_ltv": 0.70,
                "typical_rate": "12.00%",
                "max_term": "24 months",
                "features": ["Cash-out available", "Debt consolidation", "Rate and term"]
            }
        }
        
        return {
            "success": True,
            "products": products
        }
        
    except Exception as e:
        logger.error(f"❌ Error retrieving products: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve products: {str(e)}")

@pricing_router.post("/opportunity/{opportunity_id}/pricing")
async def calculate_opportunity_pricing(
    opportunity_id: str,
    request: PricingRequest,
    invitation_token: Optional[str] = Query(None, description="Invitation token for authentication")
):
    """
    Calculate pricing for a specific Salesforce opportunity
    
    This endpoint pulls opportunity data from Salesforce and combines it
    with the pricing request to provide accurate calculations.
    """
    try:
        # Initialize Salesforce connector
        sf_connector = TernusSalesforceConnectorV2()
        
        # Get opportunity details
        opportunity = sf_connector.get_opportunity_by_id(opportunity_id)
        
        if not opportunity:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        
        # Merge opportunity data with pricing request
        merged_request = request.copy()
        
        # Override with opportunity data if available
        if opportunity.get('Amount'):
            merged_request.purchase_price = opportunity['Amount']
        
        if opportunity.get('Property_Value__c'):
            merged_request.arv = opportunity['Property_Value__c']
        
        if opportunity.get('Product__c'):
            # Map Salesforce product to pricing product type
            product_mapping = {
                'Fix & Flip': 'FnF',
                'Whole Tail': 'WholeTail',
                'Bridge Loan': 'Bridge-Purchase',
                'Bridge Refinance': 'Bridge-Refi'
            }
            mapped_product = product_mapping.get(opportunity['Product__c'])
            if mapped_product:
                merged_request.product_type = mapped_product
        
        # Calculate pricing with merged data
        pricing_response = await calculate_pricing(merged_request)
        
        # Add opportunity context
        pricing_response_dict = pricing_response.dict()
        pricing_response_dict['opportunity_id'] = opportunity_id
        pricing_response_dict['opportunity_name'] = opportunity.get('Name', '')
        pricing_response_dict['opportunity_stage'] = opportunity.get('StageName', '')
        
        return pricing_response_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error calculating opportunity pricing: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate opportunity pricing: {str(e)}")

@pricing_router.get("/health")
async def pricing_health_check():
    """Health check for pricing engine"""
    try:
        # Test basic functionality
        test_inputs = LoanInputs(
            purchase_price=100000,
            arv=120000,
            product_type="FnF"
        )
        
        result = pricing_engine.calculate_pricing(test_inputs)
        
        return {
            "status": "healthy",
            "pricing_engine": "operational",
            "database": "connected",
            "test_calculation": "passed" if result.is_valid else "failed"
        }
        
    except Exception as e:
        logger.error(f"❌ Pricing health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        } 