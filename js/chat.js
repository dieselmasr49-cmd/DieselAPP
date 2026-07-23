// ==========================================
// 💬 صفحة الشات المنفصلة
// ==========================================

const supabase = window.supabase;
let currentRoomId = null;
let chatPartner = null;
let chatChannel = null;

// ✅ جلب اسم الشريك من URL
function getChatPartner() {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('with');
    console.log('📌 الشريك:', name);
    return name;
}

// ✅ التحقق من الجلسة
document.addEventListener('DOMContentLoaded', async () => {
    const user = localStorage.getItem('loggedInUserName');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    chatPartner = getChatPartner();
    if (!chatPartner) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    document.getElementById('chatUserName').textContent = chatPartner;
    await initChat(chatPartner);
});

// ✅ تهيئة الشات
async function initChat(partner) {
    const currentUser = localStorage.getItem('loggedInUserName');
    console.log('💬 تهيئة الشات مع:', partner);
    
    try {
        currentRoomId = await getOrCreateRoom(currentUser, partner);
        console.log('🔄 roomId:', currentRoomId);
        
        await loadMessages();
        startRealtimeListener();
        
        // ✅ ✅ ✅ جلب حالة الشريك (مع تجاهل الأخطاء)
        try {
            await getPartnerStatus(partner);
        } catch (statusErr) {
            console.warn('⚠️ فشل جلب حالة الشريك (سيتم تجاهل):', statusErr);
        }
        
        // ✅ ✅ ✅ تحديث حالة المستخدم (مع تجاهل الأخطاء)
        try {
            await updateOnlineStatus(true);
        } catch (statusErr) {
            console.warn('⚠️ فشل تحديث الحالة (سيتم تجاهل):', statusErr);
        }
        
    } catch (error) {
        console.error('❌ فشل تهيئة الشات:', error);
        document.getElementById('chatMessagesContainer').innerHTML = `
            <div class="chat-empty-state">
                <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>
                <p>❌ حدث خطأ في تحميل المحادثة</p>
                <button onclick="location.reload()" class="btn btn-primary btn-sm" style="margin-top:10px;">
                    <i class="fa-solid fa-arrows-rotate"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// ✅ إنشاء أو جلب الغرفة
async function getOrCreateRoom(user1, user2) {
    try {
        console.log('🔍 البحث عن غرفة للمستخدمين:', user1, user2);
        
        const { data: rooms, error: searchError } = await supabase
            .from('chat_rooms')
            .select('room_id, participant1, participant2')
            .or(`participant1.eq.${user1},participant2.eq.${user1}`)
            .or(`participant1.eq.${user2},participant2.eq.${user2}`);

        if (searchError) {
            console.error('❌ خطأ في البحث:', searchError);
            if (searchError.message?.includes('JWT') || searchError.message?.includes('expired')) {
                localStorage.clear();
                window.location.href = 'login.html';
                return null;
            }
        }

        let foundRoom = null;
        if (rooms && rooms.length > 0) {
            foundRoom = rooms.find(room => 
                (room.participant1 === user1 && room.participant2 === user2) ||
                (room.participant1 === user2 && room.participant2 === user1)
            );
        }

        if (foundRoom) {
            console.log('🔄 غرفة موجودة:', foundRoom.room_id);
            return foundRoom.room_id;
        }

        const roomId = `${user1}_${user2}_${Date.now()}`;
        console.log('🆕 إنشاء غرفة جديدة:', roomId);
        
        const { error: createError } = await supabase
            .from('chat_rooms')
            .insert({
                room_id: roomId,
                participant1: user1,
                participant2: user2,
                last_message: '',
                last_message_time: new Date().toISOString()
            });

        if (createError) {
            console.error('❌ فشل إنشاء الغرفة:', createError);
            if (createError.message?.includes('JWT') || createError.message?.includes('expired')) {
                localStorage.clear();
                window.location.href = 'login.html';
                return null;
            }
            throw createError;
        }

        console.log('✅ تم إنشاء غرفة جديدة:', roomId);
        return roomId;

    } catch (error) {
        console.error('❌ فشل إنشاء الغرفة:', error);
        throw error;
    }
}

// ✅ تحميل الرسائل
async function loadMessages() {
    const container = document.getElementById('chatMessagesContainer');
    if (!container || !currentRoomId) return;

    try {
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', currentRoomId)
            .order('created_at', { ascending: true });

        if (error) {
            if (error.message?.includes('JWT') || error.message?.includes('expired')) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw error;
        }

        const currentUser = localStorage.getItem('loggedInUserName');

        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div class="chat-empty-state">
                    <i class="fa-regular fa-comment-dots"></i>
                    <p>👋 لا توجد رسائل بعد، ابدأ المحادثة!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(msg => {
            const isMine = msg.sender === currentUser;
            return `
                <div class="chat-message ${isMine ? 'mine' : 'theirs'}">
                    <div class="chat-message-bubble">
                        <div class="chat-message-text">${msg.message}</div>
                        <div class="chat-message-time">${new Date(msg.created_at).toLocaleTimeString('ar-EG')}</div>
                    </div>
                </div>
            `;
        }).join('');

        // ✅ تحديث الرسائل كمقروءة
        try {
            await supabase
                .from('chat_messages')
                .update({ is_read: true })
                .eq('room_id', currentRoomId)
                .neq('sender', currentUser);
            
            if (typeof window.updateChatBadge === 'function') {
                setTimeout(window.updateChatBadge, 500);
            }
        } catch (readErr) {
            console.warn('⚠️ فشل تحديث حالة القراءة:', readErr);
        }

        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);

    } catch (error) {
        console.error('❌ فشل تحميل الرسائل:', error);
        container.innerHTML = `
            <div class="chat-empty-state">
                <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>
                <p>❌ فشل تحميل الرسائل</p>
            </div>
        `;
    }
}

// ✅ إرسال رسالة
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message || !currentRoomId) return;

    const currentUser = localStorage.getItem('loggedInUserName');

    try {
        const { error } = await supabase
            .from('chat_messages')
            .insert({
                room_id: currentRoomId,
                sender: currentUser,
                receiver: chatPartner,
                message: message,
                is_read: false,
                created_at: new Date().toISOString()
            });

        if (error) {
            if (error.message?.includes('JWT') || error.message?.includes('expired')) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw error;
        }

        await supabase
            .from('chat_rooms')
            .update({
                last_message: message,
                last_message_time: new Date().toISOString()
            })
            .eq('room_id', currentRoomId);

        input.value = '';
        await loadMessages();

        if (typeof window.updateChatBadge === 'function') {
            setTimeout(window.updateChatBadge, 500);
        }

    } catch (error) {
        console.error('❌ فشل إرسال الرسالة:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('❌ خطأ', 'فشل إرسال الرسالة', 'error');
        }
    }
}

// ✅ الاستماع للرسائل الجديدة
function startRealtimeListener() {
    if (chatChannel) {
        try { supabase.removeChannel(chatChannel); } catch (e) {}
    }

    chatChannel = supabase
        .channel(`chat-${currentRoomId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `room_id=eq.${currentRoomId}`
            },
            (payload) => {
                console.log('📩 رسالة جديدة:', payload);
                const msg = payload.new;
                const currentUser = localStorage.getItem('loggedInUserName');
                
                if (msg.sender !== currentUser) {
                    if (typeof window.showToast === 'function') {
                        window.showToast('💬 رسالة جديدة', `من: ${msg.sender}`, 'info');
                    }
                    if (typeof window.updateChatBadge === 'function') {
                        setTimeout(window.updateChatBadge, 500);
                    }
                }
                loadMessages();
            }
        )
        .subscribe((status) => {
            console.log('📡 حالة القناة:', status);
            if (status === 'CHANNEL_ERROR') {
                setTimeout(() => {
                    try { startRealtimeListener(); } catch (e) {}
                }, 3000);
            }
        });
}

// ✅ جلب حالة الشريك (نسخة آمنة - تتجاوز الأخطاء)
async function getPartnerStatus(partner) {
    try {
        console.log('🔍 جلب حالة الشريك:', partner);
        
        if (!partner) {
            console.warn('⚠️ لا يوجد اسم شريك');
            return;
        }

        const { data: stationData, error: stationError } = await supabase
            .from('stations')
            .select('user_id')
            .eq('station_name', partner)
            .maybeSingle();

        if (stationError || !stationData) {
            console.warn('⚠️ لم يتم العثور على المستخدم:', partner);
            const statusEl = document.getElementById('chatUserStatus');
            if (statusEl) {
                statusEl.textContent = '👤 غير مسجل';
                statusEl.className = 'chat-user-status offline';
            }
            return;
        }

        const { data: status, error: statusErr } = await supabase
            .from('user_status')
            .select('is_online, last_seen')
            .eq('user_id', stationData.user_id)
            .maybeSingle();

        if (statusErr) {
            console.warn('⚠️ فشل جلب الحالة:', statusErr);
            const statusEl = document.getElementById('chatUserStatus');
            if (statusEl) {
                statusEl.textContent = '🔴 غير معروف';
                statusEl.className = 'chat-user-status offline';
            }
            return;
        }

        const statusEl = document.getElementById('chatUserStatus');
        if (statusEl) {
            if (status && status.is_online) {
                statusEl.textContent = '🟢 متصل الآن';
                statusEl.className = 'chat-user-status online';
            } else {
                const lastSeen = status?.last_seen ? new Date(status.last_seen).toLocaleString('ar-EG') : 'منذ فترة';
                statusEl.textContent = `🔴 غير متصل (آخر ظهور: ${lastSeen})`;
                statusEl.className = 'chat-user-status offline';
            }
        }

    } catch (error) {
        console.warn('⚠️ استثناء في جلب حالة الشريك:', error);
        const statusEl = document.getElementById('chatUserStatus');
        if (statusEl) {
            statusEl.textContent = '🔴 غير متصل';
            statusEl.className = 'chat-user-status offline';
        }
    }
}

// ✅ ✅ ✅ تحديث حالة المستخدم (نسخة آمنة - تتجاوز الأخطاء)
// ✅ ✅ ✅ تحديث حالة المستخدم (نسخة هادئة - من غير تنبيهات)
async function updateOnlineStatus(isOnline) {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) return;

    try {
        await supabase
            .from('user_status')
            .upsert({
                user_id: userId,
                is_online: isOnline,
                last_seen: new Date().toISOString()
            }, { onConflict: 'user_id' });
    } catch (error) {
        // ✅ تجاهل أي خطأ بصمت (من غير رسايل في الكونسول)
    }
}

// ✅ ربط الأحداث
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backToDashboard');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // ✅ تجاهل أي خطأ في تحديث الحالة عند الخروج
            try {
                updateOnlineStatus(false);
            } catch (e) {}
            window.location.href = 'dashboard.html';
        });
    }

    const sendBtn = document.getElementById('sendChatBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    const input = document.getElementById('chatInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

// ✅ عند إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    try {
        updateOnlineStatus(false);
    } catch (e) {}
});

console.log('💬 Chat page loaded');