/**
 * Validates drawing movement data
 * @param {Object} data - Movement data from client
 * @returns {Object} Validation result with isValid and sanitized data
 */
function validateMovementData(data) {
  const result = {
    isValid: false,
    data: null,
    error: null
  };

  try {
    // Check if data exists and has required properties
    if (!data || typeof data !== 'object') {
      result.error = 'Invalid data format';
      return result;
    }

    const { x, y, drawing, color, id } = data;

    // Validate coordinates
    if (typeof x !== 'number' || typeof y !== 'number' || 
        isNaN(x) || isNaN(y) || 
        x < 0 || y < 0 || 
        x > 3800 || y > 2000) {
      result.error = 'Invalid coordinates';
      return result;
    }

    // Validate drawing state
    if (typeof drawing !== 'boolean') {
      result.error = 'Invalid drawing state';
      return result;
    }

    if (
      typeof color !== 'string' ||
      !/^#[0-9A-Fa-f]{6,8}$/.test(color)
    ) {
      result.error = 'Invalid color format ' + color;
      return result;
    }

    // Validate ID
    if (typeof id !== 'number' || isNaN(id) || id <= 0) {
      result.error = 'Invalid client ID';
      return result;
    }

    // Sanitize and return valid data
    result.isValid = true;
    result.data = {
      x: Math.round(x),
      y: Math.round(y),
      drawing: Boolean(drawing),
      color: color.toUpperCase(),
      id: Math.round(id)
    };

  } catch (error) {
    result.error = 'Validation error: ' + error.message;
  }

  return result;
}

/**
 * Sanitizes string input to prevent XSS
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>'"&]/g, '');
}

module.exports = {
  validateMovementData,
  sanitizeString
};