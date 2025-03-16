import { validateUserInput } from '../utils/validation';

describe('validateUserInput', () => {
  test('should return error for empty input', () => {
    const result = validateUserInput('');
    expect(result).toEqual({ isValid: false, sanitized: '', error: 'Input is required' });
  });

  test('should return error for input with HTML-like content', () => {
    const result = validateUserInput('<script>alert("xss")</script>');
    expect(result).toEqual({ isValid: false, sanitized: '', error: 'Invalid input' });
  });

  test('should return error for input with SQL injection patterns', () => {
    const result = validateUserInput('SELECT * FROM users');
    expect(result).toEqual({ isValid: false, sanitized: '', error: 'Invalid input' });
  });

  test('should return error for input with dangerous patterns', () => {
    const result = validateUserInput('javascript:alert("xss")');
    expect(result).toEqual({ isValid: false, sanitized: '', error: 'Invalid input' });
  });

  test('should return valid for clean input', () => {
    const result = validateUserInput('Valid input');
    expect(result).toEqual({ isValid: true, sanitized: 'Valid input' });
  });
});
