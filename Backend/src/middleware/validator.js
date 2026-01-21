/**
 * Validation Middleware
 * Checks if mandatory fields are present in the request body
 */
const validateFlow = (req, res, next) => {
  const { flow_id, timestamp, src_ip, dst_ip, attack_type, is_malicious, severity_score } = req.body;

  const missingFields = [];
  if (!flow_id) missingFields.push('flow_id');
  if (!timestamp) missingFields.push('timestamp');
  if (!src_ip) missingFields.push('src_ip');
  if (!dst_ip) missingFields.push('dst_ip');
  
  // These are usually required for IDS flows
  if (is_malicious === undefined) missingFields.push('is_malicious');
  if (attack_type === undefined) missingFields.push('attack_type');
  if (severity_score === undefined) missingFields.push('severity_score');

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      missingFields: missingFields,
      message: `The following fields are required: ${missingFields.join(', ')}`
    });
  }

  // Type checks
  if (typeof is_malicious !== 'boolean') {
    return res.status(400).json({ success: false, error: 'is_malicious must be a boolean' });
  }
  
  if (isNaN(parseFloat(severity_score))) {
    return res.status(400).json({ success: false, error: 'severity_score must be a number' });
  }

  next();
};

/**
 * Validates manual IP blocking requests
 */
const validateBlockRequest = (req, res, next) => {
  const { ip_address, reason } = req.body;

  if (!ip_address) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'ip_address is required'
    });
  }

  // Simple IP regex validation
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip_address)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid IP address format'
    });
  }

  next();
};

module.exports = {
  validateFlow,
  validateBlockRequest
};
