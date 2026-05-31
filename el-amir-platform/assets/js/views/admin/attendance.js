const AdminAttendance = (() => {
  let allRecords = [];
  let sessionDates = []; // sorted unique dates for current month
  let studentsMap   = {};
  let courses = [];
  let teachers = [];
  let currentMonth  = Utils.getCurrentMonth ? Utils.getCurrentMonth() : new Date().toISOString().slice(0, 7);
  let filters = { courseId: '', teacherId: '', studentSearch: '', status: '' };

  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20 payments-header">
        <h2 style="font-size:1.1rem">${Icons.checkSquare || Icons.attendance} شبكة الحضور — بالحصص</h2>
      </div>

      <div class="card mb-20">
        <div class="filters-bar payments-filters">
          <input type="month" class="form-input" style="width:auto"
            id="att-month-filter" value="${currentMonth}"
            onchange="AdminAttendance.onMonthChange(this.value)" title="الشهر">
          <select class="form-select" id="att-course-filter" onchange="AdminAttendance.onCourseChange(this.value)" title="الدورة / الفصل">
            <option value="">كل الدورات / الفصول</option>
          </select>
          <select class="form-select" id="att-teacher-filter" onchange="AdminAttendance.onTeacherChange(this.value)" title="الأستاذ">
            <option value="">كل الأساتذة</option>
          </select>
          <select class="form-select" id="att-status-filter" onchange="AdminAttendance.onStatusChange(this.value)" title="حالة الحضور">
            <option value="">كل الحالات</option>
            <option value="present">حاضر</option>
            <option value="absent">غائب</option>
            <option value="late">متأخر</option>
            <option value="excused">معذور</option>
          </select>
          <div class="search-input-wrapper" style="position:relative;flex:1;min-width:180px;max-width:280px">
            <input type="text" class="form-input search-input" id="att-student-search"
              placeholder="بحث بالاسم أو الهاتف..."
              oninput="AdminAttendance.onStudentSearch(this.value)">
          </div>
        </div>
      </div>

      <div id="attendance-container">
        <div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div>
      </div>
    `;
    await fetchCourses();
    await fetchTeachers();
    await load();
  }

  async function fetchCourses() {
    try {
      const data   = await API.get('/admin/courses');
      courses = data.courses || [];
      const select = document.getElementById('att-course-filter');
      if (!select) return;
      courses.forEach(c => {
        const opt = document.createElement('option');
        opt.value       = c.id;
        opt.textContent = c.name + (c.level ? ` (${c.level})` : '');
        opt.dataset.teacherId = c.teacher_id || '';
        select.appendChild(opt);
      });
    } catch (_) {}
  }

  async function fetchTeachers() {
    try {
      const data = await API.get('/admin/teachers');
      teachers = data.teachers || [];
      const select = document.getElementById('att-teacher-filter');
      if (!select) return;
      teachers.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.full_name + (t.subject ? ` — ${t.subject}` : '');
        select.appendChild(opt);
      });
    } catch (_) {}
  }

  function onMonthChange(val) { currentMonth = val; load(); }
  function onCourseChange(val) { filters.courseId = val; load(); }
  function onTeacherChange(val) { filters.teacherId = val; load(); }
  function onStatusChange(val) { filters.status = val; renderMatrix(currentMonth); }
  const onStudentSearch = (typeof Utils !== 'undefined' && Utils.debounce)
    ? Utils.debounce(function(v) { filters.studentSearch = v; renderMatrix(currentMonth); }, 250)
    : function(v) { filters.studentSearch = v; renderMatrix(currentMonth); };

  async function load() {
    const container = document.getElementById('attendance-container');
    const month     = document.getElementById('att-month-filter')?.value || currentMonth;

    const [year, m] = month.split('-');
    const from = `${month}-01`;
    const lastDay = new Date(parseInt(year, 10), parseInt(m, 10), 0).getDate();
    const to   = `${month}-${String(lastDay).padStart(2, '0')}`;

    const params = new URLSearchParams();
    if (filters.courseId) params.set('course_id', filters.courseId);
    if (filters.teacherId) params.set('teacher_id', filters.teacherId);
    params.set('from', from);
    params.set('to', to);

    try {
      let data;
      try {
        data = await API.get(`/admin/attendance/reports?${params}`);
      } catch (_) {
        data = await API.get(`/admin/attendance?${params}`);
      }
      allRecords = data.attendance || [];

      // Client-side filter by teacher (in case backend ignores teacher_id param)
      if (filters.teacherId) {
        const teacherCourseIds = courses.filter(c => c.teacher_id === filters.teacherId).map(c => c.id);
        allRecords = allRecords.filter(r => teacherCourseIds.includes(r.course_id));
      }

      processMatrix(month);
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">${Icons.warning}</div>
          <div class="title">خطأ: ${err.message}</div>
        </div>`;
    }
  }

  function processMatrix(month) {
    sessionDates = [...new Set(allRecords.map(r => r.session_date))].sort();
    studentsMap  = {};

    allRecords.forEach(r => {
      const sid = r.student_id;
      if (!studentsMap[sid]) {
        studentsMap[sid] = {
          id: sid,
          name:    r.students ? `${r.students.first_name} ${r.students.last_name}` : 'غير معروف',
          phone:   r.students?.phone || '',
          records: {}
        };
      }
      studentsMap[sid].records[r.session_date] = r;
    });

    renderMatrix(month);
  }

  function renderMatrix(month) {
    const container = document.getElementById('attendance-container');
    const [year, m] = (month || currentMonth).split('-');
    const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                        'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const monthLabel = `${monthNames[parseInt(m, 10) - 1]} ${year}`;

    // Apply client-side filters
    const q = (filters.studentSearch || '').toLowerCase();
    const visibleStudents = Object.values(studentsMap).filter(student => {
      if (q && !(student.name.toLowerCase().includes(q) || String(student.phone).toLowerCase().includes(q))) return false;
      if (filters.status) {
        const hasMatch = sessionDates.some(d => student.records[d] && student.records[d].status === filters.status);
        if (!hasMatch) return false;
      }
      return true;
    });

    if (sessionDates.length === 0 || visibleStudents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">${Icons.checkSquare || Icons.attendance}</div>
          <div class="title">لا توجد سجلات حضور تطابق الفلاتر</div>
          <div class="description">جرّب تغيير الفلاتر أو تأكد من تسجيل الحضور للحصص في ${monthLabel}</div>
        </div>`;
      return;
    }

    const sessionCount = sessionDates.length;

    const sessionHeaders = sessionDates.map((date, i) => `
      <th class="session-header" style="text-align:center;min-width:84px" title="${date}">
        <div style="font-size:0.7rem;opacity:0.6;font-weight:400;margin-bottom:2px">حصة</div>
        <div style="font-size:1rem">${i + 1}</div>
        <div style="font-size:0.65rem;opacity:0.5;margin-top:2px">${date.slice(5)}</div>
      </th>
    `).join('');

    let html = `
      <div class="matrix-month-header">
        <span>${monthLabel}</span>
        <span class="matrix-session-badge">${sessionCount} حصص مسجلة — ${visibleStudents.length} تلميذ</span>
      </div>
      <div class="table-container" style="overflow-x:auto;">
        <table class="data-table matrix-table">
          <thead>
            <tr>
              <th style="min-width:180px;position:sticky;right:0;background:var(--bg-card);z-index:2;">اسم التلميذ</th>
              ${sessionHeaders}
              <th style="text-align:center;min-width:80px">النسبة</th>
            </tr>
          </thead>
          <tbody>
    `;

    visibleStudents.forEach((student, idx) => {
      const presentCount = sessionDates.filter(d =>
        student.records[d] && student.records[d].status === 'present'
      ).length;
      const attendPct = sessionCount > 0 ? Math.round((presentCount / sessionCount) * 100) : 0;
      const pctColor  = attendPct >= 75 ? 'var(--success)' : attendPct >= 50 ? 'var(--warning)' : 'var(--danger)';

      html += `
        <tr style="background:${idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-body)'}">
          <td style="font-weight:600;position:sticky;right:0;background:inherit;z-index:1;border-left:1px solid var(--border);">
            ${Utils.escapeHtml ? Utils.escapeHtml(student.name) : student.name}
            ${student.phone ? `<div class="mono" style="font-size:0.75rem;color:var(--text-muted)">${student.phone}</div>` : ''}
          </td>
      `;

      sessionDates.forEach(date => {
        const record = student.records[date];
        let squareHtml = '<div class="matrix-square empty" title="غير مسجل"></div>';

        if (record) {
          const { status, id } = record;
          const dim = (filters.status && status !== filters.status) ? 'opacity:0.25;' : '';
          const onClick = `onclick="AdminAttendance.editRecord('${id}')"`;
          if (status === 'present')
            squareHtml = `<div class="matrix-square present" style="${dim}" title="حاضر" ${onClick}>${Icons.check}</div>`;
          else if (status === 'absent')
            squareHtml = `<div class="matrix-square absent" style="${dim}"  title="غائب" ${onClick}>${Icons.cross}</div>`;
          else if (status === 'late')
            squareHtml = `<div class="matrix-square late" style="${dim}"    title="متأخر" ${onClick}>${Icons.clock}</div>`;
          else if (status === 'excused')
            squareHtml = `<div class="matrix-square excused" style="${dim}" title="معذور" ${onClick}>${Icons.info}</div>`;
        }

        html += `<td style="text-align:center;padding:4px;">${squareHtml}</td>`;
      });

      html += `
        <td style="text-align:center;padding:4px;">
          <div style="font-size:0.8rem;font-weight:700;color:${pctColor}">${attendPct}%</div>
          <div style="font-size:0.7rem;color:var(--text-muted)">${presentCount}/${sessionCount}</div>
        </td>
      `;

      html += '</tr>';
    });

    html += `
          </tbody>
        </table>
      </div>

      <div class="matrix-legend">
        <div class="matrix-legend-item"><div class="matrix-square present" style="width:20px;height:20px;pointer-events:none">${Icons.check}</div> حاضر</div>
        <div class="matrix-legend-item"><div class="matrix-square absent"  style="width:20px;height:20px;pointer-events:none">${Icons.cross}</div> غائب</div>
        <div class="matrix-legend-item"><div class="matrix-square late"    style="width:20px;height:20px;pointer-events:none">${Icons.clock}</div> متأخر</div>
        <div class="matrix-legend-item"><div class="matrix-square excused" style="width:20px;height:20px;pointer-events:none">${Icons.info}</div> معذور</div>
        <div class="matrix-legend-item"><div class="matrix-square empty"   style="width:20px;height:20px;pointer-events:none"></div> غير مسجل</div>
      </div>
    `;

    container.innerHTML = html;
  }

  async function editRecord(id) {
    const record = allRecords.find(r => r.id === id);
    if (!record) return;

    Modal.show({
      title: 'تعديل الحضور',
      body: `
        <div class="form-group">
          <label class="form-label">الحالة</label>
          <select class="form-select" id="edit-att-status">
            <option value="present" ${record.status === 'present' ? 'selected' : ''}>حاضر</option>
            <option value="absent"  ${record.status === 'absent'  ? 'selected' : ''}>غائب</option>
            <option value="late"    ${record.status === 'late'    ? 'selected' : ''}>متأخر</option>
            <option value="excused" ${record.status === 'excused' ? 'selected' : ''}>معذور</option>
          </select>
        </div>
      `,
      confirmText: 'حفظ',
      onConfirm: async () => {
        const status = document.getElementById('edit-att-status').value;
        try {
          await API.patch(`/admin/attendance/${id}`, { status });
          Toast.success('تم تحديث حالة الحضور');
          Modal.close();
          load();
        } catch (err) { Toast.error(err.message); }
      }
    });
  }

  return { render, load, onMonthChange, onCourseChange, onTeacherChange, onStatusChange, onStudentSearch, editRecord };
})();
