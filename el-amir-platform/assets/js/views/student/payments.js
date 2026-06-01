const StudentPayments = (() => {
  async function render() {
    const page = document.getElementById('page-content');
    try {
      const data = await API.get('/student/payments');
      const payments = data.payments || [];
      const me = Auth.getUser();

      if (payments.length === 0) {
        page.innerHTML = `<div class="empty-state"><div class="icon">${Icons.payments}</div><div class="title">لا توجد دفعات</div></div>`;
        return;
      }

      let html = '';
      const grouped = {};
      payments.forEach(p => {
        if (!grouped[p.month]) grouped[p.month] = [];
        grouped[p.month].push(p);
      });

      const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

      for (const month of months) {
        const monthPayments = grouped[month];
        const maxSession = Math.max(4, ...monthPayments.map(p => p.session_number || 1));
        
        html += `
          <div class="card mb-20">
            <h3 style="margin-bottom:15px; font-weight:700;">${month}</h3>
            <div class="table-container" style="overflow-x: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="min-width: 150px">اسم التلميذ</th>
                    ${Array.from({length: maxSession}, (_, i) => `<th style="text-align:center">الحصة ${i + 1}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight:600;">${me.full_name || me.username}</td>
                    ${Array.from({length: maxSession}, (_, i) => {
                      const sessionNum = i + 1;
                      const p = monthPayments.find(pay => (pay.session_number || 1) === sessionNum);
                      if (p) {
                        return `
                          <td style="text-align:center; vertical-align:middle;">
                            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                              ${Utils.getStatusBadge(p.status)}
                              ${p.status === 'unpaid' ? `
                                <div class="upload-zone" onclick="document.getElementById('proof-${p.id}').click()" style="padding:6px 10px; cursor:pointer; font-size:0.75rem; border-radius:6px;">
                                  ${Icons.upload} إثبات
                                  <input type="file" id="proof-${p.id}" accept="image/*,.pdf" style="display:none" onchange="StudentPayments.uploadProof('${p.id}', this)">
                                </div>
                              ` : ''}
                              ${p.status === 'pending_verification' ? '<span style="font-size:0.75rem;color:var(--warning)">قيد المراجعة</span>' : ''}
                              ${p.proof_url ? `<a href="${p.proof_url}" target="_blank" class="btn btn-ghost btn-sm" style="font-size:0.75rem; padding:4px;">${Icons.view}</a>` : ''}
                            </div>
                          </td>
                        `;
                      } else {
                        return `<td style="text-align:center; color:var(--text-muted);">-</td>`;
                      }
                    }).join('')}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
      
      page.innerHTML = html;
    } catch (err) {
      page.innerHTML = `<div class="empty-state"><div class="title">خطأ: ${err.message}</div></div>`;
    }
  }

  async function uploadProof(paymentId, input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('proof', file);

    try {
      await API.upload(`/student/payments/${paymentId}/proof`, formData);
      Toast.success('تم رفع الإثبات بنجاح');
      render();
    } catch (err) {
      Toast.error(err.message);
    }
  }

  return { render, uploadProof };
})();
