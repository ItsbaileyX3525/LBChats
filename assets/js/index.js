document.addEventListener('DOMContentLoaded', () => {
	const toggle = document.getElementById('themeToggle');
	const root = document.documentElement;

	if (!toggle) return;

	const applyTheme = (theme) => {
		if (theme === 'light') {
			root.setAttribute('data-theme', 'light');
			toggle.textContent = '☀️';
			toggle.classList.add('light');
		} else {
			root.removeAttribute('data-theme');
			toggle.textContent = '🌙';
			toggle.classList.remove('light');
		}
	};


	const saved = localStorage.getItem('lbchats-theme');
	applyTheme(saved === 'light' ? 'light' : 'dark');

	toggle.addEventListener('click', () => {
		const currentIsLight = root.getAttribute('data-theme') === 'light';
		const next = currentIsLight ? 'dark' : 'light';
		applyTheme(next);
		localStorage.setItem('lbchats-theme', next === 'light' ? 'light' : 'dark');
	});

	toggle.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle.click();
		}
	});
});