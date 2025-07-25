document.addEventListener('DOMContentLoaded', async () => {
    // --- Éléments du DOM ---
    const conversationList = document.getElementById('conversation-list');
    const messageList = document.getElementById('message-list');
    const chatHeader = document.getElementById('chat-header');
    const messageForm = document.getElementById('message-form');
    const unreadIndicator = document.getElementById('unread-indicator');

    // Vues
    const conversationListView = document.getElementById('conversation-list-view');
    const chatView = document.getElementById('chat-view');
    
    // Boutons
    const chatToggleButton = document.getElementById('chat-toggle-button');
    const messagingSidebar = document.getElementById('messaging-sidebar');
    const closeChatSidebarButton = document.getElementById('close-chat-sidebar');
    const backToListBtn = document.getElementById('back-to-list-btn');

    // --- Variables d'état ---
    let currentProductId = null; // Sera défini en fonction du dernier message de la conversation
    let currentReceiverId = null;
    let conversationsCache = {};
    let currentUser = null;

    // --- Logique de la barre latérale et des vues ---
    const showChatView = () => {
        conversationListView.classList.add('hidden');
        chatView.classList.remove('hidden');
        chatView.classList.add('flex');
    };

    const showListView = () => {
        chatView.classList.add('hidden');
        chatView.classList.remove('flex');
        conversationListView.classList.remove('hidden');
        currentProductId = null;
        currentReceiverId = null;
        document.querySelectorAll('.conversation-item.active').forEach(item => item.classList.remove('active'));
    };

    chatToggleButton.addEventListener('click', () => messagingSidebar.classList.remove('translate-x-full'));
    closeChatSidebarButton.addEventListener('click', () => messagingSidebar.classList.add('translate-x-full'));
    backToListBtn.addEventListener('click', showListView);

    // --- Fonctions de la messagerie ---

    const loadConversations = async () => {
        if (!currentUser) return;
        conversationList.innerHTML = '<div class="p-4 text-center text-gray-500">Chargement...</div>';
        
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select(`
                id, content, created_at, is_read, product_id,
                sender_id, receiver_id,
                sender:profiles!sender_id (first_name, last_name, photo),
                receiver:profiles!receiver_id (first_name, last_name, photo)
            `)
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur lors du chargement des conversations:', error);
            conversationList.innerHTML = '<p class="p-4 text-red-500">Erreur de chargement.</p>';
            return;
        }

        if (!messages || messages.length === 0) {
            conversationList.innerHTML = '<p class="p-4 text-gray-500">Aucune conversation.</p>';
            return;
        }
        
        const conversations = {};
        messages.forEach(msg => {
            const otherUserId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
            if (!otherUserId || otherUserId === currentUser.id) return;
            
            const key = otherUserId;
            
            if (!conversations[key]) {
                const otherUser = msg.sender_id === currentUser.id ? msg.receiver : msg.sender;
                conversations[key] = {
                    other_user_id: otherUserId,
                    other_user_name: otherUser ? `${otherUser.first_name} ${otherUser.last_name}`.trim() : 'Utilisateur',
                    other_user_photo: otherUser?.photo || 'https://placehold.co/40x40/CBD5E0/4A5568?text=??',
                    last_message: msg,
                    unread_count: 0,
                };
            }
            
            if (new Date(msg.created_at) > new Date(conversations[key].last_message.created_at)) {
                conversations[key].last_message = msg;
            }
            if (msg.receiver_id === currentUser.id && !msg.is_read) {
                conversations[key].unread_count += 1;
            }
        });

        conversationsCache = conversations;
        renderConversations();
    };
    
    const renderConversations = () => {
        const sortedConversations = Object.values(conversationsCache).sort((a, b) => 
            new Date(b.last_message.created_at) - new Date(a.last_message.created_at)
        );

        if (sortedConversations.length === 0) {
            conversationList.innerHTML = '<p class="p-4 text-gray-500">Aucune conversation.</p>';
            return;
        }

        conversationList.innerHTML = '';
        let totalUnread = 0;
        
        sortedConversations.forEach(conv => {
            const convElement = document.createElement('div');
            convElement.className = 'conversation-item flex items-center justify-between';
            convElement.dataset.receiverId = conv.other_user_id;
            
            const preview = conv.last_message.content.slice(0, 30) + (conv.last_message.content.length > 30 ? '...' : '');
            
            convElement.innerHTML = `
                <div class="flex items-center overflow-hidden">
                    <img src="${conv.other_user_photo}" alt="${conv.other_user_name}">
                    <div class="overflow-hidden">
                        <div class="name">${conv.other_user_name}</div>
                        <div class="preview">${conv.last_message.sender_id === currentUser.id ? 'Vous: ' : ''}${preview}</div>
                    </div>
                </div>
                <div class="flex flex-col items-end flex-shrink-0 ml-2">
                    <div class="time">${new Date(conv.last_message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    ${conv.unread_count > 0 ? `<span class="unread mt-1">${conv.unread_count}</span>` : ''}
                </div>
            `;
            convElement.addEventListener('click', () => {
                const { receiverId } = convElement.dataset;
                const selectedConv = conversationsCache[receiverId];
                loadMessages(receiverId, selectedConv.other_user_name, selectedConv.other_user_photo);
                document.querySelectorAll('.conversation-item.active').forEach(item => item.classList.remove('active'));
                convElement.classList.add('active');
            });
            conversationList.appendChild(convElement);
            totalUnread += conv.unread_count;
        });

        if (totalUnread > 0) {
            unreadIndicator.textContent = totalUnread > 9 ? '9+' : totalUnread;
            unreadIndicator.classList.remove('hidden');
        } else {
            unreadIndicator.classList.add('hidden');
        }
    };

    const loadMessages = async (receiverId, receiverName, receiverPhoto) => {
        currentReceiverId = receiverId;
        showChatView();

        const headerInfo = chatHeader.querySelector('#header-info');
        if(headerInfo) headerInfo.remove();

        const newHeaderInfo = document.createElement('div');
        newHeaderInfo.id = 'header-info';
        newHeaderInfo.className = 'flex items-center';
        newHeaderInfo.innerHTML = `<img src="${receiverPhoto}" alt="${receiverName}" class="w-10 h-10 rounded-full mr-3"><h3>${receiverName}</h3>`;
        chatHeader.appendChild(newHeaderInfo);
        
        messageList.innerHTML = '<div class="p-4 text-center text-gray-500">Chargement...</div>';

        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('id, content, created_at, is_read, sender_id, product_id, receiver_id')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error('Erreur chargement messages:', error);
            messageList.innerHTML = '<p class="p-4 text-red-500">Erreur de chargement.</p>';
            return;
        }

        messageList.innerHTML = '';
        messages.forEach(msg => appendMessage(msg));
        messageList.scrollTop = messageList.scrollHeight;

        if (messages.length > 0) {
            currentProductId = messages[messages.length - 1].product_id;
        }

        const unreadMessagesIds = messages
            .filter(msg => msg.receiver_id === currentUser.id && !msg.is_read)
            .map(msg => msg.id);

        if (unreadMessagesIds.length > 0) {
            await supabaseClient.from('messages').update({ is_read: true }).in('id', unreadMessagesIds);
            if (conversationsCache[receiverId]) {
                conversationsCache[receiverId].unread_count = 0;
                renderConversations();
            }
        }
    };

    const appendMessage = (msg) => {
        const isSent = msg.sender_id === currentUser.id;
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-item', isSent ? 'sent' : 'received');
        messageElement.innerHTML = `
            <div class="content">${msg.content}</div>
            <div class="meta">${new Date(msg.created_at).toLocaleString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</div>
        `;
        messageList.appendChild(messageElement);
    };

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contentInput = document.getElementById('message-content');
        const content = contentInput.value.trim();
        
        if (!content || !currentReceiverId) return;
        
        if (!currentProductId) {
            alert("Impossible d'envoyer le message. Le contexte du produit est manquant. Veuillez démarrer une nouvelle conversation depuis une page produit.");
            return;
        }

        const { data, error } = await supabaseClient
            .from('messages')
            .insert({
                sender_id: currentUser.id,
                receiver_id: currentReceiverId,
                product_id: currentProductId,
                content,
            })
            .select()
            .single();

        if (error) {
            console.error("Erreur d'envoi:", error);
            return;
        }

        // Pas besoin d'appeler appendMessage ici, le listener temps réel s'en chargera
        contentInput.value = '';
        contentInput.style.height = 'auto';
    });
    
    const messageContent = document.getElementById('message-content');
    messageContent.addEventListener('input', () => {
        messageContent.style.height = 'auto';
        messageContent.style.height = (messageContent.scrollHeight) + 'px';
    });
    
    const listenToMessages = () => {
        if (!currentUser) return;
        supabaseClient
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMessage = payload.new;
                const otherUserId = newMessage.sender_id === currentUser.id ? newMessage.receiver_id : newMessage.sender_id;

                // Mettre à jour le cache
                let convExists = !!conversationsCache[otherUserId];
                if (!convExists) {
                    // Si la conversation est toute nouvelle, il faut recharger tout pour avoir les infos du profil
                    loadConversations();
                } else {
                     // Mettre à jour le dernier message
                    conversationsCache[otherUserId].last_message = newMessage;
                    
                    // Incrémenter le compteur si le message n'est pas pour nous et que nous ne regardons pas le chat
                    if (newMessage.receiver_id === currentUser.id && otherUserId !== currentReceiverId) {
                        conversationsCache[otherUserId].unread_count++;
                    }
                    
                    // Mettre à jour l'UI
                    renderConversations();
                }

                // Ajouter le message à la vue si la conversation est ouverte
                if (otherUserId === currentReceiverId) {
                    appendMessage(newMessage);
                    messageList.scrollTop = messageList.scrollHeight;
                }
            })
            .subscribe();
    };

    const init = async () => {
        currentUser = await getCurrentUser();
        if (currentUser) {
            await loadConversations();
            listenToMessages();
        } else {
            console.log("Utilisateur non connecté. La messagerie ne sera pas initialisée.");
            chatToggleButton.classList.add('hidden');
        }
    };

    init();
});
