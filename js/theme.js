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
    const themeLabel = document.getElementById('themeToggleLabel');

    if (theme === 'dark') {
      if (logoImg) logoImg.src = 'img/inplabel-logo-dark.png';
      if (themeLabel) themeLabel.textContent = 'Modo Oscuro';
    } else {
      if (logoImg) logoImg.src = 'img/inplabel-logo.png';
      if (themeLabel) themeLabel.textContent = 'Modo Claro';
    }

    if (typeof window.updateChartThemes === 'function') {
      try {
        window.updateChartThemes();
      } catch (e) {}
    }
  },

  toggleTheme() {
    const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }
};
