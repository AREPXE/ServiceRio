const normalizeFileName = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const name = fileName.replace(`.${extension}`, '').toLowerCase()
        .replace(/[áàâãäå]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[^a-z0-9]/g, '-') // Remplacer non-alphanum par -
        .replace(/-+/g, '-') // Supprimer doubles -
        .replace(/^-|-$/g, ''); // Supprimer - début/fin
    return `${name}.${extension}`;
};

const authForm = document.getElementById('auth-form');
if (authForm) {
    let isSignUp = false;
    const toggleAuth = document.getElementById('toggle-auth');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    const signupFields = document.getElementById('signup-fields');
    const toggleText = document.getElementById('toggle-text');
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Supprimer required au chargement (mode connexion par défaut)
    firstNameInput.removeAttribute('required');
    lastNameInput.removeAttribute('required');
    phoneInput.removeAttribute('required');

    toggleAuth.addEventListener('click', (e) => {
        e.preventDefault();
        isSignUp = !isSignUp;
        formTitle.textContent = isSignUp ? 'Inscription' : 'Connexion';
        submitBtn.textContent = isSignUp ? 'S’inscrire' : 'Se connecter';
        signupFields.classList.toggle('hidden');
        toggleText.textContent = isSignUp ? 'Déjà un compte ? ' : 'Pas de compte ? ';
        toggleAuth.textContent = isSignUp ? 'Se connecter' : 'S’inscrire';
        document.getElementById('error-message').textContent = '';
        document.getElementById('success-message').textContent = '';

        // Gérer required
        if (isSignUp) {
            firstNameInput.setAttribute('required', '');
            lastNameInput.setAttribute('required', '');
            phoneInput.setAttribute('required', '');
        } else {
            firstNameInput.removeAttribute('required');
            lastNameInput.removeAttribute('required');
            phoneInput.removeAttribute('required');
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('loading-message');
        const email = emailInput.value;
        const password = passwordInput.value;
        const errorMessage = document.getElementById('error-message');
        const successMessage = document.getElementById('success-message');
        errorMessage.textContent = '';
        successMessage.textContent = '';

        // Validation manuelle pour connexion
        if (!isSignUp) {
            if (!email.trim()) {
                errorMessage.textContent = 'L’email est requis';
                hideLoading('loading-message');
                return;
            }
            if (!password.trim()) {
                errorMessage.textContent = 'Le mot de passe est requis';
                hideLoading('loading-message');
                return;
            }
        }

        if (isSignUp) {
            const firstName = firstNameInput.value;
            const lastName = lastNameInput.value;
            const phone = phoneInput.value;
            const avatar = document.getElementById('avatar').files[0];

            // Validation prénom
            if (!firstName.trim()) {
                document.getElementById('first-name-error').textContent = 'Le prénom est requis';
                hideLoading('loading-message');
                return;
            }

            // Validation nom
            if (!lastName.trim()) {
                document.getElementById('last-name-error').textContent = 'Le nom est requis';
                hideLoading('loading-message');
                return;
            }

            // Validation téléphone RD
            const phoneRegex = /^\+1\s?\((809|829|849)\)\s?\d{3}-?\d{4}$/;
            if (!phoneRegex.test(phone)) {
                document.getElementById('phone-error').textContent = 'Format : +1 (809) 123-4567';
                hideLoading('loading-message');
                return;
            }

            // Validation email
            if (!email.trim()) {
                document.getElementById('email-error').textContent = 'L’email est requis';
                hideLoading('loading-message');
                return;
            }

            // Validation mot de passe
            if (!password.trim()) {
                document.getElementById('password-error').textContent = 'Le mot de passe est requis';
                hideLoading('loading-message');
                return;
            }

            // Inscription pour obtenir user.id
            const { data: userData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { first_name: firstName, last_name: lastName, phone } }
            });

            if (authError) {
                errorMessage.textContent = authError.message;
                hideLoading('loading-message');
                return;
            }

            // Validation avatar (max 25 Ko, type image)
            let avatarUrl = null;
            if (avatar) {
                if (avatar.size > 25 * 1024) {
                    document.getElementById('avatar-error').textContent = 'Photo max 25 Ko';
                    hideLoading('loading-message');
                    return;
                }
                if (!avatar.type.startsWith('image/')) {
                    document.getElementById('avatar-error').textContent = 'Fichier doit être une image';
                    hideLoading('loading-message');
                    return;
                }
                const normalizedName = normalizeFileName(avatar.name);
                console.log('Uploading file:', { name: normalizedName, size: avatar.size, type: avatar.type });

                const userId = userData.user.id;
                const filePath = `public/${userId}/${Date.now()}_${normalizedName}`;
                const { data, error } = await supabaseClient.storage
                    .from('user-files')
                    .upload(filePath, avatar, { contentType: avatar.type });

                if (error) {
                    document.getElementById('avatar-error').textContent = error.message.includes('Bucket not found')
                        ? 'Bucket user-files introuvable. Contactez l’admin.'
                        : error.message.includes('Bad Request')
                        ? 'Erreur upload : fichier invalide ou chemin incorrect'
                        : `Erreur upload : ${error.message}`;
                    console.error('Upload error:', error, { filePath, file: { name: avatar.name, size: avatar.size, type: avatar.type } });
                    hideLoading('loading-message');
                    return;
                }
                avatarUrl = supabaseClient.storage.from('user-files').getPublicUrl(filePath).data.publicUrl;
                console.log('Uploaded file URL:', avatarUrl);
            }

            // Insérer profil
            const profileData = {
                id: userData.user.id,
                first_name: firstName,
                last_name: lastName,
                phone,
                email,
                photo: avatarUrl
            };
            console.log('Inserting profile:', profileData);

            const { error: profileError } = await supabaseClient.from('profiles').insert(profileData);

            if (profileError) {
                errorMessage.textContent = profileError.message.includes('permission')
                    ? 'Erreur : permissions insuffisantes pour créer le profil'
                    : profileError.message.includes('constraint')
                    ? 'Erreur : données invalides ou doublon dans le profil'
                    : `Erreur création profil : ${profileError.message}`;
                console.error('Profile insert error:', profileError, { profileData });
                hideLoading('loading-message');
                return;
            }

            successMessage.innerHTML = 'Inscription réussie ! <a href="#" id="connect-now">Se connecter maintenant</a>';
            authForm.reset();
            setTimeout(() => {
                isSignUp = false;
                formTitle.textContent = 'Connexion';
                submitBtn.textContent = 'Se connecter';
                signupFields.classList.add('hidden');
                toggleText.textContent = 'Pas de compte ? ';
                toggleAuth.textContent = 'S’inscrire';
                successMessage.innerHTML = '';
                // Supprimer required après reset
                firstNameInput.removeAttribute('required');
                lastNameInput.removeAttribute('required');
                phoneInput.removeAttribute('required');
            }, 3000);

            // Gérer clic sur "Se connecter maintenant"
            document.getElementById('connect-now').addEventListener('click', (e) => {
                e.preventDefault();
                isSignUp = false;
                formTitle.textContent = 'Connexion';
                submitBtn.textContent = 'Se connecter';
                signupFields.classList.add('hidden');
                toggleText.textContent = 'Pas de compte ? ';
                toggleAuth.textContent = 'S’inscrire';
                successMessage.innerHTML = '';
                // Supprimer required
                firstNameInput.removeAttribute('required');
                lastNameInput.removeAttribute('required');
                phoneInput.removeAttribute('required');
            });
        } else {
            // Connexion
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                errorMessage.textContent = error.message;
                hideLoading('loading-message');
                return;
            }

            successMessage.textContent = 'Connexion réussie ! Redirection...';
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1000);
        }
        hideLoading('loading-message');
    });

    // Icône d’œil
    document.getElementById('toggle-password').addEventListener('click', () => {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.getElementById('toggle-password');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    });
}