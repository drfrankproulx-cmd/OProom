import { differenceInDays, parseISO, isValid } from 'date-fns';

export class DateValidator {
  /**
   * Calculate age of a document in days
   */
  static getDocumentAge(documentDate) {
    if (!documentDate) return null;

    try {
      const date = typeof documentDate === 'string' ? parseISO(documentDate) : documentDate;
      if (!isValid(date)) return null;

      return differenceInDays(new Date(), date);
    } catch (error) {
      console.error('Error calculating document age:', error);
      return null;
    }
  }

  /**
   * Validate if document is within required age range
   */
  static validateDocumentAge(documentDate, maxAgeDays) {
    const age = this.getDocumentAge(documentDate);
    if (age === null) return { isValid: false, age: null };

    return {
      isValid: age <= maxAgeDays,
      age,
      status: age <= maxAgeDays ? 'valid' : 'invalid'
    };
  }

  /**
   * Get validation status with warning threshold
   */
  static getValidationStatus(documentDate, maxAgeDays, warningThresholdDays = null) {
    const age = this.getDocumentAge(documentDate);
    if (age === null) return { status: 'pending', age: null, isValid: false };

    const isValid = age <= maxAgeDays;
    const warningThreshold = warningThresholdDays || (maxAgeDays * 0.8);

    if (!isValid) {
      return { status: 'invalid', age, isValid: false, daysOverdue: age - maxAgeDays };
    }

    if (age >= warningThreshold) {
      return { status: 'warning', age, isValid: true, daysUntilExpiry: maxAgeDays - age };
    }

    return { status: 'valid', age, isValid: true, daysUntilExpiry: maxAgeDays - age };
  }

  /**
   * Validate Prior Authorization (<60 days / 2 months)
   */
  static validatePriorAuth(date) {
    return this.getValidationStatus(date, 60, 50);
  }

  /**
   * Validate Surgical Records (60-90 days / 2-3 months)
   */
  static validateSurgicalRecords(date) {
    const age = this.getDocumentAge(date);
    if (age === null) return { status: 'pending', age: null, isValid: false };

    if (age < 60) {
      return { status: 'too-early', age, isValid: false, message: 'Too early (need 2+ months)' };
    }

    if (age > 90) {
      return { status: 'invalid', age, isValid: false, message: 'Too old (max 3 months)' };
    }

    return { status: 'valid', age, isValid: true };
  }

  /**
   * Validate Bite Approval (<120 days / 4 months)
   */
  static validateBiteApproval(date) {
    return this.getValidationStatus(date, 120, 100);
  }

  /**
   * Calculate days until surgery
   */
  static getDaysUntilSurgery(surgeryDate) {
    if (!surgeryDate) return null;

    try {
      const date = typeof surgeryDate === 'string' ? parseISO(surgeryDate) : surgeryDate;
      if (!isValid(date)) return null;

      return differenceInDays(date, new Date());
    } catch (error) {
      console.error('Error calculating days until surgery:', error);
      return null;
    }
  }

  /**
   * Get urgency level based on days until surgery
   */
  static getSurgeryUrgency(surgeryDate) {
    const daysUntil = this.getDaysUntilSurgery(surgeryDate);
    if (daysUntil === null) return 'unknown';

    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 7) return 'urgent';
    if (daysUntil <= 30) return 'warning';
    return 'normal';
  }

  /**
   * Format document age for display
   */
  static formatDocumentAge(age) {
    if (age === null) return 'N/A';
    if (age === 0) return 'Today';
    if (age === 1) return '1 day';

    if (age < 30) {
      return `${age} days`;
    }

    const months = Math.floor(age / 30);
    const days = age % 30;

    if (days === 0) {
      return months === 1 ? '1 month' : `${months} months`;
    }

    return `${months}mo ${days}d`;
  }

  /**
   * Get requirement label for display
   */
  static getRequirementLabel(documentType) {
    const requirements = {
      'prior_auth': '<2 months old',
      'surgical_records': '2-3 months old',
      'bite_approval': '<4 months old'
    };

    return requirements[documentType] || '';
  }
}

export default DateValidator;
