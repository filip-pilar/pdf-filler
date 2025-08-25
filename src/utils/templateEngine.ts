export interface TemplateValidation {
  isValid: boolean;
  dependencies: string[];
  errors: Array<{
    type: 'missing-field' | 'invalid-syntax';
    field?: string;
    message: string;
  }>;
}

export interface CompositeFormatting {
  emptyValueBehavior: 'skip' | 'show-empty' | 'placeholder';
  separatorHandling: 'smart' | 'literal';
  whitespaceHandling: 'normalize' | 'preserve';
}

export interface EvaluationContext {
  visitedFields: Set<string>;
  depth: number;
  maxDepth: number;
}

export class TemplateEngine {
  /**
   * Evaluates a template string with provided data
   * Supports {fieldName} and nested paths like {user.firstName}
   * Legacy method - use evaluateWithContext for circular reference detection
   */
  static evaluate(
    template: string, 
    data: Record<string, unknown>,
    formatting?: CompositeFormatting
  ): string {
    let result = template.replace(/{([^}]+)}/g, (_, fieldPath) => {
      const value = this.getNestedValue(data, fieldPath);
      
      if (value == null || value === '') {
        if (formatting?.emptyValueBehavior === 'placeholder') {
          return `[${fieldPath}]`;
        }
        return formatting?.emptyValueBehavior === 'skip' ? '' : '';
      }
      
      return String(value).trim();
    });
    
    // Smart separator handling - clean up extra punctuation
    if (formatting?.separatorHandling === 'smart') {
      result = result
        .replace(/,\s*,/g, ',')     // Multiple commas
        .replace(/^\s*,\s*/, '')    // Leading comma
        .replace(/\s*,\s*$/, '')    // Trailing comma
        .replace(/\s*\.\s*\./g, '.') // Multiple periods
        .replace(/\s+/g, ' ')        // Multiple spaces
        .trim();
    }
    
    if (formatting?.whitespaceHandling === 'normalize') {
      result = result.replace(/\s+/g, ' ').trim();
    }
    
    return result;
  }
  
  /**
   * Evaluates a template with circular reference detection
   * This is the safe version that prevents infinite loops
   */
  static evaluateWithContext(
    template: string,
    data: Record<string, unknown>,
    formatting?: CompositeFormatting,
    context?: EvaluationContext
  ): string {
    // Initialize context if not provided
    const ctx = context || {
      visitedFields: new Set<string>(),
      depth: 0,
      maxDepth: 10
    };
    
    // Check depth limit
    if (ctx.depth >= ctx.maxDepth) {
      console.warn(`Template evaluation max depth (${ctx.maxDepth}) exceeded`);
      return '[Max Depth Exceeded]';
    }
    
    let result = template.replace(/{([^}]+)}/g, (_, fieldPath) => {
      // Check for circular reference
      if (ctx.visitedFields.has(fieldPath)) {
        console.warn(`Circular reference detected: ${fieldPath}`);
        return '[Circular Reference]';
      }
      
      // Get the raw value
      const value = this.getNestedValue(data, fieldPath);
      
      // If the value is a string that might contain templates, evaluate it recursively
      if (typeof value === 'string' && value.includes('{') && value.includes('}')) {
        // Create new context for recursive evaluation
        const newContext: EvaluationContext = {
          visitedFields: new Set(ctx.visitedFields).add(fieldPath),
          depth: ctx.depth + 1,
          maxDepth: ctx.maxDepth
        };
        
        // Recursively evaluate
        return this.evaluateWithContext(value, data, formatting, newContext);
      }
      
      // Handle empty values
      if (value == null || value === '') {
        if (formatting?.emptyValueBehavior === 'placeholder') {
          return `[${fieldPath}]`;
        }
        return formatting?.emptyValueBehavior === 'skip' ? '' : '';
      }
      
      return String(value).trim();
    });
    
    // Apply formatting
    if (formatting?.separatorHandling === 'smart') {
      result = result
        .replace(/,\s*,/g, ',')
        .replace(/^\s*,\s*/, '')
        .replace(/\s*,\s*$/, '')
        .replace(/\s*\.\s*\./g, '.')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    if (formatting?.whitespaceHandling === 'normalize') {
      result = result.replace(/\s+/g, ' ').trim();
    }
    
    return result;
  }
  
  /**
   * Extracts field dependencies from a template
   */
  static extractDependencies(template: string): string[] {
    const matches = template.match(/{([^}]+)}/g) || [];
    const dependencies = matches.map(match => match.slice(1, -1));
    return [...new Set(dependencies)]; // Remove duplicates
  }
  
  /**
   * Validates a template against available fields
   */
  static validate(template: string, availableFields: string[]): TemplateValidation {
    const errors: TemplateValidation['errors'] = [];
    
    // Check for balanced braces
    const openBraces = (template.match(/{/g) || []).length;
    const closeBraces = (template.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push({
        type: 'invalid-syntax',
        message: 'Unbalanced braces in template'
      });
    }
    
    // Extract and validate dependencies
    const dependencies = this.extractDependencies(template);
    const missingFields = dependencies.filter(dep => {
      const fieldName = dep.split('.')[0]; // Handle nested paths
      return !availableFields.includes(fieldName) && !availableFields.includes(dep);
    });
    
    missingFields.forEach(field => {
      errors.push({
        type: 'missing-field',
        field,
        message: `Field '${field}' not found in available data`
      });
    });
    
    return {
      isValid: errors.length === 0,
      dependencies,
      errors
    };
  }
  
  /**
   * Gets nested value from an object using dot notation
   */
  private static getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let value: unknown = obj;
    
    for (const key of keys) {
      if (value == null || typeof value !== 'object') {
        return null;
      }
      value = (value as Record<string, unknown>)[key];
    }
    
    return value;
  }
  
  /**
   * Suggests common templates based on field names
   */
  static suggestTemplates(fields: string[]): Array<{ name: string; template: string }> {
    const suggestions: Array<{ name: string; template: string }> = [];
    
    // Check for name fields
    if (fields.includes('firstName') && fields.includes('lastName')) {
      suggestions.push({ 
        name: 'Full Name', 
        template: '{firstName} {lastName}' 
      });
    }
    
    // Check for address fields
    const addressFields = ['addressLine1', 'addressLine2', 'city', 'state', 'zipCode', 'country'];
    const hasAddress = addressFields.some(f => fields.includes(f));
    
    if (hasAddress) {
      const availableAddressFields = addressFields.filter(f => fields.includes(f));
      if (availableAddressFields.includes('addressLine1')) {
        let template = '{addressLine1}';
        if (availableAddressFields.includes('addressLine2')) {
          template += ', {addressLine2}';
        }
        if (availableAddressFields.includes('city')) {
          template += ', {city}';
        }
        if (availableAddressFields.includes('state')) {
          template += ', {state}';
        }
        if (availableAddressFields.includes('zipCode')) {
          template += ' {zipCode}';
        }
        if (availableAddressFields.includes('country')) {
          template += ', {country}';
        }
        suggestions.push({ name: 'Full Address', template });
      }
    }
    
    // Check for nested structures (like the schema example)
    const nestedPatterns = [
      { 
        pattern: ['personal_data.firstName', 'personal_data.lastName'],
        name: 'Full Name',
        template: '{personal_data.firstName} {personal_data.lastName}'
      },
      {
        pattern: ['kyb_kyc_1_data.addressLine1', 'kyb_kyc_1_data.city', 'kyb_kyc_1_data.state'],
        name: 'KYC Address',
        template: '{kyb_kyc_1_data.addressLine1}, {kyb_kyc_1_data.city}, {kyb_kyc_1_data.state} {kyb_kyc_1_data.zipCode}'
      }
    ];
    
    nestedPatterns.forEach(({ pattern, name, template }) => {
      if (pattern.every(field => fields.includes(field))) {
        suggestions.push({ name, template });
      }
    });
    
    return suggestions;
  }
}