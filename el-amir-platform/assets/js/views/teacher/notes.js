const TeacherNotes = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20">
        <h2 style="font-size:1.1rem">${Icons.notes} ملاحظاتي</h2>
        <button class="btn btn-accent" onclick="TeacherNotes.showAdd()">${Icons.add} إضافة ملاحظة</button>
      </div>
      <div id="notes-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    await load();
  }

  async function load() {
    const container = document.getElementById('notes-container');
    try {
      const data = await API.get('/teacher/notes');
      const notes = data.notes || [];
      if (notes.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.notes}</div><div class="title">لا توجد ملاحظات</div></div>`;
        return;
      }
      container.innerHTML = notes.map(n => `
        <div class="note-card">
          <div class="note-header">
            <span class="note-student">${n.students ? `${n.students.first_name} ${n.students.last_name}` : ''}</span>
            <div style="display:flex;gap:8px;align-items:center">
              ${n.is_private ? '<span class="private-badge">خاصة</span>' : ''}
              <span class="note-date">${Utils.formatDate(n.created_at)}</span>
            </div>
          </div>
          <div class="note-text">${Utils.escapeHtml(n.note)}</div>
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
      <form onsubmit="TeacherNotes.submitAdd(event)">
        <div class="form-group">
          <label class="form-label">التلميذ *</label>
          <select class="form-select" name="student_id" required>
            <option value="">اختر</option>
            ${students.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">الملاحظة *</label>
          <textarea class="form-textarea" name="note" required rows="4"></textarea>
        </div>
        <label class="checkbox-label mb-16"><input type="checkbox" name="is_private"> ملاحظة خاصة (المدير فقط يراها)</label>
        <button type="submit" class="btn btn-accent" style="width:100%">إضافة</button>
      </form>
    `;
    Modal.open({ title: 'إضافة ملاحظة', content, size: 'md' });
  }

  async function submitAdd(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      student_id: fd.get('student_id'),
      note: fd.get('note'),
      is_private: fd.get('is_private') === 'on'
    };
    try { await API.post('/teacher/notes', body); Modal.close(); Toast.success('تم إضافة الملاحظة'); load(); }
    catch (err) { Toast.error(err.message); }
  }

  return { render, showAdd, submitAdd };
})();
