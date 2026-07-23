// ==========================================
// ⚙️ صفحة الإعدادات (Settings)
// ==========================================

const supabase = window.supabase;

// ✅ التحقق من الجلسة
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('loggedInUserName');
    console.log('📌 المستخدم في settings:', user);
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    loadSettingsData();
});

// ✅ جلب بيانات الإعدادات
async function loadSettingsData() {
    try {
        const userId = localStorage.getItem('loggedInUserId');
        const stationName = localStorage.getItem('loggedInUserName');
        const userEmail = localStorage.getItem('loggedInUserEmail');
        
        console.log('📌 userId:', userId);
        console.log('📌 stationName:', stationName);
        console.log('📌 userEmail:', userEmail);

        // ✅ عرض البيانات الأساسية
        const nameEl = document.getElementById('settingsStationName');
        const emailEl = document.getElementById('settingsEmail');
        const userIdEl = document.getElementById('settingsUserId');
        
        if (nameEl) nameEl.textContent = stationName || 'غير محدد';
        if (emailEl) emailEl.textContent = userEmail || 'غير محدد';
        if (userIdEl) userIdEl.textContent = userId || 'غير محدد';
        
        if (!userId) {
            console.warn('⚠️ لا يوجد userId');
            return;
        }

        // ✅ ✅ ✅ جلب بيانات المحطة (مع معالجة التكرار)
        console.log('🔍 جاري جلب بيانات المحطة للمستخدم:', userId);
        
        const { data: stationData, error: stationError } = await supabase
            .from('stations')
            .select('id, phoneNum, show_phone, station_name')
            .eq('user_id', userId);

        if (stationError) {
            console.error('❌ تفاصيل الخطأ:', {
                message: stationError.message,
                code: stationError.code,
                details: stationError.details,
                hint: stationError.hint
            });
            
            window.showToast('❌ خطأ', stationError.message || 'فشل جلب بيانات المحطة', 'error');
            return;
        }

        console.log('📌 stationData (كل الصفوف):', stationData);

        // ✅ نأخذ أول صف (لو في أكتر من صف)
        const station = stationData && stationData.length > 0 ? stationData[0] : null;

        // ✅ لو في أكتر من صف، نحذف المكررات ونخلي الأول بس
        if (stationData && stationData.length > 1) {
            console.warn('⚠️ يوجد ' + stationData.length + ' صفوف لنفس المستخدم، سيتم الاحتفاظ بالأول فقط');
            
            // ✅ نحذف الصفوف المكررة (نخلي أحدث صف)
            try {
                const sorted = stationData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                const keepId = sorted[0].id;
                const deleteIds = sorted.slice(1).map(s => s.id);
                
                for (const id of deleteIds) {
                    await supabase.from('stations').delete().eq('id', id);
                    console.log('🗑️ تم حذف الصف المكرر:', id);
                }
                console.log('✅ تم تنظيف الصفوف المكررة');
            } catch (cleanErr) {
                console.warn('⚠️ فشل تنظيف الصفوف المكررة:', cleanErr);
            }
        }

        // ✅ عرض البيانات
        const phoneInput = document.getElementById('settingsPhoneInput');
        const phoneDisplay = document.getElementById('settingsPhone');
        const displayPhone = document.getElementById('displayPhoneNumber');
        const toggle = document.getElementById('showPhoneToggle');
        const visibilityStatus = document.getElementById('visibilityStatus');

        if (station) {
            const phone = station.phoneNum || '';
            const showPhone = station.show_phone || false;
            
            if (phoneInput) phoneInput.value = phone;
            if (phoneDisplay) phoneDisplay.textContent = phone || 'غير مضاف';
            if (displayPhone) displayPhone.textContent = phone || 'غير مضاف';
            if (toggle) toggle.checked = showPhone;
            
            updatePhoneStatusDisplay(showPhone, phone);
            localStorage.setItem('loggedInPhone', phone);
            
            console.log('✅ تم جلب البيانات:', { phone, showPhone });
        } else {
            console.log('ℹ️ لا توجد بيانات للمستخدم في جدول stations');
            
            // ✅ إنشاء سجل جديد للمستخدم
            try {
                const { error: insertError } = await supabase
                    .from('stations')
                    .insert([{
                        user_id: userId,
                        station_name: stationName || 'محطة غير مسماة',
                        phoneNum: '',
                        show_phone: false,
                        is_active: true
                    }]);
                
                if (insertError) {
                    console.error('❌ فشل إنشاء سجل للمستخدم:', insertError);
                } else {
                    console.log('✅ تم إنشاء سجل جديد للمستخدم');
                    // ✅ نعيد تحميل البيانات بعد الإضافة
                    setTimeout(loadSettingsData, 500);
                    return;
                }
            } catch (insertErr) {
                console.error('❌ خطأ في الإضافة:', insertErr);
            }
        }

        // ✅ عدد المحطات
        const { count: stationsCount } = await supabase
            .from('stations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        
        const branchesEl = document.getElementById('stationBranchesCount');
        if (branchesEl) branchesEl.textContent = stationsCount || 0;
        
        // ✅ عدد المحظورين
        const { count: blockedCount } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true })
            .eq('created_by', stationName);
        
        const blockedEl = document.getElementById('blockedUsersCount');
        if (blockedEl) blockedEl.textContent = blockedCount || 0;
        
        // ✅ مؤشر النشر
        const total = await supabase.from('employees').select('*', { count: 'exact', head: true });
        const userCount = blockedCount || 0;
        const totalCount = total.count || 1;
        const rate = Math.round((userCount / totalCount) * 100);
        const rateEl = document.getElementById('publishRate');
        if (rateEl) rateEl.textContent = `${rate}%`;
        
    } catch (error) {
        console.error('❌ فشل تحميل الإعدادات:', error);
        window.showToast('❌ خطأ', error.message || 'فشل تحميل الإعدادات', 'error');
    }
}

// ✅ تحديث عرض حالة الرقم
function updatePhoneStatusDisplay(show, phone) {
    const visibilityStatus = document.getElementById('visibilityStatus');
    const displayPhone = document.getElementById('displayPhoneNumber');
    
    if (displayPhone) {
        displayPhone.textContent = phone || 'غير مضاف';
    }
    
    if (visibilityStatus) {
        if (show && phone) {
            visibilityStatus.textContent = '🟢 ظاهر للوكلاء';
            visibilityStatus.style.color = '#10b981';
        } else if (show && !phone) {
            visibilityStatus.textContent = '⚠️ أضف رقمك أولاً';
            visibilityStatus.style.color = '#f59e0b';
        } else {
            visibilityStatus.textContent = '🔒 غير ظاهر';
            visibilityStatus.style.color = '#64748b';
        }
    }
}

// ✅ حفظ رقم الهاتف
async function savePhoneNumber() {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        window.showToast('❌ خطأ', 'لم يتم العثور على معرف المستخدم', 'error');
        return;
    }

    const phoneInput = document.getElementById('settingsPhoneInput');
    const phone = phoneInput?.value.trim();

    if (!phone) {
        window.showToast('⚠️ تنبيه', 'من فضلك أدخل رقم الموبايل', 'warning');
        return;
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
        window.showToast('⚠️ تنبيه', 'الرقم يجب أن يكون 10 أرقام على الأقل', 'warning');
        return;
    }

    try {
        const { error } = await supabase
            .from('stations')
            .update({ phoneNum: cleanPhone })
            .eq('user_id', userId);

        if (error) throw error;

        localStorage.setItem('loggedInPhone', cleanPhone);
        
        const phoneDisplay = document.getElementById('settingsPhone');
        const displayPhone = document.getElementById('displayPhoneNumber');
        if (phoneDisplay) phoneDisplay.textContent = cleanPhone;
        if (displayPhone) displayPhone.textContent = cleanPhone;

        const toggle = document.getElementById('showPhoneToggle');
        updatePhoneStatusDisplay(toggle?.checked || false, cleanPhone);

        window.showToast('✅ تم الحفظ', 'تم تحديث رقم الموبايل بنجاح', 'success');

    } catch (error) {
        console.error('❌ فشل حفظ الرقم:', error.message);
        window.showToast('❌ خطأ', error.message || 'فشل حفظ الرقم', 'error');
    }
}

// ✅ تبديل حالة إظهار الرقم
async function togglePhoneVisibility() {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) return;

    const toggle = document.getElementById('showPhoneToggle');
    const show = toggle?.checked || false;
    const phone = document.getElementById('settingsPhoneInput').value.trim();

    if (show && !phone) {
        window.showToast('⚠️ تنبيه', 'أضف رقمك أولاً قبل تفعيل الإظهار', 'warning');
        toggle.checked = false;
        return;
    }

    try {
        const { error } = await supabase
            .from('stations')
            .update({ show_phone: show })
            .eq('user_id', userId);

        if (error) throw error;

        updatePhoneStatusDisplay(show, phone);
        
        if (show) {
            window.showToast('📢 تم التفعيل', 'رقمك أصبح ظاهراً للوكلاء الآخرين', 'success');
        } else {
            window.showToast('🔒 تم الإخفاء', 'رقمك أصبح غير ظاهر للوكلاء', 'info');
        }

    } catch (error) {
        console.error('❌ فشل تحديث الإظهار:', error.message);
        window.showToast('❌ خطأ', error.message || 'فشل تحديث الإظهار', 'error');
        toggle.checked = !show;
    }
}

// ✅ ربط الأحداث
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('savePhoneBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', savePhoneNumber);
    }

    const toggle = document.getElementById('showPhoneToggle');
    if (toggle) {
        toggle.addEventListener('change', togglePhoneVisibility);
    }

    const phoneInput = document.getElementById('settingsPhoneInput');
    if (phoneInput) {
        phoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                savePhoneNumber();
            }
        });
    }
});

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

console.log('⚙️ Settings JS loaded');