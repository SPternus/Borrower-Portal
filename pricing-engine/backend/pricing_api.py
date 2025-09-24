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
import time
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from decimal import Decimal

from pricing_engine import TernusPricingEngine, LoanInputs, PricingResult
from sfdc_connector import TernusSalesforceConnector
from database_models import (
    LoanProduct, PropertyType, LoanPurpose, CreditScoreTier, 
    LTVTier, DSCRTier, LoanAmountTier, SystemConfiguration,
    PricingCalculationLog, GeographicRegion,
    LoanProductResponse, PropertyTypeResponse, LoanPurposeResponse,
    CreditScoreTierResponse, PricingCalculationRequest, PricingCalculationResponse,
    DatabaseManager
)
from config import settings

# Set up logging
logger = logging.getLogger(__name__)

# Create API router
pricing_router = APIRouter(prefix="/api/pricing", tags=["pricing"])

# Initialize pricing engine
pricing_engine = TernusPricingEngine()

# Dependency to get database session (will be injected by main.py)
def get_db_session():
    """This will be overridden by main.py dependency injection"""
    pass

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

@pricing_router.get("/products", response_model=List[LoanProductResponse])
async def get_loan_products(
    active_only: bool = Query(True, description="Return only active products"),
    db: Session = Depends(get_db_session)
):
    """Get all loan products"""
    try:
        query = db.query(LoanProduct)
        if active_only:
            query = query.filter(LoanProduct.is_active == True)
        
        products = query.all()
        return [LoanProductResponse.from_orm(product) for product in products]
    
    except Exception as e:
        logger.error(f"Error fetching loan products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@pricing_router.get("/property-types", response_model=List[PropertyTypeResponse])
async def get_property_types(
    active_only: bool = Query(True, description="Return only active property types"),
    db: Session = Depends(get_db_session)
):
    """Get all property types"""
    try:
        query = db.query(PropertyType)
        if active_only:
            query = query.filter(PropertyType.is_active == True)
        
        property_types = query.all()
        return [PropertyTypeResponse.from_orm(pt) for pt in property_types]
    
    except Exception as e:
        logger.error(f"Error fetching property types: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@pricing_router.get("/loan-purposes", response_model=List[LoanPurposeResponse])
async def get_loan_purposes(
    active_only: bool = Query(True, description="Return only active loan purposes"),
    db: Session = Depends(get_db_session)
):
    """Get all loan purposes"""
    try:
        query = db.query(LoanPurpose)
        if active_only:
            query = query.filter(LoanPurpose.is_active == True)
        
        loan_purposes = query.all()
        return [LoanPurposeResponse.from_orm(lp) for lp in loan_purposes]
    
    except Exception as e:
        logger.error(f"Error fetching loan purposes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@pricing_router.get("/credit-score-tiers", response_model=List[CreditScoreTierResponse])
async def get_credit_score_tiers(
    active_only: bool = Query(True, description="Return only active tiers"),
    db: Session = Depends(get_db_session)
):
    """Get all credit score tiers"""
    try:
        query = db.query(CreditScoreTier)
        if active_only:
            query = query.filter(CreditScoreTier.is_active == True)
        
        tiers = query.order_by(CreditScoreTier.min_score.desc()).all()
        return [CreditScoreTierResponse.from_orm(tier) for tier in tiers]
    
    except Exception as e:
        logger.error(f"Error fetching credit score tiers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@pricing_router.post("/calculate", response_model=PricingCalculationResponse)
async def calculate_pricing(
    request: PricingCalculationRequest,
    db: Session = Depends(get_db_session)
):
    """Calculate loan pricing based on parameters"""
    start_time = time.time()
    
    try:
        # Validate inputs
        if request.loan_amount <= 0:
            raise HTTPException(status_code=400, detail="Loan amount must be greater than 0")
        
        if request.property_value <= 0:
            raise HTTPException(status_code=400, detail="Property value must be greater than 0")
        
        if request.credit_score < 300 or request.credit_score > 850:
            raise HTTPException(status_code=400, detail="Credit score must be between 300 and 850")
        
        # Calculate LTV
        ltv = (request.loan_amount / request.property_value) * 100
        
        # Get base entities
        product = db.query(LoanProduct).filter(
            LoanProduct.id == request.product_id,
            LoanProduct.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Loan product not found")
        
        property_type = db.query(PropertyType).filter(
            PropertyType.id == request.property_type_id,
            PropertyType.is_active == True
        ).first()
        
        if not property_type:
            raise HTTPException(status_code=404, detail="Property type not found")
        
        loan_purpose = db.query(LoanPurpose).filter(
            LoanPurpose.id == request.loan_purpose_id,
            LoanPurpose.is_active == True
        ).first()
        
        if not loan_purpose:
            raise HTTPException(status_code=404, detail="Loan purpose not found")
        
        # Start with base rate
        base_rate = float(product.base_rate)
        adjustments = {}
        
        # Credit Score Adjustment
        credit_tier = db.query(CreditScoreTier).filter(
            and_(
                CreditScoreTier.min_score <= request.credit_score,
                CreditScoreTier.max_score >= request.credit_score,
                CreditScoreTier.is_active == True
            )
        ).first()
        
        if credit_tier:
            credit_adjustment = float(credit_tier.rate_adjustment)
            adjustments['credit_score'] = {
                'tier': credit_tier.tier_name,
                'adjustment': credit_adjustment
            }
        else:
            credit_adjustment = 0.5  # Default penalty for no matching tier
            adjustments['credit_score'] = {
                'tier': 'Unmatched',
                'adjustment': credit_adjustment
            }
        
        # LTV Adjustment
        ltv_tier = db.query(LTVTier).filter(
            and_(
                LTVTier.min_ltv <= ltv,
                LTVTier.max_ltv >= ltv,
                LTVTier.is_active == True
            )
        ).first()
        
        if ltv_tier:
            ltv_adjustment = float(ltv_tier.rate_adjustment)
            adjustments['ltv'] = {
                'tier': ltv_tier.tier_name,
                'value': float(ltv),
                'adjustment': ltv_adjustment
            }
        else:
            ltv_adjustment = 0.25  # Default penalty for high LTV
            adjustments['ltv'] = {
                'tier': 'High Risk',
                'value': float(ltv),
                'adjustment': ltv_adjustment
            }
        
        # DSCR Adjustment (if provided)
        dscr_adjustment = 0
        if request.dscr is not None:
            dscr_tier = db.query(DSCRTier).filter(
                and_(
                    DSCRTier.min_dscr <= request.dscr,
                    or_(DSCRTier.max_dscr >= request.dscr, DSCRTier.max_dscr.is_(None)),
                    DSCRTier.is_active == True
                )
            ).first()
            
            if dscr_tier:
                dscr_adjustment = float(dscr_tier.rate_adjustment)
                adjustments['dscr'] = {
                    'tier': dscr_tier.tier_name,
                    'value': float(request.dscr),
                    'adjustment': dscr_adjustment
                }
        
        # Loan Amount Adjustment
        loan_amount_tier = db.query(LoanAmountTier).filter(
            and_(
                LoanAmountTier.min_amount <= request.loan_amount,
                or_(LoanAmountTier.max_amount >= request.loan_amount, LoanAmountTier.max_amount.is_(None)),
                LoanAmountTier.is_active == True
            )
        ).first()
        
        if loan_amount_tier:
            loan_amount_adjustment = float(loan_amount_tier.rate_adjustment)
            adjustments['loan_amount'] = {
                'tier': loan_amount_tier.tier_name,
                'adjustment': loan_amount_adjustment
            }
        else:
            loan_amount_adjustment = 0
            adjustments['loan_amount'] = {
                'tier': 'Standard',
                'adjustment': loan_amount_adjustment
            }
        
        # Property Type Risk Adjustment
        property_risk_adjustment = (float(property_type.risk_multiplier) - 1.0) * base_rate
        adjustments['property_type'] = {
            'type': property_type.name,
            'risk_multiplier': float(property_type.risk_multiplier),
            'adjustment': property_risk_adjustment
        }
        
        # Loan Purpose Risk Adjustment
        purpose_risk_adjustment = (float(loan_purpose.risk_multiplier) - 1.0) * base_rate
        adjustments['loan_purpose'] = {
            'purpose': loan_purpose.name,
            'risk_multiplier': float(loan_purpose.risk_multiplier),
            'adjustment': purpose_risk_adjustment
        }
        
        # Calculate final rate
        total_adjustment = (
            credit_adjustment +
            ltv_adjustment +
            dscr_adjustment +
            loan_amount_adjustment +
            property_risk_adjustment +
            purpose_risk_adjustment
        )
        
        final_rate = base_rate + total_adjustment
        
        # Apply rate limits from configuration
        final_rate = max(min(final_rate, base_rate + settings.max_rate_adjustment), 
                        base_rate + settings.min_rate_adjustment)
        
        adjustments['total'] = {
            'base_rate': base_rate,
            'total_adjustment': total_adjustment,
            'final_rate': final_rate
        }
        
        # Calculate timing
        calculation_time_ms = int((time.time() - start_time) * 1000)
        calculation_id = str(uuid.uuid4())
        
        # Log the calculation if audit logging is enabled
        if settings.enable_audit_logging:
            log_entry = PricingCalculationLog(
                loan_amount=request.loan_amount,
                property_value=request.property_value,
                ltv=Decimal(str(ltv)),
                dscr=request.dscr,
                credit_score=request.credit_score,
                property_type_id=uuid.UUID(request.property_type_id),
                loan_purpose_id=uuid.UUID(request.loan_purpose_id),
                product_id=uuid.UUID(request.product_id),
                base_rate=Decimal(str(base_rate)),
                adjustments=adjustments,
                final_rate=Decimal(str(final_rate)),
                calculation_time_ms=calculation_time_ms,
                requested_by="api_user"  # This could be enhanced with actual user identification
            )
            db.add(log_entry)
            db.commit()
        
        return PricingCalculationResponse(
            loan_amount=request.loan_amount,
            property_value=request.property_value,
            ltv=Decimal(str(round(ltv, 2))),
            dscr=request.dscr,
            credit_score=request.credit_score,
            base_rate=Decimal(str(base_rate)),
            adjustments=adjustments,
            final_rate=Decimal(str(round(final_rate, 4))),
            calculation_id=calculation_id,
            calculation_time_ms=calculation_time_ms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in pricing calculation: {e}")
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")

@pricing_router.get("/config")
async def get_system_configuration(db: Session = Depends(get_db_session)):
    """Get system configuration"""
    try:
        configs = db.query(SystemConfiguration).filter(
            SystemConfiguration.is_active == True
        ).all()
        
        return {
            "configurations": [
                {
                    "key": config.config_key,
                    "value": config.config_value,
                    "type": config.config_type,
                    "description": config.description
                }
                for config in configs
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching system configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@pricing_router.get("/analytics/summary")
async def get_pricing_analytics(
    days: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db_session)
):
    """Get pricing analytics summary"""
    try:
        from datetime import datetime, timedelta
        
        start_date = datetime.now() - timedelta(days=days)
        
        # Get calculation statistics
        total_calculations = db.query(PricingCalculationLog).filter(
            PricingCalculationLog.created_at >= start_date
        ).count()
        
        avg_rate = db.query(PricingCalculationLog).filter(
            PricingCalculationLog.created_at >= start_date
        ).with_entities(PricingCalculationLog.final_rate).all()
        
        avg_rate_value = sum(float(rate[0]) for rate in avg_rate) / len(avg_rate) if avg_rate else 0
        
        # Product usage statistics
        product_usage = db.query(
            LoanProduct.name,
            db.func.count(PricingCalculationLog.id).label('count')
        ).join(PricingCalculationLog).filter(
            PricingCalculationLog.created_at >= start_date
        ).group_by(LoanProduct.name).all()
        
        return {
            "period_days": days,
            "total_calculations": total_calculations,
            "average_final_rate": round(avg_rate_value, 4),
            "product_usage": [
                {"product": usage[0], "calculations": usage[1]}
                for usage in product_usage
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching pricing analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@pricing_router.get("/quick-quote")
async def get_quick_quote(
    loan_amount: float = Query(..., description="Loan amount"),
    property_value: float = Query(..., description="Property value"),
    credit_score: int = Query(..., description="Credit score"),
    product_name: str = Query("DSCR", description="Product name"),
    db: Session = Depends(get_db_session)
):
    """Get a quick rate quote with minimal parameters"""
    try:
        # Get default product
        product = db.query(LoanProduct).filter(
            LoanProduct.name == product_name,
            LoanProduct.is_active == True
        ).first()
        
        if not product:
            product = db.query(LoanProduct).filter(
                LoanProduct.is_active == True
            ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="No active products found")
        
        # Get default property type and loan purpose
        default_property_type = db.query(PropertyType).filter(
            PropertyType.name == "Single Family Residence",
            PropertyType.is_active == True
        ).first()
        
        default_loan_purpose = db.query(LoanPurpose).filter(
            LoanPurpose.name == "Purchase",
            LoanPurpose.is_active == True
        ).first()
        
        if not default_property_type or not default_loan_purpose:
            raise HTTPException(status_code=404, detail="Default property type or loan purpose not found")
        
        # Create calculation request
        calc_request = PricingCalculationRequest(
            loan_amount=Decimal(str(loan_amount)),
            property_value=Decimal(str(property_value)),
            credit_score=credit_score,
            property_type_id=str(default_property_type.id),
            loan_purpose_id=str(default_loan_purpose.id),
            product_id=str(product.id)
        )
        
        # Calculate pricing
        result = await calculate_pricing(calc_request, db)
        
        return {
            "loan_amount": loan_amount,
            "property_value": property_value,
            "ltv": float(result.ltv),
            "credit_score": credit_score,
            "product": product.name,
            "estimated_rate": float(result.final_rate),
            "note": "This is an estimated rate. Final rate may vary based on additional factors."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in quick quote: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        sf_connector = TernusSalesforceConnector()
        
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