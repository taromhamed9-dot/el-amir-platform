const StudentNotes = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    try {
      const data = await API.get('/student/notes');
      const notes = data.notes || [];

      if (notes.length === 0) {
        page.innerHTML = `<div class="empty-state"><div class="icon">${Icons.notes}</div><div class="title">لا توجد ملاحظات من الأستاذ</div></div>`;
        return;
      }

      page.innerHTML = notes.map(n => `
        <div class="note-card">
          <div class="note-header">
            <span class="note-student">${n.teachers ? n.teachers.full_name : 'الأستاذ'}</span>
            <span class="note-date">${Utils.formatDate(n.created_at)}</span>
          </div>
          <div class="note-text">${Utils.escapeHtml(n.note)}</div>
        </div>
      `).join('');
    } catch (err) {
      page.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  return { render };
})();
