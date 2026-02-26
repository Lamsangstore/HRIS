/**
 * Shared UI Components for Lamsang Group HRIS
 * วิธีใช้: เรียกใช้ฟังก์ชัน renderUI(userProfile, activePageId) ในทุกหน้า
 */

export function renderUI(userProfile, activePageId) {
    const logoUrl = "https://lh3.googleusercontent.com/d/1wFGzcl5Y3yEfd39sA2LTbrgeNkgVxm27";
    const avatarUrl = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=27272a&color=eab308&size=128`;
    const isAdmin = userProfile.role === 'admin';
    const isManager = userProfile.role === 'manager';

    // 1. จัดการ Sidebar
    const sidebarHTML = `
        <aside class="w-64 bg-zinc-900 text-zinc-300 flex flex-col transition-all duration-300 shadow-xl z-20 h-full">
            <div class="p-5 flex items-center justify-center border-b border-zinc-800">
                <img src="${logoUrl}" alt="Lamsang Logo" class="h-10 w-10 object-contain rounded bg-white p-1 mr-3">
                <h1 class="text-lg font-bold tracking-wider truncate text-white">Lamsang Group</h1>
            </div>
            <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                <a href="home.html" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'home' ? 'bg-yellow-500 text-zinc-900 font-semibold shadow-sm' : ''}">
                    <i class="fa-solid fa-house w-6 text-center"></i> <span class="ml-3">หน้าหลัก</span>
                </a>
                
                ${(isAdmin || isManager) ? `
                <a href="#" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'executive' ? 'bg-yellow-500 text-zinc-900 font-semibold shadow-sm' : ''}">
                    <i class="fa-solid fa-chart-line w-6 text-center"></i> <span class="ml-3">แดชบอร์ดผู้บริหาร</span>
                </a>` : ''}

                <a href="time.html" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'time' ? 'bg-yellow-500 text-zinc-900 font-semibold shadow-sm' : ''}">
                    <i class="fa-solid fa-clock w-6 text-center"></i> <span class="ml-3">เวลาทำงาน & กะ</span>
                </a>

                <a href="profile.html" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'profile' ? 'bg-yellow-500 text-zinc-900 font-semibold shadow-sm' : ''}">
                    <i class="fa-solid fa-id-badge w-6 text-center"></i> <span class="ml-3">โปรไฟล์ของฉัน</span>
                </a>

                <a href="#" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'leave' ? 'bg-yellow-500 text-zinc-900 font-semibold shadow-sm' : ''}">
                    <i class="fa-solid fa-calendar-check w-6 text-center"></i> <span class="ml-3">การอนุมัติ & วันลา</span>
                </a>

                ${isAdmin ? `
                <div class="space-y-2 mt-4 pt-4 border-t border-zinc-800">
                    <p class="px-4 text-xs text-zinc-500 uppercase tracking-wider mb-2 font-semibold">ส่วนการจัดการ</p>
                    <a href="add-employee.html" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'add-employee' ? 'text-zinc-900 bg-yellow-500 font-bold' : 'text-yellow-500'}">
                        <i class="fa-solid fa-user-plus w-6 text-center"></i> <span class="ml-3">เพิ่มพนักงานใหม่</span>
                    </a>
                    <a href="#" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors">
                        <i class="fa-solid fa-file-invoice-dollar w-6 text-center"></i> <span class="ml-3">จัดการเงินเดือน</span>
                    </a>
                </div>` : ''}
            </nav>
            <div class="p-4 border-t border-zinc-800 text-[10px] text-zinc-500 text-center uppercase tracking-widest">
                &copy; 2026 Lamsang Group
            </div>
        </aside>
    `;

    // 2. จัดการ Topbar
    const topbarHTML = `
        <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6 z-10 border-b border-zinc-200">
            <h2 class="text-xl font-bold text-zinc-800">${document.title.split(' - ')[0]}</h2>
            <div class="flex items-center space-x-4">
                <button class="text-zinc-400 hover:text-yellow-500 relative transition-colors">
                    <i class="fa-regular fa-bell text-xl"></i>
                    <span class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-white">3</span>
                </button>
                <div class="h-8 w-px bg-zinc-200"></div>
                <a href="profile.html" class="flex items-center space-x-3 hover:bg-zinc-100 p-2 rounded-lg transition-colors cursor-pointer group">
                    <img src="${avatarUrl}" class="w-9 h-9 rounded-full object-cover border border-zinc-200 group-hover:border-yellow-500 transition-colors">
                    <div class="text-sm">
                        <p class="font-semibold text-zinc-800 group-hover:text-yellow-600 transition-colors">${userProfile.name}</p>
                        <p class="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">${userProfile.role}</p>
                    </div>
                </a>
                <div class="h-8 w-px bg-zinc-200"></div>
                <button onclick="window.handleLogout()" class="text-sm text-red-500 hover:text-red-700 font-bold flex items-center transition-colors">
                    <i class="fa-solid fa-right-from-bracket mr-2"></i> ออกจากระบบ
                </button>
            </div>
        </header>
    `;

    // ฉีด HTML เข้าไปใน Placeholder
    const sidebarTarget = document.getElementById('sidebar-placeholder');
    const topbarTarget = document.getElementById('topbar-placeholder');
    
    if (sidebarTarget) sidebarTarget.innerHTML = sidebarHTML;
    if (topbarTarget) topbarTarget.innerHTML = topbarHTML;
}
