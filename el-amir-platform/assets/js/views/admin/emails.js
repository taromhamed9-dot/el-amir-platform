const AdminEmails = (() => {
  let allStudents = [];
  let allCourses = [];

  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <h2 style="font-size:1.1rem" class="mb-20">${Icons.emails} إرسال الإيميلات</h2>
      <div class="card">
        <div class="form-group">
          <label class="form-label">إرسال إلى</label>
          <select class="form-select" id="email-target" onchange="AdminEmails.onTargetChange(this.value)">
            <option value="all">الجميع</option>
            <option value="students">كل التلاميذ</option>
            <option value="teachers">كل الأساتذة</option>
            <option value="course">تلاميذ دورة محددة</option>
            <option value="specific">تلاميذ محددين</option>
          </select>
        </div>

        <div id="email-course-select" style="display:none" class="form-group">
          <label class="form-label">اختر الدورة</label>
          <select class="form-select" id="email-course"></select>
        </div>

        <div id="email-students-select" style="display:none" class="form-group">
          <label class="form-label">اختر التلاميذ</label>
          <input type="text" class="form-input mb-8" placeholder="بحث بالاسم..." oninput="AdminEmails.filterStudentList(this.value)" id="email-student-search">
          <div id="email-student-list" style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px"></div>
        </div>

        <div class="form-group">
          <label class="form-label">الموضوع</label>
          <input type="text" class="form-input" id="email-subject" placeholder="موضوع الرسالة">
        </div>
        <div class="form-group">
          <label class="form-label">الرسالة</label>
          <textarea class="form-textarea" id="email-message" rows="6" placeholder="نص الرسالة..."></textarea>
        </div>
        <button class="btn btn-accent" onclick="AdminEmails.sendEmail()">${Icons.send} إرسال</button>
      </div>
    `;
    await loadData();
  }

  async function loadData() {
    try {
      const [sData, cData] = await Promise.all([
        API.get('/admin/students?limit=500'),
        API.get('/admin/courses')
      ]);
      allStudents = sData.students || [];
      allCourses = cData.courses || [];
      const courseSelect = document.getElementById('email-course');
      if (courseSelect) {
        courseSelect.innerHTML = '<option value="">اختر الدورة</option>' +
          allCourses.map(c => `<option value="${c.id}">${c.name} (${c.level})</option>`).join('');
      }
    } catch (_) {}
  }

  function onTargetChange(value) {
    document.getElementById('email-course-select').style.display = value === 'course' ? 'block' : 'none';
    document.getElementById('email-students-select').style.display = value === 'specific' ? 'block' : 'none';
    if (value === 'specific') {
      renderStudentList(allStudents);
    }
  }

  function renderStudentList(students) {
    const list = document.getElementById('email-student-list');
    if (!list) return;
    list.innerHTML = students.map(s => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;border-bottom:1px solid var(--border);font-size:0.85rem">
        <input type="checkbox" value="${s.id}" class="email-student-check">
        <span>${s.first_name} ${s.last_name}</span>
        <span style="color:var(--text-muted);font-size:0.75rem;margin-right:auto">${s.email}</span>
      </label>
    `).join('');
  }

  function filterStudentList(query) {
    const q = query.toLowerCase();
    const filtered = allStudents.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
    renderStudentList(filtered);
  }

  async function sendEmail() {
    const target = document.getElementById('email-target').value;
    const subject = document.getElementById('email-subject').value;
    const message = document.getElementById('email-message').value;

    if (!subject || !message) { Toast.warning('يرجى ملء الموضوع والرسالة'); return; }

    const body = { subject, message };

    if (target === 'specific') {
      const checked = document.querySelectorAll('.email-student-check:checked');
      if (checked.length === 0) { Toast.warning('اختر تلميذاً واحداً على الأقل'); return; }
      body.target = 'specific';
      body.student_ids = Array.from(checked).map(cb => cb.value);
    } else if (target === 'course') {
      const courseId = document.getElementById('email-course').value;
      if (!courseId) { Toast.warning('اختر الدورة'); return; }
      body.target = 'course';
      body.course_id = courseId;
    } else {
      body.target = target;
    }

    try {
      // Backend route is mounted at /admin/emails/send.
      const data = await API.post('/admin/emails/send', body);
      Toast.success(`تم إرسال ${data.sent_count || 0} إيميل بنجاح`);
      document.getElementById('email-subject').value = '';
      document.getElementById('email-message').value = '';
    } catch (err) { Toast.error(err.message); }
  }

  return { render, onTargetChange, filterStudentList, sendEmail };
})();
