const TeacherPayments = (() => {
  let currentMonthFilter = new Date().toISOString().substring(0, 7);

  async function render() {
    const page = document.getElementById('page-content');
    page.innerHTML = `
      <div class="flex items-center justify-between mb-20">
        <h2 style="font-size:1.1rem">${Icons.payments} حالة دفع التلاميذ</h2>
      </div>
      <div class="card mb-20">
        <div class="filters-bar">
          <input type="month" class="form-input" id="teacher-payments-month" value="${currentMonthFilter}" onchange="TeacherPayments.filterMonth(this.value)">
          <input type="text" class="form-input search-input" placeholder="بحث باسم التلميذ..." oninput="TeacherPayments.search(this.value)">
        </div>
      </div>
      <div id="teacher-payments-container"><div style="padding:40px;text-align:center;color:var(--text-muted)">جاري التحميل...</div></div>
    `;
    await load();
  }

  async function load(searchStr = '') {
    const container = document.getElementById('teacher-payments-container');
    try {
      const params = new URLSearchParams();
      params.append('month', currentMonthFilter);
      if (searchStr) params.append('search', searchStr);

      const data = await API.get(`/teacher/payments?${params.toString()}`);
      const payments = data.payments || [];

      if (payments.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="icon">${Icons.payments}</div><div class="title">لا توجد دفعات مسجلة لهذا الشهر</div></div>`;
        return;
      }

      const groupedByStudent = {};
      let maxSession = 4;
      payments.forEach(p => {
        const sid = p.student_id;
        if (!groupedByStudent[sid]) {
          groupedByStudent[sid] = {
            student: p.students,
            sessions: []
          };
        }
        groupedByStudent[sid].sessions.push(p);
        if (p.session_number && p.session_number > maxSession) {
          maxSession = p.session_number;
        }
      });

      const studentsList = Object.values(groupedByStudent);

      let html = `
        <div class="card">
          <div class="table-container" style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="min-width: 150px">اسم التلميذ</th>
                  ${Array.from({length: maxSession}, (_, i) => `<th style="text-align:center">الحصة ${i + 1}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${studentsList.map((group, idx) => `
                  <tr style="background: ${idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-body)'}">
                    <td style="font-weight:600;">${group.student.first_name} ${group.student.last_name}</td>
                    ${Array.from({length: maxSession}, (_, i) => {
                      const sessionNum = i + 1;
                      const p = group.sessions.find(pay => (pay.session_number || 1) === sessionNum);
                      if (p) {
                        return `<td style="text-align:center">${Utils.getStatusBadge(p.status)}</td>`;
                      } else {
                        return `<td style="text-align:center; color:var(--text-muted);">-</td>`;
                      }
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  function filterMonth(val) {
    currentMonthFilter = val;
    load(document.querySelector('.search-input').value);
  }

  const search = Utils.debounce((value) => load(value));

  return { render, filterMonth, search };
})();
