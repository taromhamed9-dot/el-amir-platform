// Export service stubs — PDF/Excel generation happens client-side
// This service provides data formatting for server-side exports if needed

function formatStudentsForExport(students) {
  return students.map(s => ({
    'الاسم الكامل': `${s.first_name} ${s.last_name}`,
    'الهاتف': s.phone,
    'هاتف ولي الأمر': s.parent_phone || '',
    'البريد': s.email || '',
    'المستوى': s.level,
    'الدورة': s.course_name || '',
    'الأستاذ': s.teacher_name || '',
    'الحالة': translateStatus(s.status),
    'تاريخ التسجيل': s.enrollment_date
  }));
}

function formatAttendanceForExport(records) {
  return records.map(r => ({
    'التلميذ': r.student_name,
    'التاريخ': r.session_date,
    'الوقت': r.session_time || '',
    'الحالة': translateAttendance(r.status),
    'ملاحظة': r.note || ''
  }));
}

function formatPaymentsForExport(payments) {
  return payments.map(p => ({
    'التلميذ': p.student_name,
    'الدورة': p.course_name,
    'المبلغ': p.amount,
    'الشهر': p.month,
    'الحالة': translatePaymentStatus(p.status),
    'تاريخ التأكيد': p.verified_at || ''
  }));
}

function translateStatus(status) {
  const map = { active: 'نشط', suspended: 'موقوف', expelled: 'مطرود', pending: 'معلّق' };
  return map[status] || status;
}

function translateAttendance(status) {
  const map = { present: 'حاضر', absent: 'غائب', late: 'متأخر', excused: 'معذور' };
  return map[status] || status;
}

function translatePaymentStatus(status) {
  const map = { paid: 'مدفوع', unpaid: 'غير مدفوع', pending_verification: 'في انتظار التأكيد' };
  return map[status] || status;
}

module.exports = {
  formatStudentsForExport,
  formatAttendanceForExport,
  formatPaymentsForExport
};
