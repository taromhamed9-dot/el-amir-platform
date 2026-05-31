function errorHandler(err, _req, res, _next) {
  console.error('Error:', err.message, err.stack);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'بيانات JSON غير صالحة' });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'البيانات موجودة مسبقاً' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'مرجع غير صالح في البيانات' });
  }

  const status = err.status || 500;
  const message = err.message || 'خطأ داخلي في الخادم';
  res.status(status).json({ error: message, stack: err.stack });
}

module.exports = errorHandler;
