const router = require('express').Router();
const ctrl = require('../controllers/student.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

router.use(authenticate, roleGuard('student'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/schedule', ctrl.getSchedule);
router.get('/attendance', ctrl.getAttendance);
router.get('/payments', ctrl.getPayments);
router.post('/payments/:payment_id/proof', ...ctrl.uploadProof);
router.get('/notes', ctrl.getNotes);
router.get('/notifications', ctrl.getNotifications);
router.patch('/notifications/read-all', ctrl.markAllRead);

module.exports = router;
