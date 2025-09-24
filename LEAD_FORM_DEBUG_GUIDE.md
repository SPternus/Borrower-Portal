# Lead Form Debug Guide

## Issue Summary
The refer-a-friend apply form is not continuing to the next step. Users are unable to proceed from step 2 (Company & Property) to step 3 (Investment Goals).

## Root Cause Analysis

### 1. Form Validation Logic
The issue is in the `canProceedToNext()` function in `client/src/components/LeadForm.tsx`:

```javascript
const canProceedToNext = () => {
  switch (currentStep) {
    case 1:
      return formData.firstName && formData.lastName && formData.email && formData.phone;
    case 2:
      return formData.company; // Company is required
    case 3:
      return true; // Investment details are optional
    case 4:
      return true; // Interests are optional
    default:
      return true;
  }
};
```

**Problem**: Step 2 requires the `company` field to be filled out, but users may not realize this is required.

### 2. User Experience Issues
- No clear indication of which fields are required
- Continue button is disabled without explanation
- No visual feedback about validation errors

## Testing Steps

### Step 1: Test the Debug Form
1. Open the `debug-lead-form.html` file in your browser
2. Fill out Step 1 completely (all 4 fields)
3. Click "Continue" - you should see Step 2
4. Try clicking "Continue" without filling the company field - it should show an error
5. Fill in the company field and try again - it should work

### Step 2: Test the Real Form
1. Go to your lead form URL (e.g., `http://localhost:3000/lead-form`)
2. Open browser developer tools (F12)
3. Go to the Console tab
4. Fill out Step 1 completely
5. Click "Continue" - check console for validation logs
6. In Step 2, try clicking "Continue" without filling company field
7. Check console for validation errors and form state

### Step 3: Check Form State
In the browser console, you can check the form state:
```javascript
// Check if React DevTools is available
// Look for the LeadForm component and inspect its state
```

## Fixes Applied

### 1. Added Console Logging
- Added detailed console logging to track form validation
- Shows which fields are missing
- Displays current form state

### 2. Added Visual Feedback
- Added helper text when validation fails
- Shows "Please enter your company name" message
- Clear indication of required fields

### 3. Improved User Experience
- Better error messaging
- Visual cues for required fields
- Step-by-step validation feedback

## Quick Fix Instructions

### If the form is still not working:

1. **Check the company field specifically:**
   - Make sure users are entering text in the company field
   - The field cannot be empty or just whitespace
   - The validation checks `formData.company` for truthiness

2. **Verify the form state:**
   - Check browser console for validation logs
   - Look for "LeadForm - Step 2 validation" messages
   - Ensure `companyValue` is not empty

3. **Test the validation function:**
   ```javascript
   // In browser console, test if company field has value
   const companyField = document.querySelector('input[name="company"]');
   console.log('Company field value:', companyField?.value);
   ```

4. **Check for JavaScript errors:**
   - Look for any JavaScript errors in console
   - Ensure React is loaded properly
   - Check if form handlers are working

## Advanced Debugging

### 1. Add Temporary Debug Button
Add this button to the form for testing:
```html
<button type="button" onClick={() => console.log('Form Data:', formData)}>
  Debug Form Data
</button>
```

### 2. Check Network Requests
- Open Network tab in developer tools
- Check if there are any failed API calls
- Look for CORS errors or server errors

### 3. Verify Environment Variables
- Check if `NEXT_PUBLIC_API_URL` is set correctly
- Ensure backend services are running
- Test API endpoints manually

## Files Modified

1. **client/src/components/LeadForm.tsx**
   - Added console logging to `canProceedToNext()`
   - Added visual feedback for validation errors
   - Improved user experience

2. **debug-lead-form.html**
   - Created standalone test form
   - Mimics the real form behavior
   - Includes debug information panel

## Expected Behavior

1. **Step 1**: User fills in firstName, lastName, email, phone
2. **Step 2**: User MUST fill in company field to continue
3. **Step 3**: Optional fields (can continue without filling)
4. **Step 4**: Optional fields (can submit without filling)

## Common Issues

1. **Company field is empty**: Most common cause
2. **JavaScript errors**: Check console for errors
3. **Form state not updating**: Check React state management
4. **Network issues**: Check API connectivity

## Next Steps

1. Test the debug form first
2. Check browser console for validation logs
3. Verify company field is being filled
4. Test with different browsers
5. Check mobile responsiveness

If the issue persists, please share:
- Browser console logs
- Screenshots of the form
- Network tab information
- Any error messages 