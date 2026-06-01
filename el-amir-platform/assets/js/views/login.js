const LoginView = (() => {
  let selectedRole = null;

  function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="login-page-wrapper">
        <!-- Slow upward grid drift is rendered by .login-page-wrapper::before — no decorative DOM nodes needed. -->
        <div class="login-container">
          <!-- Left/Top Side: Branding -->
          <div class="login-brand-side">
            <div class="brand-content">
              <div class="brand-logo-wrap float-animation">
                <img src="assets/img/Logo.png" alt="Logo" class="brand-logo">
              </div>
              <h1 class="brand-title">الأمير للتعليم</h1>
              <p class="brand-subtitle">نظام متكامل لإدارة التعليم بذكاء وفاعلية</p>
              
              <div class="brand-features hidden-mobile">
                <div class="feature-item fade-in-up" style="animation-delay:0.2s">
                  <div class="feature-icon">${Icons.dashboard}</div>
                  <div>لوحة تحكم ذكية</div>
                </div>
                <div class="feature-item fade-in-up" style="animation-delay:0.3s">
                  <div class="feature-icon">${Icons.phone}</div>
                  <div>متابعة فورية للحضور</div>
                </div>
                <div class="feature-item fade-in-up" style="animation-delay:0.4s">
                  <div class="feature-icon">${Icons.payments}</div>
                  <div>إدارة مالية دقيقة</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right/Bottom Side: Login Form -->
          <div class="login-form-side">
            <div class="form-wrapper">
              <div class="form-header">
                <h2>مرحباً بك مجدداً 👋</h2>
                <p>يرجى اختيار صفتك لتسجيل الدخول</p>
              </div>

              <div class="role-selector" id="role-selector">
                <div class="role-card-modern" data-role="admin" onclick="LoginView.selectRole('admin')">
                  <div class="role-icon">${Icons.crown}</div>
                  <div class="role-name">مدير</div>
                </div>
                <div class="role-card-modern" data-role="teacher" onclick="LoginView.selectRole('teacher')">
                  <div class="role-icon">${Icons.teachers}</div>
                  <div class="role-name">أستاذ</div>
                </div>
                <div class="role-card-modern" data-role="student" onclick="LoginView.selectRole('student')">
                  <div class="role-icon">${Icons.graduationCap}</div>
                  <div class="role-name">تلميذ</div>
                </div>
              </div>

              <form id="login-form" onsubmit="event.preventDefault(); LoginView.handleLogin(event); return false;" class="hidden-form">
                <div class="form-group-modern">
                  <label>اسم المستخدم</label>
                  <div class="input-with-icon">
                    <span class="input-icon">${Icons.user}</span>
                    <input type="text" id="login-username" placeholder="أدخل اسم المستخدم" autocomplete="username" required minlength="3" maxlength="30">
                  </div>
                </div>
                
                <div class="form-group-modern">
                  <label>كلمة المرور</label>
                  <div class="input-with-icon">
                    <span class="input-icon">${Icons.lock}</span>
                    <input type="password" id="login-password" placeholder="أدخل كلمة المرور" autocomplete="current-password" required minlength="6">
                    <button type="button" class="password-toggle" onclick="LoginView.togglePassword()">
                      ${Icons.eyeToggle}
                    </button>
                  </div>
                </div>

                <div class="forgot-password-link">
                  <a href="#" onclick="LoginView.forgotPassword()">هل نسيت كلمة المرور؟</a>
                </div>

                <div id="login-error" class="login-error-msg" style="display:none"></div>
                
                <button type="submit" class="btn-login-submit" id="login-btn">
                  تسجيل الدخول <span class="arrow-icon">←</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function selectRole(role) {
    selectedRole = role;
    document.querySelectorAll('.role-card-modern').forEach(card => {
      if(card.dataset.role === role) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
    
    const form = document.getElementById('login-form');
    form.classList.remove('hidden-form');
    form.classList.add('show-form');
    setTimeout(() => {
      document.getElementById('login-username').focus();
    }, 100);
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!selectedRole) { Toast.warning('اختر دورك أولاً'); return; }

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> جاري التحقق...';

    try {
      await Auth.login(username, password, selectedRole);
      window.location.hash = Auth.getDefaultRoute();
    } catch (err) {
      const msg = err.message === 'Failed to fetch'
        ? 'تعذّر الاتصال بالخادم. الرجاء المحاولة لاحقاً.'
        : err.message;
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
      
      // Shake animation on error
      const formWrapper = document.querySelector('.form-wrapper');
      formWrapper.classList.add('shake');
      setTimeout(() => formWrapper.classList.remove('shake'), 500);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'تسجيل الدخول <span class="arrow-icon">←</span>';
    }
  }

  function togglePassword() {
    const input = document.getElementById('login-password');
    const btn = document.querySelector('.password-toggle');
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = Icons.toggleEye;
    } else {
      input.type = 'password';
      btn.innerHTML = Icons.eyeToggle;
    }
  }

  async function forgotPassword() {
    const content = `
      <div class="form-group-modern">
        <label>البريد الإلكتروني</label>
        <input type="email" id="forgot-email" class="form-input" placeholder="أدخل بريدك الإلكتروني" required>
      </div>
      <div class="form-group-modern">
        <label>الدور</label>
        <select id="forgot-role" class="form-select">
          <option value="admin">مدير</option>
          <option value="teacher">أستاذ</option>
          <option value="student">تلميذ</option>
        </select>
      </div>
      <button class="btn-login-submit" style="margin-top:20px" onclick="LoginView.submitForgotPassword()">إرسال الطلب</button>
    `;
    Modal.open({ title: 'استعادة كلمة المرور', content, size: 'sm' });
  }

  async function submitForgotPassword() {
    const email = document.getElementById('forgot-email').value.trim();
    const role = document.getElementById('forgot-role').value;
    if (!email) { Toast.warning('أدخل البريد الإلكتروني'); return; }

    try {
      await API.post('/auth/forgot-password', { email, role });
      Modal.close();
      Toast.success('تم إرسال طلب استعادة كلمة المرور للمدير');
    } catch (err) {
      Toast.error(err.message);
    }
  }

  return { render, selectRole, handleLogin, togglePassword, forgotPassword, submitForgotPassword };
})();

