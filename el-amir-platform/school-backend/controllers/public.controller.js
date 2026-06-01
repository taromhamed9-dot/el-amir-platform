const supabase = require('../config/db');
const { sanitizeObject, validateRequired, validatePhone, validateLevel } = require('../utils/validate');

exports.getAvailableCourses = async (req, res, next) => {
  try {
    const { level } = req.query;
    let query = supabase
      .from('courses')
      .select('id, name, subject, level, price, capacity, enrolled_count, status, start_date, end_date, description, teachers(full_name)')
      .in('status', ['open']);

    if (level) query = query.eq('level', level);

    const { data, error } = await query.order('level').order('name');
    if (error) throw error;

    const courses = (data || []).map(c => ({
      ...c,
      available_seats: c.capacity - c.enrolled_count,
      teacher_name: c.teachers ? c.teachers.full_name : null
    }));

    res.json({ courses });
  } catch (err) {
    next(err);
  }
};

exports.getCourseSessions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('sessions')
      .select('day_of_week, start_time, end_time, room')
      .eq('course_id', id)
      .order('day_of_week')
      .order('start_time');

    if (error) throw error;
    res.json({ sessions: data || [] });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const body = sanitizeObject(req.body);
    const reqErr = validateRequired(['first_name', 'last_name', 'phone', 'level', 'course_id'], body);
    if (reqErr) return res.status(400).json({ error: reqErr });

    const levelErr = validateLevel(body.level);
    if (levelErr) return res.status(400).json({ error: levelErr });

    const phoneErr = validatePhone(body.phone);
    if (phoneErr) return res.status(400).json({ error: phoneErr });

    // Check duplicate
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('phone', body.phone)
      .eq('course_id', body.course_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'رقم الهاتف مسجّل بالفعل في هذه الدورة' });
    }

    const { data: course } = await supabase
      .from('courses')
      .select('teacher_id, enrolled_count, capacity, status, name')
      .eq('id', body.course_id)
      .single();

    if (!course) return res.status(404).json({ error: 'الدورة غير موجودة' });
    if (course.status !== 'open') return res.status(400).json({ error: 'الدورة غير متاحة حالياً' });
    if (course.enrolled_count >= course.capacity) return res.status(400).json({ error: 'الدورة ممتلئة' });

    const { data: student, error } = await supabase
      .from('students')
      .insert({
        username: `pending_${body.phone}`,
        password: 'pending_approval',
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone,
        parent_phone: body.parent_phone || null,
        email: body.email || null,
        level: body.level,
        course_id: body.course_id,
        teacher_id: course.teacher_id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('increment_enrolled', { cid: body.course_id });

    // Notify admins
    const { data: admins } = await supabase.from('admins').select('id, email').limit(5);
    for (const admin of (admins || [])) {
      await supabase.from('notifications').insert({
        to_role: 'admin',
        to_id: admin.id,
        type: 'new_registration',
        title: 'تسجيل جديد',
        message: `${body.first_name} ${body.last_name} سجّل في ${course.name}`,
        link: '/admin/students'
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح. سيتواصل معك المدير لتأكيد حسابك.'
    });
  } catch (err) {
    next(err);
  }
};
