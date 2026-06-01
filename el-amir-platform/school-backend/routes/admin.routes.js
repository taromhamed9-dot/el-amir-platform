const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth');
const { roleGuard, permissionGuard } = require('../middleware/roleGuard');

router.use(authenticate, roleGuard('admin', 'super_admin'));

// Dashboard
router.get('/stats', ctrl.getStats);

// Students
router.get('/students', ctrl.getStudents);
router.get('/students/:id', ctrl.getStudent);
router.post('/students', permissionGuard('manage_students'), ctrl.createStudent);
router.put('/students/:id', permissionGuard('manage_students'), ctrl.updateStudent);
router.delete('/students/:id', permissionGuard('manage_students'), ctrl.deleteStudent);
router.patch('/students/:id/status', permissionGuard('manage_students'), ctrl.updateStudentStatus);
router.patch('/students/:id/course', permissionGuard('manage_students'), ctrl.changeStudentCourse);

// Teachers
router.get('/teachers', ctrl.getTeachers);
router.get('/teachers/:id', ctrl.getTeacher);
router.post('/teachers', permissionGuard('manage_teachers'), ctrl.createTeacher);
router.put('/teachers/:id', permissionGuard('manage_teachers'), ctrl.updateTeacher);
router.delete('/teachers/:id', permissionGuard('manage_teachers'), ctrl.deleteTeacher);
router.post('/teachers/:id/impersonate', roleGuard('admin', 'super_admin'), ctrl.impersonateTeacher);

// Courses
router.get('/courses', ctrl.getCourses);
router.get('/courses/:id', ctrl.getCourse);
router.post('/courses', permissionGuard('manage_courses'), ctrl.createCourse);
router.put('/courses/:id', permissionGuard('manage_courses'), ctrl.updateCourse);
router.delete('/courses/:id', permissionGuard('manage_courses'), ctrl.deleteCourse);
router.post('/courses/:id/sessions', permissionGuard('manage_courses'), ctrl.addSession);
router.delete('/courses/:id/sessions/:session_id', permissionGuard('manage_courses'), ctrl.deleteSession);

// Payments
router.get('/payments', ctrl.getPayments);
router.post('/payments', permissionGuard('manage_payments'), ctrl.createPayment);
router.post('/payments/generate', permissionGuard('manage_payments'), ctrl.generatePayments);
router.patch('/payments/:id/verify', permissionGuard('manage_payments'), ctrl.verifyPayment);
router.post('/payments/remind', permissionGuard('manage_payments'), ctrl.sendPaymentReminders);

// Requests
router.get('/requests', ctrl.getRequests);
router.patch('/requests/:id/resolve', ctrl.resolveRequest);

// Emails
router.post('/emails/send', permissionGuard('send_emails'), ctrl.sendEmails);

// Admin Accounts
router.get('/accounts', roleGuard('super_admin'), ctrl.getAdminAccounts);
router.post('/accounts', roleGuard('super_admin'), ctrl.createAdminAccount);
router.put('/accounts/:id', roleGuard('super_admin'), ctrl.updateAdminAccount);
router.delete('/accounts/:id', roleGuard('super_admin'), ctrl.deleteAdminAccount);

// Unified Users Management
router.get('/users', roleGuard('admin', 'super_admin'), ctrl.getAllUsers);
router.post('/users/:id/reset-password', roleGuard('admin', 'super_admin'), ctrl.resetUserPassword);
router.patch('/users/:id/status', roleGuard('admin', 'super_admin'), ctrl.toggleUserStatus);

// Audit Log
router.get('/audit-log', ctrl.getAuditLog);

// Notifications
router.get('/notifications', ctrl.getNotifications);
router.patch('/notifications/read-all', ctrl.markAllRead);

// Attendance Reports
router.get('/attendance', ctrl.getAttendanceReports);

module.exports = router;
