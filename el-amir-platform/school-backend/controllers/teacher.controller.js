const supabase = require('../config/db');
const { sanitizeObject, validateRequired } = require('../utils/validate');
const emailService = require('../services/email.service');
const { getCurrentMonth } = require('../utils/format');

// ── Dashboard ──────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDay = dayNames[new Date().getDay()];

    const [coursesRes, studentsRes, todaySessionsRes, attendanceRes, requestsRes] = await Promise.all([
      supabase.from('courses').select('*').eq('teacher_id', teacherId),
      supabase.from('students').select('id', { count: 'exact' }).eq('teacher_id', teacherId).eq('status', 'active'),
      supabase.from('sessions').select('*, courses(name, level)').eq('teacher_id', teacherId).eq('day_of_week', todayDay),
      supabase.from('attendance').select('status').eq('teacher_id', teacherId).gte('session_date', getWeekStart()),
      supabase.from('requests').select('id', { count: 'exact' }).eq('from_id', teacherId).eq('status', 'pending')
    ]);

    const weekAtt = attendanceRes.data || [];
    const weekPresent = weekAtt.filter(a => a.status === 'present').length;
    const weekTotal = weekAtt.length;

    res.json({
      my_courses: coursesRes.data || [],
      students_count: studentsRes.count || 0,
      today_sessions: todaySessionsRes.data || [],
      weekly_attendance_rate: weekTotal > 0 ? Math.round((weekPresent / weekTotal) * 100) : 0,
      pending_requests_count: requestsRes.count || 0
    });
  } catch (err) {
    next(err);
  }
};

// ── My Students ────────────────────────────────────
exports.getMyStudents = async (req, res, next) => {
  try {
    const { course_id, search } = req.query;
    let query = supabase
      .from('students')
      .select('*, courses(name)')
      .eq('teacher_id', req.user.id)
      .eq('status', 'active')
      .order('first_name');

    if (course_id) query = query.eq('course_id', course_id);
    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ students: data || [] });
  } catch (err) {
    next(err);
  }
};

// ── Attendance ─────────────────────────────────────
exports.recordAttendance = async (req, res, next) => {
  try {
    const { course_id, session_date, session_time, records } = req.body;
    if (!course_id || !session_date || !records || !records.length) {
      return res.status(400).json({ error: 'بيانات الحضور غير مكتملة' });
    }

    const { data: course } = await supabase.from('courses').select('teacher_id').eq('id', course_id).single();
    if (!course || course.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'لا يمكنك تسجيل حضور لدورة ليست لك' });
    }

    const inserts = records.map(r => ({
      student_id: r.student_id,
      course_id,
      teacher_id: req.user.id,
      session_date,
      session_time: session_time || null,
      status: r.status,
      note: r.note || null,
      recorded_by: req.user.id
    }));

    const { data, error } = await supabase
      .from('attendance')
      .upsert(inserts, { onConflict: 'student_id,course_id,session_date,session_time' })
      .select();

    if (error) throw error;
    res.json({ attendance: data || [], count: inserts.length });
  } catch (err) {
    next(err);
  }
};

exports.getAttendanceHistory = async (req, res, next) => {
  try {
    const { course_id, from, to } = req.query;
    let query = supabase
      .from('attendance')
      .select('*, students(first_name, last_name)')
      .eq('teacher_id', req.user.id)
      .order('session_date', { ascending: false });

    if (course_id) query = query.eq('course_id', course_id);
    if (from) query = query.gte('session_date', from);
    if (to) query = query.lte('session_date', to);

    const { data, error } = await query.limit(200);
    if (error) throw error;
    res.json({ attendance: data || [] });
  } catch (err) {
    next(err);
  }
};

// ── Payments ───────────────────────────────────────
exports.getStudentPayments = async (req, res, next) => {
  try {
    const { month = getCurrentMonth(), status, search } = req.query;
    const teacherId = req.user.id;

    let query = supabase
      .from('payments')
      .select('*, students!inner(first_name, last_name, phone, teacher_id)')
      .eq('students.teacher_id', teacherId)
      .eq('month', month)
      .order('student_id', { ascending: true })
      .order('session_number', { ascending: true });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    let payments = data || [];

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      payments = payments.filter(p => {
        if (!p.students) return false;
        const name = `${p.students.first_name} ${p.students.last_name}`.toLowerCase();
        return name.includes(q);
      });
    }

    res.json({ payments });
  } catch (err) {
    next(err);
  }
};

// ── Schedule ───────────────────────────────────────
exports.getSchedule = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*, courses(name, level, subject)')
      .eq('teacher_id', req.user.id)
      .order('day_of_week')
      .order('start_time');

    if (error) throw error;
    res.json({ schedule: data || [] });
  } catch (err) {
    next(err);
  }
};

// ── Notes ──────────────────────────────────────────
exports.addNote = async (req, res, next) => {
  try {
    const body = sanitizeObject(req.body);
    const reqErr = validateRequired(['student_id', 'note'], body);
    if (reqErr) return res.status(400).json({ error: reqErr });

    const { data: student } = await supabase.from('students').select('teacher_id').eq('id', body.student_id).single();
    if (!student || student.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'هذا التلميذ ليس من تلاميذك' });
    }

    const { data, error } = await supabase
      .from('teacher_notes')
      .insert({
        teacher_id: req.user.id,
        student_id: body.student_id,
        note: body.note,
        is_private: body.is_private || false
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ note: data });
  } catch (err) {
    next(err);
  }
};

exports.getNotes = async (req, res, next) => {
  try {
    const { student_id } = req.query;
    let query = supabase
      .from('teacher_notes')
      .select('*, students(first_name, last_name)')
      .eq('teacher_id', req.user.id)
      .order('created_at', { ascending: false });

    if (student_id) query = query.eq('student_id', student_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ notes: data || [] });
  } catch (err) {
    next(err);
  }
};

// ── Requests ───────────────────────────────────────
exports.createRequest = async (req, res, next) => {
  try {
    const body = sanitizeObject(req.body);
    const reqErr = validateRequired(['type', 'reason'], body);
    if (reqErr) return res.status(400).json({ error: reqErr });

    const validTypes = ['expel_request', 'add_student', 'schedule_change', 'note_approval', 'other'];
    if (!validTypes.includes(body.type)) {
      return res.status(400).json({ error: 'نوع طلب غير صالح' });
    }

    const { data, error } = await supabase
      .from('requests')
      .insert({
        from_role: 'teacher',
        from_id: req.user.id,
        type: body.type,
        target_student_id: body.target_student_id || null,
        reason: body.reason,
        details: body.details || {}
      })
      .select()
      .single();

    if (error) throw error;

    // Notify admins
    const { data: admins } = await supabase.from('admins').select('id, email').limit(5);
    for (const admin of (admins || [])) {
      await supabase.from('notifications').insert({
        to_role: 'admin',
        to_id: admin.id,
        type: 'new_request',
        title: 'طلب جديد من أستاذ',
        message: `${req.user.full_name}: ${body.type}`,
        link: '/admin/requests'
      });
    }

    res.status(201).json({ request: data });
  } catch (err) {
    next(err);
  }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('requests')
      .select('*, students:target_student_id(first_name, last_name)')
      .eq('from_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ requests: data || [] });
  } catch (err) {
    next(err);
  }
};

// ── Send Email to Students ─────────────────────────
exports.sendEmailToStudents = async (req, res, next) => {
  try {
    const { student_ids, subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'الموضوع والرسالة مطلوبان' });

    let query = supabase
      .from('students')
      .select('first_name, last_name, email')
      .eq('teacher_id', req.user.id)
      .eq('is_active', true)
      .not('email', 'is', null);

    if (student_ids && student_ids.length > 0) {
      query = query.in('id', student_ids);
    }

    const { data } = await query;
    const recipients = (data || []).map(s => ({ email: s.email, name: `${s.first_name} ${s.last_name}` }));
    const results = await emailService.sendBulkEmail({ recipients, subject, message });
    const sentCount = results.filter(r => r.success).length;

    res.json({ sent_count: sentCount });
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

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const weekStart = new Date(now.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}
