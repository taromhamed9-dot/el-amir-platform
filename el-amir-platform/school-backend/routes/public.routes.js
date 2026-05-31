const router = require('express').Router();
const ctrl = require('../controllers/public.controller');
const { apiLimiter } = require('../middleware/rateLimit');

router.get('/courses', ctrl.getAvailableCourses);
router.get('/courses/:id/sessions', ctrl.getCourseSessions);
router.post('/register', apiLimiter, ctrl.register);

module.exports = router;
