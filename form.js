document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('product-form');
    const typeSelect = document.getElementById('type');
    const subTypeSelect = document.getElementById('sub_type');
    const whatsappCheckbox = document.getElementById('contact-whatsapp');
    const whatsappInput = document.getElementById('whatsapp-number');
    const emailCheckbox = document.getElementById('contact-email');
    const emailInput = document.getElementById('contact-email-address');
    const mediaInput = document.getElementById('media');
    const mediaName = document.getElementById('media-name');

    // Définir sous-types par type
    const subTypes = {
        "Acheter et vendre": ['Accessoires informatiques', 'Appareils électroménagers', 'Appareils photo et caméras', 'Articles pour bébés', "Articles de sport et exercice", "Audio", "Commercial et industriel", "Equipement électronique", "Instruments de musique", "Jeux vidéo et conseoles", "Livres", "Loisirs et artisanat", "Maison-intérieur", "Maison- Extérieur et jardin", "Matériaux pour la rénovation", "Meubles", "Objets gratuits", "Ordinanteur", "Outils", "Santé et besoins spéciaux", "Téléphones", "Télé et vidéo", "Vélos", "Vêtements", "Autre"],
        "Autos et véhicules": ["Autos et camions", "Pièces de véhicules, pneus, accessoires", "Services automobiles", "Motos", "Autre"],
        "Immobilier": ["À louer", "À vendre", "Services immobiliers"],
        "Emplois": ["Administration et réception", "Bars, restauration et tourisme", "Chauffeurs et gardiens de sécurité", "Comptabilité et gestion", "Coiffure, esthétique et spa", "Construction et main-d'œuve", "Garderie", "Néttoyage et ménage", "Programmation et informatique", "Santé", "Service à la clientèle", "Temps partiel et étudiants", "Travail général", "Télé, médias et mode", "Vente et vente au détail", "Web et infographie", "Autre"]
    };

    // Charger profil pour contacts par défaut
    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('phone, email')
        .eq('id', user.id)
        .single();
    if (profileError) {
        document.getElementById('form-message').innerHTML = `<span style="color: red;">Erreur : ${profileError.message}</span>`;
        return;
    }
    whatsappInput.value = profile.phone || '';
    emailInput.value = profile.email || '';

    // Activer sous-type selon type
    typeSelect.addEventListener('change', () => {
        subTypeSelect.innerHTML = '<option value="">Sélectionnez un sous-type</option>';
        const selectedType = typeSelect.value;
        if (selectedType && subTypes[selectedType]) {
            subTypeSelect.disabled = false;
            subTypes[selectedType].forEach(subType => {
                const option = document.createElement('option');
                option.value = subType;
                option.textContent = subType;
                subTypeSelect.appendChild(option);
            });
        } else {
            subTypeSelect.disabled = true;
        }
    });

    // Activer/désactiver champs de contact
    whatsappCheckbox.addEventListener('change', () => {
        whatsappInput.disabled = !whatsappCheckbox.checked;
        if (!whatsappCheckbox.checked) {
            whatsappInput.value = profile.phone || '';
        }
    });
    emailCheckbox.addEventListener('change', () => {
        emailInput.disabled = !emailCheckbox.checked;
        if (!emailCheckbox.checked) {
            emailInput.value = profile.email || '';
        }
    });

    // Afficher noms des fichiers
    mediaInput.addEventListener('change', () => {
        const files = mediaInput.files;
        mediaName.textContent = files.length ? Array.from(files).map(f => f.name).join(', ') : 'Aucun fichier sélectionné';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('form-message', 'Chargement...');
        document.querySelectorAll('.error').forEach(el => el.textContent = '');

        const name = document.getElementById('name').value;
        const type = typeSelect.value;
        const subType = subTypeSelect.value;
        const price = parseFloat(document.getElementById('price').value);
        const description = document.getElementById('description').value;
        const cities = Array.from(document.querySelectorAll('input[name="cities"]:checked')).map(input => input.value);
        const contactWhatsapp = whatsappCheckbox.checked ? whatsappInput.value : null;
        const contactEmail = emailCheckbox.checked ? emailInput.value : null;
        const mediaFiles = mediaInput.files;

        // Validations
        if (!name.trim()) {
            document.getElementById('name-error').textContent = 'Le nom est requis';
            hideLoading('form-message');
            return;
        }
        if (!type) {
            document.getElementById('type-error').textContent = 'Le type est requis';
            hideLoading('form-message');
            return;
        }
        if (!subType) {
            document.getElementById('sub_type-error').textContent = 'Le sous-type est requis';
            hideLoading('form-message');
            return;
        }
        if (isNaN(price) || price < 0) {
            document.getElementById('price-error').textContent = 'Prix invalide';
            hideLoading('form-message');
            return;
        }
        if (!description.trim()) {
            document.getElementById('description-error').textContent = 'La description est requise';
            hideLoading('form-message');
            return;
        }
        if (!cities.length) {
            document.getElementById('cities-error').textContent = 'Au moins une ville est requise';
            hideLoading('form-message');
            return;
        }
        if (whatsappCheckbox.checked && !contactWhatsapp.match(/^\+1\s?\((809|829|849)\)\s?\d{3}-?\d{4}$/)) {
            document.getElementById('whatsapp-number-error').textContent = 'Format : +1 (809) 123-4567';
            hideLoading('form-message');
            return;
        }
        if (emailCheckbox.checked && !contactEmail.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
            document.getElementById('contact-email-error').textContent = 'Email invalide';
            hideLoading('form-message');
            return;
        }

        // Valider médias
        const images = Array.from(mediaFiles).filter(f => f.type.startsWith('image/'));
        const videos = Array.from(mediaFiles).filter(f => f.type.startsWith('video/'));
        if (images.length > 3) {
            document.getElementById('media-error').textContent = 'Maximum 3 images';
            hideLoading('form-message');
            return;
        }
        if (videos.length > 2) {
            document.getElementById('media-error').textContent = 'Maximum 2 vidéos';
            hideLoading('form-message');
            return;
        }
        if (!mediaFiles.length) {
            document.getElementById('media-error').textContent = 'Au moins un fichier est requis';
            hideLoading('form-message');
            return;
        }
        for (const file of mediaFiles) {
            if (file.size > 500 * 1024) {
                document.getElementById('media-error').textContent = 'Chaque fichier doit être < 500 Ko';
                hideLoading('form-message');
                return;
            }
        }

        // Uploader médias
        const mediaUrls = [];
        const mediaTypes = [];
        for (const file of mediaFiles) {
            const normalizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '-');
            const filePath = `public/${user.id}/${Date.now()}_${normalizedName}`;
            const { error } = await supabaseClient.storage
                .from('user-files')
                .upload(filePath, file, { contentType: file.type });
            if (error) {
                document.getElementById('media-error').textContent = `Erreur upload : ${error.message}`;
                hideLoading('form-message');
                return;
            }
            const url = supabaseClient.storage.from('user-files').getPublicUrl(filePath).data.publicUrl;
            mediaUrls.push(url);
            mediaTypes.push(file.type.startsWith('image/') ? 'image' : 'video');
        }
        document.getElementById('media-types').value = JSON.stringify(mediaTypes);

        // Insérer produit
        const productData = {
            user_id: user.id,
            name,
            type,
            sub_type: subType,
            price,
            description,
            cities,
            contact_whatsapp: contactWhatsapp,
            contact_email: contactEmail,
            media: mediaUrls,
            media_types: mediaTypes
        };
        const { error } = await supabaseClient.from('products').insert(productData);
        if (error) {
            document.getElementById('form-message').innerHTML = `<span style="color: red;">Erreur : ${error.message}</span>`;
            hideLoading('form-message');
            return;
        }

        document.getElementById('form-message').textContent = 'Produit publié ! Redirection...';
        form.reset();
        whatsappInput.value = profile.phone || '';
        emailInput.value = profile.email || '';
        subTypeSelect.disabled = true;
        mediaName.textContent = 'Aucun fichier sélectionné';
        setTimeout(() => {
            window.location.href = 'profile.html';
        }, 1000);
        hideLoading('form-message');
    });
});