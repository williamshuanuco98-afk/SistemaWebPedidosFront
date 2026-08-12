export const themeManager = {
  currentTheme: 'light',

  initTheme() {
    const savedTheme = localStorage.getItem('inplabel_theme') || 'light';
    this.setTheme(savedTheme);
  },

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('inplabel_theme', theme);

    const logoImg = document.getElementById('brandLogoImg');
    const themeIcon = document.getElementById('themeToggleIcon');
    const themeLabel = document.getElementById('themeToggleLabel');

    if (theme === 'dark') {
      if (logoImg) logoImg.src = 'img/inplabel-logo-dark.png';
      if (themeIcon) {
        themeIcon.className = 'bi bi-sun-fill icon';
        themeIcon.style.color = '#f59e0b';
      }
      if (themeLabel) themeLabel.textContent = 'Modo Claro';
    } else {
      if (logoImg) logoImg.src = 'img/inplabel-logo.png';
      if (themeIcon) {
        themeIcon.className = 'bi bi-moon-stars-fill icon';
        themeIcon.style.color = '#17644aff';
      }
      if (themeLabel) themeLabel.textContent = 'Modo Oscuro';
    }
  },

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }
};
