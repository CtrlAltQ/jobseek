import { formatSalary, formatDate, truncateText, validateEmail } from '@/lib/utils';

describe('Utils', () => {
  describe('formatSalary', () => {
    it('should format salary range correctly', () => {
      const salary = { min: 50000, max: 80000, currency: 'USD' };
      expect(formatSalary(salary)).toBe('$50,000 - $80,000');
    });

    it('should format minimum salary correctly', () => {
      const salary = { min: 60000, currency: 'USD' };
      expect(formatSalary(salary)).toBe('$60,000+');
    });

    it('should handle undefined salary', () => {
      expect(formatSalary(undefined)).toBe('Salary not specified');
    });
  });

  describe('formatDate', () => {
    it('should format today correctly', () => {
      const today = new Date();
      expect(formatDate(today)).toBe('Today');
    });

    it('should format yesterday correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatDate(yesterday)).toBe('Yesterday');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });
});