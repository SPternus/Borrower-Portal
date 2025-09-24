-- Create database for Ternus Pricing Engine
CREATE DATABASE ternus_pricing_engine;

-- Connect to the new database
\c ternus_pricing_engine;

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PRICING RULES TABLES
-- =====================================================

-- Loan Products table
CREATE TABLE loan_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    base_rate DECIMAL(5,4) NOT NULL,
    min_loan_amount DECIMAL(15,2) DEFAULT 0,
    max_loan_amount DECIMAL(15,2),
    min_ltv DECIMAL(5,2) DEFAULT 0,
    max_ltv DECIMAL(5,2) DEFAULT 100,
    min_dscr DECIMAL(5,2),
    max_dscr DECIMAL(5,2),
    min_credit_score INTEGER,
    max_credit_score INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Property Types table
CREATE TABLE property_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    risk_multiplier DECIMAL(5,4) DEFAULT 1.0000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Loan Purposes table
CREATE TABLE loan_purposes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    risk_multiplier DECIMAL(5,4) DEFAULT 1.0000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Geographic Regions table
CREATE TABLE geographic_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_name VARCHAR(100) NOT NULL,
    state_code VARCHAR(2),
    city VARCHAR(100),
    zip_code VARCHAR(10),
    risk_multiplier DECIMAL(5,4) DEFAULT 1.0000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Credit Score Tiers table
CREATE TABLE credit_score_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name VARCHAR(50) NOT NULL,
    min_score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    rate_adjustment DECIMAL(5,4) DEFAULT 0.0000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LTV Tiers table
CREATE TABLE ltv_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name VARCHAR(50) NOT NULL,
    min_ltv DECIMAL(5,2) NOT NULL,
    max_ltv DECIMAL(5,2) NOT NULL,
    rate_adjustment DECIMAL(5,4) DEFAULT 0.0000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DSCR Tiers table
CREATE TABLE dscr_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name VARCHAR(50) NOT NULL,
    min_dscr DECIMAL(5,2) NOT NULL,
    max_dscr DECIMAL(5,2),
    rate_adjustment DECIMAL(5,4) DEFAULT 0.0000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Loan Amount Tiers table
CREATE TABLE loan_amount_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name VARCHAR(50) NOT NULL,
    min_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2),
    rate_adjustment DECIMAL(5,4) DEFAULT 0.0000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CONFIGURATION TABLES
-- =====================================================

-- System Configuration table
CREATE TABLE system_configuration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Excel Integration Settings table
CREATE TABLE excel_integration_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT,
    sheet_name VARCHAR(100),
    last_modified TIMESTAMP WITH TIME ZONE,
    checksum VARCHAR(64),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rate Sheets table (for storing Excel-based rate data)
CREATE TABLE rate_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sheet_name VARCHAR(100) NOT NULL,
    product_id UUID REFERENCES loan_products(id),
    rate_data JSONB, -- Store the rate matrix as JSON
    effective_date DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AUDIT AND LOGGING TABLES
-- =====================================================

-- Pricing Calculations Log table
CREATE TABLE pricing_calculations_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_amount DECIMAL(15,2),
    property_value DECIMAL(15,2),
    ltv DECIMAL(5,2),
    dscr DECIMAL(5,2),
    credit_score INTEGER,
    property_type_id UUID REFERENCES property_types(id),
    loan_purpose_id UUID REFERENCES loan_purposes(id),
    product_id UUID REFERENCES loan_products(id),
    calculated_rate DECIMAL(5,4),
    base_rate DECIMAL(5,4),
    adjustments JSONB, -- Store all rate adjustments
    final_rate DECIMAL(5,4),
    calculation_time_ms INTEGER,
    requested_by VARCHAR(100),
    request_ip INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Configuration Changes Log table
CREATE TABLE configuration_changes_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    action VARCHAR(20), -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for loan products
CREATE INDEX idx_loan_products_active ON loan_products(is_active);
CREATE INDEX idx_loan_products_name ON loan_products(name);

-- Indexes for property types
CREATE INDEX idx_property_types_active ON property_types(is_active);
CREATE INDEX idx_property_types_name ON property_types(name);

-- Indexes for loan purposes
CREATE INDEX idx_loan_purposes_active ON loan_purposes(is_active);
CREATE INDEX idx_loan_purposes_name ON loan_purposes(name);

-- Indexes for geographic regions
CREATE INDEX idx_geographic_regions_active ON geographic_regions(is_active);
CREATE INDEX idx_geographic_regions_state ON geographic_regions(state_code);
CREATE INDEX idx_geographic_regions_zip ON geographic_regions(zip_code);

-- Indexes for tiers
CREATE INDEX idx_credit_score_tiers_active ON credit_score_tiers(is_active);
CREATE INDEX idx_credit_score_tiers_range ON credit_score_tiers(min_score, max_score);

CREATE INDEX idx_ltv_tiers_active ON ltv_tiers(is_active);
CREATE INDEX idx_ltv_tiers_range ON ltv_tiers(min_ltv, max_ltv);

CREATE INDEX idx_dscr_tiers_active ON dscr_tiers(is_active);
CREATE INDEX idx_dscr_tiers_range ON dscr_tiers(min_dscr, max_dscr);

CREATE INDEX idx_loan_amount_tiers_active ON loan_amount_tiers(is_active);
CREATE INDEX idx_loan_amount_tiers_range ON loan_amount_tiers(min_amount, max_amount);

-- Indexes for system configuration
CREATE INDEX idx_system_configuration_key ON system_configuration(config_key);
CREATE INDEX idx_system_configuration_active ON system_configuration(is_active);

-- Indexes for rate sheets
CREATE INDEX idx_rate_sheets_active ON rate_sheets(is_active);
CREATE INDEX idx_rate_sheets_product ON rate_sheets(product_id);
CREATE INDEX idx_rate_sheets_dates ON rate_sheets(effective_date, expiry_date);

-- Indexes for logging tables
CREATE INDEX idx_pricing_calculations_log_created ON pricing_calculations_log(created_at);
CREATE INDEX idx_pricing_calculations_log_product ON pricing_calculations_log(product_id);

CREATE INDEX idx_configuration_changes_log_created ON configuration_changes_log(changed_at);
CREATE INDEX idx_configuration_changes_log_table ON configuration_changes_log(table_name);

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert default loan products
INSERT INTO loan_products (name, description, base_rate, min_loan_amount, max_loan_amount, min_ltv, max_ltv) VALUES
('Fix & Flip', 'Short-term loans for property renovation and resale', 12.0000, 50000, 2000000, 60, 80),
('DSCR', 'Debt Service Coverage Ratio loans for rental properties', 8.5000, 75000, 5000000, 65, 85),
('Bridge Loan', 'Short-term financing to bridge gap between transactions', 10.5000, 100000, 3000000, 70, 80),
('Commercial', 'Commercial real estate investment loans', 9.0000, 500000, 10000000, 70, 75);

-- Insert default property types
INSERT INTO property_types (name, description, risk_multiplier) VALUES
('Single Family Residence', 'Single family homes', 1.0000),
('Multi-Family (2-4 units)', 'Small multi-family properties', 1.0250),
('Multi-Family (5+ units)', 'Large multi-family properties', 1.0500),
('Condominium', 'Condominium units', 1.0125),
('Townhouse', 'Townhouse properties', 1.0100),
('Commercial', 'Commercial properties', 1.0750),
('Mixed Use', 'Mixed residential/commercial', 1.0625);

-- Insert default loan purposes
INSERT INTO loan_purposes (name, description, risk_multiplier) VALUES
('Purchase', 'Property acquisition', 1.0000),
('Refinance', 'Refinancing existing loan', 0.9875),
('Cash Out Refinance', 'Cash-out refinancing', 1.0125),
('Renovation', 'Property improvement', 1.0250),
('Construction', 'New construction', 1.0500);

-- Insert default credit score tiers
INSERT INTO credit_score_tiers (tier_name, min_score, max_score, rate_adjustment) VALUES
('Excellent', 740, 850, -0.5000),
('Very Good', 680, 739, -0.2500),
('Good', 620, 679, 0.0000),
('Fair', 580, 619, 0.2500),
('Poor', 500, 579, 0.5000);

-- Insert default LTV tiers
INSERT INTO ltv_tiers (tier_name, min_ltv, max_ltv, rate_adjustment) VALUES
('Conservative', 0, 60, -0.2500),
('Standard', 60.01, 70, 0.0000),
('Aggressive', 70.01, 80, 0.2500),
('High Risk', 80.01, 85, 0.5000);

-- Insert default DSCR tiers
INSERT INTO dscr_tiers (tier_name, min_dscr, max_dscr, rate_adjustment) VALUES
('Excellent', 1.50, 999, -0.2500),
('Good', 1.25, 1.49, 0.0000),
('Adequate', 1.00, 1.24, 0.2500),
('Below Standard', 0.75, 0.99, 0.5000);

-- Insert default loan amount tiers
INSERT INTO loan_amount_tiers (tier_name, min_amount, max_amount, rate_adjustment) VALUES
('Small', 50000, 250000, 0.1250),
('Medium', 250001, 1000000, 0.0000),
('Large', 1000001, 5000000, -0.1250),
('Jumbo', 5000001, NULL, -0.2500);

-- Insert default system configuration
INSERT INTO system_configuration (config_key, config_value, config_type, description) VALUES
('default_margin', '2.0000', 'number', 'Default margin added to base rate'),
('max_rate_adjustment', '3.0000', 'number', 'Maximum total rate adjustment allowed'),
('min_rate_adjustment', '-1.0000', 'number', 'Minimum total rate adjustment allowed'),
('enable_excel_integration', 'true', 'boolean', 'Enable Excel file integration for rates'),
('rate_precision', '4', 'number', 'Decimal places for rate calculations'),
('enable_audit_logging', 'true', 'boolean', 'Enable detailed audit logging'),
('cache_duration_minutes', '30', 'number', 'Duration to cache rate calculations');

-- Create functions for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at on all tables
CREATE TRIGGER update_loan_products_updated_at BEFORE UPDATE ON loan_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_property_types_updated_at BEFORE UPDATE ON property_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loan_purposes_updated_at BEFORE UPDATE ON loan_purposes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_geographic_regions_updated_at BEFORE UPDATE ON geographic_regions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_score_tiers_updated_at BEFORE UPDATE ON credit_score_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ltv_tiers_updated_at BEFORE UPDATE ON ltv_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dscr_tiers_updated_at BEFORE UPDATE ON dscr_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loan_amount_tiers_updated_at BEFORE UPDATE ON loan_amount_tiers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_configuration_updated_at BEFORE UPDATE ON system_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_excel_integration_settings_updated_at BEFORE UPDATE ON excel_integration_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rate_sheets_updated_at BEFORE UPDATE ON rate_sheets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pricing_engine_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pricing_engine_user; 