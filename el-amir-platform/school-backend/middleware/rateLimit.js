const rateLimit = require('express-rate-limit');

// In-memory rate limiting only works in persistent server environments.
// On Vercel serverless, each invocation may be a fresh instance, so we use
// a no-op passthrough middleware instead to avoid incorrect behavior.
const isServerless = !!process.env.VERCEL;

const _noopLimiter = (req, res, next) => next();

const loginLimiter = isServerless ? _noopLimiter : rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'محاولات كثيرة، حاول بعد 10 دقائق' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body.username || req.ip
});

const apiLimiter = isServerless ? _noopLimiter : rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'طلبات كثيرة، حاول لاحقاً' }
});

module.exports = { loginLimiter, apiLimiter };
