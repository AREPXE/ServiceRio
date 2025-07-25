document.addEventListener('DOMContentLoaded', async () => {
    const popularContainer = document.getElementById('popular-products');
    const recentContainer = document.getElementById('recent-products');
    const otherContainer = document.getElementById('other-products');
    const authSection = document.getElementById('auth-section');
    const emailForm = document.getElementById('email-form');
    const emailSubject = document.getElementById('email-subject');
    let currentProductId = null;
    let currentReceiverId = null;

    popularContainer.innerHTML = '<div style="text-align: center; color: #6c757d; font-size: 1.2rem; margin: 20px;">Chargement...</div>';
    recentContainer.innerHTML = '<div style="text-align: center; color: #6c757d; font-size: 1.2rem; margin: 20px;">Chargement...</div>';
    otherContainer.innerHTML = '<div style="text-align: center; color: #6c757d; font-size: 1.2rem; margin: 20px;">Chargement...</div>';

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
                const { error } = await supabaseClient.auth.signOut();
                if (error) {
                    console.error('Logout error:', error);
                } else {
                    window.location.href = 'login.html';
                }
            });
        }
    } else {
        authSection.innerHTML = '<a href="login.html" class="auth-btn nav-link">Connexion/Inscription</a>';
    }

    // Initialiser la modale
    const sendMessageModalElement = document.getElementById('sendMessageModal');
    if (!sendMessageModalElement) {
        console.error('Modale #sendMessageModal non trouvée dans le DOM');
        return;
    }
    const sendMessageModal = new bootstrap.Modal(sendMessageModalElement);
    console.log('Modale sendMessageModal initialisée');

    // Charger tous les produits non supprimés
    console.log('Chargement des produits avec is_deleted = "non"');
    const { data: products, error: productsError } = await supabaseClient
        .from('products')
        .select('id, name, type, sub_type, price, description, cities, media, media_types, created_at, contact_whatsapp, contact_email, user_id')
        .eq('is_deleted', 'non')
        .order('created_at', { ascending: false });

    if (productsError) {
        console.error('Products fetch error:', productsError);
        popularContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement.</p>';
        recentContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement.</p>';
        otherContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement.</p>';
        return;
    }

    if (!products || products.length === 0) {
        console.log('Aucun produit trouvé avec is_deleted = "non"');
        popularContainer.innerHTML = '<p>Aucun produit disponible.</p>';
        recentContainer.innerHTML = '<p>Aucun produit disponible.</p>';
        otherContainer.innerHTML = '<p>Aucun produit disponible.</p>';
        return;
    }

    console.log('Produits chargés:', products);

    // Charger les likes
    const { data: likes, error: likesError } = await supabaseClient
        .from('likes')
        .select('product_id, user_id');

    if (likesError) {
        console.error('Likes fetch error:', likesError);
        popularContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des likes.</p>';
        recentContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des likes.</p>';
        otherContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des likes.</p>';
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

    // Ajouter le nombre de likes à chaque produit
    const productsWithLikes = products.map(product => ({
        ...product,
        likes: likesCount[product.id] || 0,
        isLiked: userLikes.has(product.id)
    }));

    // Récupérer profils des vendeurs
    const userIds = [...new Set(products.map(p => p.user_id))];
    const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select('id, first_name, last_name, photo')
        .in('id', userIds);

    if (profilesError) {
        console.error('Profiles fetch error:', profilesError);
        popularContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des profils.</p>';
        recentContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des profils.</p>';
        otherContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des profils.</p>';
        return;
    }

    const profileMap = profiles.reduce((map, profile) => {
        map[profile.id] = profile;
        return map;
    }, {});

    // Sélectionner produits
    const popularProducts = productsWithLikes
        .sort((a, b) => (b.likes || 0) - (a.likes || 0))
        .slice(0, 20);
    console.log('Produits Populaires (tri par likes) :', popularProducts.map(p => ({ id: p.id, name: p.name, likes: p.likes })));

    const recentProducts = productsWithLikes
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 20);
    console.log('Produits Récents (tri par created_at) :', recentProducts.map(p => ({ id: p.id, name: p.name, created_at: p.created_at })));

    const usedIds = new Set([...popularProducts, ...recentProducts].map(p => p.id));
    const otherProducts = productsWithLikes
        .filter(p => !usedIds.has(p.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);
    console.log('Autres Produits (aléatoire) :', otherProducts.map(p => ({ id: p.id, name: p.name })));

    // Fonction pour rendre produits
    const renderProducts = (container, products, sectionPrefix) => {
        container.innerHTML = '';
        if (products.length === 0) {
            container.innerHTML = '<p>Aucun produit dans cette catégorie.</p>';
            return;
        }

        products.forEach((product, index) => {
            const profile = profileMap[product.user_id] || { first_name: 'Inconnu', last_name: '', photo: 'https://via.placeholder.com/30' };
            const citiesText = product.cities.join(', ');
            const createdAt = new Date(product.created_at).toLocaleDateString('fr-FR');
            const authorName = `${profile.first_name} ${profile.last_name}`.trim();

            if (!product.media || !product.media_types || product.media.length !== product.media_types.length) {
                console.warn(`Produit ${product.id} : médias invalides`, product.media, product.media_types);
                return;
            }

            const mediaUrl = product.media[0] || '';
            const whatsappMessage = encodeURIComponent(
                `Produit : ${product.name}\n` +
                `Média : ${mediaUrl}\n` +
                `Vendeur : ${authorName}\n` +
                `Prix : ${product.price}₱\n` +
                `Je veux qu'on en discute`
            );

            const card = document.createElement('div');
            card.classList.add('blog-card');
            card.style.setProperty('--index', index);
            card.innerHTML = `
                <div id="${sectionPrefix}-carousel-${product.id}" class="carousel slide" data-bs-ride="carousel">
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
                        <button class="carousel-control-prev" type="button" data-bs-target="#${sectionPrefix}-carousel-${product.id}" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#${sectionPrefix}-carousel-${product.id}" data-bs-slide="next">
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
                        <span class="reactions ${product.isLiked ? 'liked' : ''}" id="${sectionPrefix}-reactions-${product.id}">
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
                        <span id="${sectionPrefix}-description-${product.id}" class="description-content truncated">${product.description}</span>
                        <a id="${sectionPrefix}-description-toggle-${product.id}" class="voir-plus">Voir plus</a>
                    </p>
                    <p class="cities">
                        <strong>Villes :</strong>
                        <span id="${sectionPrefix}-cities-${product.id}" class="cities-content truncated">${citiesText}</span>
                        <a id="${sectionPrefix}-cities-toggle-${product.id}" class="voir-plus">Voir plus</a>
                    </p>
                    <div class="dropdown">
                        <button class="order-btn dropdown-toggle" type="button" data-bs-toggle="dropdown">Commander</button>
                        <ul class="dropdown-menu">
                            ${product.contact_whatsapp ? `<li><a class="dropdown-item" href="https://wa.me/${product.contact_whatsapp}?text=${whatsappMessage}" target="_blank">WhatsApp</a></li>` : ''}
                            ${product.contact_email ? `<li><a class="dropdown-item" href="mailto:${product.contact_email}?subject=Commande%20${encodeURIComponent(product.name)}">Email</a></li>` : ''}
                            <li><a class="dropdown-item message-option" href="#" data-product-id="${product.id}" data-receiver-id="${product.user_id}" data-product-name="${encodeURIComponent(product.name)}">Message</a>
                            ${!isAuthenticated ? `<span class="login-prompt">Connectez-vous pour envoyer un message</span>` : ''}</li>
                        </ul>
                    </div>
                </div>
            `;
            container.appendChild(card);

            // Gérer l'option de message
            const messageOption = card.querySelector('.message-option');
            if (messageOption) {
                console.log(`Ajout d'écouteur pour message-option du produit ${product.id}, receiver ${product.user_id}`);
                messageOption.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Clic sur message-option:', {
                        productId: messageOption.dataset.productId,
                        receiverId: messageOption.dataset.receiverId,
                        productName: messageOption.dataset.productName,
                        isAuthenticated
                    });
                    if (!isAuthenticated) {
                        console.log('Utilisateur non authentifié, redirection vers login.html');
                        window.location.href = 'login.html';
                        return;
                    }
                    currentProductId = messageOption.dataset.productId;
                    currentReceiverId = messageOption.dataset.receiverId;
                    const productName = decodeURIComponent(messageOption.dataset.productName);
                    const messageContent = document.getElementById('message-content');
                    if (messageContent) {
                        messageContent.value = `Je veux en savoir plus sur votre produit '${productName}'.`;
                    } else {
                        console.error('Champ #message-content non trouvé');
                    }
                    document.getElementById('send-loading').style.display = 'none';
                    document.getElementById('send-success').style.display = 'none';
                    try {
                        sendMessageModal.show();
                        console.log('Modale ouverte pour le produit', product.id);
                    } catch (error) {
                        console.error('Erreur lors de l\'ouverture de la modale:', error);
                    }
                });
            } else {
                console.warn(`Option de message non trouvée pour le produit ${product.id}`);
            }

            if (product.media.length > 1) {
                const carouselElement = document.getElementById(`${sectionPrefix}-carousel-${product.id}`);
                if (carouselElement) {
                    new bootstrap.Carousel(carouselElement, {
                        ride: 'carousel'
                    });
                } else {
                    console.warn(`Carrousel non trouvé pour le produit ${product.id} dans la section ${sectionPrefix}`);
                }
            }

            const dropdownElement = card.querySelector('.dropdown-toggle');
            if (dropdownElement) {
                new bootstrap.Dropdown(dropdownElement);
            } else {
                console.warn(`Dropdown non trouvé pour le produit ${product.id} dans la section ${sectionPrefix}`);
            }

            const toggleContent = (id, type) => {
                const content = document.getElementById(`${sectionPrefix}-${type}-${id}`);
                const button = document.getElementById(`${sectionPrefix}-${type}-toggle-${id}`);
                if (content.classList.contains('truncated')) {
                    content.classList.remove('truncated');
                    button.innerText = 'Voir moins';
                } else {
                    content.classList.add('truncated');
                    button.innerText = 'Voir plus';
                }
            };
            document.getElementById(`${sectionPrefix}-description-toggle-${product.id}`).addEventListener('click', () => toggleContent(product.id, 'description'));
            document.getElementById(`${sectionPrefix}-cities-toggle-${product.id}`).addEventListener('click', () => toggleContent(product.id, 'cities'));

            const reactions = document.getElementById(`${sectionPrefix}-reactions-${product.id}`);
            if (isAuthenticated) {
                reactions.addEventListener('click', async () => {
                    const likeCountElement = reactions.querySelector('.like-count');
                    let currentLikes = parseInt(likeCountElement.textContent);

                    if (reactions.classList.contains('liked')) {
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
    };

    // Gérer l'envoi de message
    const sendMessageBtn = document.getElementById('send-message-btn');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', async () => {
            console.log('Tentative d\'envoi de message via sendMessageModal...');
            console.log('User ID:', user?.id);
            console.log('Receiver ID:', currentReceiverId);
            console.log('Product ID:', currentProductId);

            const content = document.getElementById('message-content').value.trim();
            if (!content) {
                console.warn('Contenu du message vide');
                document.getElementById('message-content').value = 'Veuillez entrer un message.';
                return;
            }
            if (!currentProductId) {
                console.warn('Produit non défini pour le message');
                document.getElementById('message-content').value = 'Erreur : Aucun produit sélectionné.';
                return;
            }
            if (!currentReceiverId) {
                console.warn('Destinataire non défini pour le message');
                document.getElementById('message-content').value = 'Erreur : Aucun destinataire sélectionné.';
                return;
            }
            if (currentReceiverId === user?.id) {
                console.warn('Tentative d\'envoi d\'un message à soi-même');
                document.getElementById('message-content').value = 'Erreur : Vous ne pouvez pas vous envoyer un message à vous-même.';
                return;
            }

            document.getElementById('send-loading').style.display = 'block';
            document.getElementById('send-success').style.display = 'none';
            sendMessageBtn.disabled = true;
            document.querySelector('#sendMessageModal .btn-cancel').disabled = true;

            const { error } = await supabaseClient
                .from('messages')
                .insert({
                    sender_id: user.id,
                    receiver_id: currentReceiverId,
                    product_id: currentProductId,
                    content,
                    is_read: false
                });

            if (error) {
                console.error('Erreur lors de l\'envoi du message:', error);
                document.getElementById('send-loading').style.display = 'none';
                sendMessageBtn.disabled = false;
                document.querySelector('#sendMessageModal .btn-cancel').disabled = false;
                document.getElementById('message-content').value = `Erreur : ${error.message}`;
                return;
            }

            console.log('Message envoyé avec succès via sendMessageModal');
            document.getElementById('send-loading').style.display = 'none';
            document.getElementById('send-success').style.display = 'block';
            document.getElementById('message-content').value = '';

            setTimeout(() => {
                sendMessageModal.hide();
                sendMessageBtn.disabled = false;
                document.querySelector('#sendMessageModal .btn-cancel').disabled = false;
                currentProductId = null;
                currentReceiverId = null;
            }, 1000);
        });
    } else {
        console.error('Bouton #send-message-btn non trouvé dans le DOM');
    }

    // Gérer la fermeture de la modale
    sendMessageModalElement.addEventListener('hidden.bs.modal', () => {
        console.log('Modale sendMessageModal fermée');
        const popularSection = document.getElementById('popular-products');
        if (popularSection) {
            popularSection.focus();
            console.log('Focus déplacé vers popular-products');
        }
        currentProductId = null;
        currentReceiverId = null;
    });

    renderProducts(popularContainer, popularProducts, 'popular');
    renderProducts(recentContainer, recentProducts, 'recent');
    renderProducts(otherContainer, otherProducts, 'other');
});