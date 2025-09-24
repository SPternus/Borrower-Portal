// Utility to clear all Auth0 state from browser storage
export const clearAuth0State = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear all localStorage keys that contain 'auth0'
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('auth0') || key.includes('@@auth0'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear sessionStorage
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('auth0') || key.includes('@@auth0'))) {
        sessionKeysToRemove.push(key);
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    console.log('Auth0 state cleared successfully');
  } catch (error) {
    console.error('Error clearing Auth0 state:', error);
  }
};

// Clear state on page load if there's an error
export const clearAuth0StateOnError = () => {
  if (typeof window !== 'undefined' && window.location.search.includes('error')) {
    clearAuth0State();
  }
}; 