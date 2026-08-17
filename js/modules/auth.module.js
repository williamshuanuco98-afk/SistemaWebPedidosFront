import { api } from '../api.js';
import { showConfirmModal } from '../helpers.js';

const STORAGE_KEY = 'inplabel_user';

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function isAuthenticated() {
  return getCurrentUser() !== null;
}

export function isAdmin() {
  const user = getCurrentUser();
  return user && (user.rol === 'ADMIN' || user.rol === 'ADMINISTRADOR');
}

export function canDelete() {
  return isAdmin();
}

export function fillCredentials(username, password) {
  const userEl = document.getElementById('loginUsername');
  const passEl = document.getElementById('loginPassword');
  if (userEl) userEl.value = username;
  if (passEl) passEl.value = password;
}

export async function submitLogin(e) {
  if (e) e.preventDefault();

  const userEl = document.getElementById('loginUsername');
  const passEl = document.getElementById('loginPassword');
  const alertEl = document.getElementById('loginAlert');
  const btnSubmit = document.getElementById('btnLoginSubmit');

  const username = userEl ? userEl.value.trim() : '';
  const password = passEl ? passEl.value : '';

  if (!username || !password) {
    showLoginAlert('Por favor ingrese usuario y contraseña.', 'warning');
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Validando acceso...';
  }

  try {
    const res = await api.login(username, password);

    if (res && res.success && res.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.user));
      showLoginAlert('Acceso correcto. Redirigiendo...', 'success');

      setTimeout(() => {
        if (window.app && typeof window.app.navigateTo === 'function') {
          window.app.updateUserUI();
          window.app.navigateTo('dashboard');
        } else {
          window.location.reload();
        }
      }, 400);
    } else {
      showLoginAlert(res?.message || 'Usuario o contraseña incorrectos.', 'danger');
    }
  } catch (err) {
    showLoginAlert('Error de conexión con el servidor de autenticación.', 'danger');
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i> Iniciar Sesión';
    }
  }
}

export async function confirmLogout() {
  const confirmed = await showConfirmModal({
    title: '¿Cerrar Sesión?',
    message: '¿Está seguro de que desea salir del sistema?',
    icon: 'bi-box-arrow-right',
    iconBg: 'rgba(239, 68, 68, 0.15)',
    iconColor: '#ef4444',
    confirmText: 'Cerrar Sesión',
    confirmBtnClass: 'btn-danger',
    cancelText: 'Cancelar'
  });

  if (confirmed) {
    logout();
  }
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  if (window.app && typeof window.app.navigateTo === 'function') {
    window.app.updateUserUI();
    window.app.navigateTo('login');
  } else {
    window.location.reload();
  }
}

export function showLoginAlert(msg, type = 'danger') {
  const alertEl = document.getElementById('loginAlert');
  if (!alertEl) return;
  alertEl.className = `alert alert-${type} py-2 px-3 small d-flex align-items-center gap-2 mb-3`;
  alertEl.innerHTML = `<i class="bi ${type === 'danger' ? 'bi-exclamation-triangle-fill' : type === 'warning' ? 'bi-exclamation-circle-fill' : 'bi-check-circle-fill'}"></i> <span>${msg}</span>`;
  alertEl.classList.remove('d-none');
}

export function togglePasswordVisibility() {
  const passEl = document.getElementById('loginPassword');
  const iconEl = document.getElementById('togglePassIcon');
  if (!passEl) return;
  if (passEl.type === 'password') {
    passEl.type = 'text';
    if (iconEl) iconEl.className = 'bi bi-eye-slash-fill';
  } else {
    passEl.type = 'password';
    if (iconEl) iconEl.className = 'bi bi-eye-fill';
  }
}
