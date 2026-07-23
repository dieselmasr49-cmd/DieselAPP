// ==========================================
// 📸 صفحة الناشر (Publisher Profile) - النسخة النهائية
// ==========================================

const supabase = window.supabase;

// ✅ جلب اسم الناشر من URL
function getPublisherNameFromURL() {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('name');
    console.log('📌 اسم الناشر من URL:', name);
    return name;
}

// ✅ التحقق من الجلسة
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('loggedInUserName');
    console.log('📌 المستخدم الحالي:', user);
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    const publisherName = getPublisherNameFromURL();
    if (!publisherName) {
        console.error('❌ لا يوجد اسم ناشر في الرابط');
        document.getElementById('publisherName').textContent = '⚠️ لم يتم تحديد الناشر';
        return;
    }
    
    loadPublisherData(publisherName);
});

// ✅ تحميل بيانات الناشر
async function loadPublisherData(publisherName) {
    console.log('📡 جاري تحميل بيانات الناشر:', publisherName);
    
    try {
        const { data: stationData, error: stationErr } = await supabase
            .from('stations')
            .select('station_name, phoneNum, show_phone, created_at')
            .eq('station_name', publisherName)
            .maybeSingle();

        if (stationErr) {
            console.error('❌ خطأ في جلب بيانات الناشر:', stationErr);
            document.getElementById('publisherName').textContent = '❌ حدث خطأ';
            return;
        }

        if (!stationData) {
            console.warn('⚠️ الناشر غير موجود');
            document.getElementById('publisherName').textContent = '⚠️ الناشر غير موجود';
            return;
        }

        document.getElementById('publisherName').textContent = stationData.station_name;
        document.getElementById('publisherStation').innerHTML = `📍 المحطة: <span>${stationData.station_name}</span>`;

        // ✅ رقم الهاتف
        const phoneContainer = document.getElementById('publisherPhoneContainer');
        const callBtn = document.getElementById('publisherCallBtn');
        const whatsappBtn = document.getElementById('publisherWhatsappBtn');

        if (stationData.show_phone && stationData.phoneNum) {
            const phone = stationData.phoneNum;
            phoneContainer.style.display = 'inline-flex';
            phoneContainer.innerHTML = `
                <i class="fa-solid fa-phone"></i>
                <span class="phone-number">${phone}</span>
            `;
            callBtn.style.display = 'inline-flex';
            callBtn.onclick = () => window.location.href = `tel:${phone}`;
            whatsappBtn.style.display = 'inline-flex';
            const waNumber = phone.replace(/^0/, '20');
            whatsappBtn.onclick = () => window.open(`https://wa.me/${waNumber}`, '_blank');
        } else {
            phoneContainer.style.display = 'none';
            callBtn.style.display = 'none';
            whatsappBtn.style.display = 'none';
        }

        // ✅ حالات الناشر
        const { data: casesData, error: casesErr } = await supabase
            .from('employees')
            .select('*')
            .eq('created_by', publisherName)
            .order('created_at', { ascending: false });

        if (casesErr) {
            console.error('❌ فشل جلب حالات الناشر:', casesErr);
        }

        const totalCases = casesData?.length || 0;
        document.getElementById('publisherTotalCases').textContent = totalCases;
        document.getElementById('publisherCasesCount').textContent = `${totalCases} حالة`;

        // ✅ الترتيب
        try {
            const { data: allPublishers, error: pubErr } = await supabase
                .from('employees')
                .select('created_by');

            if (!pubErr && allPublishers) {
                const counts = {};
                allPublishers.forEach(p => {
                    if (p.created_by) {
                        counts[p.created_by] = (counts[p.created_by] || 0) + 1;
                    }
                });
                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                const rank = sorted.findIndex(p => p[0] === publisherName) + 1;
                document.getElementById('publisherRank').textContent = rank > 0 ? `#${rank}` : '--';
            }
        } catch (rankErr) {
            document.getElementById('publisherRank').textContent = '--';
        }

        // ✅ معدل النشر
        try {
            const { count: totalAll, error: totalErr } = await supabase
                .from('employees')
                .select('*', { count: 'exact', head: true });

            if (!totalErr) {
                const rate = totalAll > 0 ? Math.round((totalCases / totalAll) * 100) : 0;
                document.getElementById('publisherRate').textContent = `${rate}%`;
            }
        } catch (rateErr) {
            document.getElementById('publisherRate').textContent = '0%';
        }

        renderPublisherCases(casesData);

        // ✅ إضافة زر المحادثة
        const actionsContainer = document.getElementById('publisherActions');
        if (actionsContainer) {
            const currentUser = localStorage.getItem('loggedInUserName');
            if (currentUser && currentUser !== publisherName) {
                actionsContainer.innerHTML = '';
                
                const chatBtn = document.createElement('button');
                chatBtn.id = 'openChatBtn';
                chatBtn.className = 'btn btn-primary';
                chatBtn.style.cssText = 'background: #3b82f6; padding: 10px 24px; color: white; border: none; border-radius: 8px; cursor: pointer; font-family: "Cairo"; font-weight: 600; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 8px;';
                chatBtn.innerHTML = '<i class="fa-solid fa-comment"></i> 💬 تواصل مع الناشر';
                actionsContainer.appendChild(chatBtn);
                
                chatBtn.addEventListener('click', function() {
                    const name = document.getElementById('publisherName')?.textContent || '';
                    if (name && name !== 'جاري التحميل...') {
                        window.openChatWindow(name);
                    }
                });
            }
        }

    } catch (error) {
        console.error('❌ فشل تحميل بيانات الناشر:', error);
        document.getElementById('publisherName').textContent = '❌ حدث خطأ';
    }
}

// ✅ عرض حالات الناشر
function renderPublisherCases(cases) {
    const container = document.getElementById('publisherCasesList');
    if (!container) return;

    if (!cases || cases.length === 0) {
        container.innerHTML = `
            <div class="loading-placeholder">
                <i class="fa-regular fa-circle-check" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                لم ينشر هذا الناشر أي حالات حتى الآن
            </div>
        `;
        return;
    }

    container.innerHTML = cases.map(c => `
        <div class="publisher-case-item" onclick="openDetailsDialog(${JSON.stringify(c).replace(/"/g, '&quot;')})">
            <div>
                <div class="case-name">${c.employees_name}</div>
                <div class="case-details">📍 ${c.station_name || 'غير محدد'} | 🆔 ${c.national || 'غير محدد'}</div>
            </div>
            <div style="text-align: left;">
                <div class="case-reason">${c.Leave_work || 'سبب غير محدد'}</div>
                <div class="case-date">${c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG') : 'مؤخراً'}</div>
            </div>
        </div>
    `).join('');
}

// ✅ دالة فتح تفاصيل الموظف
window.openDetailsDialog = function(emp) {
    if (typeof window.openDetails === 'function') {
        window.openDetails(emp);
    } else {
        alert(`📋 ${emp.employees_name}\n🆔 ${emp.national}\n📍 ${emp.station_name}\n⚠️ ${emp.Leave_work}`);
    }
};

// ==========================================
// 💬 نظام المحادثة (مدمج في publisher.js)
// ==========================================

let chatChannel = null;

// ✅ دالة إنشاء أو جلب غرفة
async function getOrCreateChatRoomId(user1, user2) {
    try {
        console.log('🔍 البحث عن غرفة للمستخدمين:', user1, user2);
        
        // ✅ البحث عن غرفة موجودة
        const { data: existing, error } = await supabase
            .from('chat_rooms')
            .select('room_id')
            .or(`and(participant1.eq.${user1},participant2.eq.${user2}),and(participant1.eq.${user2},participant2.eq.${user1})`)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            console.error('❌ خطأ في البحث:', error);
        }

        if (existing) {
            console.log('🔄 غرفة موجودة:', existing.room_id);
            return existing.room_id;
        }

        // ✅ إنشاء غرفة جديدة
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
            
            // ✅ لو في تكرار، نجيب الغرفة مرة تانية
            if (createError.code === '23505') {
                const { data: retryData } = await supabase
                    .from('chat_rooms')
                    .select('room_id')
                    .or(`and(participant1.eq.${user1},participant2.eq.${user2}),and(participant1.eq.${user2},participant2.eq.${user1})`)
                    .maybeSingle();
                
                if (retryData) {
                    console.log('✅ تم العثور على الغرفة:', retryData.room_id);
                    return retryData.room_id;
                }
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
async function loadChatMessages(roomId) {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    try {
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        const currentUser = localStorage.getItem('loggedInUserName');

        if (!messages || messages.length === 0) {
            container.innerHTML = `
                <div class="chat-empty">
                    <i class="fa-regular fa-comment-dots" style="font-size: 2rem; color: #cbd5e1;"></i>
                    <p>لا توجد رسائل بعد، ابدأ المحادثة!</p>
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

        container.scrollTop = container.scrollHeight;

    } catch (error) {
        console.error('❌ فشل تحميل الرسائل:', error);
        container.innerHTML = `<div class="chat-empty">❌ حدث خطأ</div>`;
    }
}

// ✅ إرسال رسالة
async function sendMessageToPublisher(message, publisherName) {
    if (!message.trim()) return;

    const currentUser = localStorage.getItem('loggedInUserName');
    if (!currentUser || currentUser === publisherName) {
        window.showToast('⚠️ تنبيه', 'لا يمكن إرسال رسالة لنفسك', 'warning');
        return;
    }

    try {
        const roomId = await getOrCreateChatRoomId(currentUser, publisherName);
        
        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                room_id: roomId,
                sender: currentUser,
                receiver: publisherName,
                message: message.trim(),
                is_read: false
            }]);

        if (error) throw error;

        await supabase
            .from('chat_rooms')
            .update({
                last_message: message.trim(),
                last_message_time: new Date().toISOString()
            })
            .eq('room_id', roomId);

        document.getElementById('chatInput').value = '';
        await loadChatMessages(roomId);

        window.showToast('✅ تم الإرسال', 'تم إرسال رسالتك بنجاح', 'success');

    } catch (error) {
        console.error('❌ فشل إرسال الرسالة:', error);
        window.showToast('❌ خطأ', error.message || 'فشل إرسال الرسالة', 'error');
    }
}

// ✅ الاستماع للرسائل
function startChatListener(roomId) {
    if (chatChannel) {
        try { supabase.removeChannel(chatChannel); } catch (e) {}
    }

    chatChannel = supabase
        .channel(`chat-${roomId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `room_id=eq.${roomId}`
            },
            (payload) => {
                console.log('📩 رسالة جديدة:', payload);
                const msg = payload.new;
                const currentUser = localStorage.getItem('loggedInUserName');
                
                if (msg.sender !== currentUser) {
                    window.showToast('💬 رسالة جديدة', `من: ${msg.sender}`, 'info');
                    if (typeof window.updateChatBadge === 'function') {
                        setTimeout(window.updateChatBadge, 500);
                    }
                }
                loadChatMessages(roomId);
            }
        )
        .subscribe();
}

// ✅ فتح نافذة المحادثة
window.openChatWindow = async function(publisherName) {
    console.log('💬 فتح المحادثة مع:', publisherName);
    
    const currentUser = localStorage.getItem('loggedInUserName');
    if (!currentUser || currentUser === publisherName) {
        window.showToast('⚠️ تنبيه', 'لا يمكن الدردشة مع نفسك', 'warning');
        return;
    }
    
    let chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
        chatWindow.remove();
    }

    chatWindow = document.createElement('div');
    chatWindow.id = 'chatWindow';
    chatWindow.className = 'chat-window-overlay';
    chatWindow.innerHTML = `
        <div class="chat-window-card">
            <div class="chat-window-header">
                <div>
                    <span style="font-size: 1.2rem; font-weight: 700;">💬 محادثة</span>
                    <span id="chatReceiverName" style="font-size: 0.85rem; color: #64748b; margin-right: 10px;">مع: ${publisherName}</span>
                    <span id="chatOnlineStatus" style="font-size: 0.8rem; margin-right: 10px;">🟢 متصل</span>
                </div>
                <button id="closeChatBtn" class="close-dialog-btn" style="background: none; border: none; color: #64748b; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <div id="chatMessagesContainer" class="chat-messages-container">
                <div class="chat-empty">جاري تحميل المحادثة...</div>
            </div>
            <div class="chat-input-container">
                <input type="text" id="chatInput" placeholder="اكتب رسالتك هنا..." style="flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: 'Cairo'; outline: none;">
                <button id="sendChatBtn" class="btn btn-primary" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    <i class="fa-solid fa-paper-plane"></i> إرسال
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(chatWindow);
    chatWindow.style.display = 'flex';

    document.getElementById('closeChatBtn').addEventListener('click', () => {
        chatWindow.style.display = 'none';
        chatWindow.remove();
        if (chatChannel) {
            try { supabase.removeChannel(chatChannel); } catch (e) {}
        }
    });

    document.getElementById('sendChatBtn').addEventListener('click', () => {
        const input = document.getElementById('chatInput');
        sendMessageToPublisher(input.value, publisherName);
    });

    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            sendMessageToPublisher(input.value, publisherName);
        }
    });

    try {
        const roomId = await getOrCreateChatRoomId(currentUser, publisherName);
        await loadChatMessages(roomId);
        startChatListener(roomId);
    } catch (error) {
        console.error('❌ فشل تهيئة المحادثة:', error);
        document.getElementById('chatMessagesContainer').innerHTML = `
            <div class="chat-empty">
                <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>
                <p>❌ فشل تحميل المحادثة</p>
                <button onclick="location.reload()" class="btn btn-primary btn-sm" style="margin-top:10px;">
                    <i class="fa-solid fa-arrows-rotate"></i> إعادة المحاولة
                </button>
            </div>
        `;
    }
};

// ✅ تسجيل الخروج
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        if (typeof window.endActiveSession === 'function') {
            await window.endActiveSession();
        }
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('❌ فشل الخروج:', error.message);
    }
});

console.log('📸 Publisher JS loaded');