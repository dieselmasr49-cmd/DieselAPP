// ==========================================
// 🔐 صفحة تسجيل الدخول (Login)
// ==========================================

const supabase = window.supabase;

document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('loggedInUserName');
    if (user) {
        const role = localStorage.getItem('currentUserRole') || 'user';
        window.location.href = role === 'adminmaster' ? 'admin.html' : 'dashboard.html';
        return;
    }
    initLoginSystem();
});

function initLoginSystem() {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("companyName").value.trim();
        const password = document.getElementById("Accpassword").value;
        const loginBtn = document.getElementById("loginBtn");

        if (!email || !password) {
            window.showToast("تنبيه", "من فضلك أدخل اسم المستخدم وكلمة المرور", "warning");
            return;
        }

        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = "⏳ جاري التحقق...";
        loginBtn.disabled = true;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                window.showToast("فشل تسجيل الدخول", "اسم المستخدم أو كلمة المرور غير صحيحة", "error");
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
                return;
            }

            if (data && data.session) {
                console.log('✅ session:', data.session);
                console.log('✅ user:', data.session.user);

                // ✅ ✅ ✅ جلب بيانات المحطة بشكل صحيح
                const { data: stationData, error: stationError } = await supabase
                    .from('stations')
                    .select('station_name, role, is_active')
                    .eq('user_id', data.session.user.id)
                    .maybeSingle();

                if (stationError) {
                    console.error('❌ خطأ في جلب بيانات المحطة:', stationError);
                }

                console.log('📌 stationData:', stationData);

                // ✅ التأكد من أن station_name موجود
                let stationName = stationData?.station_name || 'محطة فرعية';
                let userRole = stationData?.role || 'user';
                let isActive = stationData?.is_active !== false;

                // ✅ ✅ ✅ لو station_name = 'محطة فرعية'، نجيب اسم المستخدم من الـ email
                if (stationName === 'محطة فرعية' || !stationName) {
                    // نحاول نجيب الاسم من الـ email
                    const emailName = email.split('@')[0];
                    stationName = emailName || 'محطة فرعية';
                    console.log('📌 تم استخدام اسم من الإيميل:', stationName);
                }

                if (isActive === false) {
                    window.showToast("⛔ حساب مجمد", "يرجى التواصل مع الدعم الفني", "error");
                    await supabase.auth.signOut();
                    loginBtn.innerHTML = originalText;
                    loginBtn.disabled = false;
                    return;
                }

                // ✅ ✅ ✅ حفظ البيانات في localStorage
                localStorage.setItem("loggedInUserName", stationName);
                localStorage.setItem("loggedInUserEmail", data.session.user.email);
                localStorage.setItem("loggedInUserId", data.session.user.id);
                localStorage.setItem("currentUserRole", userRole);
                localStorage.setItem("loggedInPhone", stationData?.phoneNum || '');

                console.log('✅ تم حفظ البيانات:', {
                    stationName,
                    userRole,
                    email: data.session.user.email
                });

                window.showToast("مرحباً بك 🎉", `تم تسجيل الدخول بنجاح`, "success");

                if (typeof window.createActiveSession === 'function') {
                    setTimeout(() => window.createActiveSession(), 500);
                }

                // ✅ التوجيه حسب الصلاحية
                if (userRole === "adminmaster") {
                    window.location.href = "admin.html";
                } else {
                    window.location.href = "dashboard.html";
                }
            }
        } catch (err) {
            console.error("Login Error:", err.message);
            window.showToast("فشل تسجيل الدخول", err.message || "حدث خطأ غير متوقع", "error");
        } finally {
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        }
    });
}