// ==========================================
// 📡 نظام الـ Realtime (نسخة هادئة)
// ==========================================

let realtimeChannels = [];
let isRealtimeActive = false;

// ✅ تشغيل الـ Realtime (نسخة هادئة)
export function initRealtime() {
    // ✅ منع التكرار
    if (isRealtimeActive) {
        return;
    }

    const supabase = window.supabase;
    if (!supabase) {
        setTimeout(initRealtime, 2000);
        return;
    }

    console.log('📡 محاولة تفعيل Realtime...');
    isRealtimeActive = true;

    try {
        // ✅ ✅ ✅ قناة واحدة بس (employees) مع تجاهل الأخطاء
        const channel = supabase
            .channel('public:employees')
            .on(
                'postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'employees' 
                },
                (payload) => {
                    // ✅ تحديث بدون إشعارات كثيرة
                    handleChange(payload);
                }
            )
            .subscribe((status) => {
                // ✅ نعرض الحالة بشكل هادئ
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime connected');
                } else if (status === 'CHANNEL_ERROR') {
                    // ✅ نتجاهل الخطأ ونحاول تاني بهدوء
                    setTimeout(() => {
                        if (!isRealtimeActive) return;
                        try {
                            channel.subscribe();
                        } catch (e) {
                            // نتجاهل
                        }
                    }, 5000);
                }
            });

        realtimeChannels.push(channel);

    } catch (error) {
        // ✅ نتجاهل أي خطأ
        isRealtimeActive = false;
    }
}

// ✅ إيقاف الـ Realtime
export function stopRealtime() {
    realtimeChannels.forEach(channel => {
        try {
            channel.unsubscribe();
        } catch (e) {
            // نتجاهل
        }
    });
    realtimeChannels = [];
    isRealtimeActive = false;
}

// ✅ معالجة التغييرات (نسخة خفيفة)
function handleChange(payload) {
    // ✅ تحديث لوحة التحكم (بس لو الدالة موجودة)
    if (typeof window.loadDashboardStats === 'function') {
        try {
            window.loadDashboardStats();
        } catch (e) {
            // نتجاهل
        }
    }

    // ✅ تحديث التقارير
    if (typeof window.loadPersonalReport === 'function') {
        try {
            window.loadPersonalReport();
        } catch (e) {
            // نتجاهل
        }
    }

    // ✅ تحديث المحطات
    if (typeof window.loadStations === 'function') {
        try {
            window.loadStations();
        } catch (e) {
            // نتجاهل
        }
    }

    // ✅ وميض خفيف
    flashPage();
}

// ✅ وميض الصفحة
function flashPage() {
    const main = document.querySelector('main, .admin-main, .dashboard-main, .reports-main');
    if (main) {
        main.style.transition = 'background 0.3s';
        main.style.background = '#f0f9ff';
        setTimeout(() => {
            main.style.background = '';
        }, 300);
    }
}

// ✅ تشغيل تلقائي
document.addEventListener('DOMContentLoaded', () => {
    // ✅ نستنى 3 ثواني عشان كل حاجة تتحمل
    setTimeout(() => {
        try {
            initRealtime();
        } catch (e) {
            // نتجاهل أي خطأ في البداية
        }
    }, 3000);
});

console.log('📡 Realtime handler ready');