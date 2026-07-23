// ==========================================
// 🛡️ لوحة التحكم (Admin) - نسخة بسيطة
// ==========================================

const supabase = window.supabase;

// ✅ التحقق من الصلاحية
document.addEventListener('DOMContentLoaded', () => {
    console.log('🛡️ Admin page loaded');
    
    const role = localStorage.getItem('currentUserRole') || 'user';
    console.log('📌 role:', role);
    
    if (role !== 'adminmaster') {
        console.warn('⚠️ ليس لديك صلاحية adminmaster، جاري التحويل...');
        window.location.href = 'dashboard.html';
        return;
    }
    
    const userNameEl = document.getElementById('adminUserName');
    if (userNameEl) {
        userNameEl.textContent = localStorage.getItem('loggedInUserName') || 'أمير النظام';
    }
    
    // ✅ تشغيل لوحة التحكم
    initAdminDashboard();
});

// ✅ تهيئة لوحة التحكم
function initAdminDashboard() {
    console.log('🔄 initAdminDashboard started');
    
    try {
        // ✅ 1. تفعيل أزرار السايد بار
        const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
        console.log('📌 sidebarLinks found:', sidebarLinks.length);
        
        sidebarLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔄 Sidebar clicked:', this.dataset.section);
                
                // ✅ شيل active من الكل
                document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // ✅ أظهر الصفحة
                const pageId = this.dataset.section;
                document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active-page'));
                const target = document.getElementById(`page-${pageId}`);
                if (target) {
                    target.classList.add('active-page');
                    console.log('✅ Page shown:', pageId);
                }
            });
        });
        
        // ✅ 2. تحميل الإحصائيات
        loadAdminStats();
        loadStations();
        
        // ✅ 3. تحميل الرسوم البيانية (من غير ما توقف الدنيا)
        setTimeout(() => {
            try {
                initCharts();
            } catch (e) {
                console.warn('⚠️ Charts error:', e.message);
            }
        }, 500);
        
        console.log('✅ Admin dashboard initialized');
        
    } catch (error) {
        console.error('❌ فشل تهيئة لوحة التحكم:', error);
    }
}

// ✅ جلب الإحصائيات
async function loadAdminStats() {
    try {
        console.log('📊 Loading admin stats...');
        
        const { count: totalStations } = await supabase
            .from('stations')
            .select('*', { count: 'exact', head: true });
        
        const { data: stations } = await supabase
            .from('stations')
            .select('is_active');
        
        const active = stations?.filter(s => s.is_active === true).length || 0;
        const frozen = (totalStations || 0) - active;
        
        const totalEl = document.getElementById('adminTotalStationsCount');
        const activeEl = document.getElementById('adminActiveStationsCount');
        const frozenEl = document.getElementById('adminFrozenStationsCount');
        
        if (totalEl) totalEl.textContent = totalStations || 0;
        if (activeEl) activeEl.textContent = active;
        if (frozenEl) frozenEl.textContent = frozen;
        
        console.log('📊 Stats loaded:', { totalStations, active, frozen });
        
    } catch (error) {
        console.error('❌ فشل جلب الإحصائيات:', error.message);
    }
}

// ✅ جلب المحطات
async function loadStations() {
    const tbody = document.getElementById('adminStationsTableBody');
    if (!tbody) {
        console.warn('⚠️ adminStationsTableBody not found');
        return;
    }
    
    try {
        console.log('📋 Loading stations...');
        
        const { data: stations, error } = await supabase
            .from('stations')
            .select('*')
            .order('station_name');
        
        if (error) throw error;
        
        if (!stations || stations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا توجد محطات مسجلة</td></tr>`;
            return;
        }
        
        tbody.innerHTML = stations.map(st => `
            <tr>
                <td><i class="fa-solid fa-building" style="color:#64748b;"></i> ${st.station_name}</td>
                <td>${st.email || 'غير متاح'}</td>
                <td style="text-align:center;">
                    <span style="background:#f1f5f9; padding:4px 12px; border-radius:20px; font-size:0.8rem;">نشط</span>
                </td>
                <td style="text-align:center;">
                    <span style="background:${st.is_active ? '#dcfce7' : '#fee2e2'}; color:${st.is_active ? '#16a34a' : '#dc2626'}; padding:4px 12px; border-radius:20px; font-size:0.8rem; font-weight:bold;">
                        ${st.is_active ? '🟢 نشط' : '🛑 مجمد'}
                    </span>
                </td>
                <td style="text-align:center;">
                    <button onclick="toggleStationStatus('${st.id}', ${!st.is_active})" 
                            class="toggle-status-btn ${st.is_active ? 'active' : 'inactive'}">
                        ${st.is_active ? 'تجميد' : 'تنشيط'}
                    </button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ Stations loaded:', stations.length);
        
    } catch (error) {
        console.error('❌ فشل جلب المحطات:', error.message);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">خطأ في جلب البيانات</td></tr>`;
    }
}

// ✅ تبديل حالة المحطة
window.toggleStationStatus = async (id, newState) => {
    try {
        console.log('🔄 Toggling station:', id, newState);
        
        const { error } = await supabase
            .from('stations')
            .update({ is_active: newState })
            .eq('id', id);
        
        if (error) throw error;
        
        window.showToast('✅ تم التحديث', newState ? 'تم تنشيط الحساب' : 'تم تجميد الحساب', 'success');
        loadStations();
        loadAdminStats();
        
    } catch (error) {
        console.error('❌ فشل تحديث الحالة:', error.message);
        window.showToast('❌ خطأ', 'فشل تحديث الحالة', 'error');
    }
};

// ✅ إضافة محطة جديدة
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById('addNewStationBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            document.getElementById('addStationDialog').style.display = 'flex';
        });
    }
    
    const saveBtn = document.getElementById('saveNewStation');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const name = document.getElementById('newStationName').value.trim();
            const email = document.getElementById('newStationEmail').value.trim();
            const pass = document.getElementById('newStationPass').value;
            
            if (!name || !email || !pass) {
                window.showToast('⚠️ تنبيه', 'املأ جميع الحقول', 'warning');
                return;
            }
            
            try {
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: email,
                    password: pass
                });
                
                if (authError) throw authError;
                
                const { error: dbError } = await supabase
                    .from('stations')
                    .insert([{
                        station_name: name,
                        email: email,
                        user_id: authData.user.id,
                        is_active: true
                    }]);
                
                if (dbError) throw dbError;
                
                window.showToast('✅ تمت الإضافة', 'تم إضافة المحطة بنجاح', 'success');
                document.getElementById('addStationDialog').style.display = 'none';
                document.getElementById('newStationName').value = '';
                document.getElementById('newStationEmail').value = '';
                document.getElementById('newStationPass').value = '';
                loadStations();
                loadAdminStats();
                
            } catch (error) {
                console.error('❌ فشل إضافة المحطة:', error.message);
                window.showToast('❌ خطأ', error.message, 'error');
            }
        });
    }
    
    // ✅ تحديث المحطات
    const refreshBtn = document.getElementById('adminRefreshStationsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadStations();
            loadAdminStats();
            window.showToast('🔄 تم التحديث', 'تم تحديث البيانات', 'success');
        });
    }
});

// ✅ الرسوم البيانية (بسيطة)
async function initCharts() {
    try {
        // ✅ تحميل Chart.js
        if (typeof Chart === 'undefined') {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        }
        
        const barContainer = document.getElementById('adminBarsChartContainer');
        if (!barContainer) return;
        
        const { data: stations } = await supabase
            .from('stations')
            .select('station_name');
        
        const { data: employees } = await supabase
            .from('employees')
            .select('station_name');
        
        if (!stations || stations.length === 0) {
            barContainer.innerHTML = '<div style="color:#94a3b8; text-align:center; padding:20px;">لا توجد بيانات</div>';
            return;
        }
        
        const labels = stations.map(s => s.station_name);
        const data = stations.map(st => {
            return employees?.filter(e => e.station_name === st.station_name).length || 0;
        });
        
        barContainer.innerHTML = '';
        const canvas = document.createElement('canvas');
        barContainer.appendChild(canvas);
        
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد الحالات',
                    data: data,
                    backgroundColor: '#3b82f6',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
        
        console.log('📊 Charts initialized');
        
    } catch (error) {
        console.warn('⚠️ Charts error (non-critical):', error.message);
    }
}

// ✅ تسجيل الخروج (شغال 100%)
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('backToMainAppBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            console.log('🚪 Logging out...');
            try {
                if (typeof window.endActiveSession === 'function') {
                    await window.endActiveSession();
                }
                await supabase.auth.signOut();
                localStorage.clear();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('❌ فشل الخروج:', error.message);
                // ✅ لو فشل، نحاول نخرج بالطريقة القديمة
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }
});

console.log('🛡️ Admin JS loaded');