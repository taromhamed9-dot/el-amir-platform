const AdminAccounts = (() => {
  let allUsers = [];
  let currentFilters = { role: '', search: '', status: '' };

  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20 payments-header">
        <h2 style="font-size:1.1rem">${Icons.accounts} إدارة جميع المستخدمين</h2>
        <button class="btn btn-accent" onclick="AdminAccounts.showAddAdminModal()">${Icons.add} إضافة مدير</button>
      </div>

      <div class="card mb-20">
        <div class="filters-bar payments-filters">
          <select class="form-select" onchange="AdminAccounts.filterRole(this.value)">
            <option value="">كل الأدوار</option>
            <option value="admin">مدير</option>
            <option value="teacher">أستاذ</option>
            <option value="student">تلميذ</option>
          </select>
          <select class="form-select" onchange="AdminAccounts.filterStatus(this.value)">
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">معطّل</option>
          </select>
          <div class="search-input-wrapper" style="position:relative;flex:1;min-width:180px;max-width:300px">
            <input type="text" class="form-input search-input" placeholder="بحث بالاسم أو المستخدم..." oninput="AdminAccounts.searchUsers(this.value)">
          </div>
        </div>
      </div>

      <div id="accounts-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    await loadUsers();
  }

  async function loadUsers() {
    const container = document.getElementById('accounts-container');
    try {
      const data = await API.get('/admin/users');
      allUsers = data.users || [];
      renderTable();
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.warning}</div><div class="title">خطأ في تحميل البيانات</div><div class="description">${err.message}</div></div>`;
    }
  }

  function renderTable() {
    const container = document.getElementById('accounts-container');
    let filtered = allUsers;

    if (currentFilters.role) {
      filtered = filtered.filter(u => u.role_type === currentFilters.role);
    }
    
    if (currentFilters.status) {
      filtered = filtered.filter(u => currentFilters.status === 'active' ? u.is_active : !u.is_active);
    }
    
    if (currentFilters.search) {
      const q = currentFilters.search.toLowerCase();
      filtered = filtered.filter(u => 
        (u.full_name && u.full_name.toLowerCase().includes(q)) || 
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.accounts}</div><div class="title">لا توجد حسابات تطابق البحث</div></div>`;
      return;
    }

    let html = `
      <div class="table-container" style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="min-width: 150px">المستخدم</th>
              <th style="min-width: 200px">الاسم الكامل</th>
              <th>كلمة المرور</th>
              <th>الدور</th>
              <th style="text-align:center">الحالة</th>
              <th>تاريخ الإنشاء</th>
              <th style="text-align:left">إجراءات</th>
            </tr>
          </thead>
          <tbody>
    `;

    filtered.forEach((u, i) => {
      const roleAr = u.role_type === 'admin' ? 'مدير' : u.role_type === 'teacher' ? 'أستاذ' : 'تلميذ';
      const roleClass = u.role_type === 'admin' ? 'badge-accent' : u.role_type === 'teacher' ? 'badge-primary' : 'badge-outline';
      
      const isMe = u.id === Auth.getUser()?.id && u.role_type === Auth.getUser()?.role;

      html += `
        <tr style="background: ${i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-body)'}">
          <td class="mono" style="font-size:0.85rem">${u.username}</td>
          <td style="font-weight:600">${u.full_name}
            ${u.email ? `<div style="font-size:0.75rem;color:var(--text-muted);font-weight:normal">${u.email}</div>` : ''}
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="mono hidden-password" id="pw-${u.id}" style="font-size:0.85rem; letter-spacing:2px;">••••••••</span>
              <button class="btn btn-icon btn-sm" onclick="AdminAccounts.toggleRawPassword('${u.id}', '${u.raw_password ? u.raw_password.replace(/'/g, "\\'") : ''}')" title="عرض/إخفاء">
                ${Icons.eyeToggle}
              </button>
            </div>
          </td>
          <td><span class="badge ${roleClass}">${roleAr}</span></td>
          <td style="text-align:center">
            <div style="display:flex; justify-content:center; align-items:center;">
              <label class="toggle-switch" style="transform: scale(0.85)">
                <input type="checkbox" ${u.is_active ? 'checked' : ''} ${isMe ? 'disabled' : ''} onchange="AdminAccounts.toggleStatus('${u.id}', '${u.role_type}', this.checked)">
                <span class="slider round"></span>
              </label>
            </div>
          </td>
          <td style="font-size:0.85rem;color:var(--text-muted)">${u.created_at ? Utils.formatDate(u.created_at).substring(0,10) : '—'}</td>
          <td style="text-align:left">
            <button class="btn btn-outline btn-sm" onclick="AdminAccounts.showResetPassword('${u.id}', '${u.role_type}', '${u.full_name}')" ${isMe ? 'disabled' : ''}>${Icons.forgot} إعادة تعيين السر</button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  function toggleRawPassword(id, rawPw) {
    const el = document.getElementById(`pw-${id}`);
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
  function filterStatus(v) { currentFilters.status = v; renderTable(); }
  
  const searchUsers = Utils.debounce(function(v) {
    currentFilters.search = v;
    renderTable();
  }, 300);

  async function toggleStatus(id, roleType, isActive) {
    try {
      await API.patch(`/admin/users/${id}/status`, { role_type: roleType, is_active: isActive });
      Toast.success(isActive ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب');
      const user = allUsers.find(u => u.id === id && u.role_type === roleType);
      if (user) user.is_active = isActive;
    } catch (err) {
      Toast.error(err.message);
      renderTable(); // Revert toggle visually
    }
  }

  function showResetPassword(id, roleType, name) {
    Modal.show({
      title: 'إعادة تعيين كلمة المرور',
      body: `
        <p style="margin-bottom:15px;font-size:0.9rem">إعادة تعيين كلمة المرور للمستخدم: <strong>${name}</strong></p>
        <div class="form-group-modern">
          <label>كلمة المرور الجديدة</label>
          <input type="text" class="form-input" id="reset-new-password" placeholder="أدخل كلمة المرور الجديدة" minlength="6" required>
        </div>
      `,
      confirmText: 'إعادة تعيين',
      onConfirm: async () => {
        const newPassword = document.getElementById('reset-new-password').value;
        if (newPassword.length < 6) { Toast.warning('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
        
        try {
          await API.post(`/admin/users/${id}/reset-password`, { role_type: roleType, new_password: newPassword });
          Toast.success('تمت إعادة تعيين كلمة المرور بنجاح');
          Modal.close();
        } catch (err) {
          Toast.error(err.message);
        }
      }
    });
  }

  function showAddAdminModal() {
    const content = `
      <form onsubmit="AdminAccounts.submitAddAdmin(event)">
        <div class="form-row">
          <div class="form-group"><label class="form-label">الاسم الكامل *</label><input type="text" class="form-input" name="full_name" required></div>
          <div class="form-group"><label class="form-label">اسم المستخدم *</label><input type="text" class="form-input" name="username" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">البريد *</label><input type="email" class="form-input" name="email" required></div>
          <div class="form-group"><label class="form-label">كلمة المرور *</label><input type="password" class="form-input" name="password" required minlength="6"></div>
        </div>
        <div class="form-group">
          <label class="form-label">الدور</label>
          <select class="form-select" name="role">
            <option value="admin">مدير</option>
            <option value="super_admin">مدير رئيسي</option>
          </select>
        </div>
        <button type="submit" class="btn btn-accent" style="width:100%">${Icons.add} إضافة</button>
      </form>
    `;
    Modal.show({ title: 'إضافة حساب مدير', body: content, confirmText: 'إضافة', onConfirm: () => {
      // The form submission will handle this, so we don't need onConfirm here, just use the built-in modal close
    } });
  }

  async function submitAddAdmin(e) {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    try {
      await API.post('/admin/accounts', body);
      Modal.close();
      Toast.success('تم إضافة حساب المدير بنجاح');
      loadUsers();
    } catch (err) { Toast.error(err.message); }
  }

  return { render, filterRole, filterStatus, searchUsers, toggleStatus, showResetPassword, showAddAdminModal, submitAddAdmin, toggleRawPassword };
})();
