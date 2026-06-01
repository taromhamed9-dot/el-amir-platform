const router = require('express').Router();
const ctrl = require('../controllers/teacher.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard } = require('../middleware/roleGuard');

router.use(authenticate, roleGuard('teacher'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/students', ctrl.getMyStudents);
router.get('/payments', ctrl.getStudentPayments);
router.post('/attendance', ctrl.recordAttendance);
router.get('/attendance', ctrl.getAttendanceHistory);
router.get('/schedule', ctrl.getSchedule);
router.post('/notes', ctrl.addNote);
router.get('/notes', ctrl.getNotes);
router.post('/requests', ctrl.createRequest);
router.get('/requests', ctrl.getMyRequests);
router.post('/emails/send', ctrl.sendEmailToStudents);
router.get('/notifications', ctrl.getNotifications);
router.patch('/notifications/read-all', ctrl.markAllRead);

module.exports = router;
