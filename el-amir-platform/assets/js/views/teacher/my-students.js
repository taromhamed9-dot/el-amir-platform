const TeacherStudents = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <h2 style="font-size:1.1rem" class="mb-20">${Icons.students} تلاميذي</h2>
      <div class="filters-bar">
        <input type="text" class="form-input search-input" placeholder="بحث..." oninput="TeacherStudents.search(this.value)">
      </div>
      <div id="my-students-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    await load();
  }

  async function load(search) {
    const container = document.getElementById('my-students-container');
    try {
      const params = search ? `?search=${search}` : '';
      const data = await API.get(`/teacher/students${params}`);
      const students = data.students || [];
      if (students.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.students}</div><div class="title">لا يوجد تلاميذ</div></div>`;
        return;
      }
      container.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead><tr><th>الاسم</th><th>الهاتف</th><th>المستوى</th><th>الدورة</th><th>الحالة</th></tr></thead>
            <tbody>
              ${students.map(s => `
                <tr>
                  <td style="font-weight:600">${s.first_name} ${s.last_name}</td>
                  <td class="mono">${s.phone || ''}</td>
                  <td>${s.level}</td>
                  <td>${s.courses ? s.courses.name : '—'}</td>
                  <td>${Utils.getStatusBadge(s.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  const search = Utils.debounce((value) => load(value));

  return { render, search };
})();
