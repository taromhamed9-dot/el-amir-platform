const supabase = require('../config/db');
const multer = require('multer');
const { uploadFile } = require('../services/storage.service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Dashboard ──────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const [studentRes, attendanceRes, paymentRes, notificationsRes] = await Promise.all([
      supabase.from('students').select('*, courses(name, subject, price), teachers(full_name)').eq('id', studentId).single(),
      supabase.from('attendance').select('status').eq('student_id', studentId),
      supabase.from('payments').select('status, month').eq('student_id', studentId).order('month', { ascending: false }).limit(1),
      supabase.from('notifications').select('*').eq('to_id', studentId).eq('is_read', false).limit(5)
    ]);

    const att = attendanceRes.data || [];
    const total = att.length;
    const present = att.filter(a => a.status === 'present').length;

    let scheduleData = [];
    if (studentRes.data && studentRes.data.course_id) {
      const { data } = await supabase.from('sessions').select('*').eq('course_id', studentRes.data.course_id).order('day_of_week').order('start_time');
      scheduleData = data || [];
    }

    const latestPayment = paymentRes.data && paymentRes.data[0];

    res.json({
      student: studentRes.data,
      attendance_rate: total > 0 ? Math.round((present / total) * 100) : 0,
      payment_status: latestPayment ? latestPayment.status : 'unpaid',
      schedule: scheduleData,
      notifications: notificationsRes.data || []
    });
  } catch (err) {
    next(err);
  }
};

// ── Schedule ───────────────────────────────────────
exports.getSchedule = async (req, res, next) => {
  try {
    const { data: student } = await supabase.from('students').select('course_id').eq('id', req.user.id).single();
    if (!student || !student.course_id) {
      return res.json({ schedule: [] });
    }

    const { data, error } = await supabase
      .from('sessions')
      .select('*, courses(name, level)')
      .eq('course_id', student.course_id)
      .order('day_of_week')
      .order('start_time');

    if (error) throw error;
    res.json({ schedule: data || [] });
  } catch (err) {
    next(err);
  }
};

// ── Attendance ─────────────────────────────────────
exports.getAttendance = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', req.user.id)
      .order('session_date', { ascending: false });

    if (error) throw error;

    const records = data || [];
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const late = records.filter(r => r.status === 'late').length;
    const excused = records.filter(r => r.status === 'excused').length;

    res.json({
      attendance: records,
      summary: {
        total,
        present,
        absent,
        late,
        excused,
        rate: total > 0 ? Math.round((present / total) * 100) : 0
      }
    });
  } catch (err) {
    next(err);
  }
};

// ── Payments ───────────────────────────────────────
exports.getPayments = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, courses(name, price)')
      .eq('student_id', req.user.id)
      .order('month', { ascending: false });

    if (error) throw error;
    res.json({ payments: data || [] });
  } catch (err) {
    next(err);
  }
};

exports.uploadProof = [
  upload.single('proof'),
  async (req, res, next) => {
    try {
      const { payment_id } = req.params;
      if (!req.file) return res.status(400).json({ error: 'الملف مطلوب' });

      const { data: payment } = await supabase
        .from('payments')
        .select('student_id')
        .eq('id', payment_id)
        .single();

      if (!payment || payment.student_id !== req.user.id) {
        return res.status(403).json({ error: 'لا يمكنك رفع إثبات لهذا الدفع' });
      }

      const url = await uploadFile(req.file, `proofs/${req.user.id}`);

      const { data, error } = await supabase
        .from('payments')
        .update({
          proof_url: url,
          status: 'pending_verification',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment_id)
        .select()
        .single();

      if (error) throw error;

      // Notify admins
      const { data: admins } = await supabase.from('admins').select('id').limit(5);
      for (const admin of (admins || [])) {
        await supabase.from('notifications').insert({
          to_role: 'admin',
          to_id: admin.id,
          type: 'payment_proof',
          title: 'إثبات دفع جديد',
          message: `${req.user.full_name} رفع إثبات دفع`,
          link: '/admin/payments'
        });
      }

      res.json({ payment: data });
    } catch (err) {
      next(err);
    }
  }
];

// ── Notes ──────────────────────────────────────────
exports.getNotes = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('teacher_notes')
      .select('*, teachers(full_name)')
      .eq('student_id', req.user.id)
      .eq('is_private', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ notes: data || [] });
  } catch (err) {
    next(err);
  }
};

// ── Notifications ──────────────────────────────────
exports.getNotifications = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('to_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    const unread = (data || []).filter(n => !n.is_read).length;
    res.json({ notifications: data || [], unread_count: unread });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('to_id', req.user.id)
      .eq('is_read', false);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
