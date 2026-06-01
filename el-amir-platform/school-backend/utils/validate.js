function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = typeof value === 'string' ? escapeHtml(value) : value;
  }
  return sanitized;
}

function validateUsername(username) {
  if (!username || username.length < 3 || username.length > 30) {
    return 'اسم المستخدم يجب أن يكون بين 3 و 30 حرفاً';
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return 'اسم المستخدم يحتوي على أحرف غير مسموحة';
  }
  return null;
}

function validatePassword(password) {
  if (!password || password.length < 6) {
    return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
  }
  return null;
}

function validateEmail(email) {
  if (!email) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) {
    return 'البريد الإلكتروني غير صالح';
  }
  return null;
}

function validatePhone(phone) {
  if (!phone) return null;
  const re = /^[0-9+]{8,15}$/;
  if (!re.test(phone)) {
    return 'رقم الهاتف غير صالح';
  }
  return null;
}

function validateLevel(level) {
  const valid = ['1AM', '2AM', '3AM', '4AM', '1AS', '2AS', '3AS'];
  if (!valid.includes(level)) {
    return 'المستوى الدراسي غير صالح';
  }
  return null;
}

function validateRequired(fields, body) {
  const missing = fields.filter(f => !body[f] && body[f] !== 0);
  if (missing.length > 0) {
    return `الحقول التالية مطلوبة: ${missing.join(', ')}`;
  }
  return null;
}

module.exports = {
  escapeHtml,
  sanitizeObject,
  validateUsername,
  validatePassword,
  validateEmail,
  validatePhone,
  validateLevel,
  validateRequired
};
