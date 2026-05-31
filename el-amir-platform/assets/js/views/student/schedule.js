const StudentScheduleView = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    try {
      const data = await API.get('/student/schedule');
      const sessions = data.schedule || [];

      if (sessions.length === 0) {
        page.innerHTML = `<div class="empty-state"><div class="icon">${Icons.schedule}</div><div class="title">لا توجد حصص في جدولك</div></div>`;
        return;
      }

      page.innerHTML = `
        <div class="grid grid-3">
          ${sessions.map(s => `
            <div class="card">
              <div style="font-weight:700;margin-bottom:8px;color:var(--accent)">${Utils.getArabicDay(s.day_of_week)}</div>
              <div class="mono" style="font-size:1.1rem;margin-bottom:4px">${Utils.formatTime(s.start_time)} - ${Utils.formatTime(s.end_time)}</div>
              <div style="font-size:0.85rem;color:var(--text-muted)">${s.courses ? s.courses.name : ''}</div>
              ${s.room ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px">القاعة: ${s.room}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      page.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  return { render };
})();
