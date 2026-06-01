const AdminStudents = (() => {
  let currentPage = 1;
  let filters = {};

  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20">
        <h2 style="font-size:1.1rem">${Icons.students} قائمة التلاميذ</h2>
        <button class="btn btn-accent" onclick="AdminStudents.showAddModal()">${Icons.add} إضافة تلميذ</button>
      </div>
      <div class="filters-bar">
        <input type="text" class="form-input search-input" placeholder="بحث بالاسم أو الهاتف..." oninput="AdminStudents.onSearch(this.value)">
        <select class="form-select" onchange="AdminStudents.filterLevel(this.value)">
          <option value="">كل المستويات</option>
          ${Utils.getLevelOptions().map(l => `<option value="${l}">${l}</option>`).join('')}
        </select>
        <select class="form-select" id="st-course-filter" onchange="AdminStudents.filterCourse(this.value)">
          <option value="">كل الدورات</option>
        </select>
        <select class="form-select" id="st-teacher-filter" onchange="AdminStudents.filterTeacher(this.value)">
          <option value="">كل الأساتذة</option>
        </select>
        <div style="margin-right:auto;display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="AdminStudents.exportExcel()">${Icons.excel} Excel</button>
          <button class="btn btn-outline btn-sm" onclick="AdminStudents.exportPDF()">${Icons.pdf} PDF</button>
        </div>
      </div>
      <div id="students-table-container">
        <div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div>
      </div>
    `;
    await populateLookups();
    await loadStudents();
  }

  async function populateLookups() {
    try {
      const [cd, td] = await Promise.all([API.get('/admin/courses'), API.get('/admin/teachers')]);
      const cSel = document.getElementById('st-course-filter');
      const tSel = document.getElementById('st-teacher-filter');
      if (cSel && cd.courses) cSel.insertAdjacentHTML('beforeend', cd.courses.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)}</option>`).join(''));
      if (tSel && td.teachers) tSel.insertAdjacentHTML('beforeend', td.teachers.map(t => `<option value="${t.id}">${Utils.escapeHtml(t.full_name)}</option>`).join(''));
    } catch (_) {}
  }

  async function loadStudents() {
    const container = document.getElementById('students-table-container');
    try {
      const params = new URLSearchParams(Utils.cleanParams({ page: currentPage, limit: 20, ...filters }));
      const data = await API.get(`/admin/students?${params}`);
      const students = data.students || [];

      if (students.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.students}</div><div class="title">لا يوجد تلاميذ</div></div>`;
        return;
      }

      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>الاسم الكامل</th>
                <th>الهاتف</th>
                <th>المستوى</th>
                <th>الدورة</th>
                <th>الأستاذ</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => `
                <tr>
                  <td style="font-weight:600">${Utils.escapeHtml(s.first_name)} ${Utils.escapeHtml(s.last_name)}</td>
                  <td class="mono">${s.phone || ''}</td>
                  <td><span class="badge badge-info">${s.level}</span></td>
                  <td>${s.courses ? s.courses.name : '—'}</td>
                  <td>${s.teachers ? s.teachers.full_name : '—'}</td>
                  <td>
                    <div style="display:flex;gap:4px">
                      <button class="btn btn-ghost btn-sm" onclick="AdminStudents.viewStudent('${s.id}')" title="عرض">${Icons.view}</button>
                      <button class="btn btn-ghost btn-sm" onclick="AdminStudents.editStudent('${s.id}')" title="تعديل">${Icons.edit}</button>
                      <button class="btn btn-ghost btn-sm" onclick="AdminStudents.transferStudent('${s.id}')" title="تحويل الدورة" style="color:var(--info)">🔄</button>
                      <button class="btn btn-ghost btn-sm" onclick="AdminStudents.deleteStudent('${s.id}')" title="حذف" style="color:var(--danger)">${Icons.remove}</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${Utils.generatePagination(data.page, data.pages)}
      `;

      container.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = parseInt(btn.dataset.page);
          loadStudents();
        });
      });
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  const onSearch = Utils.debounce((value) => {
    filters.search = value || undefined;
    currentPage = 1;
    loadStudents();
  });

  function filterLevel(value) { filters.level = value || undefined; currentPage = 1; loadStudents(); }
  function filterStatus(value) { filters.status = value || undefined; currentPage = 1; loadStudents(); }
  function filterCourse(value) { filters.course_id = value || undefined; currentPage = 1; loadStudents(); }
  function filterTeacher(value) { filters.teacher_id = value || undefined; currentPage = 1; loadStudents(); }

  async function showAddModal() {
    let courses = [];
    try { const d = await API.get('/admin/courses'); courses = d.courses || []; } catch (_) {}

    const content = `
      <form id="add-student-form" onsubmit="AdminStudents.submitAddStudent(event)">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">الاسم الأول *</label>
            <input type="text" class="form-input" name="first_name" required>
          </div>
          <div class="form-group">
            <label class="form-label">اللقب *</label>
            <input type="text" class="form-input" name="last_name" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">رقم الهاتف *</label>
            <input type="tel" class="form-input" name="phone" required>
          </div>
          <div class="form-group">
            <label class="form-label">هاتف ولي الأمر</label>
            <input type="tel" class="form-input" name="parent_phone">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">البريد الإلكتروني</label>
            <input type="email" class="form-input" name="email">
          </div>
          <div class="form-group">
            <label class="form-label">المستوى الدراسي *</label>
            <select class="form-select" name="level" required>
              <option value="">اختر المستوى</option>
              ${Utils.getLevelOptions().map(l => `<option value="${l}">${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">الدورة</label>
            <select class="form-select" name="course_id">
              <option value="">بدون دورة</option>
              ${courses.map(c => `<option value="${c.id}">${c.name} (${c.level}) — ${c.enrolled_count}/${c.capacity}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">طريقة الدفع *</label>
            <select class="form-select" name="payment_model" required>
              <option value="per_session">حصة / حصة</option>
              <option value="monthly">شهري (دفعة واحدة للشهر)</option>
            </select>
            <small style="color:var(--text-muted)">طريقة الدفع تتحكم في عدد الأعمدة التي تظهر في صفحة الدفع</small>
          </div>
        </div>
        <button type="submit" class="btn btn-accent" style="width:100%;margin-top:8px">تسجيل التلميذ</button>
      </form>
    `;
    Modal.open({ title: 'إضافة تلميذ جديد', content, size: 'lg' });
  }

  async function submitAddStudent(e) {
    e.preventDefault();
    const form = e.target;
    const body = Object.fromEntries(new FormData(form));
    if (!body.course_id) delete body.course_id;

    try {
      const data = await API.post('/admin/students', body);
      Modal.close();
      Toast.success(`تم تسجيل ${body.first_name} بنجاح — username: ${data.credentials.username}`);
      loadStudents();
    } catch (err) {
      Toast.error(err.message);
    }
  }

  async function viewStudent(id) {
    try {
      const data = await API.get(`/admin/students/${id}`);
      const s = data.student;
      const att = data.attendance_summary;

      const content = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div>
            <h4 style="margin-bottom:12px;color:var(--accent)">البيانات الشخصية</h4>
            <div style="font-size:0.88rem;line-height:2">
              <div><strong>الاسم:</strong> ${s.first_name} ${s.last_name}</div>
              <div><strong>الهاتف:</strong> ${s.phone}</div>
              <div><strong>ولي الأمر:</strong> ${s.parent_phone || '—'}</div>
              <div><strong>البريد:</strong> ${s.email || '—'}</div>
              <div><strong>المستوى:</strong> ${s.level}</div>
              <div><strong>الحالة:</strong> ${Utils.getStatusBadge(s.status)}</div>
              <div><strong>تاريخ التسجيل:</strong> ${Utils.formatDate(s.enrollment_date)}</div>
            </div>
          </div>
          <div>
            <h4 style="margin-bottom:12px;color:var(--accent)">الحضور</h4>
            <div style="font-size:0.88rem;line-height:2">
              <div><strong>المجموع:</strong> ${att.total} حصة</div>
              <div><strong>حاضر:</strong> <span style="color:var(--success)">${att.present}</span></div>
              <div><strong>غائب:</strong> <span style="color:var(--danger)">${att.absent}</span></div>
              <div><strong>متأخر:</strong> <span style="color:var(--warning)">${att.late}</span></div>
              <div><strong>النسبة:</strong> ${att.rate}%</div>
            </div>
            <div class="progress-bar mt-12"><div class="fill green" style="width:${att.rate}%"></div></div>
          </div>
        </div>
        <h4 style="margin-top:20px;margin-bottom:12px;color:var(--accent)">الدفعات</h4>
        ${data.payments.length > 0 ? `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>الشهر</th><th>المبلغ</th><th>الحالة</th></tr></thead>
              <tbody>
                ${data.payments.map(p => `<tr><td class="mono">${p.month}</td><td class="mono">${Utils.formatCurrency(p.amount)}</td><td>${Utils.getStatusBadge(p.status)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color:var(--text-muted)">لا توجد دفعات</p>'}
        <h4 style="margin-top:20px;margin-bottom:12px;color:var(--accent)">سجل التحويلات</h4>
        ${data.transfer_history && data.transfer_history.length > 0 ? `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>التاريخ</th><th>التفاصيل</th></tr></thead>
              <tbody>
                ${data.transfer_history.map(t => `<tr><td class="mono">${Utils.formatDate(t.timestamp)}</td><td>تحويل من الدورة ${t.details?.old_course || '—'} إلى ${t.details?.new_course || '—'}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p style="color:var(--text-muted)">لا يوجد سجل تحويلات</p>'}
      `;
      Modal.open({ title: `${s.first_name} ${s.last_name}`, content, size: 'lg' });
    } catch (err) {
      Toast.error(err.message);
    }
  }

  async function editStudent(id) {
    try {
      const data = await API.get(`/admin/students/${id}`);
      const s = data.student;
      let courses = [];
      try { const d = await API.get('/admin/courses'); courses = d.courses || []; } catch (_) {}

      const content = `
        <form id="edit-student-form" onsubmit="AdminStudents.submitEditStudent(event, '${id}')">
          <div class="form-row">
            <div class="form-group"><label class="form-label">الاسم الأول</label><input type="text" class="form-input" name="first_name" value="${s.first_name}" required></div>
            <div class="form-group"><label class="form-label">اللقب</label><input type="text" class="form-input" name="last_name" value="${s.last_name}" required></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">الهاتف</label><input type="tel" class="form-input" name="phone" value="${s.phone}"></div>
            <div class="form-group"><label class="form-label">هاتف ولي الأمر</label><input type="tel" class="form-input" name="parent_phone" value="${s.parent_phone || ''}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">البريد</label><input type="email" class="form-input" name="email" value="${s.email || ''}"></div>
            <div class="form-group">
              <label class="form-label">المستوى</label>
              <select class="form-select" name="level">${Utils.getLevelOptions().map(l => `<option value="${l}" ${s.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">الدورة</label>
              <select class="form-select" name="course_id">
                <option value="">بدون دورة</option>
                ${courses.map(c => `<option value="${c.id}" ${s.course_id === c.id ? 'selected' : ''}>${c.name} (${c.level})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">طريقة الدفع</label>
              <select class="form-select" name="payment_model">
                <option value="per_session" ${s.payment_model === 'per_session' ? 'selected' : ''}>حصة / حصة</option>
                <option value="monthly" ${s.payment_model === 'monthly' ? 'selected' : ''}>شهري</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">حفظ التعديلات</button>
        </form>
      `;
      Modal.open({ title: `تعديل ${s.first_name} ${s.last_name}`, content, size: 'lg' });
    } catch (err) {
      Toast.error(err.message);
    }
  }

  async function submitEditStudent(e, id) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    if (!body.course_id) delete body.course_id;
    try {
      await API.put(`/admin/students/${id}`, body);
      Modal.close();
      Toast.success('تم تحديث بيانات التلميذ');
      loadStudents();
    } catch (err) { Toast.error(err.message); }
  }

  async function transferStudent(id) {
    try {
      const data = await API.get(`/admin/students/${id}`);
      const s = data.student;
      let courses = [];
      try { const d = await API.get('/admin/courses'); courses = d.courses || []; } catch (_) {}

      const content = `
        <form onsubmit="AdminStudents.submitTransferStudent(event, '${id}')">
          <div style="margin-bottom:15px">
            <p><strong>التلميذ:</strong> ${s.first_name} ${s.last_name}</p>
            <p><strong>الدورة الحالية:</strong> ${s.courses ? s.courses.name : 'لا يوجد'}</p>
          </div>
          <div class="form-group">
            <label class="form-label">الدورة الجديدة *</label>
            <select class="form-select" name="new_course_id" required>
              <option value="">اختر الدورة الجديدة...</option>
              ${courses.map(c => `<option value="${c.id}" ${s.course_id === c.id ? 'disabled' : ''}>${c.name} (${c.level}) — ${c.enrolled_count}/${c.capacity}</option>`).join('')}
            </select>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">إجراء التحويل</button>
        </form>
      `;
      Modal.open({ title: 'تحويل تلميذ لدورة أخرى', content, size: 'md' });
    } catch (err) {
      Toast.error(err.message);
    }
  }

  async function submitTransferStudent(e, id) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      await API.patch(`/admin/students/${id}/course`, body);
      Modal.close();
      Toast.success('تم تحويل التلميذ بنجاح');
      loadStudents();
    } catch (err) { Toast.error(err.message); }
  }

  async function deleteStudent(id) {
    const confirmed = await Modal.confirm({
      title: 'حذف التلميذ',
      message: 'هل أنت متأكد من حذف هذا التلميذ؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await API.delete(`/admin/students/${id}`, { reason: 'حذف من قبل المدير' });
      Toast.success('تم حذف التلميذ');
      loadStudents();
    } catch (err) { Toast.error(err.message); }
  }

  // Fetch every page that matches the current filters so exports mirror what's
  // visible in the table (filters applied, paginator collapsed into one set).
  async function fetchAllFiltered() {
    const params = new URLSearchParams(Utils.cleanParams({ limit: 1000, ...filters }));
    const data = await API.get(`/admin/students?${params}`);
    return data.students || [];
  }

  // Columns mirror the table 1:1 (minus the actions column).
  const EXPORT_COLUMNS = [
    { header: 'الاسم الكامل', key: 'name' },
    { header: 'الهاتف',       key: 'phone' },
    { header: 'المستوى',      key: 'level' },
    { header: 'الدورة',       key: 'course' },
    { header: 'الأستاذ',      key: 'teacher' }
  ];

  function toExportRow(s) {
    return {
      name:    `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      phone:   s.phone || '',
      level:   s.level || '',
      course:  s.courses  ? s.courses.name      : '',
      teacher: s.teachers ? s.teachers.full_name : ''
    };
  }

  async function exportExcel() {
    try {
      const students = await fetchAllFiltered();
      if (students.length === 0) { Toast.warning('لا توجد بيانات للتصدير'); return; }
      const rows = students.map(s => {
        const r = toExportRow(s);
        return EXPORT_COLUMNS.reduce((o, c) => { o[c.header] = r[c.key]; return o; }, {});
      });
      await Export.toExcel(rows, `students-${new Date().toISOString().slice(0,10)}`);
    } catch (err) { Toast.error(err.message); }
  }

  async function exportPDF() {
    try {
      const students = await fetchAllFiltered();
      if (students.length === 0) { Toast.warning('لا توجد بيانات للتصدير'); return; }
      const rows = students.map(toExportRow);
      await Export.toPDF(rows, EXPORT_COLUMNS, 'قائمة التلاميذ', `students-${new Date().toISOString().slice(0,10)}`);
    } catch (err) { Toast.error(err.message); }
  }

  return { render, showAddModal, submitAddStudent, viewStudent, editStudent, submitEditStudent, transferStudent, submitTransferStudent, deleteStudent, onSearch, filterLevel, filterStatus, filterCourse, filterTeacher, exportExcel, exportPDF };
})();
