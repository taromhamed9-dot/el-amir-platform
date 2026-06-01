const AdminCourses = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20">
        <h2 style="font-size:1.1rem">${Icons.courses} إدارة الدورات</h2>
        <button class="btn btn-accent" onclick="AdminCourses.showAddModal()">${Icons.add} إنشاء دورة</button>
      </div>
      <div class="filters-bar mb-20">
        <input type="text" class="form-input search-input" placeholder="بحث بالاسم..." oninput="AdminCourses.searchCourses(this.value)">
        <select class="form-select" onchange="AdminCourses.filterLevel(this.value)">
          <option value="">كل المستويات</option>
          ${Utils.getLevelOptions().map(l => `<option value="${l}">${l}</option>`).join('')}
        </select>
        <select class="form-select" onchange="AdminCourses.filterStatus(this.value)">
          <option value="">كل الحالات</option>
          <option value="open">مفتوحة</option>
          <option value="full">ممتلئة</option>
          <option value="closed">مغلقة</option>
        </select>
      </div>
      <div id="courses-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    await loadCourses();
  }

  let currentFilters = {};

  async function loadCourses(filters = currentFilters) {
    currentFilters = filters;
    const container = document.getElementById('courses-container');
    try {
      // Strip undefined/empty values BEFORE building the query string —
      // otherwise URLSearchParams serializes `undefined` to the literal
      // string "undefined" and the backend's `eq('level', 'undefined')`
      // matches nothing, which is why "filter then back to all" looked empty.
      const params = new URLSearchParams(Utils.cleanParams(filters));
      const data = await API.get(`/admin/courses?${params}`);
      let courses = data.courses || [];

      // Client-side search (the backend ignores `search` on /admin/courses).
      const q = (filters.search || '').toLowerCase().trim();
      if (q) {
        courses = courses.filter(c =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.subject && c.subject.toLowerCase().includes(q))
        );
      }
      if (courses.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.courses}</div><div class="title">لا توجد دورات</div></div>`;
        return;
      }
      container.innerHTML = `<div class="grid grid-3">${courses.map(courseCard).join('')}</div>`;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  function courseCard(c) {
    const pct = c.capacity > 0 ? Math.round((c.enrolled_count / c.capacity) * 100) : 0;
    const fillColor = pct >= 90 ? 'red' : pct >= 60 ? 'gold' : 'green';
    return `
      <div class="course-card">
        <div class="course-header">
          <div>
            <div class="course-name">${Utils.escapeHtml(c.name)}</div>
            <div style="font-size:0.82rem;color:var(--text-muted)">${c.subject}</div>
          </div>
          ${Utils.getStatusBadge(c.status)}
        </div>
        <div class="course-meta">
          <span>${Icons.graduationCap} ${c.level}</span>
          <span>${Icons.teachers} ${c.teachers ? c.teachers.full_name : '—'}</span>
          <span title="سعر الحصة الواحدة">${Icons.money} ${Utils.formatCurrency(c.session_price || 0)} / حصة</span>
          <span title="السعر الشهري المحسوب تلقائياً" style="color:var(--text-muted)">≈ ${Utils.formatCurrency((c.session_price || 0) * (c.sessions_per_month || 4))} / شهر</span>
        </div>
        <div class="capacity-bar">
          <div class="capacity-text"><span>${c.enrolled_count}/${c.capacity} تلميذ</span><span>${pct}%</span></div>
          <div class="progress-bar"><div class="fill ${fillColor}" style="width:${pct}%"></div></div>
        </div>
        <div class="actions">
          <button class="btn btn-ghost btn-sm" onclick="AdminCourses.viewCourse('${c.id}')">${Icons.view} عرض</button>
          <button class="btn btn-ghost btn-sm" onclick="AdminCourses.editCourse('${c.id}')">${Icons.edit} تعديل</button>
          <button class="btn btn-ghost btn-sm" onclick="AdminCourses.deleteCourse('${c.id}')" style="color:var(--danger)">${Icons.remove}</button>
        </div>
      </div>
    `;
  }

  function filterLevel(v) { currentFilters.level = v || undefined; loadCourses(); }
  function filterStatus(v) { currentFilters.status = v || undefined; loadCourses(); }
  const searchCourses = Utils.debounce((v) => { currentFilters.search = v || undefined; loadCourses(); }, 300);

  async function showAddModal() {
    let teachers = [];
    try { const d = await API.get('/admin/teachers'); teachers = d.teachers || []; } catch (_) {}
    const content = `
      <form onsubmit="AdminCourses.submitAdd(event)">
        <div class="form-row">
          <div class="form-group"><label class="form-label">اسم الدورة *</label><input type="text" class="form-input" name="name" required></div>
          <div class="form-group"><label class="form-label">المادة *</label><input type="text" class="form-input" name="subject" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">المستوى *</label><select class="form-select" name="level" required><option value="">اختر</option>${Utils.getLevelOptions().map(l => `<option value="${l}">${l}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">الطاقة *</label><input type="number" class="form-input" name="capacity" required min="1" value="20"></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">سعر الحصة (دج) *</label>
            <input type="number" class="form-input" name="session_price" required min="0" step="50" placeholder="مثلاً 500" oninput="AdminCourses._recalcMonthly()">
          </div>
          <div class="form-group">
            <label class="form-label">عدد الحصص في الشهر *</label>
            <input type="number" class="form-input" name="sessions_per_month" required min="1" max="20" value="4" oninput="AdminCourses._recalcMonthly()">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">السعر الشهري المحسوب</label>
            <input type="text" class="form-input" id="course-monthly-preview" disabled value="— دج" style="background:rgba(124,58,237,0.1);font-weight:700">
            <small style="color:var(--text-muted)">= سعر الحصة × عدد الحصص</small>
          </div>
          <div class="form-group"><label class="form-label">الأستاذ</label><select class="form-select" name="teacher_id"><option value="">بدون</option>${teachers.map(t => `<option value="${t.id}">${t.full_name}</option>`).join('')}</select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">تاريخ البداية</label><input type="date" class="form-input" name="start_date"></div>
          <div class="form-group"><label class="form-label">تاريخ النهاية</label><input type="date" class="form-input" name="end_date"></div>
        </div>
        <div class="form-group"><label class="form-label">الوصف</label><textarea class="form-textarea" name="description" rows="2"></textarea></div>
        <button type="submit" class="btn btn-accent" style="width:100%">إنشاء الدورة</button>
      </form>
    `;
    Modal.open({ title: 'إنشاء دورة جديدة', content, size: 'lg' });
  }

  async function submitAdd(e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    body.session_price = Number(body.session_price);
    body.sessions_per_month = Number(body.sessions_per_month);
    // Server recomputes `price` from session_price × sessions_per_month,
    // but send it anyway so old code paths see a sensible value.
    body.price = body.session_price * body.sessions_per_month;
    body.capacity = Number(body.capacity);
    if (!body.teacher_id) delete body.teacher_id;
    if (!body.start_date) delete body.start_date;
    if (!body.end_date) delete body.end_date;
    try { await API.post('/admin/courses', body); Modal.close(); Toast.success('تم إنشاء الدورة'); loadCourses(); }
    catch (err) { Toast.error(err.message); }
  }

  // Live update the read-only monthly preview field whenever
  // session_price or sessions_per_month changes.
  function _recalcMonthly() {
    const sp = parseFloat(document.querySelector('[name=session_price]')?.value) || 0;
    const spm = parseInt(document.querySelector('[name=sessions_per_month]')?.value, 10) || 0;
    const out = document.getElementById('course-monthly-preview');
    if (out) out.value = `${(sp * spm).toLocaleString('ar-DZ')} دج`;
  }

  async function viewCourse(id) {
    try {
      const data = await API.get(`/admin/courses/${id}`);
      const c = data.course;
      const content = `
        <div style="font-size:0.88rem;line-height:2;margin-bottom:16px">
          <div><strong>المادة:</strong> ${c.subject}</div>
          <div><strong>المستوى:</strong> ${c.level}</div>
          <div><strong>السعر:</strong> ${Utils.formatCurrency(c.price)}</div>
          <div><strong>المقاعد:</strong> ${c.enrolled_count}/${c.capacity}</div>
          <div><strong>الأستاذ:</strong> ${data.teacher ? data.teacher.full_name : '—'}</div>
        </div>
        <h4 style="margin-bottom:8px">الجدول</h4>
        ${data.sessions.length > 0 ? data.sessions.map(s => `<span class="badge badge-info" style="margin:2px">${Utils.getArabicDay(s.day_of_week)} ${Utils.formatTime(s.start_time)}-${Utils.formatTime(s.end_time)} ${s.room ? '('+s.room+')' : ''}</span>`).join('') : '<p style="color:var(--text-muted)">لا توجد حصص</p>'}
        <h4 style="margin-top:16px;margin-bottom:8px">التلاميذ (${data.students.length})</h4>
        ${data.students.length > 0 ? data.students.map(s => `<div style="padding:4px 0;font-size:0.85rem">${s.first_name} ${s.last_name}</div>`).join('') : '<p style="color:var(--text-muted)">لا يوجد تلاميذ</p>'}
        <h4 style="margin-top:16px;margin-bottom:8px">إضافة حصة</h4>
        <form onsubmit="AdminCourses.addSession(event, '${id}')" style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end">
          <select class="form-select" name="day_of_week" required style="width:auto">${Utils.getDayOptions().map(d => `<option value="${d.value}">${d.label}</option>`).join('')}</select>
          <input type="time" class="form-input" name="start_time" required style="width:auto">
          <input type="time" class="form-input" name="end_time" required style="width:auto">
          <input type="text" class="form-input" name="room" placeholder="القاعة" style="width:100px">
          <button type="submit" class="btn btn-primary btn-sm">إضافة</button>
        </form>
      `;
      Modal.open({ title: c.name, content, size: 'lg' });
    } catch (err) { Toast.error(err.message); }
  }

  async function addSession(e, courseId) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      await API.post(`/admin/courses/${courseId}/sessions`, body);
      Toast.success('تم إضافة الحصة');
      Modal.close();
      viewCourse(courseId);
    } catch (err) { Toast.error(err.message); }
  }

  async function editCourse(id) {
    try {
      const data = await API.get(`/admin/courses/${id}`);
      const c = data.course;
      let teachers = [];
      try { const d = await API.get('/admin/teachers'); teachers = d.teachers || []; } catch (_) {}
      const content = `
        <form onsubmit="AdminCourses.submitEdit(event, '${id}')">
          <div class="form-row">
            <div class="form-group"><label class="form-label">اسم الدورة</label><input type="text" class="form-input" name="name" value="${c.name}" required></div>
            <div class="form-group"><label class="form-label">المادة</label><input type="text" class="form-input" name="subject" value="${c.subject}" required></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">سعر الحصة (دج)</label>
              <input type="number" class="form-input" name="session_price" value="${c.session_price || 0}" min="0" step="50" required oninput="AdminCourses._recalcMonthlyEdit()">
            </div>
            <div class="form-group">
              <label class="form-label">عدد الحصص في الشهر</label>
              <input type="number" class="form-input" name="sessions_per_month" value="${c.sessions_per_month || 4}" min="1" max="20" required oninput="AdminCourses._recalcMonthlyEdit()">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">السعر الشهري المحسوب</label>
              <input type="text" class="form-input" id="course-monthly-preview-edit" disabled value="${((c.session_price || 0) * (c.sessions_per_month || 4)).toLocaleString('ar-DZ')} دج" style="background:rgba(124,58,237,0.1);font-weight:700">
            </div>
            <div class="form-group"><label class="form-label">الطاقة</label><input type="number" class="form-input" name="capacity" value="${c.capacity}" required></div>
          </div>
          <div class="form-group"><label class="form-label">الأستاذ</label><select class="form-select" name="teacher_id"><option value="">بدون</option>${teachers.map(t => `<option value="${t.id}" ${c.teacher_id === t.id ? 'selected' : ''}>${t.full_name}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">الحالة</label><select class="form-select" name="status"><option value="open" ${c.status==='open'?'selected':''}>مفتوحة</option><option value="full" ${c.status==='full'?'selected':''}>ممتلئة</option><option value="closed" ${c.status==='closed'?'selected':''}>مغلقة</option></select></div>
          <button type="submit" class="btn btn-primary" style="width:100%">حفظ</button>
        </form>
      `;
      Modal.open({ title: `تعديل ${c.name}`, content, size: 'md' });
    } catch (err) { Toast.error(err.message); }
  }

  async function submitEdit(e, id) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    body.session_price = Number(body.session_price);
    body.sessions_per_month = Number(body.sessions_per_month);
    body.price = body.session_price * body.sessions_per_month;
    body.capacity = Number(body.capacity);
    if (!body.teacher_id) body.teacher_id = null;
    try { await API.put(`/admin/courses/${id}`, body); Modal.close(); Toast.success('تم التحديث'); loadCourses(); }
    catch (err) { Toast.error(err.message); }
  }

  function _recalcMonthlyEdit() {
    const sp = parseFloat(document.querySelector('[name=session_price]')?.value) || 0;
    const spm = parseInt(document.querySelector('[name=sessions_per_month]')?.value, 10) || 0;
    const out = document.getElementById('course-monthly-preview-edit');
    if (out) out.value = `${(sp * spm).toLocaleString('ar-DZ')} دج`;
  }

  async function deleteCourse(id) {
    const ok = await Modal.confirm({ title: 'حذف الدورة', message: 'هل أنت متأكد؟', confirmText: 'حذف' });
    if (!ok) return;
    try { await API.delete(`/admin/courses/${id}`); Toast.success('تم حذف الدورة'); loadCourses(); }
    catch (err) { Toast.error(err.message); }
  }

  return {
    render, showAddModal, submitAdd, viewCourse, addSession, editCourse, submitEdit,
    deleteCourse, filterLevel, filterStatus, searchCourses,
    _recalcMonthly, _recalcMonthlyEdit
  };
})();
