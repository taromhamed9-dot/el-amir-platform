function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرّح' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذا المورد' });
    }
    next();
  };
}

function permissionGuard(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرّح' });
    }
    if (req.user.role === 'super_admin') {
      return next();
    }
    if (req.user.role === 'admin' && req.user.permissions && req.user.permissions[permission]) {
      return next();
    }
    return res.status(403).json({ error: 'ليس لديك صلاحية لهذا الإجراء' });
  };
}

module.exports = { roleGuard, permissionGuard };
