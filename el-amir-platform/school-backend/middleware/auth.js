const jwt = require('jsonwebtoken');
const supabase = require('../config/db');

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'لم يتم تقديم رمز المصادقة' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: tokenRecord } = await supabase
      .from('auth_tokens')
      .select('id')
      .eq('token_hash', hashToken(token))
      .single();

    if (!tokenRecord) {
      return res.status(401).json({ error: 'الجلسة منتهية، سجّل دخولك مجدداً' });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      full_name: decoded.full_name,
      email: decoded.email,
      permissions: decoded.permissions || {}
    };
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة' });
    }
    return res.status(401).json({ error: 'رمز مصادقة غير صالح' });
  }
}

function hashToken(token) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { authenticate, hashToken };
