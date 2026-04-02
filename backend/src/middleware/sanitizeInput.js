// src/middleware/sanitizeInput.js
// XSS and injection sanitizer — strips dangerous characters from req.body

const xss = require('xss');

function sanitizeValue(value) {
  if (typeof value === 'string') return xss(value.trim());
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)]));
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  return value;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}

module.exports = sanitizeInput;
