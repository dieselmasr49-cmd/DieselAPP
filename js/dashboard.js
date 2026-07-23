// ==========================================
// 🏠 الصفحة الرئيسية (Dashboard)
// ==========================================

const supabase = window.supabase;

// ✅ التحقق من الجلسة
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('loggedInUserName');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    // ✅ عرض اسم المستخدم
    const userNameEl = document.getElementById('currentUserName');
    if (userNameEl) {
        userNameEl.textContent = user;
    }
    
    // ✅ تحميل الإحصائيات
    loadDashboardStats();
    
    // ✅ ✅ ✅ تحديث عداد الرسائل في الناف بار
    setTimeout(() => {
        if (typeof window.updateChatBadge === 'function') {
            window.updateChatBadge();
        }
    }, 1500);
});

// ✅ جلب الإحصائيات
async function loadDashboardStats() {
    try {
        // ✅ عدد المحظورين
        const { count: totalEmp, error: empErr } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true });
        
        if (empErr) throw empErr;
        
        const totalEl = document.getElementById('totalEmployeesCount');
        if (totalEl) totalEl.textContent = totalEmp || 0;
        
        // ✅ عدد المحطات
        const { count: stationsCount, error: stationsErr } = await supabase
            .from('stations')
            .select('*', { count: 'exact', head: true });
        
        if (!stationsErr) {
            const stationsEl = document.getElementById('totalStationsCount');
            if (stationsEl) stationsEl.textContent = stationsCount || 0;
        }
        
        // ✅ آخر 5 حالات
        const { data: recentData, error: recentErr } = await supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (recentErr) throw recentErr;
        
        const container = document.getElementById('recentEmployeesList');
        if (!container) return;
        
        if (!recentData || recentData.length === 0) {
            container.innerHTML = `<div class="loading-placeholder">💡 لا توجد حالات مسجلة</div>`;
            return;
        }
        
        container.innerHTML = recentData.map(emp => `
            <div class="recent-item" onclick="openDetails(${JSON.stringify(emp).replace(/"/g, '&quot;')})">
                <div class="recent-item-info">
                    <h4>${emp.employees_name}</h4>
                    <p>📍 ${emp.station_name || 'غير محدد'} | 🆔 ${emp.national || 'غير محدد'}</p>
                </div>
                <span style="font-size: 0.75rem; color: #94a3b8;">
                    ${emp.created_at ? new Date(emp.created_at).toLocaleDateString('ar-EG') : 'مؤخراً'}
                </span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ فشل تحميل الإحصائيات:', error.message);
    }
}

// ✅ ✅ ✅ دالة تحديث عداد الرسائل (تُنادى من chat-list.js)
window.updateChatBadge = async function() {
    const currentUser = localStorage.getItem('loggedInUserName');
    if (!currentUser) return;

    try {
        // ✅ جلب كل الغرف اللي المستخدم مشارك فيها
        const { data: rooms, error: roomsError } = await supabase
            .from('chat_rooms')
            .select('room_id')
            .or(`participant1.eq.${currentUser},participant2.eq.${currentUser}`);

        if (roomsError) {
            console.warn('⚠️ فشل جلب الغرف:', roomsError);
            return;
        }

        if (!rooms || rooms.length === 0) {
            const badge = document.getElementById('chatNavBadge');
            if (badge) badge.style.display = 'none';
            return;
        }

        let totalUnread = 0;
        for (const room of rooms) {
            const { count, error: countError } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.room_id)
                .eq('is_read', false)
                .neq('sender', currentUser);

            if (!countError) {
                totalUnread += count || 0;
            }
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
        
        // ✅ تحديث العداد في صفحة المحادثات (لو مفتوحة)
        if (typeof window.updateChatListBadge === 'function') {
            window.updateChatListBadge(totalUnread);
        }

    } catch (error) {
        console.error('❌ فشل تحديث عداد الرسائل:', error);
    }
};

// ==========================================
// 📋 نافذة تفاصيل الموظف
// ==========================================

// ✅ فتح نافذة التفاصيل
window.openDetails = function(emp) {
    const detailsDialog = document.getElementById('detailsDialog');
    const dialogDetailsBody = document.getElementById('dialogDetailsBody');
    
    if (!detailsDialog || !dialogDetailsBody) return;

    let realLeavingDate = 'غير محدد';
    if (emp.leavingdate) {
        const dateObj = new Date(emp.leavingdate);
        realLeavingDate = dateObj.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    const publisherName = emp.created_by || 'نظام آلي';
    const isPublisher = publisherName !== 'نظام آلي' && publisherName !== 'غير معروف';

    dialogDetailsBody.innerHTML = `
        <div id="pdfPrintArea" style="direction: rtl; font-family: 'Cairo', sans-serif; padding: 10px;">
            <div class="detail-item"><strong>اسم الموظف:</strong> ${emp.employees_name}</div>
            <div class="detail-item" style="display: flex; align-items: center;">
                <strong>الرقم القومي:</strong>
                <span style="margin-right: 10px;">${emp.national}</span>
                <button class="copy-mini-btn" onclick="copyToClipboard('${emp.national}', this)">
                    <i class="fa-regular fa-copy"></i> نسخ
                </button>
            </div>
            <div class="detail-item"><strong>العنوان:</strong> ${emp.address || 'غير محدد'}</div>
            <div class="detail-item"><strong>المحطة:</strong> ${emp.station_name}</div>
            <div class="detail-item"><strong>مسؤول التوظيف:</strong> ${emp.Recruitment_Officer || 'غير محدد'}</div>
            <div class="detail-item"><strong>مدير العمليات:</strong> ${emp.Operations_Manager || 'غير محدد'}</div>
            <div class="detail-item"><strong>سبب ترك العمل:</strong> <span style="color:#dc3545; font-weight:bold;">${emp.Leave_work || 'غير محدد'}</span></div>
            <div class="detail-item"><strong>وكيل او شركة:</strong> ${emp.agent || 'لا يوجد'}</div>
            <div class="detail-item"><strong>ملاحظات إضافية:</strong> ${emp.comments || 'لا يوجد'}</div>
            <div class="detail-item"><strong>📅 تاريخ ترك العمل الفعلي:</strong> <span style="color:#28a745; font-weight:bold;">${realLeavingDate}</span></div>
            
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
        </div>
        <div style="margin-top: 20px; text-align: center;">
            <button id="downloadPdfBtn" class="btn btn-success" onclick="exportEmployeePDF(${JSON.stringify(emp).replace(/"/g, '&quot;')})">
                <i class="fa-solid fa-file-pdf"></i> 📥 تحميل تقرير PDF رسمي
            </button>
        </div>
    `;

    detailsDialog.classList.remove('hidden');
};

// ✅ إغلاق نافذة التفاصيل
function closeDetails() {
    const detailsDialog = document.getElementById('detailsDialog');
    if (detailsDialog) {
        detailsDialog.classList.add('hidden');
    }
}

// ✅ نسخ النص
window.copyToClipboard = function(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ!';
        btnElement.style.background = '#10b981';
        btnElement.style.color = '#fff';
        
        setTimeout(() => {
            btnElement.innerHTML = originalText;
            btnElement.style.background = '#e2e8f0';
            btnElement.style.color = '#475569';
        }, 1500);
    });
};

// ✅ ربط أزرار الإغلاق
document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.getElementById('closeDetailsBtn');
    const backBtn = document.getElementById('backDetailsBtn');
    const detailsDialog = document.getElementById('detailsDialog');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeDetails);
    }
    if (backBtn) {
        backBtn.addEventListener('click', closeDetails);
    }
    if (detailsDialog) {
        detailsDialog.addEventListener('click', function(e) {
            if (e.target === this) closeDetails();
        });
    }
});

// ==========================================
// 📄 تصدير PDF
// ==========================================

window.exportEmployeePDF = function(emp) {
    const btn = document.getElementById('downloadPdfBtn');
    if (btn) {
        btn.innerHTML = '⏳ جاري تجهيز التقرير...';
        btn.disabled = true;
    }

    let realLeavingDate = emp.leavingdate ? new Date(emp.leavingdate).toLocaleDateString('ar-EG') : 'غير محدد';
    let printDate = new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    if (typeof html2pdf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = function() {
            generatePDF(emp, realLeavingDate, printDate);
        };
        document.head.appendChild(script);
    } else {
        generatePDF(emp, realLeavingDate, printDate);
    }
};

function generatePDF(emp, realLeavingDate, printDate) {
    const element = document.createElement('div');
    element.innerHTML = `
        <div style="direction: rtl; font-family: 'Cairo', sans-serif; padding: 40px; color: #1e293b; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 30px;">
                <div>
                    <h1 style="margin: 0; font-size: 1.8rem; color: #1e293b;">MappMaster</h1>
                    <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #64748b;">نظام إدارة الحظر والعمليات الذكي</p>
                </div>
                <div style="text-align: left;">
                    <span style="background: #ef4444; color: white; padding: 5px 12px; border-radius: 4px; font-weight: bold; font-size: 0.85rem;">⚠️ تقرير حظر رسمي</span>
                </div>
            </div>
            <h2 style="text-align: center; font-size: 1.4rem; color: #0f172a; margin-bottom: 25px; background: #f1f5f9; padding: 10px; border-radius: 6px;">بيانات إدراج موظف في القائمة السوداء</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 1rem;">
                <tr style="background: #f8fafc;"><td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold; width: 30%;">اسم الموظف:</td><td style="padding: 12px; border: 1px solid #cbd5e1; color:#0f172a; font-weight: 600;">${emp.employees_name}</td></tr>
                <tr><td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold;">الرقم القومي:</td><td style="padding: 12px; border: 1px solid #cbd5e1; font-family: monospace;">${emp.national}</td></tr>
                <tr style="background: #f8fafc;"><td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold;">المحطة التابع لها:</td><td style="padding: 12px; border: 1px solid #cbd5e1;">${emp.station_name}</td></tr>
                <tr><td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #dc3545;">سبب ترك العمل:</td><td style="padding: 12px; border: 1px solid #cbd5e1; color: #dc3545; font-weight: bold;">${emp.Leave_work || 'غير محدد'}</td></tr>
                <tr style="background: #f8fafc;"><td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold;">وكيل او شركة:</td><td style="padding: 12px; border: 1px solid #cbd5e1; color: #28a745; font-weight: bold;">${emp.agent || 'غير محدد'}</td></tr>
                <tr><td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold;">📅 تاريخ ترك العمل الفعلي:</td><td style="padding: 12px; border: 1px solid #cbd5e1; color: #28a745; font-weight: bold;">${realLeavingDate}</td></tr>
                <tr style="background: #f8fafc;"><td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold;">الناشر:</td><td style="padding: 12px; border: 1px solid #cbd5e1; color: #3b82f6; font-weight: bold;">${emp.created_by || 'نظام آلي'}</td></tr>
            </table>
            <div style="margin-bottom: 40px; background: #fffdf5; border-right: 4px solid #ffc107; padding: 15px; border-radius: 4px;">
                <h4 style="margin: 0 0 8px 0; color: #b7791f; font-size: 0.95rem;">📝 ملاحظات:</h4>
                <p style="margin: 0; font-size: 0.9rem; color: #475569; line-height: 1.6;">${emp.comments || 'لا توجد ملاحظات إضافية مسجلة.'}</p>
            </div>
            <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
                <div>تاريخ استخراج التقرير: ${printDate}</div>
                <div style="text-align: left; font-weight: bold; color: #3b82f6;">توقيع إدارة العمليات</div>
            </div>
        </div>
    `;

    html2pdf().set({
        margin: 0,
        filename: `تقرير_حظر_${emp.employees_name.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(element).save().then(() => {
        const btn = document.getElementById('downloadPdfBtn');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> 📥 تحميل تقرير PDF رسمي';
            btn.disabled = false;
        }
        window.showToast('✅ تم التحميل', 'تم تصدير ملف الـ PDF بنجاح!', 'success');
    }).catch(err => {
        console.error(err);
        const btn = document.getElementById('downloadPdfBtn');
        if (btn) {
            btn.innerHTML = '❌ فشل التحميل';
            btn.disabled = false;
        }
        window.showToast('❌ حدث خطأ', 'فشل تصدير ملف الـ PDF', 'error');
    });
}

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

console.log('🏠 Dashboard JS loaded');

// ==========================================
// 📱 تثبيت التطبيق (PWA)
// ==========================================

let deferredPrompt = null;
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installAppBtn');
const closeBanner = document.getElementById('closeInstallBanner');

// ✅ الاستماع لحدث التثبيت
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // ✅ إظهار البانر
  if (installBanner) {
    installBanner.style.display = 'flex';
  }
  console.log('📱 PWA install prompt available');
});

// ✅ زر التثبيت
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      console.log('📱 User choice:', result.outcome);
      
      if (result.outcome === 'accepted') {
        window.showToast('✅ تم التثبيت', 'تم إضافة التطبيق لشاشة هاتفك', 'success');
      }
      deferredPrompt = null;
      
      // ✅ إخفاء البانر
      if (installBanner) {
        installBanner.style.display = 'none';
      }
    }
  });
}

// ✅ إغلاق البانر
if (closeBanner) {
  closeBanner.addEventListener('click', () => {
    if (installBanner) {
      installBanner.style.display = 'none';
    }
  });
}

// ✅ التحقق من التثبيت
window.addEventListener('appinstalled', () => {
  console.log('📱 App installed successfully!');
  window.showToast('🎉 شكراً للتثبيت', 'تم تثبيت التطبيق بنجاح', 'success');
});