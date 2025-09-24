# Loan Type Configuration Update Summary

## Issue Identified
The loan types in the system didn't match the actual Salesforce loan types, causing 404 errors when trying to fetch document requirements.

## Salesforce Loan Types (Actual)
Based on the user's feedback, the actual loan types in Salesforce are:
1. **Bridge loan**
2. **Fix and flip loan** 
3. **Ground up construction loan**
4. **Wholetail Loan**
5. **Long Term Rental Loans**

## Previous System Loan Types
The system was configured with:
- `fix-flip`
- `dscr`
- `bridge`
- `wholetail`
- `construction`
- `portfolio`
- `transactional`

## Updated System Configuration

### 1. Updated Loan Type Enum
```python
class LoanType(Enum):
    BRIDGE_LOAN = "bridge-loan"
    FIX_AND_FLIP_LOAN = "fix-and-flip-loan"
    GROUND_UP_CONSTRUCTION_LOAN = "ground-up-construction-loan"
    WHOLETAIL_LOAN = "wholetail-loan"
    LONG_TERM_RENTAL_LOANS = "long-term-rental-loans"
```

### 2. Document Requirements Mapping
Updated `LOAN_TYPE_DOCUMENT_REQUIREMENTS` to use the new loan types:
- `LoanType.FIX_AND_FLIP_LOAN` (was `FIX_FLIP`)
- `LoanType.BRIDGE_LOAN` (was `BRIDGE`)
- `LoanType.GROUND_UP_CONSTRUCTION_LOAN` (was `CONSTRUCTION`)
- `LoanType.WHOLETAIL_LOAN` (was `WHOLETAIL`)
- `LoanType.LONG_TERM_RENTAL_LOANS` (was `DSCR`)

### 3. Task Workflows Updated
Updated `LOAN_TYPE_TASK_WORKFLOWS` with:
- All new loan type references
- Added workflows for `WHOLETAIL_LOAN` and `LONG_TERM_RENTAL_LOANS`
- Removed `TRANSACTIONAL` and `PORTFOLIO` workflows

### 4. Removed Deprecated Loan Types
- Removed `TRANSACTIONAL` (not in Salesforce)
- Removed `PORTFOLIO` (consolidated into `LONG_TERM_RENTAL_LOANS`)
- Removed `DSCR` (renamed to `LONG_TERM_RENTAL_LOANS`)

## Frontend Mapping
The frontend converts loan types using:
```typescript
loanType={application.type.toLowerCase().replace(/\s+/g, '-')}
```

This converts:
- "Fix and flip loan" → "fix-and-flip-loan" ✅
- "Bridge loan" → "bridge-loan" ✅
- "Ground up construction loan" → "ground-up-construction-loan" ✅
- "Wholetail Loan" → "wholetail-loan" ✅
- "Long Term Rental Loans" → "long-term-rental-loans" ✅

## Document Categories by Loan Type

### Fix and Flip Loan
- **Income**: Bank statements, tax returns, employment verification
- **Assets**: Down payment proof, construction budget, contractor estimates
- **Property**: Purchase contract, as-is appraisal, ARV appraisal, renovation plans
- **Identity**: Government ID, Social Security card
- **Business**: Business license (optional)

### Bridge Loan
- **Income**: Income verification, bank statements, tax returns
- **Property**: Current property appraisal, purchase contract, exit strategy
- **Assets**: Equity proof, down payment verification
- **Identity**: Government ID, Social Security card

### Ground Up Construction Loan
- **Income**: Income documentation, financial statements
- **Construction**: Plans, permits, contractor agreements, budget, timeline
- **Property**: Land deed, land appraisal, as-completed appraisal
- **Assets**: Construction down payment, contingency funds
- **Identity**: Government ID, Social Security card

### Wholetail Loan
- **Income**: Income verification, bank statements, tax returns
- **Property**: Purchase contract, as-is appraisal, market analysis
- **Assets**: Down payment proof, renovation funds, marketing budget
- **Identity**: Government ID, Social Security card

### Long Term Rental Loans
- **Income**: Personal income documentation
- **Rental Documentation**: Lease agreements, rent rolls, market analysis
- **Property**: Property appraisal, deed, insurance, tax statements
- **Assets**: Down payment proof, reserve funds
- **Identity**: Government ID, Social Security card

## API Endpoints Updated
All endpoints now support the new loan types:
- `/api/config/loan-types/fix-and-flip-loan/documents`
- `/api/config/loan-types/bridge-loan/documents`
- `/api/config/loan-types/ground-up-construction-loan/documents`
- `/api/config/loan-types/wholetail-loan/documents`
- `/api/config/loan-types/long-term-rental-loans/documents`

## Testing Required
1. **Backend API Testing**: Verify all new loan type endpoints return proper document requirements
2. **Frontend Integration**: Test that the document requirements load correctly for each loan type
3. **Document Upload**: Verify file uploads work with the new loan type configurations
4. **Error Handling**: Ensure graceful handling of unknown loan types

## Benefits of Update
1. **Accurate Mapping**: System now matches actual Salesforce loan types
2. **Comprehensive Coverage**: All 5 Salesforce loan types are supported
3. **Proper Documentation**: Each loan type has specific document requirements
4. **Workflow Integration**: Task workflows align with loan type requirements
5. **Scalable Architecture**: Easy to add new loan types in the future

## Next Steps
1. Restart Python server to load new configuration
2. Test all loan type document endpoints
3. Verify frontend integration with new loan types
4. Update any hardcoded loan type references in the codebase
5. Document the mapping for future reference 