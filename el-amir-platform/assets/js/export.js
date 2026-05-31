const Export = (() => {
  // ── Excel ───────────────────────────────────────────────
  async function toExcel(data, filename) {
    if (!Array.isArray(data) || data.length === 0) {
      Toast.warning('لا توجد بيانات للتصدير');
      return;
    }
    if (!window.XLSX) {
      await loadScript('https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js');
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'البيانات');

    // RTL view in Excel + auto column widths
    if (!ws['!views']) ws['!views'] = [{}];
    ws['!views'][0].RTL = true;

    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(r => String(r[key] == null ? '' : r[key]).length)) + 2
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `${filename}.xlsx`, { bookType: 'xlsx', type: 'binary' });
    Toast.success('تم تصدير الملف بنجاح');
  }

  // ── PDF ─────────────────────────────────────────────────
  // The container MUST be attached to the DOM before html2canvas runs;
  // off-DOM nodes occasionally render as blank tables (which is what was
  // happening here — the table appeared empty in the PDF). We attach it
  // off-screen, render, then remove it.
  async function toPDF(data, columns, title, filename) {
    if (!Array.isArray(data) || data.length === 0) {
      Toast.warning('لا توجد بيانات للتصدير');
      return;
    }
    if (!window.html2pdf) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
    }

    const container = document.createElement('div');
    // Off-screen but rendered, with a fixed paper width so html2canvas
    // captures the full table layout (not the page viewport's width).
    Object.assign(container.style, {
      position: 'fixed',
      top: '0',
      left: '-10000px',
      width: '1100px',
      padding: '20px',
      fontFamily: "'Tajawal', 'Segoe UI', Tahoma, sans-serif",
      direction: 'rtl',
      background: '#ffffff',
      color: '#000000',
      zIndex: '-1'
    });

    const safe = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[c]);
    };

    container.innerHTML = `
      <h2 style="text-align:center; color:#1a0e30; margin: 0 0 6px;">${safe(title)}</h2>
      <p style="text-align:center; color:#666; font-size: 12px; margin: 0 0 14px;">
        تاريخ الاستخراج: ${new Date().toLocaleString('ar-DZ')}
      </p>
      <table style="width:100%; border-collapse: collapse; font-size: 12px; color:#000;">
        <thead>
          <tr style="background:#1a3a5c; color:#fff;">
            ${columns.map(c => `<th style="padding:8px; border:1px solid #ddd; text-align:right;">${safe(c.header)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map((row, i) => `
            <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              ${columns.map(c => `<td style="padding:8px; border:1px solid #ddd; color:#000;">${safe(row[c.key])}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.body.appendChild(container);

    const opt = {
      margin:       10,
      filename:     `${filename}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    try {
      // Give the browser a tick to lay the table out before capture.
      await new Promise(r => setTimeout(r, 50));
      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (_) {}
      }
      await html2pdf().set(opt).from(container).save();
      Toast.success('تم تصدير PDF بنجاح');
    } catch (err) {
      Toast.error('فشل في تصدير PDF');
      console.error(err);
    } finally {
      container.remove();
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return { toExcel, toPDF };
})();
