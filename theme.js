console.log('theme.js chargé !');
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM chargé');
    const html = document.documentElement;
    const themeOptions = document.querySelectorAll('.theme-option');
    const themeIcons = document.querySelectorAll('.theme-icon');
    console.log('Éléments .theme-option trouvés:', themeOptions.length);
    console.log('Éléments .theme-icon trouvés:', themeIcons.length);

    if (themeOptions.length === 0) {
        console.error('Aucun élément .theme-option trouvé dans le DOM');
        return;
    }

    if (themeIcons.length === 0) {
        console.error('Aucun élément .theme-icon trouvé dans le DOM');
        return;
    }

    // Appliquer le thème sauvegardé ou auto
    const savedTheme = localStorage.getItem('theme') || 'auto';
    console.log('Thème initial:', savedTheme);
    applyTheme(savedTheme);

    // Gérer les clics sur les options
    themeOptions.forEach(option => {
        console.log('Ajout écouteur pour thème:', option.dataset.theme);
        option.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedTheme = option.dataset.theme;
            console.log('Thème sélectionné:', selectedTheme);
            localStorage.setItem('theme', selectedTheme);
            applyTheme(selectedTheme);
        });
    });

    function applyTheme(theme) {
        console.log('Application du thème:', theme);
        // Mettre à jour l'attribut data-theme
        if (theme === 'auto') {
            html.removeAttribute('data-theme');
            console.log('data-theme supprimé, utilisant prefers-color-scheme');
        } else {
            html.setAttribute('data-theme', theme);
            console.log('data-theme défini à:', theme);
        }
        // Mettre à jour l'icône active
        themeIcons.forEach(icon => {
            icon.classList.remove('active');
            if (icon.dataset.theme === theme) {
                icon.classList.add('active');
            }
        });
        // Vérifier l'attribut après changement
        console.log('Attribut data-theme actuel:', html.getAttribute('data-theme') || 'aucun (auto)');
    }
});