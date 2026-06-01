const TeacherAttendance = (() => {
  let students = [];
  let records = {};
  let currentTab = 'record';

  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20 attendance-page-header">
        <h2 style="font-size:1.1rem">${Icons.attendance} الحضور و الغياب</h2>
      </div>

      <div class="tabs mb-20">
        <button class="tab-btn ${currentTab === 'record' ? 'active' : ''}" onclick="TeacherAttendance.switchTab('record')">${Icons.notes} تسجيل الحضور</button>
        <button class="tab-btn ${currentTab === 'history' ? 'active' : ''}" onclick="TeacherAttendance.switchTab('history')">${Icons.history} سجل الحضور</button>
        <button class="tab-btn ${currentTab === 'stats' ? 'active' : ''}" onclick="TeacherAttendance.switchTab('stats')">${Icons.stats} الإحصائيات</button>
      </div>

      <div id="attendance-tab-content"></div>
    `;
    await renderCurrentTab();
  }

  async function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tabs .tab-btn:nth-child(${tab === 'record' ? 1 : tab === 'history' ? 2 : 3})`).classList.add('active');
    await renderCurrentTab();
  }

  async function renderCurrentTab() {
    const container = document.getElementById('attendance-tab-content');
    if (currentTab === 'record') await renderRecordTab(container);
    else if (currentTab === 'history') await renderHistoryTab(container);
    else if (currentTab === 'stats') await renderStatsTab(container);
  }

  async function renderRecordTab(container) {
    container.innerHTML = `
      <div class="card mb-20">
        <div class="card-header">
          <span class="card-title">${Icons.notes} معلومات الحصة</span>
        </div>
        <div class="form-row attendance-form-row">
          <div class="form-group">
            <label class="form-label">الدورة</label>
            <select class="form-select" id="att-course" onchange="TeacherAttendance.loadStudents()">
              <option value="">اختر الدورة</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">التاريخ</label>
            <input type="date" class="form-input" id="att-date" value="${new Date().toISOString().split('T')[0]}"
              onchange="TeacherAttendance.loadStudents()">
          </div>
          <div class="form-group">
            <label class="form-label">الوقت</label>
            <input type="time" class="form-input" id="att-time" onchange="TeacherAttendance.loadStudents()">
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="TeacherAttendance.markAllPresent()">${Icons.check} كلهم حاضرون</button>
          <button class="btn btn-outline btn-sm" style="border-color:var(--danger);color:var(--danger)" onclick="TeacherAttendance.markAllAbsent()">${Icons.cross} كلهم غائبون</button>
        </div>
      </div>

      <div id="attendance-form-container"></div>

      <div style="margin-top:16px" id="attendance-save-container">
        <button class="btn btn-accent btn-lg attendance-save-btn" onclick="TeacherAttendance.save()">${Icons.save} حفظ الحضور</button>
      </div>
    `;

    try {
      const data = await API.get('/teacher/dashboard');
      const select = document.getElementById('att-course');
      (data.my_courses || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.level})`;
        select.appendChild(opt);
      });
    } catch (_) {}
  }

  async function renderHistoryTab(container) {
    container.innerHTML = `
      <div class="card mb-20">
        <div class="card-header">
          <span class="card-title">${Icons.filter} فلترة السجل</span>
        </div>
        <div class="form-row attendance-form-row">
          <div class="form-group">
            <label class="form-label">الدورة</label>
            <select class="form-select" id="hist-course" onchange="TeacherAttendance.loadHistory()">
              <option value="">كل الدورات</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">من تاريخ</label>
            <input type="date" class="form-input" id="hist-from" onchange="TeacherAttendance.loadHistory()">
          </div>
          <div class="form-group">
            <label class="form-label">إلى تاريخ</label>
            <input type="date" class="form-input" id="hist-to" onchange="TeacherAttendance.loadHistory()">
          </div>
        </div>
      </div>
      <div id="history-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;

    try {
      const data = await API.get('/teacher/dashboard');
      const select = document.getElementById('hist-course');
      (data.my_courses || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.level})`;
        select.appendChild(opt);
      });
    } catch (_) {}

    await loadHistory();
  }

  async function renderStatsTab(container) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">جاري تحميل الإحصائيات...</div>';

    try {
      const data = await API.get('/teacher/dashboard');
      const courses = data.my_courses || [];

      let allAtt = [];
      for (const c of courses) {
        try {
          const attData = await API.get(`/teacher/attendance?course_id=${c.id}`);
          allAtt = allAtt.concat((attData.attendance || []).map(a => ({ ...a, courseName: c.name })));
        } catch (_) {}
      }

      const total = allAtt.length;
      const present = allAtt.filter(a => a.status === 'present').length;
      const absent = allAtt.filter(a => a.status === 'absent').length;
      const late = allAtt.filter(a => a.status === 'late').length;
      const excused = allAtt.filter(a => a.status === 'excused').length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      const courseStats = {};
      allAtt.forEach(a => {
        if (!courseStats[a.course_id]) courseStats[a.course_id] = { name: a.courseName, total: 0, present: 0, absent: 0, late: 0, excused: 0 };
        courseStats[a.course_id].total++;
        courseStats[a.course_id][a.status]++;
      });

      container.innerHTML = `
        <div class="grid grid-4 mb-20">
          <div class="stat-card">
            <div class="stat-icon green">${Icons.present}</div>
            <div>
              <div class="stat-value">${present}</div>
              <div class="stat-label">حاضر</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon red">${Icons.absent}</div>
            <div>
              <div class="stat-value">${absent}</div>
              <div class="stat-label">غائب</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">${Icons.late}</div>
            <div>
              <div class="stat-value">${late}</div>
              <div class="stat-label">متأخر</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">${Icons.excused}</div>
            <div>
              <div class="stat-value">${excused}</div>
              <div class="stat-label">معذور</div>
            </div>
          </div>
        </div>

        <div class="card mb-20">
          <div class="card-header">
            <span class="card-title">${Icons.stats} نسبة الحضور الإجمالية</span>
            <span class="mono" style="font-weight:700;font-size:1.2rem;color:${rate >= 70 ? 'var(--success)' : rate >= 50 ? 'var(--warning)' : 'var(--danger)'}">${rate}%</span>
          </div>
          <div class="progress-bar" style="height:12px;border-radius:6px">
            <div class="fill ${rate >= 70 ? 'green' : rate >= 50 ? 'gold' : 'red'}" style="width:${rate}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:0.8rem;color:var(--text-muted)">
            <span>إجمالي السجلات: ${total}</span>
            <span>الحاضرين: ${present} من ${total}</span>
          </div>
        </div>

        ${Object.keys(courseStats).length > 0 ? `
          <div class="card">
            <div class="card-header">
              <span class="card-title">${Icons.courses} إحصائيات حسب الدورة</span>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>الدورة</th>
                    <th>إجمالي</th>
                    <th>حاضر</th>
                    <th>غائب</th>
                    <th>متأخر</th>
                    <th>معذور</th>
                    <th>النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.values(courseStats).map(cs => {
                    const cRate = cs.total > 0 ? Math.round((cs.present / cs.total) * 100) : 0;
                    return `
                      <tr>
                        <td style="font-weight:600">${cs.name}</td>
                        <td class="mono">${cs.total}</td>
                        <td><span class="badge badge-success">${cs.present}</span></td>
                        <td><span class="badge badge-danger">${cs.absent}</span></td>
                        <td><span class="badge badge-warning">${cs.late}</span></td>
                        <td><span class="badge badge-info">${cs.excused}</span></td>
                        <td>
                          <div style="display:flex;align-items:center;gap:8px">
                            <div class="progress-bar" style="flex:1;height:6px">
                              <div class="fill ${cRate >= 70 ? 'green' : cRate >= 50 ? 'gold' : 'red'}" style="width:${cRate}%"></div>
                            </div>
                            <span class="mono" style="font-size:0.8rem;font-weight:600">${cRate}%</span>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.warning}</div><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  async function loadHistory() {
    const container = document.getElementById('history-container');
    const courseId = document.getElementById('hist-course')?.value;
    const from = document.getElementById('hist-from')?.value;
    const to = document.getElementById('hist-to')?.value;

    try {
      const params = new URLSearchParams();
      if (courseId) params.set('course_id', courseId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const data = await API.get(`/teacher/attendance?${params}`);
      const attendance = data.attendance || [];

      if (attendance.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.schedule}</div><div class="title">لا توجد سجلات</div><div class="description">لم يتم العثور على سجلات حضور مطابقة</div></div>`;
        return;
      }

      // Group by student for grid view
      const byStudent = {};
      attendance.forEach(a => {
        const sid = a.student_id;
        if (!byStudent[sid]) {
          byStudent[sid] = {
            name: a.students ? `${a.students.first_name} ${a.students.last_name}` : '—',
            records: []
          };
        }
        byStudent[sid].records.push(a);
      });

      let html = '<div class="att-grid">';
      Object.keys(byStudent).forEach(sid => {
        const st = byStudent[sid];
        html += `<div class="att-student-card card">
          <div class="asc-header">
            <div class="asc-name">${st.name}</div>
          </div>
          <div class="asc-squares">`;
        st.records.forEach(r => {
          const statusIcon = r.status === 'present' ? Icons.check : r.status === 'absent' ? Icons.cross : r.status === 'late' ? Icons.clock : Icons.info;
          html += `<div class="att-square ${r.status}" title="${Utils.formatDate(r.session_date)} - ${Utils.getAttendanceStatus(r.status)}">
            <div class="att-square-icon">${statusIcon}</div>
            <div class="att-square-date">${Utils.formatDate(r.session_date)}</div>
          </div>`;
        });
        html += `</div></div>`;
      });
      html += '</div>';
      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  // Re-render whenever the course OR date changes. Saving the same
  // (student_id, course_id, session_date, session_time) tuple upserts
  // on the backend, so editing a past session just works — as long as
  // we pre-fill the form with the existing values for that date.
  async function loadStudents() {
    const courseId = document.getElementById('att-course')?.value;
    const date     = document.getElementById('att-date')?.value;
    const time     = document.getElementById('att-time')?.value || '';
    const container = document.getElementById('attendance-form-container');
    const banner    = document.getElementById('att-existing-banner');
    if (banner) banner.remove();
    if (!courseId) { container.innerHTML = ''; return; }

    try {
      const data = await API.get(`/teacher/students?course_id=${courseId}`);
      students = data.students || [];

      // Try to pull existing attendance for this course on this date so we
      // can detect "edit past session" vs "new session".
      let existing = [];
      if (date) {
        try {
          const ex = await API.get(`/teacher/attendance?course_id=${courseId}&from=${date}&to=${date}`);
          existing = (ex.attendance || []).filter(a => !time || (a.session_time || '') === time);
        } catch (_) { existing = []; }
      }

      const existingByStudent = {};
      existing.forEach(a => { existingByStudent[a.student_id] = a; });
      const isEdit = existing.length > 0;

      records = {};
      students.forEach(s => {
        const ex = existingByStudent[s.id];
        records[s.id] = {
          student_id: s.id,
          status: ex ? ex.status : 'present',
          note:   ex ? (ex.note || '') : ''
        };
      });

      if (students.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.student}</div><div class="title">لا يوجد تلاميذ</div><div class="description">هذه الدورة ليس بها تلاميذ مسجلين</div></div>`;
        return;
      }

      const editBanner = isEdit
        ? `<div id="att-existing-banner" class="alert alert-info" style="margin-bottom:12px;padding:10px;border-radius:8px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);color:var(--text-main)">
            ${Icons.edit} تعديل جلسة سابقة — تم تحميل ${existing.length} سجل موجود. أي تغيير سيتم بالكتابة فوق السجلات الحالية.
          </div>`
        : `<div id="att-existing-banner" class="alert" style="margin-bottom:12px;padding:10px;border-radius:8px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);color:var(--text-main)">
            ${Icons.add} جلسة جديدة — سيتم إنشاء عمود جديد في السجل عند الحفظ.
          </div>`;

      const statusBtnHtml = (sid, st, label, icon, mod) => `
        <button class="status-btn ${mod} ${records[sid].status === st ? 'selected' : ''}"
                data-id="${sid}" data-status="${st}"
                onclick="TeacherAttendance.setStatus('${sid}','${st}',this)">${icon} ${label}</button>`;

      container.innerHTML = `
        ${editBanner}
        <div class="card mb-16">
          <div class="card-header">
            <span class="card-title">${Icons.students} قائمة التلاميذ (${students.length})</span>
          </div>
          <div class="attendance-form">
            ${students.map((s, i) => `
              <div class="student-row ${i % 2 === 0 ? '' : 'alt-row'}">
                <div class="student-info-cell">
                  <span class="student-number">${i + 1}</span>
                  <span class="student-name">${s.first_name} ${s.last_name}</span>
                </div>
                <div class="status-buttons">
                  ${statusBtnHtml(s.id, 'present', 'حاضر', Icons.check, 'present')}
                  ${statusBtnHtml(s.id, 'absent',  'غائب',  Icons.cross, 'absent')}
                  ${statusBtnHtml(s.id, 'late',    'متأخر',  Icons.clock, 'late')}
                  ${statusBtnHtml(s.id, 'excused', 'معذور', Icons.info,  'excused')}
                </div>
                <input type="text" class="form-input note-input"
                  placeholder="ملاحظة..."
                  value="${Utils.escapeHtml(records[s.id].note || '')}"
                  oninput="TeacherAttendance.setNote('${s.id}',this.value)">
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  function setStatus(id, status, btn) {
    records[id].status = status;
    const row = btn.closest('.student-row');
    row.querySelectorAll('.status-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }

  function setNote(id, note) {
    if (records[id]) records[id].note = note;
  }

  function markAllPresent() {
    Object.keys(records).forEach(id => { records[id].status = 'present'; });
    document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.status-btn.present').forEach(b => b.classList.add('selected'));
    Toast.info('تم تحديد الجميع كحاضرين');
  }

  function markAllAbsent() {
    Object.keys(records).forEach(id => { records[id].status = 'absent'; });
    document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.status-btn.absent').forEach(b => b.classList.add('selected'));
    Toast.info('تم تحديد الجميع كغائبين');
  }

  async function save() {
    const courseId = document.getElementById('att-course').value;
    const date = document.getElementById('att-date').value;
    const time = document.getElementById('att-time').value;

    if (!courseId) { Toast.warning('اختر الدورة'); return; }
    if (!date) { Toast.warning('اختر التاريخ'); return; }
    if (Object.keys(records).length === 0) { Toast.warning('لا يوجد تلاميذ'); return; }

    try {
      const wasEdit = !!document.querySelector('#att-existing-banner.alert-info');
      await API.post('/teacher/attendance', {
        course_id: courseId,
        session_date: date,
        session_time: time || null,
        records: Object.values(records)
      });
      Toast.success(wasEdit ? 'تم تحديث سجلات الجلسة' : 'تم حفظ جلسة جديدة');
      // Refresh so the banner flips from "new" → "edit" on next save.
      await loadStudents();
    } catch (err) { Toast.error(err.message); }
  }

  return { render, switchTab, loadStudents, loadHistory, setStatus, setNote, markAllPresent, markAllAbsent, save };
})();
