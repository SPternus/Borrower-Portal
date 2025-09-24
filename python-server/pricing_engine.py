#!/usr/bin/env python3
"""
Ternus Pricing Engine
Configurable loan pricing engine based on Excel formulas
Supports Fix & Flip, WholeTail, Bridge loans with PostgreSQL storage
"""

import json
import logging
import math
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from decimal import Decimal, ROUND_HALF_UP
import sqlite3
import os

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class LoanInputs:
    """Loan input parameters"""
    # Property Information
    purchase_price: float = 0.0
    arv: float = 0.0  # After Repair Value
    rehab_costs: float = 0.0
    as_is_value: float = 0.0
    current_balance: float = 0.0  # For refinance
    
    # Loan Parameters
    loan_purpose: str = "Purchase"  # Purchase, Refinance
    product_type: str = "FnF"  # FnF, WholeTail, Bridge-Purchase, Bridge-Refi
    loan_to_cost_ratio: float = 0.80  # 80%
    loan_to_arv_ratio: float = 0.70   # 70%
    interest_rate: float = 0.12       # 12% annual
    term_months: int = 12
    
    # Fees and Options
    origination_fee_rate: float = 0.02  # 2%
    inspection_fee: float = 750.0
    processing_fee: float = 995.0
    appraisal_fee: float = 650.0
    title_insurance: float = 2500.0
    attorney_fee: float = 1500.0
    interest_reserve_months: int = 6
    interest_reserve_required: bool = True
    extension_fee_rate: float = 0.06  # 6% if extended
    
    # Dates
    funding_date: datetime = None
    maturity_date: datetime = None
    
    def __post_init__(self):
        if self.funding_date is None:
            self.funding_date = datetime.now()
        if self.maturity_date is None:
            self.maturity_date = self.funding_date + timedelta(days=self.term_months * 30)

@dataclass 
class PricingResult:
    """Pricing calculation results"""
    # Loan Details
    loan_amount: float = 0.0
    max_loan_amount: float = 0.0
    funds_to_borrower: float = 0.0
    
    # Interest Calculations
    daily_interest_rate: float = 0.0
    monthly_interest_payment: float = 0.0
    total_interest: float = 0.0
    
    # Fees
    origination_fee: float = 0.0
    inspection_fee: float = 0.0
    processing_fee: float = 0.0
    appraisal_fee: float = 0.0
    title_insurance: float = 0.0
    attorney_fee: float = 0.0
    interest_reserve: float = 0.0
    extension_fee: float = 0.0
    
    # Totals
    total_fees: float = 0.0
    total_closing_costs: float = 0.0
    total_amount_due_at_maturity: float = 0.0
    net_funding_amount: float = 0.0
    
    # Validation
    is_valid: bool = True
    warnings: List[str] = None
    errors: List[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []
        if self.errors is None:
            self.errors = []

class TernusPricingEngine:
    """Main pricing engine class"""
    
    def __init__(self, config_file: str = "pricing_config.json"):
        self.config_file = config_file
        self.config = self.load_config()
        self.db_path = "pricing_engine.db"
        self.init_database()
        
        # Custom calculation functions
        self.functions = {
            'min': min,
            'max': max,
            'sum': sum,
            'abs': abs,
            'round': round,
            'pow': pow,
            'vlookup': self._vlookup,
            'pmt': self._pmt,
            'days': self._days_between,
            'eomonth': self._eomonth,
            'np': np
        }
        
        logger.info("✅ Ternus Pricing Engine initialized")
    
    def load_config(self) -> Dict:
        """Load pricing configuration"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            else:
                logger.warning(f"⚠️ Config file {self.config_file} not found, using defaults")
                return self._default_config()
        except Exception as e:
            logger.error(f"❌ Error loading config: {e}")
            return self._default_config()
    
    def _default_config(self) -> Dict:
        """Default pricing configuration"""
        return {
            "products": {
                "FnF": {
                    "name": "Fix & Flip",
                    "max_ltc": 0.80,
                    "max_ltv": 0.70,
                    "base_rate": 0.12,
                    "max_term_months": 12,
                    "origination_fee": 0.02,
                    "interest_reserve_required": True
                },
                "WholeTail": {
                    "name": "Whole Tail",
                    "max_ltc": 0.75,
                    "max_ltv": 0.65,
                    "base_rate": 0.11,
                    "max_term_months": 6,
                    "origination_fee": 0.015,
                    "interest_reserve_required": False
                },
                "Bridge-Purchase": {
                    "name": "Bridge Purchase",
                    "max_ltc": 0.75,
                    "max_ltv": 0.70,
                    "base_rate": 0.12,
                    "max_term_months": 24,
                    "origination_fee": 0.02,
                    "interest_reserve_required": True
                },
                "Bridge-Refi": {
                    "name": "Bridge Refinance",
                    "max_ltc": 0.75,
                    "max_ltv": 0.70,
                    "base_rate": 0.12,
                    "max_term_months": 24,
                    "origination_fee": 0.02,
                    "interest_reserve_required": True
                }
            }
        }
    
    def init_database(self):
        """Initialize SQLite database for pricing storage"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pricing scenarios table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pricing_scenarios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scenario_name TEXT NOT NULL,
                    product_type TEXT NOT NULL,
                    inputs_json TEXT NOT NULL,
                    results_json TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by TEXT,
                    opportunity_id TEXT,
                    contact_id TEXT,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            # Pricing rules table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS pricing_rules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    rule_name TEXT NOT NULL,
                    product_type TEXT NOT NULL,
                    condition_formula TEXT NOT NULL,
                    adjustment_type TEXT NOT NULL,  -- 'rate', 'fee', 'ltv'
                    adjustment_value REAL NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Fee schedules table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS fee_schedules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_type TEXT NOT NULL,
                    fee_type TEXT NOT NULL,
                    fee_amount REAL,
                    fee_percentage REAL,
                    minimum_amount REAL,
                    maximum_amount REAL,
                    is_active BOOLEAN DEFAULT 1
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("✅ Pricing database initialized")
            
        except Exception as e:
            logger.error(f"❌ Database initialization error: {e}")
    
    def calculate_pricing(self, inputs: LoanInputs) -> PricingResult:
        """Main pricing calculation method"""
        logger.info(f"🔢 Calculating pricing for {inputs.product_type}")
        
        try:
            # Initialize result
            result = PricingResult()
            
            # Validate inputs
            if not self._validate_inputs(inputs, result):
                return result
            
            # Calculate based on product type
            if inputs.product_type == "FnF":
                result = self._calculate_fix_flip(inputs, result)
            elif inputs.product_type == "WholeTail":
                result = self._calculate_whole_tail(inputs, result)
            elif inputs.product_type == "Bridge-Purchase":
                result = self._calculate_bridge_purchase(inputs, result)
            elif inputs.product_type == "Bridge-Refi":
                result = self._calculate_bridge_refi(inputs, result)
            else:
                result.errors.append(f"Unknown product type: {inputs.product_type}")
                result.is_valid = False
                return result
            
            # Final calculations
            self._calculate_totals(inputs, result)
            
            logger.info(f"✅ Pricing calculated: Loan Amount ${result.loan_amount:,.2f}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Pricing calculation error: {e}")
            result.errors.append(f"Calculation error: {str(e)}")
            result.is_valid = False
            return result
    
    def _validate_inputs(self, inputs: LoanInputs, result: PricingResult) -> bool:
        """Validate input parameters"""
        is_valid = True
        
        # Check required fields
        if inputs.purchase_price <= 0 and inputs.as_is_value <= 0:
            result.errors.append("Purchase price or as-is value must be greater than 0")
            is_valid = False
        
        if inputs.product_type in ["FnF", "WholeTail"] and inputs.arv <= 0:
            result.errors.append("ARV (After Repair Value) is required for Fix & Flip and WholeTail")
            is_valid = False
        
        if inputs.interest_rate <= 0 or inputs.interest_rate > 1:
            result.errors.append("Interest rate must be between 0 and 1")
            is_valid = False
        
        if inputs.term_months <= 0:
            result.errors.append("Term must be greater than 0 months")
            is_valid = False
        
        # Warnings
        if inputs.loan_to_cost_ratio > 0.85:
            result.warnings.append("LTC ratio is very high (>85%)")
        
        if inputs.interest_rate > 0.18:
            result.warnings.append("Interest rate is very high (>18%)")
        
        result.is_valid = is_valid
        return is_valid
    
    def _calculate_fix_flip(self, inputs: LoanInputs, result: PricingResult) -> PricingResult:
        """Calculate Fix & Flip pricing based on Excel formulas"""
        
        # F6: =(F4*0.7)-F5 - Max loan based on 70% ARV minus rehab
        max_loan_arv = (inputs.arv * 0.7) - inputs.rehab_costs
        
        # F7: =IF(F6=0,MIN(F2:F3),MIN(F2,F3,F6)) - Final max loan amount
        if max_loan_arv <= 0:
            result.max_loan_amount = min(inputs.purchase_price, inputs.arv)
        else:
            result.max_loan_amount = min(inputs.purchase_price, inputs.arv, max_loan_arv)
        
        # D13: Purchase price (from data entry)
        purchase_price = inputs.purchase_price
        
        # I11: =D13*I5 - Loan amount based on LTC
        loan_amount_ltc = purchase_price * inputs.loan_to_cost_ratio
        
        # I12: =D14+D15 - Total costs (rehab + acquisition)
        total_costs = inputs.rehab_costs + inputs.purchase_price
        
        # I13: =IF(I11>I12,I12,I11) - Min of LTC loan or total costs
        result.loan_amount = min(loan_amount_ltc, total_costs)
        
        # Interest calculations
        # D24: =(D17*0.12)/360 - Daily interest
        result.daily_interest_rate = (result.loan_amount * inputs.interest_rate) / 360
        
        # D25: =(D17*0.12)/12 - Monthly interest
        result.monthly_interest_payment = (result.loan_amount * inputs.interest_rate) / 12
        
        # Fees calculation
        # C31: =$D$17*$I$4 - Origination fee
        result.origination_fee = result.loan_amount * inputs.origination_fee_rate
        
        # Interest reserve calculation (I7 = "Yes")
        if inputs.interest_reserve_required:
            # C33: =IF(I7="Yes", D25*6,0) - 6 months interest reserve
            result.interest_reserve = result.monthly_interest_payment * inputs.interest_reserve_months
        
        # Standard fees
        result.inspection_fee = inputs.inspection_fee
        result.processing_fee = inputs.processing_fee
        result.appraisal_fee = inputs.appraisal_fee
        
        return result
    
    def _calculate_whole_tail(self, inputs: LoanInputs, result: PricingResult) -> PricingResult:
        """Calculate WholeTail pricing"""
        
        # D13: ARV from data entry
        arv = inputs.arv
        
        # D14: Max loan amount (from F7 calculation)
        max_loan_arv = (arv * 0.7) - inputs.rehab_costs
        result.max_loan_amount = max(0, max_loan_arv)
        
        # D15: Cash to borrower calculation
        if result.max_loan_amount > arv:
            cash_to_borrower = 0
        else:
            cash_to_borrower = arv - result.max_loan_amount
        
        # D17: Final loan amount
        result.loan_amount = min(arv, result.max_loan_amount)
        
        # Interest calculations (12% rate)
        result.daily_interest_rate = (result.loan_amount * inputs.interest_rate) / 360
        result.monthly_interest_payment = (result.loan_amount * inputs.interest_rate) / 12
        
        # Fees
        result.origination_fee = result.loan_amount * inputs.origination_fee_rate
        result.funds_to_borrower = cash_to_borrower
        
        return result
    
    def _calculate_bridge_purchase(self, inputs: LoanInputs, result: PricingResult) -> PricingResult:
        """Calculate Bridge Purchase pricing"""
        
        # D13: Purchase price
        purchase_price = inputs.purchase_price
        
        # D16: Loan amount (LTC * purchase price)
        result.loan_amount = purchase_price * inputs.loan_to_cost_ratio
        result.max_loan_amount = result.loan_amount
        
        # Interest calculations
        result.daily_interest_rate = (result.loan_amount * inputs.interest_rate) / 360
        result.monthly_interest_payment = (result.loan_amount * inputs.interest_rate) / 12
        
        # Fees
        result.origination_fee = result.loan_amount * inputs.origination_fee_rate
        
        # E28: Funds to borrower
        result.funds_to_borrower = purchase_price - result.loan_amount
        
        # Interest reserve (6 months if required)
        if inputs.interest_reserve_required:
            result.interest_reserve = result.monthly_interest_payment * 6
        
        return result
    
    def _calculate_bridge_refi(self, inputs: LoanInputs, result: PricingResult) -> PricingResult:
        """Calculate Bridge Refinance pricing"""
        
        # Similar to purchase but uses as-is value
        as_is_value = inputs.as_is_value or inputs.purchase_price
        
        # D16: Loan amount (LTV * as-is value)
        result.loan_amount = as_is_value * inputs.loan_to_arv_ratio
        result.max_loan_amount = result.loan_amount
        
        # Interest calculations
        result.daily_interest_rate = (result.loan_amount * inputs.interest_rate) / 360
        result.monthly_interest_payment = (result.loan_amount * inputs.interest_rate) / 12
        
        # Fees
        result.origination_fee = result.loan_amount * inputs.origination_fee_rate
        
        # Net funding (after paying off existing mortgage)
        current_balance = inputs.current_balance or 0
        result.net_funding_amount = result.loan_amount - current_balance
        
        # Interest reserve
        if inputs.interest_reserve_required:
            result.interest_reserve = result.monthly_interest_payment * 6
        
        return result
    
    def _calculate_totals(self, inputs: LoanInputs, result: PricingResult):
        """Calculate final totals"""
        
        # Total fees
        result.total_fees = (
            result.origination_fee +
            result.inspection_fee +
            result.processing_fee +
            result.appraisal_fee +
            result.title_insurance +
            result.attorney_fee +
            result.interest_reserve +
            result.extension_fee
        )
        
        # Total closing costs (fees paid at closing)
        result.total_closing_costs = (
            result.origination_fee +
            result.inspection_fee +
            result.processing_fee +
            result.appraisal_fee +
            result.title_insurance +
            result.attorney_fee
        )
        
        # Total interest over term
        result.total_interest = result.monthly_interest_payment * inputs.term_months
        
        # Total amount due at maturity
        result.total_amount_due_at_maturity = result.loan_amount + result.total_interest
        
        # Net funding to borrower
        if result.net_funding_amount == 0:  # Not set by product calculation
            result.net_funding_amount = result.loan_amount - result.total_closing_costs
    
    def save_pricing_scenario(self, scenario_name: str, inputs: LoanInputs, 
                            result: PricingResult, contact_id: str = None,
                            opportunity_id: str = None) -> int:
        """Save pricing scenario to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO pricing_scenarios 
                (scenario_name, product_type, inputs_json, results_json, contact_id, opportunity_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                scenario_name,
                inputs.product_type,
                json.dumps(asdict(inputs), default=str),
                json.dumps(asdict(result), default=str),
                contact_id,
                opportunity_id
            ))
            
            scenario_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Pricing scenario saved with ID: {scenario_id}")
            return scenario_id
            
        except Exception as e:
            logger.error(f"❌ Error saving pricing scenario: {e}")
            return None
    
    def get_pricing_scenarios(self, contact_id: str = None, 
                            opportunity_id: str = None) -> List[Dict]:
        """Retrieve pricing scenarios"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = "SELECT * FROM pricing_scenarios WHERE is_active = 1"
            params = []
            
            if contact_id:
                query += " AND contact_id = ?"
                params.append(contact_id)
            
            if opportunity_id:
                query += " AND opportunity_id = ?"
                params.append(opportunity_id)
            
            query += " ORDER BY created_at DESC"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            scenarios = []
            for row in rows:
                scenario = {
                    'id': row[0],
                    'scenario_name': row[1],
                    'product_type': row[2],
                    'inputs': json.loads(row[3]),
                    'results': json.loads(row[4]),
                    'created_at': row[5],
                    'contact_id': row[7],
                    'opportunity_id': row[8]
                }
                scenarios.append(scenario)
            
            conn.close()
            return scenarios
            
        except Exception as e:
            logger.error(f"❌ Error retrieving scenarios: {e}")
            return []
    
    # Helper functions for Excel formula compatibility
    def _vlookup(self, lookup_value, table_array, col_index, exact_match=True):
        """VLOOKUP function implementation"""
        # Simplified implementation
        return lookup_value
    
    def _pmt(self, rate, nper, pv, fv=0, type=0):
        """PMT function for loan payments"""
        if rate == 0:
            return -pv / nper
        return -(pv * rate * (1 + rate)**nper) / ((1 + rate)**nper - 1)
    
    def _days_between(self, date1, date2):
        """Calculate days between dates"""
        if isinstance(date1, str):
            date1 = datetime.strptime(date1, "%Y-%m-%d")
        if isinstance(date2, str):
            date2 = datetime.strptime(date2, "%Y-%m-%d")
        return abs((date2 - date1).days)
    
    def _eomonth(self, start_date, months):
        """End of month calculation"""
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, "%Y-%m-%d")
        
        # Add months and get last day of month
        import calendar
        year = start_date.year
        month = start_date.month + months
        
        while month > 12:
            month -= 12
            year += 1
        while month < 1:
            month += 12
            year -= 1
        
        last_day = calendar.monthrange(year, month)[1]
        return datetime(year, month, last_day)


# Example usage and testing
if __name__ == "__main__":
    print("🚀 Testing Ternus Pricing Engine")
    
    # Initialize engine
    engine = TernusPricingEngine()
    
    # Test Fix & Flip scenario
    fnf_inputs = LoanInputs(
        purchase_price=400000,
        arv=650000,
        rehab_costs=80000,
        product_type="FnF",
        loan_to_cost_ratio=0.80,
        loan_to_arv_ratio=0.70,
        interest_rate=0.12,
        term_months=12,
        interest_reserve_required=True
    )
    
    result = engine.calculate_pricing(fnf_inputs)
    
    print(f"\n🏠 Fix & Flip Pricing:")
    print(f"💰 Loan Amount: ${result.loan_amount:,.2f}")
    print(f"📊 Monthly Payment: ${result.monthly_interest_payment:,.2f}")
    print(f"🧾 Total Fees: ${result.total_fees:,.2f}")
    print(f"💵 Net Funding: ${result.net_funding_amount:,.2f}")
    
    if result.warnings:
        print(f"⚠️ Warnings: {', '.join(result.warnings)}")
    
    if result.errors:
        print(f"❌ Errors: {', '.join(result.errors)}")
    
    # Save scenario
    scenario_id = engine.save_pricing_scenario(
        "Test Fix & Flip",
        fnf_inputs,
        result,
        contact_id="003XX0000004DcW"
    )
    
    print(f"\n✅ Pricing engine test completed! Scenario ID: {scenario_id}") 