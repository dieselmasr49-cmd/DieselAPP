// ==========================================
// 📊 صفحة التقارير (Reports)
// ==========================================

const supabase = window.supabase;

// ✅ التحقق من الجلسة
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('loggedInUserName');
    console.log('📌 المستخدم في reports:', user);
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    loadReportsStats();
    loadPersonalReport();
});

// ✅ جلب الإحصائيات للصفحة
async function loadReportsStats() {
    try {
        const { count: totalStations } = await supabase
            .from('stations')
            .select('*', { count: 'exact', head: true });
        
        const { count: totalEmployees } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true });
        
        const stationsEl = document.getElementById('reportTotalStations');
        const employeesEl = document.getElementById('reportTotalEmployees');
        const updateEl = document.getElementById('reportLastUpdate');
        
        if (stationsEl) stationsEl.textContent = totalStations || 0;
        if (employeesEl) employeesEl.textContent = totalEmployees || 0;
        if (updateEl) updateEl.textContent = new Date().toLocaleTimeString('ar-EG');
        
    } catch (error) {
        console.error('❌ فشل جلب الإحصائيات:', error.message);
    }
}

// ==========================================
// 📊 التقرير الشخصي
// ==========================================

let myPublishChart = null;

async function loadPersonalReport() {
    const publisherName = localStorage.getItem('loggedInUserName');
    console.log('📌 الناشر في التقرير الشخصي:', publisherName);
    
    if (!publisherName) {
        console.warn('⚠️ لا يوجد ناشر مسجل');
        return;
    }

    try {
        // ✅ جلب حالات هذا الناشر
        const { data: myCases, error: casesErr } = await supabase
            .from('employees')
            .select('*')
            .eq('created_by', publisherName)
            .order('created_at', { ascending: false });

        if (casesErr) throw casesErr;
        console.log('📊 عدد حالات الناشر:', myCases?.length || 0);

        // ✅ جلب إجمالي الحالات
        const { count: totalAll, error: totalErr } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true });

        if (totalErr) throw totalErr;

        // ✅ جلب الناشرين
        const { data: allPublishers, error: pubErr } = await supabase
            .from('employees')
            .select('created_by');

        if (pubErr) throw pubErr;

        const myCount = myCases?.length || 0;
        const totalCount = totalAll || 1;
        const rate = Math.round((myCount / totalCount) * 100);

        // ✅ عرض الإحصائيات
        const totalEl = document.getElementById('myTotalCases');
        const rateEl = document.getElementById('myPublishRate');
        const rankEl = document.getElementById('myRank');
        
        if (totalEl) totalEl.textContent = myCount;
        if (rateEl) rateEl.textContent = `${rate}%`;

        // ✅ حساب الترتيب
        if (allPublishers) {
            const counts = {};
            allPublishers.forEach(p => {
                if (p.created_by) {
                    counts[p.created_by] = (counts[p.created_by] || 0) + 1;
                }
            });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const rank = sorted.findIndex(p => p[0] === publisherName) + 1;
            if (rankEl) rankEl.textContent = rank > 0 ? `#${rank} من ${sorted.length}` : '--';
        }

        // ✅ رسم بياني
        renderMyPublishChart(myCases);
        renderMyCases(myCases);

    } catch (error) {
        console.error('❌ فشل تحميل التقرير الشخصي:', error.message);
    }
}

// ✅ رسم بياني
function renderMyPublishChart(myCases) {
    const ctx = document.getElementById('myPublishChart');
    if (!ctx) return;

    const days = [];
    const counts = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().slice(0, 10);
        days.push(date.toLocaleDateString('ar-EG', { weekday: 'short' }));
        
        const count = myCases?.filter(c => {
            const caseDate = new Date(c.created_at).toISOString().slice(0, 10);
            return caseDate === dateStr;
        }).length || 0;
        counts.push(count);
    }

    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.onload = () => createMyPublishChart(ctx, days, counts);
        document.head.appendChild(script);
    } else {
        createMyPublishChart(ctx, days, counts);
    }
}

function createMyPublishChart(ctx, days, counts) {
    if (myPublishChart) {
        myPublishChart.destroy();
    }

    myPublishChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'عدد الحالات المنشورة',
                data: counts,
                backgroundColor: ['#3b82f6', '#60a5fa', '#93c5fd', '#3b82f6', '#60a5fa', '#93c5fd', '#3b82f6'],
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// ✅ عرض قائمة حالاتي
function renderMyCases(myCases) {
    const container = document.getElementById('myCasesList');
    if (!container) return;

    if (!myCases || myCases.length === 0) {
        container.innerHTML = `
            <div class="empty-cases">
                <i class="fa-regular fa-circle-check" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                لم تقم بنشر أي حالة حتى الآن
            </div>
        `;
        return;
    }

    container.innerHTML = myCases.map(c => `
        <div class="my-case-item" onclick="openDetails(${JSON.stringify(c).replace(/"/g, '&quot;')})">
            <div>
                <div class="case-name">${c.employees_name}</div>
                <div class="case-details">📍 ${c.station_name || 'غير محدد'} | 🆔 ${c.national || 'غير محدد'}</div>
            </div>
            <div class="case-date">
                ${c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG') : 'مؤخراً'}
            </div>
        </div>
    `).join('');
}

// ✅ تصدير الدوال
window.loadPersonalReport = loadPersonalReport;

// ... دوال التصدير (CSV, PDF) موجودة

console.log('📊 Reports JS loaded');