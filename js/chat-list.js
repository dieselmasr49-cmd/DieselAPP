// ==========================================
// 💬 قائمة المحادثات (Chat List)
// ==========================================

const supabase = window.supabase;
let chatListChannel = null;

// ✅ التحقق من الجلسة
document.addEventListener('DOMContentLoaded', async () => {
    const user = localStorage.getItem('loggedInUserName');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    await loadChatList();
    listenForNewMessages();
});

// ✅ تحميل قائمة المحادثات
// ✅ تحميل قائمة المحادثات (نسخة معدلة)
async function loadChatList() {
    const container = document.getElementById('chatListContainer');
    const currentUser = localStorage.getItem('loggedInUserName');
    
    try {
        // ✅ جلب الغرف مع DISTINCT (منع التكرار)
        const { data: rooms, error: roomsError } = await supabase
            .from('chat_rooms')
            .select('*')
            .or(`participant1.eq.${currentUser},participant2.eq.${currentUser}`)
            .order('last_message_time', { ascending: false });

        if (roomsError) throw roomsError;

        // ✅ ✅ ✅ منع التكرار في الكود (لو حصل)
        const uniqueRooms = [];
        const seen = new Set();
        
        rooms.forEach(room => {
            const key = [room.participant1, room.participant2].sort().join('_');
            if (!seen.has(key)) {
                seen.add(key);
                uniqueRooms.push(room);
            }
        });

        if (uniqueRooms.length === 0) {
            container.innerHTML = `
                <div class="empty-chats">
                    <i class="fa-regular fa-comment-dots"></i>
                    <h3>لا توجد محادثات</h3>
                    <p>ابدأ محادثة جديدة من صفحة الناشر</p>
                </div>
            `;
            return;
        }

        // ✅ تجهيز بيانات المحادثات
        let chatItems = [];
        
        for (const room of uniqueRooms) {
            const partner = room.participant1 === currentUser ? room.participant2 : room.participant1;
            
            // ✅ جلب عدد الرسائل غير المقروءة
            const { count: unreadCount, error: countError } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.room_id)
                .eq('is_read', false)
                .neq('sender', currentUser);

            if (countError) console.warn('⚠️ فشل جلب العداد:', countError);

            // ✅ جلب حالة المستخدم
            let isOnline = false;
            try {
                const { data: stationData } = await supabase
                    .from('stations')
                    .select('user_id')
                    .eq('station_name', partner)
                    .maybeSingle();
                
                if (stationData) {
                    const { data: status } = await supabase
                        .from('user_status')
                        .select('is_online')
                        .eq('user_id', stationData.user_id)
                        .maybeSingle();
                    if (status) isOnline = status.is_online;
                }
            } catch (e) {}

            chatItems.push({
                partner: partner,
                roomId: room.room_id,
                lastMessage: room.last_message || 'ابدأ المحادثة',
                lastTime: room.last_message_time || room.created_at,
                unreadCount: unreadCount || 0,
                isOnline: isOnline
            });
        }

        // ✅ عرض المحادثات
        container.innerHTML = chatItems.map(chat => `
            <div class="chat-item" onclick="openChat('${chat.partner}', '${chat.roomId}')">
                <div class="chat-item-avatar">
                    <span class="avatar-icon">${chat.partner.charAt(0)}</span>
                    <span class="online-dot ${chat.isOnline ? 'online' : 'offline'}"></span>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-header">
                        <span class="chat-item-name">${chat.partner}</span>
                        <span class="chat-item-time">${new Date(chat.lastTime).toLocaleTimeString('ar-EG')}</span>
                    </div>
                    <div class="chat-item-preview">${chat.lastMessage}</div>
                </div>
                ${chat.unreadCount > 0 ? `<span class="chat-item-badge">${chat.unreadCount}</span>` : ''}
            </div>
        `).join('');

    } catch (error) {
        console.error('❌ فشل تحميل المحادثات:', error);
        container.innerHTML = `
            <div class="loading-placeholder">
                <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>
                حدث خطأ في تحميل المحادثات
                <button onclick="location.reload()" class="btn btn-primary btn-sm" style="margin-top:10px;">
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// ✅ فتح محادثة
window.openChat = function(partner, roomId) {
    window.location.href = `chat.html?with=${encodeURIComponent(partner)}`;
};

// ✅ الاستماع للرسائل الجديدة
function listenForNewMessages() {
    const currentUser = localStorage.getItem('loggedInUserName');
    if (!currentUser) return;

    if (chatListChannel) {
        try { supabase.removeChannel(chatListChannel); } catch (e) {}
    }

    chatListChannel = supabase
        .channel('chat-list')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `receiver=eq.${currentUser}`
            },
            (payload) => {
                console.log('📩 رسالة جديدة في القائمة:', payload);
                // ✅ تحديث القائمة
                loadChatList();
                
                // ✅ تحديث العداد في الناف بار
                if (typeof window.updateChatBadge === 'function') {
                    window.updateChatBadge();
                }
            }
        )
        .subscribe();
}

// ✅ تحديث العداد في الناف بار (سيتم استدعاؤها من dashboard.js)
window.updateChatBadge = async function() {
    const currentUser = localStorage.getItem('loggedInUserName');
    if (!currentUser) return;

    try {
        // ✅ جلب كل الغرف
        const { data: rooms } = await supabase
            .from('chat_rooms')
            .select('room_id')
            .or(`participant1.eq.${currentUser},participant2.eq.${currentUser}`);

        if (!rooms) return;

        let totalUnread = 0;
        for (const room of rooms) {
            const { count } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.room_id)
                .eq('is_read', false)
                .neq('sender', currentUser);
            totalUnread += count || 0;
        }

        // ✅ تحديث العداد في الناف بار
        const badge = document.getElementById('chatNavBadge');
        if (badge) {
            if (totalUnread > 0) {
                badge.style.display = 'flex';
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('❌ فشل تحديث العداد:', error);
    }
};

// ✅ زر الرجوع
document.getElementById('backBtn')?.addEventListener('click', () => {
    window.location.href = 'dashboard.html';
});

// ✅ بحث في المحادثات
document.getElementById('chatSearchInput')?.addEventListener('input', function() {
    const query = this.value.trim().toLowerCase();
    const items = document.querySelectorAll('.chat-item');
    
    items.forEach(item => {
        const name = item.querySelector('.chat-item-name')?.textContent?.toLowerCase() || '';
        const preview = item.querySelector('.chat-item-preview')?.textContent?.toLowerCase() || '';
        const match = name.includes(query) || preview.includes(query);
        item.style.display = match ? 'flex' : 'none';
    });
});

console.log('💬 Chat List loaded');