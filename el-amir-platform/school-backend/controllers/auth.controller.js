const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/db');
const { comparePassword } = require('../utils/hash');
const { hashToken } = require('../middleware/auth');

const ROLE_TABLES = {
  admin: 'admins',
  super_admin: 'admins',
  teacher: 'teachers',
  student: 'students'
};

exports.login = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    const table = role === 'admin' ? 'admins' : ROLE_TABLES[role];
    if (!table) {
      return res.status(400).json({ error: 'دور غير صالح' });
    }

    const { data: user, error } = await supabase
      .from(table)
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: 'الحساب معطّل' });
    }

    const storedPassword = user.password_hash || user.password;
    if (!storedPassword) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
    const valid = await comparePassword(password, storedPassword);
    if (!valid) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const actualRole = table === 'admins' ? (user.role || 'admin') : role;
    const fullName = user.full_name || `${user.first_name} ${user.last_name}`;

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      {
        id: user.id,
        role: actualRole,
        full_name: fullName,
        email: user.email,
        permissions: user.permissions || {},
        jti
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    const decoded = jwt.decode(token);
    await supabase.from('auth_tokens').insert({
      user_id: user.id,
      user_role: actualRole,
      token_hash: hashToken(token),
      jti,
      expires_at: new Date(decoded.exp * 1000).toISOString()
    });

    // Update last_login for admin/super_admin
    if (table === 'admins') {
      supabase.from('admins').update({ last_login: new Date().toISOString() }).eq('id', user.id).then(() => {});
    }

    res.json({
      token,
      role: actualRole,
      user: {
        id: user.id,
        full_name: fullName,
        email: user.email
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await supabase
      .from('auth_tokens')
      .delete()
      .eq('token_hash', hashToken(req.token));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => {
  res.json({
    id: req.user.id,
    role: req.user.role,
    full_name: req.user.full_name,
    email: req.user.email,
    permissions: req.user.permissions
  });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'البريد والدور مطلوبان' });
    }

    const { data: admins } = await supabase
      .from('admins')
      .select('email')
      .limit(1);

    if (admins && admins.length > 0) {
      const { sendEmail } = require('../config/email');
      await sendEmail({
        to: admins[0].email,
        subject: 'طلب استعادة كلمة المرور',
        html: `<div dir="rtl"><p>طلب استعادة كلمة مرور من: ${email} (${role})</p></div>`
      });
    }

    res.json({ success: true, message: 'تم إرسال طلب استعادة كلمة المرور للمدير' });
  } catch (err) {
    next(err);
  }
};
