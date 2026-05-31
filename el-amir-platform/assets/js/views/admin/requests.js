const AdminRequests = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <h2 style="font-size:1.1rem" class="mb-20">${Icons.requests} الطلبات الواردة</h2>
      <div class="filters-bar mb-20">
        <input type="text" class="form-input search-input" placeholder="بحث..." oninput="AdminRequests.onSearch(this.value)">
      </div>
      <div class="tabs mb-20">
        <button class="tab-btn active" onclick="AdminRequests.filter('pending',this)">المعلقة</button>
        <button class="tab-btn" onclick="AdminRequests.filter('all',this)">الكل</button>
      </div>
      <div id="requests-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    await load('pending');
  }

  let currentStatus = 'pending';
  let searchQ = '';

  const onSearch = Utils.debounce((v) => { searchQ = v; load(currentStatus); }, 300);

  async function load(status) {
    currentStatus = status;
    const container = document.getElementById('requests-container');
    try {
      const data = await API.get(`/admin/requests?status=${status}`);
      let requests = data.requests || [];
      if (searchQ) {
        const q = searchQ.toLowerCase();
        requests = requests.filter(r => (r.reason || '').toLowerCase().includes(q) ||
          (r.students && `${r.students.first_name} ${r.students.last_name}`.toLowerCase().includes(q)));
      }
      if (requests.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.requests}</div><div class="title">لا توجد طلبات</div></div>`;
        return;
      }
      container.innerHTML = requests.map(r => `
        <div class="card mb-16" style="animation:fadeIn 0.3s ease">
          <div class="flex items-center justify-between mb-16">
            <div>
              <span class="badge badge-info">${translateType(r.type)}</span>
              ${Utils.getStatusBadge(r.status)}
            </div>
            <span style="font-size:0.78rem;color:var(--text-muted)" class="mono">${Utils.formatDate(r.created_at)}</span>
          </div>
          <p style="margin-bottom:8px"><strong>السبب:</strong> ${Utils.escapeHtml(r.reason)}</p>
          ${r.students ? `<p style="margin-bottom:8px"><strong>التلميذ:</strong> ${r.students.first_name} ${r.students.last_name}</p>` : ''}
          ${r.response ? `<p style="margin-bottom:8px"><strong>الرد:</strong> ${Utils.escapeHtml(r.response)}</p>` : ''}
          ${r.status === 'pending' ? `
            <div class="flex gap-8 mt-12">
              <button class="btn btn-success btn-sm" onclick="AdminRequests.resolve('${r.id}','approve')">${Icons.approve} قبول</button>
              <button class="btn btn-danger btn-sm" onclick="AdminRequests.resolve('${r.id}','reject')">${Icons.reject} رفض</button>
            </div>
          ` : ''}
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  function filter(status, btn) {
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    load(status);
  }

  async function resolve(id, action) {
    const response = action === 'reject' ? prompt('سبب الرفض:') : (prompt('رد (اختياري):') || '');
    if (action === 'reject' && !response) { Toast.warning('سبب الرفض مطلوب'); return; }
    try {
      await API.patch(`/admin/requests/${id}/resolve`, { action, response });
      Toast.success(action === 'approve' ? 'تم القبول' : 'تم الرفض');
      load('pending');
    } catch (err) { Toast.error(err.message); }
  }

  function translateType(type) {
    const map = { expel_request: 'طلب طرد', add_student: 'طلب إضافة', schedule_change: 'تغيير جدول', note_approval: 'ملاحظة', session_request: 'طلب حصة', other: 'أخرى' };
    return map[type] || type;
  }

  return { render, filter, resolve, onSearch };
})();
