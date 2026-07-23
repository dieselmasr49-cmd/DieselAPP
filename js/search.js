// ==========================================
// 🔍 صفحة البحث الذكي
// ==========================================

const supabase = window.supabase;
let searchTimeout = null;

// ✅ التحقق من الجلسة
document.addEventListener('DOMContentLoaded', async () => {
    const user = localStorage.getItem('loggedInUserName');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    await loadFilterOptions();
    setupEventListeners();
    
    // ✅ نسجل الدوال في window
    window.openDetailsDialog = openDetailsDialog;
    window.downloadEmployeePDF = downloadEmployeePDF;
});

// ✅ تحميل خيارات الفلتر
async function loadFilterOptions() {
    try {
        const { data: stations } = await supabase
            .from('stations')
            .select('station_name')
            .order('station_name');
        
        const select = document.getElementById('filterStation');
        if (stations && select) {
            stations.forEach(st => {
                const option = document.createElement('option');
                option.value = st.station_name;
                option.textContent = st.station_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('❌ فشل تحميل خيارات الفلتر:', error);
    }
}

// ✅ إعداد المستمعين
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearSearchBtn');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            if (this.value.length > 0) {
                if (clearBtn) clearBtn.style.display = 'block';
            } else {
                if (clearBtn) clearBtn.style.display = 'none';
            }
            
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performSearch();
            }, 300);
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                this.style.display = 'none';
                performSearch();
                searchInput.focus();
            }
        });
    }
    
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', performSearch);
    }
    
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', function() {
            const station = document.getElementById('filterStation');
            const dateFrom = document.getElementById('filterDateFrom');
            const dateTo = document.getElementById('filterDateTo');
            const reason = document.getElementById('filterReason');
            
            if (station) station.value = '';
            if (dateFrom) dateFrom.value = '';
            if (dateTo) dateTo.value = '';
            if (reason) reason.value = '';
            
            performSearch();
        });
    }
}

// ✅ دالة البحث الرئيسية
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    
    const station = document.getElementById('filterStation');
    const dateFrom = document.getElementById('filterDateFrom');
    const dateTo = document.getElementById('filterDateTo');
    const reason = document.getElementById('filterReason');
    
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = `
        <div class="loading-results">
            <i class="fa-solid fa-spinner fa-spin"></i>
            جاري البحث...
        </div>
    `;
    
    const startTime = performance.now();
    
    try {
        let queryBuilder = supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (query) {
            queryBuilder = queryBuilder.or(
                `employees_name.ilike.%${query}%,` +
                `national.ilike.%${query}%,` +
                `station_name.ilike.%${query}%`
            );
        }
        
        if (station && station.value) {
            queryBuilder = queryBuilder.eq('station_name', station.value);
        }
        
        if (dateFrom && dateFrom.value) {
            queryBuilder = queryBuilder.gte('created_at', dateFrom.value);
        }
        if (dateTo && dateTo.value) {
            queryBuilder = queryBuilder.lte('created_at', dateTo.value + 'T23:59:59');
        }
        
        if (reason && reason.value) {
            queryBuilder = queryBuilder.ilike('Leave_work', `%${reason.value}%`);
        }
        
        const { data, error } = await queryBuilder;
        
        if (error) throw error;
        
        const endTime = performance.now();
        const searchTime = ((endTime - startTime) / 1000).toFixed(2);
        
        renderResults(data, query, searchTime);
        
    } catch (error) {
        console.error('❌ فشل البحث:', error);
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: #ef4444;"></i>
                <h4>حدث خطأ</h4>
                <p>${error.message || 'فشل تنفيذ البحث'}</p>
            </div>
        `;
    }
}

// ✅ عرض النتائج
function renderResults(data, query, searchTime) {
    const resultsContainer = document.getElementById('searchResults');
    const statsContainer = document.getElementById('searchStats');
    
    if (!resultsContainer) return;
    
    if (!data || data.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-inbox" style="font-size: 3rem; color: #cbd5e1;"></i>
                <h4>لا توجد نتائج</h4>
                <p>لم يتم العثور على أي حالة مطابقة لبحثك</p>
            </div>
        `;
        if (statsContainer) statsContainer.style.display = 'none';
        return;
    }
    
    const resultsCount = document.getElementById('resultsCount');
    const searchTimeEl = document.getElementById('searchTime');
    
    if (resultsCount) resultsCount.textContent = data.length;
    if (searchTimeEl) searchTimeEl.textContent = searchTime;
    if (statsContainer) statsContainer.style.display = 'flex';
    
    resultsContainer.innerHTML = data.map(emp => {
        const highlightedName = query ? highlightText(emp.employees_name, query) : emp.employees_name;
        const highlightedNational = query ? highlightText(emp.national, query) : emp.national;
        
        let badgeClass = 'badge-danger';
        let statusText = 'محظور';
        
        if (emp.Leave_work && emp.Leave_work.toLowerCase().includes('تحقيق')) {
            badgeClass = 'badge-warning';
            statusText = 'تحقيق';
        } else if (emp.Leave_work && emp.Leave_work.toLowerCase().includes('انتهى')) {
            badgeClass = 'badge-success';
            statusText = 'منتهي';
        }
        
        return `
            <div class="result-card" onclick="openDetailsDialog(${JSON.stringify(emp).replace(/"/g, '&quot;')})">
                <div class="result-info">
                    <h4>${highlightedName}</h4>
                    <div class="result-details">
                        <span><i class="fa-regular fa-id-card"></i> ${highlightedNational}</span>
                        <span><i class="fa-solid fa-building"></i> ${emp.station_name || 'غير محدد'}</span>
                        <span><i class="fa-solid fa-tag"></i> ${emp.Leave_work || 'سبب غير محدد'}</span>
                    </div>
                </div>
                <div class="result-status">
                    <span class="badge ${badgeClass}">${statusText}</span>
                    <span class="result-date">${emp.created_at ? new Date(emp.created_at).toLocaleDateString('ar-EG') : 'مؤخراً'}</span>
                    <span style="font-size: 0.7rem; color: #94a3b8;">${emp.created_by || 'نظام آلي'}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ✅ تمييز النص
function highlightText(text, query) {
    if (!text || !query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// ✅ دالة فتح الديلوج
function openDetailsDialog(emp) {
    console.log('📋 فتح تفاصيل الموظف:', emp);
    
    // ✅ استخدام الدالة الموجودة في dashboard.js
    if (typeof window.openDetails === 'function') {
        window.openDetails(emp);
        return;
    }
    
    // ✅ لو الدالة مش موجودة، نفتح الديلوج المحلي
    showTemporaryDetails(emp);
}

// ✅ عرض تفاصيل مؤقتة (مع زر خروج وعرض حساب الناشر)
function showTemporaryDetails(emp) {
    let dialog = document.getElementById('detailsDialog');
    
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'detailsDialog';
        dialog.className = 'dialog-overlay hidden';
        dialog.innerHTML = `
            <div class="dialog-card animate-slide">
                <div class="dialog-header">
                    <h3>📋 تفاصيل الموظف</h3>
                    <button id="closeDetailsBtn" class="close-dialog-btn" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">&times;</button>
                </div>
                <div class="dialog-body">
                    <div id="dialogDetailsBody"></div>
                    <div class="dialog-footer-actions" style="margin-top:15px; display:flex; justify-content:center; gap:10px;">
                        <button id="backDetailsBtn" class="btn btn-secondary" style="padding:8px 20px;">↩️ رجوع</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
        
        const closeBtn = document.getElementById('closeDetailsBtn');
        const backBtn = document.getElementById('backDetailsBtn');
        
        if (closeBtn) closeBtn.addEventListener('click', closeDialog);
        if (backBtn) backBtn.addEventListener('click', closeDialog);
        
        dialog.addEventListener('click', function(e) {
            if (e.target === this) closeDialog();
        });
    }
    
    const body = document.getElementById('dialogDetailsBody');
    if (body) {
        let realLeavingDate = 'غير محدد';
        if (emp.leavingdate) {
            const dateObj = new Date(emp.leavingdate);
            realLeavingDate = dateObj.toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // ✅ اسم الناشر
        const publisherName = emp.created_by || 'نظام آلي';
        const isPublisher = publisherName !== 'نظام آلي' && publisherName !== 'غير معروف';
        
        body.innerHTML = `
            <div style="direction: rtl; font-family: 'Cairo', sans-serif; padding: 10px;">
                <div class="detail-item" style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                    <strong>اسم الموظف:</strong> ${emp.employees_name}
                </div>
                <div class="detail-item" style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                    <strong>الرقم القومي:</strong> ${emp.national}
                </div>
                <div class="detail-item" style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                    <strong>العنوان:</strong> ${emp.address || 'غير محدد'}
                </div>
                <div class="detail-item" style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                    <strong>المحطة:</strong> ${emp.station_name}
                </div>
                <div class="detail-item" style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                    <strong>مسؤول التوظيف:</strong> ${emp.Recruitment_Officer || 'غير محدد'}
                </div>
                <div class="detail-item" style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                    <strong>مدير العمليات:</strong> ${emp.Operations_Manager || 'غير محدد'}
                </div>
                <div class="detail-item" style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                    <strong>سبب ترك العمل:</strong> <span style="color:#dc3545; font-weight:bold;">${emp.Leave_work || 'غير محدد'}</span>
                </div>
                <div class="detail-item" style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                    <strong>وكيل او شركة:</strong> ${emp.agent || 'لا يوجد'}
                </div>
                <div class="detail-item" style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                    <strong>ملاحظات إضافية:</strong> ${emp.comments || 'لا يوجد'}
                </div>
                <div class="detail-item" style="padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.9rem;">
                    <strong>📅 تاريخ ترك العمل الفعلي:</strong> <span style="color:#28a745; font-weight:bold;">${realLeavingDate}</span>
                </div>
                
                <!-- ✅ عرض حساب الناشر (رابط) -->
                <div class="detail-item" style="border-top: 1px dashed #cbd5e1; margin-top: 10px; padding-top: 10px; font-size: 0.9rem; color: #64748b;">
                    <i class="fa-solid fa-signature"></i> <strong>بواسطة (الناشر):</strong>
                    ${isPublisher ? `
                        <a href="publisher.html?name=${encodeURIComponent(publisherName)}" 
                           style="color: #3b82f6; font-weight: bold; cursor: pointer; text-decoration: none; transition: color 0.2s;"
                           onmouseover="this.style.color='#1d4ed8'; this.style.textDecoration='underline';"
                           onmouseout="this.style.color='#3b82f6'; this.style.textDecoration='none';">
                            ${publisherName}
                        </a>
                    ` : `
                        <span style="color: #94a3b8; font-weight: bold;">${publisherName}</span>
                    `}
                </div>
                
                <!-- ✅ زر تحميل PDF -->
                <div style="margin-top: 15px; text-align: center;">
                    <button onclick="downloadEmployeePDF(${JSON.stringify(emp).replace(/"/g, '&quot;')})" 
                            style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Cairo'; font-size: 0.9rem; transition: background 0.2s;"
                            onmouseover="this.style.background='#059669'"
                            onmouseout="this.style.background='#10b981'">
                        <i class="fa-solid fa-file-pdf"></i> 📥 تحميل تقرير PDF
                    </button>
                </div>
            </div>
        `;
    }
    
    dialog.classList.remove('hidden');
}

// ✅ دالة تحميل PDF (من داخل البحث)
function downloadEmployeePDF(emp) {
    // ✅ استخدام الدالة الموجودة في dashboard.js
    if (typeof window.exportEmployeePDF === 'function') {
        window.exportEmployeePDF(emp);
        return;
    }
    
    // ✅ لو مش موجودة، نعرض رسالة
    alert('📄 جاري تجهيز التقرير...\n' + emp.employees_name);
}

// ✅ إغلاق الديلوج
function closeDialog() {
    const dialog = document.getElementById('detailsDialog');
    if (dialog) {
        dialog.classList.add('hidden');
    }
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

console.log('🔍 Search JS loaded');