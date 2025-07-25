let allProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    const blogContainer = document.getElementById('blog-container');
    const typeFilter = document.getElementById('type-filter');
    const subTypeFilter = document.getElementById('sub-type-filter');
    const cityFilter = document.getElementById('city-filter');
    const authSection = document.getElementById('auth-section');
    const emailForm = document.getElementById('email-form');
    const emailSubject = document.getElementById('email-subject');
    const sendMessageModal = new bootstrap.Modal(document.getElementById('sendMessageModal'));
    let currentProductId = null;
    let currentReceiverId = null;

    blogContainer.innerHTML = '<div style="text-align: center; color: #6c757d; font-size: 1.2rem; margin: 20px;">Chargement en cours...</div>';

    // Gérer le formulaire e-mail
    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const subject = encodeURIComponent(emailSubject.value.trim());
        const email = 'Serviciorio@hotmail.com';
        window.location.href = `mailto:${email}?subject=${subject}`;
        emailSubject.value = '';
    });

    // Vérifier l'utilisateur connecté
    const { data: { user } } = await supabaseClient.auth.getUser();
    const isAuthenticated = !!user;
    console.log('Utilisateur authentifié ?', isAuthenticated, 'User ID:', user?.id);
    // const user = await getCurrentUser();
    // const isAuthenticated = !!user;

    // Gérer l'affichage de la section authentification
    if (isAuthenticated) {
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('first_name, last_name, photo')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
            authSection.innerHTML = '<a href="login.html" class="auth-btn nav-link">Connexion/Inscription</a>';
        } else {
            const fullName = `${profile.first_name} ${profile.last_name}`.trim();
            authSection.innerHTML = `
                <div class="user-profile">
                    <img src="${profile.photo || 'https://via.placeholder.com/30'}" alt="${fullName}">
                    <span>${fullName}</span>
                    <a href="#" class="logout-btn nav-link" id="logout-btn">Déconnexion</a>
                </div>
            `;

            document.getElementById('logout-btn').addEventListener('click', async (e) => {
                e.preventDefault();
                await logout();
            });
        }
    } else {
        authSection.innerHTML = '<a href="login.html" class="auth-btn nav-link">Connexion/Inscription</a>';
    }

    // Charger tous les produits non supprimés
    console.log('Chargement des produits avec is_deleted = "non"');
    const { data: products, error: productsError } = await supabaseClient
        .from('products')
        .select('id, name, type, sub_type, price, description, cities, media, media_types, created_at, contact_whatsapp, contact_email, user_id')
        .eq('is_deleted', 'non')
        .order('created_at', { ascending: false });

    if (productsError) {
        console.error('Products fetch error:', productsError);
        blogContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des produits : ' + productsError.message + '</p>';
        return;
    }

    if (!products || products.length === 0) {
        console.log('Aucun produit trouvé avec is_deleted = "non"');
        blogContainer.innerHTML = '<p>Aucun produit publié.</p>';
        typeFilter.disabled = true;
        subTypeFilter.disabled = true;
        cityFilter.disabled = true;
        return;
    }

    console.log('Produits chargés:', products);

    // Charger les likes
    const { data: likes, error: likesError } = await supabaseClient
        .from('likes')
        .select('product_id, user_id');

    if (likesError) {
        console.error('Likes fetch error:', likesError);
        blogContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des likes.</p>';
        return;
    }

    // Compter les likes par produit
    const likesCount = likes.reduce((acc, like) => {
        acc[like.product_id] = (acc[like.product_id] || 0) + 1;
        return acc;
    }, {});

    // Vérifier les likes de l'utilisateur connecté
    const userLikes = isAuthenticated
        ? new Set(likes.filter(like => like.user_id === user.id).map(like => like.product_id))
        : new Set();

    // Ajouter likes aux produits
    allProducts = products.map(product => ({
        ...product,
        likes: likesCount[product.id] || 0,
        isLiked: userLikes.has(product.id)
    }));

    // Récupérer les profils des vendeurs
    const userIds = [...new Set(products.map(p => p.user_id))];
    const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, first_name, last_name, photo')
        .in('id', userIds);

    if (profilesError) {
        console.error('Profiles fetch error:', profilesError);
        blogContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des profils.</p>';
        return;
    }

    const profileMap = profiles.reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
    }, {});

    // Remplir les filtres
    const types = [...new Set(products.map(p => p.type))].sort();
    const subTypes = [...new Set(products.map(p => p.sub_type))].sort();
    const cities = [...new Set(products.flatMap(p => p.cities))].sort();

    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });

    subTypes.forEach(subType => {
        const option = document.createElement('option');
        option.value = subType;
        option.textContent = subType;
        subTypeFilter.appendChild(option);
    });

    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });

    // Fonction pour afficher les produits
    const renderProducts = (filteredProducts) => {
        blogContainer.innerHTML = '';
        if (filteredProducts.length === 0) {
            blogContainer.innerHTML = '<p>Aucun produit correspond aux filtres.</p>';
            return;
        }

        filteredProducts.forEach((product, index) => {
            const profile = profileMap[product.user_id] || { first_name: 'Inconnu', last_name: '', photo: 'https://via.placeholder.com/30' };
            const citiesText = product.cities.join(', ');
            const createdAt = new Date(product.created_at).toLocaleDateString('fr-FR');
            const authorName = `${profile.first_name} ${profile.last_name}`.trim();

            // Vérifier médias
            if (!product.media || !product.media_types || product.media.length !== product.media_types.length) {
                console.warn(`Produit ${product.id} : médias invalides`, product.media, product.media_types);
                return;
            }

            // Préparer message WhatsApp
            const mediaUrl = product.media[0] || '';
            const whatsappMessage = encodeURIComponent(
                `Produit : ${product.name}\n` +
                `Média : ${mediaUrl}\n` +
                `Vendeur : ${authorName}\n` +
                `Prix : ${product.price}₱\n` +
                `Je veux qu'on en discute`
            );

            const card = document.createElement('div');
            card.classList.add('col-lg-3', 'col-md-6', 'col-sm-12');
            card.innerHTML = `
                <div class="blog-card">
                    <div id="carousel-${product.id}" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-inner">
                            ${product.media.map((item, i) => `
                                <div class="carousel-item ${i === 0 ? 'active' : ''}">
                                    ${product.media_types[i] === 'video' ? 
                                        `<video src="${item}" autoplay muted loop controls></video>` : 
                                        `<img src="${item}" alt="${product.name}">`}
                                </div>
                            `).join('')}
                        </div>
                        ${product.media.length > 1 ? `
                            <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${product.id}" data-bs-slide="prev">
                                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            </button>
                            <button class="carousel-control-next" type="button" data-bs-target="#carousel-${product.id}" data-bs-slide="next">
                                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            </button>
                        ` : ''}
                    </div>
                    <div class="card-body">
                        <div class="author-info">
                            <span class="author-name">
                                <img src="${profile.photo || 'https://via.placeholder.com/30'}" alt="${authorName}" class="author-pic">
                                <span class="author-name">${authorName}</span>
                            </span>
                            <span class="reactions ${product.isLiked ? 'liked' : ''}" id="reactions-${product.id}">
                                <i class="fas fa-heart"></i> <span class="like-count">${product.likes}</span>
                                ${!isAuthenticated ? `<span class="login-prompt">Connectez-vous pour liker</span>` : ''} 
                            </span>
                        </div>
                        <h5 class="product-name">${product.name}</h5>
                        <p class="product-type">${product.type} - ${product.sub_type}</p>
                        <div class="date-price">
                            <span class="date">${createdAt}</span>
                            <span class="price">${product.price}₱</span>
                        </div>
                        <p class="description">
                            <span id="description-${product.id}" class="description-content truncated">${product.description}</span>
                            <a id="description-toggle-${product.id}" class="voir-plus">Voir plus</a>
                        </p>
                        <p class="cities">
                            <strong>Villes :</strong>
                            <span id="cities-${product.id}" class="cities-content truncated">${citiesText}</span>
                            <a id="cities-toggle-${product.id}" class="voir-plus">Voir plus</a>
                        </p>
                        <div class="dropdown">
                            <button class="order-btn dropdown-toggle" type="button" data-bs-toggle="dropdown">Commander</button>
                            <ul class="dropdown-menu">
                                ${product.contact_whatsapp ? `<li><a class="dropdown-item" href="https://wa.me/${product.contact_whatsapp}?text=${whatsappMessage}" target="_blank">WhatsApp</a></li>` : ''}
                                ${product.contact_email ? `<li><a class="dropdown-item" href="mailto:${product.contact_email}?subject=Commande%20${encodeURIComponent(product.name)}">Email</a></li>` : ''}
                                ${isAuthenticated && product.user_id !== user.id ? `<li><a class="dropdown-item message-option" href="#" data-product-id="${product.id}" data-receiver-id="${product.user_id}" data-product-name="${encodeURIComponent(product.name)}">Message</a></li>` : ''}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            blogContainer.appendChild(card);

            // Initialiser le carrousel
            if (product.media.length > 1) {
                const carouselElement = document.getElementById(`carousel-${product.id}`);
                if (carouselElement) {
                    new bootstrap.Carousel(carouselElement, {
                        ride: 'carousel'
                    });
                } else {
                    console.warn(`Carrousel non trouvé pour le produit ${product.id}`);
                }
            }

            // Initialiser le dropdown
            const dropdownElement = card.querySelector('.dropdown-toggle');
            if (dropdownElement) {
                new bootstrap.Dropdown(dropdownElement);
            } else {
                console.warn(`Dropdown non trouvé pour le produit ${product.id}`);
            }

            // Gérer "Voir plus"
            const toggleContent = (id, type) => {
                const content = document.getElementById(`${type}-${id}`);
                const button = document.getElementById(`${type}-toggle-${id}`);
                if (content.classList.contains('truncated')) {
                    content.classList.remove('truncated');
                    button.innerText = 'Voir moins';
                } else {
                    content.classList.add('truncated');
                    button.innerText = 'Voir plus';
                }
            };
            document.getElementById(`description-toggle-${product.id}`).addEventListener('click', () => toggleContent(product.id, 'description'));
            document.getElementById(`cities-toggle-${product.id}`).addEventListener('click', () => toggleContent(product.id, 'cities'));

            // Gérer les likes
            const reactions = document.getElementById(`reactions-${product.id}`);
            if (isAuthenticated) {
                reactions.addEventListener('click', async () => {
                    const likeCountElement = reactions.querySelector('.like-count');
                    let currentLikes = parseInt(likeCountElement.textContent);

                    if (reactions.classList.contains('liked')) {
                        // Supprimer le like
                        const { error } = await supabaseClient
                            .from('likes')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('product_id', product.id);

                        if (error) {
                            console.error('Error removing like:', error);
                            return;
                        }

                        reactions.classList.remove('liked');
                        likeCountElement.textContent = currentLikes - 1;
                        product.likes = currentLikes - 1;
                        product.isLiked = false;
                    } else {
                        // Ajouter le like
                        const { error } = await supabaseClient
                            .from('likes')
                            .insert({ user_id: user.id, product_id: product.id });

                        if (error) {
                            console.error('Error adding like:', error);
                            return;
                        }

                        reactions.classList.add('liked');
                        likeCountElement.textContent = currentLikes + 1;
                        product.likes = currentLikes + 1;
                        product.isLiked = true;
                    }
                });
            }
        });

        // Gérer l'option de message
        document.querySelectorAll('.message-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!isAuthenticated) {
                    window.location.href = 'login.html';
                    return;
                }
                currentProductId = btn.dataset.productId;
                currentReceiverId = btn.dataset.receiverId;
                const productName = decodeURIComponent(btn.dataset.productName);
                const messageContent = document.getElementById('message-content');
                messageContent.value = `Je veux en savoir plus sur votre produit '${productName}'.`;
                document.getElementById('send-loading').style.display = 'none';
                document.getElementById('send-success').style.display = 'none';
                sendMessageModal.show();
            });
        });
    };

    // Gérer l'envoi de message
    document.getElementById('send-message-btn').addEventListener('click', async () => {
        if (!isAuthenticated) {
            window.location.href = 'login.html';
            return;
        }

        const content = document.getElementById('message-content').value.trim();
        if (!content || !currentProductId || !currentReceiverId) return;

        document.getElementById('send-loading').style.display = 'block';
        document.getElementById('send-success').style.display = 'none';
        document.getElementById('send-message-btn').disabled = true;
        document.querySelector('#sendMessageModal .btn-cancel').disabled = true;

        const { error } = await supabaseClient
            .from('messages')
            .insert({
                sender_id: user.id,
                receiver_id: currentReceiverId,
                product_id: currentProductId,
                content
            });

        if (error) {
            console.error('Error sending message:', error);
            document.getElementById('send-loading').style.display = 'none';
            document.getElementById('send-message-btn').disabled = false;
            document.querySelector('#sendMessageModal .btn-cancel').disabled = false;
            return;
        }

        document.getElementById('send-loading').style.display = 'none';
        document.getElementById('send-success').style.display = 'block';
        document.getElementById('message-content').value = '';

        setTimeout(() => {
            sendMessageModal.hide();
            document.getElementById('send-message-btn').disabled = false;
            document.querySelector('#sendMessageModal .btn-cancel').disabled = false;
            currentProductId = null;
            currentReceiverId = null;
        }, 1000);
    });

    // Fonction pour filtrer les produits
    const filterProducts = () => {
        const selectedType = typeFilter.value;
        const selectedSubType = subTypeFilter.value;
        const selectedCity = cityFilter.value;

        const filteredProducts = allProducts.filter(product => {
            return (!selectedType || product.type === selectedType) &&
                   (!selectedSubType || product.sub_type === selectedSubType) &&
                   (!selectedCity || product.cities.includes(selectedCity));
        });

        renderProducts(filteredProducts);
    };

    // Initialiser rendu et filtres
    renderProducts(allProducts);
    typeFilter.addEventListener('change', filterProducts);
    subTypeFilter.addEventListener('change', filterProducts);
    cityFilter.addEventListener('change', filterProducts);
});