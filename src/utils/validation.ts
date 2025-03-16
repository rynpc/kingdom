
export const validateUserInput = (value: string): { isValid: boolean; sanitized: string; error?: string } => {
  if (!value) {
    return { isValid: false, sanitized: '', error: 'Input is required' };
  }

  // Reject any input containing HTML-like content or script tags
  if (/<[^>]*>/.test(value)) {
    return { isValid: false, sanitized: '', error: 'Invalid input' };
  }

  // Check for common SQL injection patterns
  const sqlPatterns = ['select', 'insert', 'update', 'delete', 'drop', 'union', '--'];
  if (sqlPatterns.some(pattern => value.toLowerCase().includes(pattern))) {
    return { isValid: false, sanitized: '', error: 'Invalid input' };
  }

  // Check for other dangerous patterns
  if (value.includes('javascript:') || 
      value.includes('data:') || 
      value.includes('vbscript:')) {
    return { isValid: false, sanitized: '', error: 'Invalid input' };
  }

  // If we get here, the input is valid
  return { isValid: true, sanitized: value.trim() };
};