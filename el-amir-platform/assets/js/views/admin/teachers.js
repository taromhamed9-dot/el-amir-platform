const AdminTeachers = (() => {
  let allTeachers = [];
  let filters = {};

  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20">
        <h2 style="font-size:1.1rem">${Icons.teachers} قائمة الأساتذة</h2>
        <button class="btn btn-accent" onclick="AdminTeachers.showAddModal()">${Icons.add} إضافة أستاذ</button>
      </div>
      <div class="filters-bar mb-20">
        <input type="text" class="form-input search-input" placeholder="بحث بالاسم أو المادة..." oninput="AdminTeachers.onSearch(this.value)">
      </div>
      <div id="teachers-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    await loadTeachers();
  }

  const onSearch = Utils.debounce((value) => {
    filters.search = value || undefined;
    applyFilters();
  });

  function filterStatus(value) {
    filters.status = value || undefined;
    applyFilters();
  }

  function applyFilters() {
    let filtered = [...allTeachers];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(t => t.full_name.toLowerCase().includes(q) || (t.subject && t.subject.toLowerCase().includes(q)));
    }
    if (filters.status) {
      filtered = filtered.filter(t => filters.status === 'active' ? t.is_active : !t.is_active);
    }
    renderTable(filtered);
  }

  async function loadTeachers() {
    const container = document.getElementById('teachers-container');
    try {
      const data = await API.get('/admin/teachers');
      allTeachers = data.teachers || [];
      renderTable(allTeachers);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  function renderTable(teachers) {
    const container = document.getElementById('teachers-container');
    if (teachers.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.teachers}</div><div class="title">لا يوجد أساتذة</div></div>`;
      return;
    }
    container.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>الاسم</th><th>المادة</th><th>الهاتف</th><th>البريد</th><th>الإجراءات</th></tr></thead>
          <tbody>
            ${teachers.map(t => `
              <tr>
                <td style="font-weight:600">${Utils.escapeHtml(t.full_name)}</td>
                <td>${t.subject || '—'}</td>
                <td class="mono">${t.phone || '—'}</td>
                <td>${t.email}</td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm" onclick="AdminTeachers.viewTeacher('${t.id}')" title="عرض">${Icons.view}</button>
                    <button class="btn btn-ghost btn-sm" onclick="AdminTeachers.editTeacher('${t.id}')" title="تعديل">${Icons.edit}</button>
                    <button class="btn btn-ghost btn-sm" onclick="AdminTeachers.impersonate('${t.id}')" title="دخول كأستاذ" style="color:var(--warning)">${Icons.impersonate}</button>
                    <button class="btn btn-ghost btn-sm" onclick="AdminTeachers.deleteTeacher('${t.id}')" title="حذف" style="color:var(--danger)">${Icons.remove}</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function showAddModal() {
    const content = `
      <form id="add-teacher-form" onsubmit="AdminTeachers.submitAdd(event)">
        <div class="form-row">
          <div class="form-group"><label class="form-label">الاسم الكامل *</label><input type="text" class="form-input" name="full_name" required></div>
          <div class="form-group"><label class="form-label">المادة</label><input type="text" class="form-input" name="subject"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">البريد *</label><input type="email" class="form-input" name="email" required></div>
          <div class="form-group"><label class="form-label">الهاتف</label><input type="tel" class="form-input" name="phone"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">اسم المستخدم *</label><input type="text" class="form-input" name="username" required></div>
          <div class="form-group"><label class="form-label">كلمة المرور *</label><input type="password" class="form-input" name="password" required minlength="6"></div>
        </div>
        <div class="form-group"><label class="form-label">ملاحظات</label><textarea class="form-textarea" name="notes" rows="2"></textarea></div>
        <button type="submit" class="btn btn-accent" style="width:100%">إضافة الأستاذ</button>
      </form>
    `;
    Modal.open({ title: 'إضافة أستاذ جديد', content, size: 'lg' });
  }

  async function submitAdd(e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      await API.post('/admin/teachers', body);
      Modal.close();
      Toast.success('تم إضافة الأستاذ بنجاح');
      loadTeachers();
    } catch (err) { Toast.error(err.message); }
  }

  async function viewTeacher(id) {
    try {
      const data = await API.get(`/admin/teachers/${id}`);
      const t = data.teacher;
      const content = `
        <div style="font-size:0.88rem;line-height:2">
          <div><strong>الاسم:</strong> ${t.full_name}</div>
          <div><strong>المادة:</strong> ${t.subject || '—'}</div>
          <div><strong>البريد:</strong> ${t.email}</div>
          <div><strong>الهاتف:</strong> ${t.phone || '—'}</div>
          <div><strong>عدد الدورات:</strong> ${data.courses.length}</div>
          ${data.courses.length > 0 ? `
            <h4 style="margin-top:12px">الدورات:</h4>
            <ul style="list-style:none;padding:0">${data.courses.map(c => `<li style="padding:4px 0;border-bottom:1px solid var(--border)">${c.name} (${c.level}) - ${c.enrolled_count}/${c.capacity} تلميذ</li>`).join('')}</ul>
          ` : ''}
        </div>
      `;
      Modal.open({ title: `${Icons.view} بيانات الأستاذ`, content, size: 'md' });
    } catch (err) { Toast.error(err.message); }
  }

  async function editTeacher(id) {
    try {
      const data = await API.get(`/admin/teachers/${id}`);
      const t = data.teacher;
      const content = `
        <form onsubmit="AdminTeachers.submitEdit(event,'${id}')">
          <div class="form-row">
            <div class="form-group"><label class="form-label">الاسم الكامل *</label><input type="text" class="form-input" name="full_name" value="${t.full_name}" required></div>
            <div class="form-group"><label class="form-label">المادة</label><input type="text" class="form-input" name="subject" value="${t.subject || ''}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">البريد *</label><input type="email" class="form-input" name="email" value="${t.email}" required></div>
            <div class="form-group"><label class="form-label">الهاتف</label><input type="tel" class="form-input" name="phone" value="${t.phone || ''}"></div>
          </div>
          <div class="form-group">
            <label class="form-label">الحالة</label>
            <select class="form-select" name="is_active">
              <option value="true" ${t.is_active ? 'selected' : ''}>نشط</option>
              <option value="false" ${!t.is_active ? 'selected' : ''}>معطّل</option>
            </select>
          </div>
          <button type="submit" class="btn btn-accent" style="width:100%">حفظ التعديلات</button>
        </form>
      `;
      Modal.open({ title: 'تعديل بيانات الأستاذ', content, size: 'md' });
    } catch (err) { Toast.error(err.message); }
  }

  async function submitEdit(e, id) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    body.is_active = body.is_active === 'true';
    try { await API.patch(`/admin/teachers/${id}`, body); Modal.close(); Toast.success('تم التعديل'); loadTeachers(); }
    catch (err) { Toast.error(err.message); }
  }

  async function impersonate(id) {
    try {
      await Auth.impersonateTeacher(id);
      window.location.hash = '#/teacher/dashboard';
      window.location.reload();
    } catch (err) { Toast.error(err.message); }
  }

  async function deleteTeacher(id) {
    const ok = await Modal.confirm({ title: 'حذف الأستاذ', message: 'هل أنت متأكد من حذف هذا الأستاذ؟', confirmText: 'حذف' });
    if (!ok) return;
    try { await API.delete(`/admin/teachers/${id}`); Toast.success('تم الحذف'); loadTeachers(); }
    catch (err) { Toast.error(err.message); }
  }

  return { render, onSearch, filterStatus, showAddModal, submitAdd, viewTeacher, editTeacher, submitEdit, impersonate, deleteTeacher };
})();
