document.addEventListener('DOMContentLoaded', async () => {
    const blogContainer = document.getElementById('blog-container');
    const authSection = document.getElementById('auth-section');
    const emailForm = document.getElementById('email-form');
    const emailSubject = document.getElementById('email-subject');
    // const messageIcon = document.getElementById('message-icon');
    // const unreadCount = document.getElementById('unread-count');
    // const messagesModal = new bootstrap.Modal(document.getElementById('messagesModal'));
    // const sendMessageModal = new bootstrap.Modal(document.getElementById('sendMessageModal'));
    // let currentProductId = null;
    // let currentReceiverId = null;

    blogContainer.innerHTML = '<div style="text-align: center; color: #6c757d; font-size: 1.2rem; margin: 20px;">Chargement en cours...</div>';

    // Gérer le formulaire e-mail
    emailForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const subject = encodeURIComponent(emailSubject.value.trim());
        const email = 'Serviciorio@hotmail.com';
        window.location.href = `mailto:${email}?subject=${subject}`;
        emailSubject.value = '';
    });

    // Vérifier utilisateur connecté
    const user = await getCurrentUser();
    if (!user) {
        console.warn('Utilisateur non connecté, redirection vers login.html');
        window.location.href = 'login.html';
        return;
    }

    // Gérer l'affichage de la section authentification
    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name, photo, email')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error('Erreur lors du chargement du profil:', profileError);
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
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Afficher profil
    if (profileError || !profile) {
        console.error('Erreur lors du chargement du profil:', profileError);
        document.getElementById('profile-name').textContent = 'Erreur de chargement';
        document.getElementById('profile-email').textContent = '';
        blogContainer.innerHTML = '<p>Erreur lors du chargement du profil.</p>';
        return;
    }

    document.getElementById('profile-name').textContent = `${profile.first_name} ${profile.last_name}`;
    document.getElementById('profile-email').textContent = profile.email;
    if (profile.photo) {
        document.getElementById('profile-photo').src = profile.photo;
    }

    // Compter les messages non lus
    // const updateUnreadCount = async () => {
    //     const { data: unreadMessages, error } = await supabaseClient
    //         .from('messages')
    //         .select('id')
    //         .eq('receiver_id', user.id)
    //         .eq('is_read', false);

    //     if (error) {
    //         console.error('Erreur lors du comptage des messages non lus:', error);
    //         return;
    //     }

    //     unreadCount.textContent = unreadMessages.length;
    //     unreadCount.style.display = unreadMessages.length > 0 ? 'inline' : 'none';
    // };

    // await updateUnreadCount();

    // Gérer l'ouverture de la modale de messagerie
    // messageIcon.addEventListener('click', async () => {
    //     const messageList = document.getElementById('message-list');
    //     messageList.innerHTML = '<div style="text-align: center; color: #6c757d;">Chargement...</div>';

    //     // Charger les messages
    //     const { data: messages, error } = await supabaseClient
    //         .from('messages')
    //         .select(`
    //             id, content, created_at, is_read,
    //             sender_id, receiver_id, product_id,
    //             sender:profiles!sender_id (first_name, last_name),
    //             product:products (name)
    //         `)
    //         .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    //         .order('created_at', { ascending: true });

    //     if (error) {
    //         console.error('Erreur lors du chargement des messages:', error);
    //         messageList.innerHTML = '<p style="color: red;">Erreur lors du chargement des messages.</p>';
    //         return;
    //     }

    //     if (!messages || messages.length === 0) {
    //         messageList.innerHTML = '<p>Aucun message.</p>';
    //         currentProductId = null;
    //         currentReceiverId = null;
    //         return;
    //     }

    //     console.log('Messages chargés:', messages);

    //     // Grouper les messages par conversation (produit et interlocuteur)
    //     const conversations = {};
    //     messages.forEach(msg => {
    //         const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
    //         if (otherUserId === user.id) {
    //             console.warn('Message avec sender_id et receiver_id identiques:', msg);
    //             return; // Ignorer les messages où l'utilisateur s'envoie à lui-même
    //         }
    //         const key = `${msg.product_id}-${otherUserId}`;
    //         if (!conversations[key]) {
    //             conversations[key] = {
    //                 product_id: msg.product_id,
    //                 product_name: msg.product?.name || 'Produit inconnu',
    //                 other_user_id: otherUserId,
    //                 other_user_name: msg.sender_id === user.id ? 'Vous' : `${msg.sender.first_name} ${msg.sender.last_name}`,
    //                 messages: []
    //             };
    //         }
    //         conversations[key].messages.push(msg);
    //     });

    //     // Afficher les conversations
    //     messageList.innerHTML = '';
    //     const conversationElements = [];
    //     Object.values(conversations).forEach(conv => {
    //         const convElement = document.createElement('div');
    //         convElement.classList.add('conversation');
    //         convElement.dataset.productId = conv.product_id;
    //         convElement.dataset.receiverId = conv.other_user_id;
    //         convElement.innerHTML = `
    //             <h6>${conv.product_name} - ${conv.other_user_name}</h6>
    //             <div class="conversation-messages">
    //                 ${conv.messages.map(msg => `
    //                     <div class="message-item ${msg.sender_id === user.id ? 'sent' : 'received'}">
    //                         <div class="message-content">${msg.content}</div>
    //                         <div class="message-meta">
    //                             <span>${new Date(msg.created_at).toLocaleString('fr-FR')}</span>
    //                             <span>${msg.is_read ? 'Lu' : 'Non lu'}</span>
    //                         </div>
    //                     </div>
    //                 `).join('')}
    //             </div>
    //         `;
    //         messageList.appendChild(convElement);
    //         conversationElements.push(convElement);

    //         // Marquer les messages reçus comme lus
    //         if (conv.messages.some(msg => msg.receiver_id === user.id && !msg.is_read)) {
    //             supabaseClient
    //                 .from('messages')
    //                 .update({ is_read: true })
    //                 .eq('receiver_id', user.id)
    //                 .in('id', conv.messages.filter(msg => msg.receiver_id === user.id && !msg.is_read).map(msg => msg.id))
    //                 .then(() => updateUnreadCount());
    //         }
    //     });

    //     // Sélectionner la première conversation par défaut
    //     if (conversationElements.length > 0) {
    //         const firstConv = conversationElements[0];
    //         firstConv.classList.add('active-conversation');
    //         currentProductId = firstConv.dataset.productId;
    //         currentReceiverId = firstConv.dataset.receiverId;
    //         document.getElementById('reply-content').value = `Re: ${Object.values(conversations)[0].product_name}`;
    //         console.log('Conversation par défaut sélectionnée:', {
    //             product_id: currentProductId,
    //             receiver_id: currentReceiverId,
    //             product_name: Object.values(conversations)[0].product_name
    //         });
    //     } else {
    //         messageList.innerHTML = '<p>Aucune conversation valide trouvée.</p>';
    //         currentProductId = null;
    //         currentReceiverId = null;
    //     }

    //     // Gérer la sélection de conversation via délégation
    //     messageList.addEventListener('click', (e) => {
    //         const convElement = e.target.closest('.conversation');
    //         if (!convElement) return;

    //         console.log('Clic sur une conversation détecté');
    //         // Supprimer la classe active des autres conversations
    //         conversationElements.forEach(el => el.classList.remove('active-conversation'));
    //         convElement.classList.add('active-conversation');

    //         // Mettre à jour le contexte
    //         currentProductId = convElement.dataset.productId;
    //         currentReceiverId = convElement.dataset.receiverId;
    //         const productName = convElement.querySelector('h6').textContent.split(' - ')[0];
    //         document.getElementById('reply-content').value = `Re: ${productName}`;
    //         console.log('Conversation sélectionnée:', {
    //             product_id: currentProductId,
    //             receiver_id: currentReceiverId,
    //             product_name: productName
    //         });
    //     });

    //     // Faire défiler vers le bas
    //     messageList.scrollTop = messageList.scrollHeight;

    //     messagesModal.show();
    // });

    // Gérer la fermeture de la modale pour éviter les problèmes de focus
    // document.getElementById('messagesModal').addEventListener('hidden.bs.modal', () => {
    //     // Déplacer le focus vers un élément hors de la modale
    //     const messageIcon = document.getElementById('message-icon');
    //     if (messageIcon) {
    //         messageIcon.focus();
    //         console.log('Focus déplacé vers message-icon après fermeture de messagesModal');
    //     }
    // });

    // Gérer l'envoi de réponse
    // const replyForm = document.getElementById('reply-form');
    // replyForm.addEventListener('submit', async (e) => {
    //     e.preventDefault();
    //     console.log('Tentative d\'envoi de réponse...');
    //     console.log('User ID:', user.id);
    //     console.log('Receiver ID:', currentReceiverId);
    //     console.log('Product ID:', currentProductId);

    //     const content = document.getElementById('reply-content').value.trim();
    //     if (!content) {
    //         console.warn('Contenu de la réponse vide');
    //         const messageList = document.getElementById('message-list');
    //         messageList.innerHTML = '<p style="color: red;">Veuillez entrer un message.</p>' + messageList.innerHTML;
    //         return;
    //     }
    //     if (!currentProductId) {
    //         console.warn('Produit non défini pour la réponse');
    //         const messageList = document.getElementById('message-list');
    //         messageList.innerHTML = '<p style="color: red;">Veuillez sélectionner une conversation.</p>' + messageList.innerHTML;
    //         return;
    //     }
    //     if (!currentReceiverId) {
    //         console.warn('Destinataire non défini pour la réponse');
    //         const messageList = document.getElementById('message-list');
    //         messageList.innerHTML = '<p style="color: red;">Veuillez sélectionner une conversation.</p>' + messageList.innerHTML;
    //         return;
    //     }
    //     if (currentReceiverId === user.id) {
    //         console.warn('Tentative d\'envoi d\'un message à soi-même');
    //         const messageList = document.getElementById('message-list');
    //         messageList.innerHTML = '<p style="color: red;">Vous ne pouvez pas vous envoyer un message à vous-même.</p>' + messageList.innerHTML;
    //         return;
    //     }

    //     const { error } = await supabaseClient
    //         .from('messages')
    //         .insert({
    //             sender_id: user.id,
    //             receiver_id: currentReceiverId,
    //             product_id: currentProductId,
    //             content,
    //             is_read: false
    //         });

    //     if (error) {
    //         console.error('Erreur lors de l\'envoi de la réponse:', error);
    //         const messageList = document.getElementById('message-list');
    //         messageList.innerHTML = `<p style="color: red;">Erreur lors de l'envoi : ${error.message}</p>` + messageList.innerHTML;
    //         return;
    //     }

    //     console.log('Réponse envoyée avec succès');
    //     document.getElementById('reply-content').value = '';
    //     messageIcon.click(); // Rafraîchir la modale
    // });

    // Charger produits (non supprimés)
    console.log('Chargement des produits pour user_id:', user.id);
    const { data: products, error: productsError } = await supabaseClient
        .from('products')
        .select('id, name, type, sub_type, price, description, cities, media, media_types, created_at, contact_whatsapp, contact_email, user_id')
        .eq('user_id', user.id)
        .eq('is_deleted', 'non')
        .order('created_at', { ascending: false });

    if (productsError) {
        console.error('Erreur lors du chargement des produits:', productsError);
        blogContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des produits : ' + productsError.message + '</p>';
        return;
    }

    if (!products || products.length === 0) {
        console.log('Aucun produit trouvé avec is_deleted = "non"');
        blogContainer.innerHTML = '<p>Aucun produit publié.</p>';
        return;
    }

    console.log('Produits chargés:', products);

    // Charger les likes
    const { data: likes, error: likesError } = await supabaseClient
        .from('likes')
        .select('product_id, user_id');

    if (likesError) {
        console.error('Erreur lors du chargement des likes:', likesError);
        blogContainer.innerHTML = '<p style="color: red;">Erreur lors du chargement des likes.</p>';
        return;
    }

    // Compter les likes par produit
    const likesCount = likes.reduce((acc, like) => {
        acc[like.product_id] = (acc[like.product_id] || 0) + 1;
        return acc;
    }, {});

    // Vérifier les likes de l'utilisateur connecté
    const userLikes = new Set(likes.filter(like => like.user_id === user.id).map(like => like.product_id));

    // Ajouter likes aux produits
    const enrichedProducts = products.map(product => ({
        ...product,
        likes: likesCount[product.id] || 0,
        isLiked: userLikes.has(product.id)
    }));

    blogContainer.innerHTML = '';

    enrichedProducts.forEach((product, index) => {
        const citiesText = product.cities.join(', ');
        const createdAt = new Date(product.created_at).toLocaleDateString('fr-FR');
        const authorName = `${profile.first_name} ${profile.last_name}`;
        const authorPic = profile.photo || 'https://via.placeholder.com/30';

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
                            <span class="visually-hidden">Précédent</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#carousel-${product.id}" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Suivant</span>
                        </button>
                    ` : ''}
                </div>
                <div class="card-body">
                    <div class="author-info">
                        <span class="author-name">
                            <img src="${authorPic}" alt="${authorName}" class="author-pic">
                            <span class="author-name">${authorName}</span>
                        </span>
                        <span class="reactions ${product.isLiked ? 'liked' : ''}" id="reactions-${product.id}">
                            <i class="fas fa-heart"></i> <span class="like-count">${product.likes}</span>
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
                        <button class="order-btn dropdown-toggle" type="button" id="dropdown-${product.id}" data-bs-toggle="dropdown" aria-expanded="false">Commander</button>
                        <ul class="dropdown-menu" aria-labelledby="dropdown-${product.id}">
                            ${product.contact_whatsapp ? `<li><a class="dropdown-item" href="https://wa.me/${product.contact_whatsapp}?text=${whatsappMessage}" target="_blank">WhatsApp</a></li>` : ''}
                            ${product.contact_email ? `<li><a class="dropdown-item" href="mailto:${product.contact_email}?subject=Commande%20${encodeURIComponent(product.name)}">Email</a></li>` : ''}
                            <li><a class="dropdown-item message-option" href="#" data-product-id="${product.id}" data-receiver-id="${product.user_id}" data-product-name="${encodeURIComponent(product.name)}">Message</a></li>
                        </ul>
                    </div>
                </div>
                <button class="delete-btn" data-id="${product.id}">
                    <i class="fas fa-trash"></i>
                </button>
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
        const dropdownElement = document.getElementById(`dropdown-${product.id}`);
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
                    console.error('Erreur lors de la suppression du like:', error);
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
                    console.error('Erreur lors de l\'ajout du like:', error);
                    return;
                }

                reactions.classList.add('liked');
                likeCountElement.textContent = currentLikes + 1;
                product.likes = currentLikes + 1;
                product.isLiked = true;
            }
        });
    });

    // Gérer l'option de message
    document.querySelectorAll('.message-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
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

    // Gérer l'envoi de message
    // document.getElementById('send-message-btn').addEventListener('click', async () => {
    //     console.log('Tentative d\'envoi de message via sendMessageModal...');
    //     console.log('User ID:', user.id);
    //     console.log('Receiver ID:', currentReceiverId);
    //     console.log('Product ID:', currentProductId);

    //     const content = document.getElementById('message-content').value.trim();
    //     if (!content) {
    //         console.warn('Contenu du message vide');
    //         return;
    //     }
    //     if (!currentProductId) {
    //         console.warn('Produit non défini pour le message');
    //         return;
    //     }
    //     if (!currentReceiverId) {
    //         console.warn('Destinataire non défini pour le message');
    //         return;
    //     }
    //     if (currentReceiverId === user.id) {
    //         console.warn('Tentative d\'envoi d\'un message à soi-même via sendMessageModal');
    //         const messageContent = document.getElementById('message-content');
    //         messageContent.value = 'Erreur : Vous ne pouvez pas vous envoyer un message à vous-même.';
    //         return;
    //     }

    //     document.getElementById('send-loading').style.display = 'block';
    //     document.getElementById('send-success').style.display = 'none';
    //     document.getElementById('send-message-btn').disabled = true;
    //     document.querySelector('#sendMessageModal .btn-cancel').disabled = true;

    //     const { error } = await supabaseClient
    //         .from('messages')
    //         .insert({
    //             sender_id: user.id,
    //             receiver_id: currentReceiverId,
    //             product_id: currentProductId,
    //             content,
    //             is_read: false
    //         });

    //     if (error) {
    //         console.error('Erreur lors de l\'envoi du message:', error);
    //         document.getElementById('send-loading').style.display = 'none';
    //         document.getElementById('send-message-btn').disabled = false;
    //         document.querySelector('#sendMessageModal .btn-cancel').disabled = false;
    //         return;
    //     }

    //     console.log('Message envoyé avec succès via sendMessageModal');
    //     document.getElementById('send-loading').style.display = 'none';
    //     document.getElementById('send-success').style.display = 'block';
    //     document.getElementById('message-content').value = '';

    //     setTimeout(() => {
    //         sendMessageModal.hide();
    //         document.getElementById('send-message-btn').disabled = false;
    //         document.querySelector('#sendMessageModal .btn-cancel').disabled = false;
    //         currentProductId = null;
    //         currentReceiverId = null;
    //     }, 1000);
    // });

    // Initialiser la modale de suppression
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    let productIdToDelete = null;

    // Gérer suppression
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            productIdToDelete = btn.dataset.id;
            console.log('Bouton supprimer cliqué, productIdToDelete:', productIdToDelete);
            // Réinitialiser les messages
            const confirmMessage = document.getElementById('confirmMessage');
            const loadingMessage = document.getElementById('loadingMessage');
            const successMessage = document.getElementById('successMessage');
            if (confirmMessage && loadingMessage && successMessage) {
                confirmMessage.style.display = 'block';
                loadingMessage.style.display = 'none';
                successMessage.style.display = 'none';
            } else {
                console.error('Un ou plusieurs éléments de la modale de suppression sont manquants');
                return;
            }
            deleteModal.show();
        });
    });

    // Gérer confirmation de suppression
    document.getElementById('confirmDelete').addEventListener('click', async () => {
        if (!productIdToDelete) {
            console.error('Aucun productIdToDelete défini');
            deleteModal.hide();
            return;
        }

        console.log('Confirmation de suppression pour product_id:', productIdToDelete);

        // Afficher "Suppression en cours..."
        const confirmMessage = document.getElementById('confirmMessage');
        const loadingMessage = document.getElementById('loadingMessage');
        const successMessage = document.getElementById('successMessage');
        if (confirmMessage && loadingMessage && successMessage) {
            confirmMessage.style.display = 'none';
            loadingMessage.style.display = 'block';
            successMessage.style.display = 'none';
        } else {
            console.error('Un ou plusieurs éléments de la modale de suppression sont manquants');
            deleteModal.hide();
            return;
        }
        document.getElementById('confirmDelete').disabled = true;
        document.querySelector('.btn-cancel').disabled = true;

        // Supprimer les likes associés
        const { error: likesError } = await supabaseClient
            .from('likes')
            .delete()
            .eq('product_id', productIdToDelete);

        if (likesError) {
            console.error('Erreur lors de la suppression des likes:', likesError);
            alert('Erreur lors de la suppression des likes : ' + likesError.message);
            loadingMessage.style.display = 'none';
            document.getElementById('confirmDelete').disabled = false;
            document.querySelector('.btn-cancel').disabled = false;
            deleteModal.hide();
            return;
        }

        console.log('Likes supprimés pour product_id:', productIdToDelete);

        // Marquer le produit comme supprimé
        const { data, error } = await supabaseClient
            .from('products')
            .update({ is_deleted: 'oui' })
            .eq('id', productIdToDelete)
            .select();

        if (error) {
            console.error('Erreur lors du marquage du produit comme supprimé:', error);
            alert('Erreur lors de la suppression : ' + error.message);
            loadingMessage.style.display = 'none';
            document.getElementById('confirmDelete').disabled = false;
            document.querySelector('.btn-cancel').disabled = false;
            deleteModal.hide();
            return;
        }

        console.log('Produit marqué comme supprimé:', data);

        // Afficher "Produit supprimé !"
        loadingMessage.style.display = 'none';
        successMessage.style.display = 'block';

        // Supprimer la carte du DOM
        const card = document.querySelector(`.delete-btn[data-id="${productIdToDelete}"]`).closest('.col-lg-3');
        if (card) {
            card.remove();
            console.log('Carte supprimée du DOM pour product_id:', productIdToDelete);
        } else {
            console.warn('Carte non trouvée pour product_id:', productIdToDelete);
        }

        // Fermer la modale après 1 seconde
        setTimeout(() => {
            deleteModal.hide();
            document.getElementById('confirmDelete').disabled = false;
            document.querySelector('.btn-cancel').disabled = false;
            productIdToDelete = null;
        }, 1000);
    });

    // Gérer redirection vers formulaire
    document.getElementById('add-product-btn').addEventListener('click', () => {
        window.location.href = 'form.html';
    });
});