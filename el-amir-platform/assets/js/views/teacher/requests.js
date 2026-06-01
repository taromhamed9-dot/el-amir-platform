const TeacherRequests = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20">
        <h2 style="font-size:1.1rem">${Icons.requests} طلباتي</h2>
        <button class="btn btn-accent" onclick="TeacherRequests.showAdd()">${Icons.add} طلب جديد</button>
      </div>
      <div id="requests-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    await load();
  }

  async function load() {
    const container = document.getElementById('requests-container');
    try {
      const data = await API.get('/teacher/requests');
      const requests = data.requests || [];
      if (requests.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.requests}</div><div class="title">لا توجد طلبات</div></div>`;
        return;
      }
      container.innerHTML = requests.map(r => `
        <div class="card mb-16">
          <div class="flex items-center justify-between mb-12">
            <div>
              <span class="badge badge-info">${translateType(r.type)}</span>
              ${Utils.getStatusBadge(r.status)}
            </div>
            <span class="mono" style="font-size:0.78rem;color:var(--text-muted)">${Utils.formatDate(r.created_at)}</span>
          </div>
          <p><strong>السبب:</strong> ${Utils.escapeHtml(r.reason)}</p>
          ${r.students ? `<p><strong>التلميذ:</strong> ${r.students.first_name} ${r.students.last_name}</p>` : ''}
          ${r.response ? `<p style="margin-top:8px;color:var(--accent)"><strong>الرد:</strong> ${Utils.escapeHtml(r.response)}</p>` : ''}
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  async function showAdd() {
    let students = [];
    try { const d = await API.get('/teacher/students'); students = d.students || []; } catch (_) {}
    const content = `
      <form onsubmit="TeacherRequests.submitAdd(event)">
        <div class="form-group">
          <label class="form-label">نوع الطلب *</label>
          <select class="form-select" name="type" required>
            <option value="session_request">طلب حصة جديدة</option>
            <option value="expel_request">طلب طرد</option>
            <option value="add_student">طلب إضافة تلميذ</option>
            <option value="schedule_change">تغيير في الجدول</option>
            <option value="other">أخرى</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">التلميذ المعني (اختياري)</label>
          <select class="form-select" name="target_student_id">
            <option value="">بدون</option>
            ${students.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">السبب *</label>
          <textarea class="form-textarea" name="reason" required rows="3"></textarea>
        </div>
        <button type="submit" class="btn btn-accent" style="width:100%">إرسال الطلب</button>
      </form>
    `;
    Modal.open({ title: 'طلب جديد', content, size: 'md' });
  }

  async function submitAdd(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { type: fd.get('type'), reason: fd.get('reason') };
    if (fd.get('target_student_id')) body.target_student_id = fd.get('target_student_id');
    try { await API.post('/teacher/requests', body); Modal.close(); Toast.success('تم إرسال الطلب'); load(); }
    catch (err) { Toast.error(err.message); }
  }

  function translateType(type) {
    const map = { session_request: 'طلب حصة', expel_request: 'طلب طرد', add_student: 'طلب إضافة', schedule_change: 'تغيير جدول', note_approval: 'ملاحظة', other: 'أخرى' };
    return map[type] || type;
  }

  return { render, showAdd, submitAdd };
})();
