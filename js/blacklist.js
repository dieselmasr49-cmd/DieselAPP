// ==========================================
// ⚠️ صفحة إضافة الحالات (Blacklist)
// ==========================================

const supabase = window.supabase;

// ✅ التحقق من الجلسة
document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('loggedInUserName');
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    console.log('✅ المستخدم الحالي:', user);
});

// ✅ الفورم
const employeeForm = document.getElementById('employeeForm');
if (employeeForm) {
    employeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('🔄 تم الضغط على زر الإضافة');

        const employeeName = document.getElementById('employeeName').value.trim();
        const nationalId = document.getElementById('nationalId').value.trim();
        const address = document.getElementById('address').value.trim();
        const stationName = document.getElementById('stationName').value.trim();
        const Recruitment_Officer = document.getElementById('Recruitment_Officer').value.trim();
        const Operations_Manager = document.getElementById('Operations_Manager').value.trim();
        const Leave_work = document.getElementById('Leave_work').value.trim();
        const leavingDate = document.getElementById('leavingDate').value;
        const comments = document.getElementById('comments').value.trim();
        const agent = document.getElementById('agent').value.trim();

        const currentPublisher = localStorage.getItem('loggedInUserName') || 'محطة فرعية';
        const submitBtn = document.getElementById('submitBtn');

        if (!employeeName || !nationalId || !stationName) {
            window.showToast('⚠️ تنبيه', 'الاسم والرقم القومي والمحطة مطلوبين', 'warning');
            return;
        }

        submitBtn.innerHTML = '⏳ جاري الإدراج...';
        submitBtn.disabled = true;

        try {
            // ✅ 1. جلب station_id
            let stationId = null;
            const { data: stationData, error: stationError } = await supabase
                .from('stations')
                .select('id')
                .eq('station_name', stationName)
                .maybeSingle();

            if (stationError) {
                console.error('❌ خطأ في جلب station_id:', stationError);
            }

            if (stationData) {
                stationId = stationData.id;
                console.log('✅ station_id:', stationId);
            } else {
                console.warn('⚠️ المحطة غير موجودة:', stationName);
                
                // ✅ إضافة المحطة مع user_id
                const userId = localStorage.getItem('loggedInUserId');
                if (!userId) {
                    console.error('❌ لا يوجد user_id');
                    window.showToast('❌ خطأ', 'لم يتم العثور على معرف المستخدم', 'error');
                    submitBtn.innerHTML = '➕ إدراج في القائمة السوداء';
                    submitBtn.disabled = false;
                    return;
                }
                
                const { data: newStation, error: addStationError } = await supabase
                    .from('stations')
                    .insert([{ 
                        station_name: stationName,
                        user_id: userId
                    }])
                    .select();

                if (addStationError) {
                    console.error('❌ فشل إضافة المحطة:', addStationError);
                    window.showToast('❌ خطأ', addStationError.message || 'فشل إضافة المحطة', 'error');
                    submitBtn.innerHTML = '➕ إدراج في القائمة السوداء';
                    submitBtn.disabled = false;
                    return;
                }

                if (newStation && newStation.length > 0) {
                    stationId = newStation[0].id;
                    console.log('✅ تم إضافة المحطة، station_id:', stationId);
                }
            }

            // ✅ 2. التحقق من التكرار
            const { data: existingEmp, error: checkError } = await supabase
                .from('employees')
                .select('id')
                .eq('national', nationalId);

            if (checkError) {
                console.error('❌ خطأ في التحقق من التكرار:', checkError);
            }

            if (existingEmp && existingEmp.length > 0) {
                window.showToast('⚠️ الموظف مدرج مسبقاً!', 'يوجد موظف بنفس الرقم القومي.', 'warning');
                submitBtn.innerHTML = '➕ إدراج في القائمة السوداء';
                submitBtn.disabled = false;
                return;
            }

            // ✅ 3. إضافة الموظف
            const newEmployee = {
                employees_name: employeeName,
                national: nationalId,
                address: address || null,
                station_name: stationName,
                station_id: stationId,
                Recruitment_Officer: Recruitment_Officer || null,
                Operations_Manager: Operations_Manager || null,
                Leave_work: Leave_work || null,
                leavingdate: leavingDate || null,
                comments: comments || null,
                agent: agent || null,
                created_by: currentPublisher,
                is_blacklisted: true
            };

            console.log('📤 إرسال البيانات:', newEmployee);

            const { data: insertedData, error: insertError } = await supabase
                .from('employees')
                .insert([newEmployee])
                .select();

            if (insertError) {
                console.error('❌ خطأ في الإضافة:', insertError);
                window.showToast('❌ خطأ', insertError.message || 'فشل إدراج الموظف', 'error');
                submitBtn.innerHTML = '➕ إدراج في القائمة السوداء';
                submitBtn.disabled = false;
                return;
            }

            console.log('✅ تمت الإضافة بنجاح:', insertedData);

            // ✅ 4. إضافة إشعار
            try {
                await supabase
                    .from('notifications')
                    .insert([{
                        station_id: stationId,
                        station_name: stationName,
                        title: '🚨 إضافة موظف جديد',
                        message: `تم إضافة "${employeeName}" إلى قائمة الحظر بواسطة ${currentPublisher}`,
                        type: 'warning',
                        is_read: false,
                        created_at: new Date().toISOString()
                    }]);
                console.log('✅ تم إضافة الإشعار');
            } catch (notifErr) {
                console.warn('⚠️ فشل إضافة الإشعار:', notifErr);
            }

            window.showToast('✅ تمت الإضافة', `تم إدراج الموظف ${employeeName}.`, 'success');
            employeeForm.reset();

            if (typeof window.loadDashboardStats === 'function') {
                window.loadDashboardStats();
            }
            if (typeof window.loadPersonalReport === 'function') {
                window.loadPersonalReport();
            }

        } catch (error) {
            console.error('❌ Insert Error:', error);
            window.showToast('❌ خطأ', error.message || 'فشل إدراج الموظف', 'error');
        } finally {
            submitBtn.innerHTML = '➕ إدراج في القائمة السوداء';
            submitBtn.disabled = false;
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

console.log('⚠️ Blacklist JS loaded');