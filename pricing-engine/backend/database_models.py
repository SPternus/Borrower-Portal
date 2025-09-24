"""
Database models for Ternus Pricing Engine
"""
from sqlalchemy import create_engine, Column, String, Text, Boolean, Integer, DECIMAL, DateTime, Date, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.sql import func
import uuid
import json

Base = declarative_base()

class LoanProduct(Base):
    __tablename__ = 'loan_products'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    base_rate = Column(DECIMAL(6,4), nullable=False)
    min_loan_amount = Column(DECIMAL(15,2), default=0)
    max_loan_amount = Column(DECIMAL(15,2))
    min_ltv = Column(DECIMAL(5,2), default=0)
    max_ltv = Column(DECIMAL(5,2), default=100)
    min_dscr = Column(DECIMAL(5,2))
    max_dscr = Column(DECIMAL(5,2))
    min_credit_score = Column(Integer)
    max_credit_score = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    rate_sheets = relationship("RateSheet", back_populates="product")
    pricing_calculations = relationship("PricingCalculationLog", back_populates="product")

class PropertyType(Base):
    __tablename__ = 'property_types'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), nullable=False, unique=True)
    description = Column(Text)
    risk_multiplier = Column(DECIMAL(5,4), default=1.0000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    pricing_calculations = relationship("PricingCalculationLog", back_populates="property_type")

class LoanPurpose(Base):
    __tablename__ = 'loan_purposes'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), nullable=False, unique=True)
    description = Column(Text)
    risk_multiplier = Column(DECIMAL(5,4), default=1.0000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    pricing_calculations = relationship("PricingCalculationLog", back_populates="loan_purpose")

class GeographicRegion(Base):
    __tablename__ = 'geographic_regions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    region_name = Column(String(100), nullable=False)
    state_code = Column(String(2))
    city = Column(String(100))
    zip_code = Column(String(10))
    risk_multiplier = Column(DECIMAL(5,4), default=1.0000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class CreditScoreTier(Base):
    __tablename__ = 'credit_score_tiers'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tier_name = Column(String(50), nullable=False)
    min_score = Column(Integer, nullable=False)
    max_score = Column(Integer, nullable=False)
    rate_adjustment = Column(DECIMAL(5,4), default=0.0000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class LTVTier(Base):
    __tablename__ = 'ltv_tiers'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tier_name = Column(String(50), nullable=False)
    min_ltv = Column(DECIMAL(5,2), nullable=False)
    max_ltv = Column(DECIMAL(5,2), nullable=False)
    rate_adjustment = Column(DECIMAL(5,4), default=0.0000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class DSCRTier(Base):
    __tablename__ = 'dscr_tiers'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tier_name = Column(String(50), nullable=False)
    min_dscr = Column(DECIMAL(5,2), nullable=False)
    max_dscr = Column(DECIMAL(5,2))
    rate_adjustment = Column(DECIMAL(5,4), default=0.0000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class LoanAmountTier(Base):
    __tablename__ = 'loan_amount_tiers'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tier_name = Column(String(50), nullable=False)
    min_amount = Column(DECIMAL(15,2), nullable=False)
    max_amount = Column(DECIMAL(15,2))
    rate_adjustment = Column(DECIMAL(5,4), default=0.0000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class SystemConfiguration(Base):
    __tablename__ = 'system_configuration'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    config_key = Column(String(100), nullable=False, unique=True)
    config_value = Column(Text)
    config_type = Column(String(20), default='string')  # string, number, boolean, json
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class ExcelIntegrationSettings(Base):
    __tablename__ = 'excel_integration_settings'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_name = Column(String(255), nullable=False)
    file_path = Column(Text)
    sheet_name = Column(String(100))
    last_modified = Column(DateTime)
    checksum = Column(String(64))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class RateSheet(Base):
    __tablename__ = 'rate_sheets'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sheet_name = Column(String(100), nullable=False)
    product_id = Column(String(36), ForeignKey('loan_products.id'))
    rate_data = Column(JSON)  # Store the rate matrix as JSON
    effective_date = Column(Date)
    expiry_date = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    product = relationship("LoanProduct", back_populates="rate_sheets")

class PricingCalculationLog(Base):
    __tablename__ = 'pricing_calculations_log'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    loan_amount = Column(DECIMAL(15,2))
    property_value = Column(DECIMAL(15,2))
    ltv = Column(DECIMAL(5,2))
    dscr = Column(DECIMAL(5,2))
    credit_score = Column(Integer)
    property_type_id = Column(String(36), ForeignKey('property_types.id'))
    loan_purpose_id = Column(String(36), ForeignKey('loan_purposes.id'))
    product_id = Column(String(36), ForeignKey('loan_products.id'))
    calculated_rate = Column(DECIMAL(5,4))
    base_rate = Column(DECIMAL(6,4))
    adjustments = Column(JSON)  # Store all rate adjustments
    final_rate = Column(DECIMAL(6,4))
    calculation_time_ms = Column(Integer)
    requested_by = Column(String(100))
    request_ip = Column(String(45))  # IPv6 compatible
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    property_type = relationship("PropertyType", back_populates="pricing_calculations")
    loan_purpose = relationship("LoanPurpose", back_populates="pricing_calculations")
    product = relationship("LoanProduct", back_populates="pricing_calculations")

class ConfigurationChangesLog(Base):
    __tablename__ = 'configuration_changes_log'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    table_name = Column(String(100), nullable=False)
    record_id = Column(String(36))
    action = Column(String(20))  # INSERT, UPDATE, DELETE
    old_values = Column(JSON)
    new_values = Column(JSON)
    changed_by = Column(String(100))
    changed_at = Column(DateTime, server_default=func.now())


# Database connection and session management
class DatabaseManager:
    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def get_session(self):
        """Get a database session"""
        session = self.SessionLocal()
        try:
            return session
        except Exception as e:
            session.close()
            raise e
    
    def create_tables(self):
        """Create all tables if they don't exist"""
        Base.metadata.create_all(bind=self.engine)
    
    def close(self):
        """Close the database connection"""
        self.engine.dispose()


# Pydantic models for API responses
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal

class LoanProductResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    base_rate: Decimal
    min_loan_amount: Optional[Decimal]
    max_loan_amount: Optional[Decimal]
    min_ltv: Optional[Decimal]
    max_ltv: Optional[Decimal]
    min_dscr: Optional[Decimal]
    max_dscr: Optional[Decimal]
    min_credit_score: Optional[int]
    max_credit_score: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PropertyTypeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    risk_multiplier: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class LoanPurposeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    risk_multiplier: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CreditScoreTierResponse(BaseModel):
    id: str
    tier_name: str
    min_score: int
    max_score: int
    rate_adjustment: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class PricingCalculationRequest(BaseModel):
    loan_amount: Decimal
    property_value: Decimal
    credit_score: int
    property_type_id: str
    loan_purpose_id: str
    product_id: str
    dscr: Optional[Decimal] = None

class PricingCalculationResponse(BaseModel):
    loan_amount: Decimal
    property_value: Decimal
    ltv: Decimal
    dscr: Optional[Decimal]
    credit_score: int
    base_rate: Decimal
    adjustments: Dict[str, Any]
    final_rate: Decimal
    calculation_id: str
    calculation_time_ms: int 