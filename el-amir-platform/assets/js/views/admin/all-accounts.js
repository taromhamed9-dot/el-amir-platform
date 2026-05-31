const AdminAllAccounts = (() => {
  let allUsers = [];
  let currentFilters = { role: '', search: '', course: '', level: '' };
  let courses = [];

  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20 payments-header">
        <h2 style="font-size:1.1rem">${Icons.idCard} الحسابات (الأساتذة والتلاميذ)</h2>
      </div>

      <div class="card mb-20">
        <div class="filters-bar payments-filters">
          <select class="form-select" onchange="AdminAllAccounts.filterRole(this.value)">
            <option value="">كل الأدوار</option>
            <option value="teacher">أستاذ</option>
            <option value="student">تلميذ</option>
          </select>
          <select class="form-select" id="all-accounts-course-filter" onchange="AdminAllAccounts.filterCourse(this.value)">
            <option value="">كل الدورات</option>
          </select>
          <select class="form-select" onchange="AdminAllAccounts.filterLevel(this.value)">
            <option value="">كل المستويات</option>
            ${(Utils.getLevelOptions ? Utils.getLevelOptions() : ['1AM','2AM','3AM','4AM','1AS','2AS','3AS']).map(l => `<option value="${l}">${l}</option>`).join('')}
          </select>
          <div class="search-input-wrapper" style="position:relative;flex:1;min-width:180px;max-width:300px">
            <input type="text" class="form-input search-input" placeholder="بحث بالاسم أو المستخدم أو الهاتف..." oninput="AdminAllAccounts.searchUsers(this.value)">
          </div>
        </div>
      </div>

      <div id="all-accounts-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    await loadCourses();
    await loadUsers();
  }

  async function loadCourses() {
    try {
      const d = await API.get('/admin/courses');
      courses = d.courses || [];
      const sel = document.getElementById('all-accounts-course-filter');
      if (sel) {
        sel.insertAdjacentHTML('beforeend', courses.map(c => `<option value="${c.id}">${c.name}</option>`).join(''));
      }
    } catch (_) {}
  }

  async function loadUsers() {
    const container = document.getElementById('all-accounts-container');
    try {
      const data = await API.get('/admin/users');
      // Show only teachers and students on this page
      allUsers = (data.users || []).filter(u => u.role_type === 'teacher' || u.role_type === 'student');
      renderTable();
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.warning}</div><div class="title">خطأ في تحميل البيانات</div><div class="description">${err.message}</div></div>`;
    }
  }

  function renderTable() {
    const container = document.getElementById('all-accounts-container');
    let filtered = allUsers;

    if (currentFilters.role) {
      filtered = filtered.filter(u => u.role_type === currentFilters.role);
    }

    if (currentFilters.level) {
      filtered = filtered.filter(u => u.role_type === 'student' && u.level === currentFilters.level);
    }

    if (currentFilters.course) {
      filtered = filtered.filter(u => u.course_id === currentFilters.course);
    }

    if (currentFilters.search) {
      const q = currentFilters.search.toLowerCase();
      filtered = filtered.filter(u =>
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && String(u.phone).toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.idCard}</div><div class="title">لا توجد حسابات تطابق البحث</div></div>`;
      return;
    }

    let html = `
      <div class="table-container" style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="min-width:140px">المستخدم</th>
              <th style="min-width:200px">الاسم الكامل</th>
              <th>الهاتف / البريد</th>
              <th>كلمة المرور</th>
              <th>الدور</th>
              <th>التفاصيل</th>
              <th style="text-align:left">إجراءات</th>
            </tr>
          </thead>
          <tbody>
    `;

    filtered.forEach((u, i) => {
      const roleAr = u.role_type === 'teacher' ? 'أستاذ' : 'تلميذ';
      const roleClass = u.role_type === 'teacher' ? 'badge-primary' : 'badge-outline';
      const safeRaw = (u.raw_password || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

      html += `
        <tr style="background: ${i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-body)'}">
          <td class="mono" style="font-size:0.85rem">${Utils.escapeHtml(u.username || '')}</td>
          <td style="font-weight:600">${Utils.escapeHtml(u.full_name || '')}
            ${u.email ? `<div style="font-size:0.75rem;color:var(--text-muted);font-weight:normal">${Utils.escapeHtml(u.email)}</div>` : ''}
          </td>
          <td class="mono" style="font-size:0.85rem">${u.phone ? Utils.escapeHtml(String(u.phone)) : '—'}</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="mono hidden-password" id="all-pw-${u.role_type}-${u.id}" style="font-size:0.85rem; letter-spacing:2px;">••••••••</span>
              <button class="btn btn-icon btn-sm" onclick="AdminAllAccounts.toggleRawPassword('${u.role_type}', '${u.id}', '${safeRaw}')" title="عرض/إخفاء">
                ${Icons.eyeToggle}
              </button>
            </div>
          </td>
          <td><span class="badge ${roleClass}">${roleAr}</span></td>
          <td style="font-size:0.85rem;color:var(--text-muted)">
            ${u.role_type === 'student'
              ? `${u.level ? `<span class="badge badge-info">${u.level}</span>` : ''}`
              : `${u.subject ? Utils.escapeHtml(u.subject) : '—'}`}
          </td>
          <td style="text-align:left">
            <button class="btn btn-outline btn-sm" onclick="AdminAllAccounts.showResetPassword('${u.id}', '${u.role_type}', '${(u.full_name || '').replace(/'/g, "\\'")}')">${Icons.forgot || ''} إعادة تعيين السر</button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  function toggleRawPassword(roleType, id, rawPw) {
    const el = document.getElementById(`all-pw-${roleType}-${id}`);
    if (!el) return;
    if (el.classList.contains('hidden-password')) {
      el.classList.remove('hidden-password');
      el.textContent = rawPw || 'غير متوفر';
      el.style.letterSpacing = 'normal';
    } else {
      el.classList.add('hidden-password');
      el.textContent = '••••••••';
      el.style.letterSpacing = '2px';
    }
  }

  function filterRole(v) { currentFilters.role = v; renderTable(); }
  function filterCourse(v) { currentFilters.course = v; renderTable(); }
  function filterLevel(v) { currentFilters.level = v; renderTable(); }

  const searchUsers = Utils.debounce(function(v) {
    currentFilters.search = v;
    renderTable();
  }, 300);

  function showResetPassword(id, roleType, name) {
    Modal.show({
      title: 'إعادة تعيين كلمة المرور',
      body: `
        <p style="margin-bottom:15px;font-size:0.9rem">إعادة تعيين كلمة المرور للمستخدم: <strong>${Utils.escapeHtml(name)}</strong></p>
        <div class="form-group-modern">
          <label>كلمة المرور الجديدة</label>
          <input type="text" class="form-input" id="all-reset-new-password" placeholder="أدخل كلمة المرور الجديدة" minlength="6" required>
        </div>
      `,
      confirmText: 'إعادة تعيين',
      onConfirm: async () => {
        const newPassword = document.getElementById('all-reset-new-password').value;
        if (newPassword.length < 6) { Toast.warning('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
        try {
          await API.post(`/admin/users/${id}/reset-password`, { role_type: roleType, new_password: newPassword });
          Toast.success('تمت إعادة تعيين كلمة المرور بنجاح');
          Modal.close();
          await loadUsers();
        } catch (err) {
          Toast.error(err.message);
        }
      }
    });
  }

  return { render, filterRole, filterCourse, filterLevel, searchUsers, toggleRawPassword, showResetPassword };
})();
