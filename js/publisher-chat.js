// ==========================================
// 📸 صفحة الناشر (Publisher Profile)
// ==========================================

const supabase = window.supabase;
let currentRoomId = null;
let chatChannel = null;

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
        // ✅ 1. جلب بيانات الناشر من جدول stations
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

        console.log('📊 بيانات الناشر من stations:', stationData);

        if (!stationData) {
            console.warn('⚠️ الناشر غير موجود في قاعدة البيانات');
            document.getElementById('publisherName').textContent = '⚠️ الناشر غير موجود';
            return;
        }

        // ✅ 2. عرض اسم المحطة
        document.getElementById('publisherName').textContent = stationData.station_name;
        document.getElementById('publisherStation').innerHTML = `📍 المحطة: <span>${stationData.station_name}</span>`;

        // ✅ 3. عرض رقم الهاتف (لو مفعل)
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
            
            console.log('✅ رقم الهاتف ظاهر');
        } else {
            phoneContainer.style.display = 'none';
            phoneContainer.innerHTML = '';
            callBtn.style.display = 'none';
            whatsappBtn.style.display = 'none';
            console.log('🔒 رقم الهاتف مخفي');
        }

        // ✅ 4. جلب حالات الناشر
        const { data: casesData, error: casesErr } = await supabase
            .from('employees')
            .select('*')
            .eq('created_by', publisherName)
            .order('created_at', { ascending: false });

        if (casesErr) {
            console.error('❌ فشل جلب حالات الناشر:', casesErr);
        }

        console.log('📊 عدد حالات الناشر:', casesData?.length || 0);

        // ✅ 5. عرض عدد الحالات
        const totalCases = casesData?.length || 0;
        document.getElementById('publisherTotalCases').textContent = totalCases;
        document.getElementById('publisherCasesCount').textContent = `${totalCases} حالة`;

        // ✅ 6. حساب الترتيب
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
                console.log('🏆 ترتيب الناشر:', rank);
            }
        } catch (rankErr) {
            console.warn('⚠️ فشل حساب الترتيب:', rankErr);
            document.getElementById('publisherRank').textContent = '--';
        }

        // ✅ 7. حساب معدل النشر
        try {
            const { count: totalAll, error: totalErr } = await supabase
                .from('employees')
                .select('*', { count: 'exact', head: true });

            if (!totalErr) {
                const rate = totalAll > 0 ? Math.round((totalCases / totalAll) * 100) : 0;
                document.getElementById('publisherRate').textContent = `${rate}%`;
                console.log('📈 معدل النشر:', rate);
            }
        } catch (rateErr) {
            console.warn('⚠️ فشل حساب معدل النشر:', rateErr);
            document.getElementById('publisherRate').textContent = '0%';
        }

        // ✅ 8. عرض قائمة الحالات
        renderPublisherCases(casesData);

        // ✅ ✅ ✅ 9. إضافة زر المحادثة
        const actionsContainer = document.getElementById('publisherActions');
        if (actionsContainer) {
            const currentUser = localStorage.getItem('loggedInUserName');
            if (currentUser && currentUser !== publisherName) {
                // ✅ نمسح أي أزرار قديمة
                actionsContainer.innerHTML = '';
                
                // ✅ نضيف زر المحادثة
                const chatBtn = document.createElement('button');
                chatBtn.id = 'openChatBtn';
                chatBtn.className = 'btn btn-primary';
                chatBtn.style.cssText = 'background: #3b82f6; padding: 10px 24px; color: white; border: none; border-radius: 8px; cursor: pointer; font-family: "Cairo"; font-weight: 600; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 8px;';
                chatBtn.innerHTML = '<i class="fa-solid fa-comment"></i> 💬 تواصل مع الناشر';
                actionsContainer.appendChild(chatBtn);
                
                // ✅ ربط زر المحادثة
                chatBtn.addEventListener('click', function() {
                    openChatWindow(publisherName);
                });
                
                console.log('✅ تم إضافة زر المحادثة');
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
// 💬 نظام المحادثة (مدمج)
// ==========================================

// ✅ إنشاء أو جلب غرفة المحادثة
async function getOrCreateChatRoom(user1, user2) {
    try {
        const { data: existing, error } = await supabase
            .from('chat_rooms')
            .select('*')
            .or(`and(participant1.eq.${user1},participant2.eq.${user2}),and(participant1.eq.${user2},participant2.eq.${user1})`)
            .maybeSingle();
        
        if (error) throw error;
        
        if (existing) {
            currentRoomId = existing.room_id;
            console.log('🔄 غرفة موجودة:', currentRoomId);
            return existing;
        }
        
        const roomId = `${user1}_${user2}_${Date.now()}`;
        const { data: newRoom, error: createError } = await supabase
            .from('chat_rooms')
            .insert([{
                room_id: roomId,
                participant1: user1,
                participant2: user2
            }])
            .select();
        
        if (createError) throw createError;
        
        currentRoomId = roomId;
        console.log('✅ تم إنشاء غرفة جديدة:', currentRoomId);
        return newRoom[0];
        
    } catch (error) {
        console.error('❌ فشل إنشاء غرفة:', error);
        return null;
    }
}

// ✅ تحميل الرسائل
async function loadMessages() {
    if (!currentRoomId) return;
    
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;
    
    try {
        const { data: messages, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', currentRoomId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        renderMessages(messages);
        
    } catch (error) {
        console.error('❌ فشل تحميل الرسائل:', error);
    }
}

// ✅ عرض الرسائل
function renderMessages(messages) {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;
    
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
}

// ✅ إرسال رسالة
async function sendMessage(message) {
    if (!message.trim() || !currentRoomId) return;
    
    const currentUser = localStorage.getItem('loggedInUserName');
    const receiver = document.getElementById('chatReceiverName')?.textContent?.replace('مع: ', '') || 'الوكيل';
    
    try {
        const { error } = await supabase
            .from('chat_messages')
            .insert([{
                room_id: currentRoomId,
                sender: currentUser,
                receiver: receiver,
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
            .eq('room_id', currentRoomId);
        
        document.getElementById('chatInput').value = '';
        await loadMessages();
        
    } catch (error) {
        console.error('❌ فشل إرسال الرسالة:', error);
        if (typeof window.showToast === 'function') {
            window.showToast('❌ خطأ', 'فشل إرسال الرسالة', 'error');
        }
    }
    // ✅ بعد إرسال الرسالة بنجاح
// ✅ إرسال إشارة للمستقبل عشان يحدث العداد
if (typeof window.updateUnreadBadge === 'function') {
    setTimeout(window.updateUnreadBadge, 500);
}
}

// ✅ الاستماع للرسائل الجديدة
function startRealtimeListener() {
    if (chatChannel) {
        try {
            supabase.removeChannel(chatChannel);
        } catch (e) {}
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
                
                if (msg.sender !== localStorage.getItem('loggedInUserName')) {
                    if (typeof window.showToast === 'function') {
                        window.showToast('💬 رسالة جديدة', msg.message, 'info');
                    }
                }
                loadMessages();
            }
        )
        .subscribe();
}

// ✅ تحديث حالة الاتصال
async function updateOnlineStatus(isOnline) {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) return;
    
    try {
        const { error } = await supabase
            .from('user_status')
            .upsert({
                user_id: userId,
                is_online: isOnline,
                last_seen: new Date().toISOString()
            }, { onConflict: 'user_id' });
        
        if (error) throw error;
        
        const statusEl = document.getElementById('chatOnlineStatus');
        if (statusEl) {
            statusEl.textContent = isOnline ? '🟢 متصل' : '🔴 غير متصل';
            statusEl.style.color = isOnline ? '#10b981' : '#ef4444';
        }
        
    } catch (error) {
        console.error('❌ فشل تحديث الحالة:', error);
    }
}

// ✅ جلب حالة المستخدم الآخر
async function getOtherUserStatus(userName) {
    try {
        const { data: stationData, error: stationError } = await supabase
            .from('stations')
            .select('user_id')
            .eq('station_name', userName)
            .maybeSingle();
        
        if (stationError || !stationData) return null;
        
        const { data: status, error: statusErr } = await supabase
            .from('user_status')
            .select('is_online, last_seen')
            .eq('user_id', stationData.user_id)
            .maybeSingle();
        
        if (statusErr) return null;
        return status || { is_online: false };
        
    } catch (error) {
        console.error('❌ فشل جلب حالة المستخدم:', error);
        return null;
    }
}

// ✅ فتح نافذة المحادثة
function openChatWindow(publisherName) {
    let chatWindow = document.getElementById('chatWindow');
    if (!chatWindow) {
        chatWindow = document.createElement('div');
        chatWindow.id = 'chatWindow';
        chatWindow.className = 'chat-window-overlay';
        document.body.appendChild(chatWindow);
    }
    
    chatWindow.innerHTML = `
        <div class="chat-window-card">
            <div class="chat-window-header">
                <div>
                    <span style="font-size: 1.2rem; font-weight: 700;">💬 المحادثة</span>
                    <span id="chatReceiverName" style="font-size: 0.85rem; color: #64748b; margin-right: 10px;">مع: ${publisherName}</span>
                    <span id="chatOnlineStatus" style="font-size: 0.8rem; margin-right: 10px;">🟢 متصل</span>
                </div>
                <button id="closeChatBtn" class="close-dialog-btn" style="background: none; border: none; color: #64748b; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <div id="chatMessagesContainer" class="chat-messages-container">
                <div class="chat-empty">جاري تحميل المحادثة...</div>
            </div>
            <div class="chat-input-container">
                <input type="text" id="chatInput" placeholder="اكتب رسالتك..." style="flex: 1; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: 'Cairo'; outline: none;">
                <button id="sendChatBtn" class="btn btn-primary" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('closeChatBtn').addEventListener('click', () => {
        chatWindow.style.display = 'none';
        updateOnlineStatus(false);
    });
    
    document.getElementById('sendChatBtn').addEventListener('click', () => {
        const input = document.getElementById('chatInput');
        sendMessage(input.value);
    });
    
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            sendMessage(input.value);
        }
    });
    
    chatWindow.style.display = 'flex';
    
    // ✅ تهيئة المحادثة
    const currentUser = localStorage.getItem('loggedInUserName');
    getOrCreateChatRoom(currentUser, publisherName).then(() => {
        loadMessages();
        startRealtimeListener();
        updateOnlineStatus(true);
    });
    
    getOtherUserStatus(publisherName).then(status => {
        const statusEl = document.getElementById('chatOnlineStatus');
        if (statusEl && status) {
            statusEl.textContent = status.is_online ? '🟢 متصل' : '🔴 غير متصل';
            statusEl.style.color = status.is_online ? '#10b981' : '#ef4444';
        }
    });
}

// ✅ تسجيل الخروج
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage('logout', '*');
        }
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