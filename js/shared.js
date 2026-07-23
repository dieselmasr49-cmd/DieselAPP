import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://khjoskyotujvkeupmkdm.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtoam9za3lvdHVqdmtldXBta2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNTIwNTAsImV4cCI6MjA5NDcyODA1MH0.rlXmRxTUnecci1__J8zsvHou5-pXzFaLJc_M3P_9sPQ';

const supabase = createClient(supabaseUrl, supabaseKey);
window.supabase = supabase;

window.showToast = function(title, message, type = 'success') {
    const colors = { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' };
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:99999; display:flex; flex-direction:column; gap:10px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
        background: ${colors[type] || '#3b82f6'}; color: white;
        padding: 12px 20px; border-radius: 8px; min-width: 250px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-family: 'Cairo', sans-serif; direction: rtl;
        animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `<div style="font-weight:bold;margin-bottom:4px;">${title}</div><div style="font-size:0.9rem;opacity:0.9;">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

console.log('📦 Shared JS loaded');