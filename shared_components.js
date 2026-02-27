/**
 * Shared UI Components for Lamsang Group HRIS
 * วิธีใช้: เรียกใช้ฟังก์ชัน renderUI(userProfile, activePageId) ในทุกหน้า
 */

export function renderUI(userProfile, activePageId) {
    const logoUrl = "https://lh3.googleusercontent.com/d/1wFGzcl5Y3yEfd39sA2LTbrgeNkgVxm27";
    const avatarUrl = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=27272a&color=eab308&size=128`;
    const isAdmin = userProfile.role === 'admin';
    const isManager = userProfile.role === 'manager';

    // 1. จัดการ Sidebar (เพิ่ม CSS สำหรับโหมด Collapsed ย่อขนาด)
    const sidebarHTML = `
        <style>
            #app-sidebar { transition: width 0.3s ease; }
            /* เมื่อย่อเมนู จะเหลือความกว้างแค่ 5rem (80px) */
            #app-sidebar.collapsed { width: 5rem; }
            #app-sidebar.collapsed .sidebar-text { display: none; }
            #app-sidebar.collapsed .nav-item { justify-content: center; padding-left: 0; padding-right: 0; }
            #app-sidebar.collapsed .nav-item i { margin-left: 0 !important; margin-right: 0 !important; font-size: 1.25rem; }
            #app-sidebar.collapsed .logo-container img { margin-right: 0; }
            #app-sidebar.collapsed .admin-panel-text { display: none; }
            #app-sidebar.collapsed .footer-text { display: none; }
            #app-sidebar.collapsed .collapsed-footer-text { display: block; }
        </style>
        
        <aside id="app-sidebar" class="w-64 bg-zinc-900 text-zinc-300 flex flex-col transition-all duration-300 shadow-xl z-20 h-full overflow-hidden shrink-0">
            <div class="logo-container p-5 flex items-center justify-center border-b border-zinc-800 transition-all">
                <img src="${logoUrl}" alt="Lamsang Logo" class="h-10 w-10 min-w-[2.5rem] object-contain rounded bg-white p-1 mr-3 shrink-0 transition-all">
                <h1 class="text-lg font-bold tracking-wider truncate text-white sidebar-text">Lamsang Group</h1>
            </div>
            <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
                <a href="home.html" title="หน้าหลัก" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'home' ? 'bg-yellow-500 text-zinc-900 font-semibold shadow-sm' : ''}">
                    <i class="fa-solid fa-house w-6 text-center shrink-0"></i> <span class="ml-3 font-medium sidebar-text whitespace-nowrap">หน้าหลัก</span>
                </a>
                
                ${(isAdmin || isManager) ? `
                <a href="#" title="แดชบอร์ดผู้บริหาร" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'executive' ? 'bg-yellow-500 text-zinc-900 font-semibold shadow-sm' : ''}">
                    <i class="fa-solid fa-chart-line w-6 text-center shrink-0"></i> <span class="ml-3 font-medium sidebar-text whitespace-nowrap">แดชบอร์ดผู้บริหาร</span>
                </a>` : ''}

                <a href="time.html" title="เวลาทำงาน & กะ" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'time' ? 'bg-yellow-500 text-zinc-900 font-semibold shadow-sm' : ''}">
                    <i class="fa-solid fa-clock w-6 text-center shrink-0"></i> <span class="ml-3 font-medium sidebar-text whitespace-nowrap">เวลาทำงาน & กะ</span>
                </a>

                <a href="profile.html" title="โปรไฟล์ของฉัน" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'profile' ? 'bg-yellow-500 text-zinc-900 font-semibold shadow-sm' : ''}">
                    <i class="fa-solid fa-id-badge w-6 text-center shrink-0"></i> <span class="ml-3 font-medium sidebar-text whitespace-nowrap">โปรไฟล์ของฉัน</span>
                </a>

                <a href="#" title="การอนุมัติ & วันลา" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'leave' ? 'bg-yellow-500 text-zinc-900 font-semibold shadow-sm' : ''}">
                    <i class="fa-solid fa-calendar-check w-6 text-center shrink-0"></i> <span class="ml-3 font-medium sidebar-text whitespace-nowrap">การอนุมัติ & วันลา</span>
                </a>

                ${isAdmin ? `
                <div class="space-y-2 mt-6 pt-6 border-t border-zinc-800">
                    <p class="px-4 text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold admin-panel-text whitespace-nowrap">Admin Panel</p>
                    <a href="add-employee.html" title="เพิ่มพนักงานใหม่" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors ${activePageId === 'add-employee' ? 'text-zinc-900 bg-yellow-500 font-bold' : 'text-yellow-500'}">
                        <i class="fa-solid fa-user-plus w-6 text-center shrink-0"></i> <span class="ml-3 sidebar-text whitespace-nowrap">เพิ่มพนักงานใหม่</span>
                    </a>
                    <a href="#" title="จัดการเงินเดือน" class="nav-item flex items-center px-4 py-3 rounded-lg hover:bg-zinc-800 hover:text-yellow-400 transition-colors">
                        <i class="fa-solid fa-file-invoice-dollar w-6 text-center shrink-0"></i> <span class="ml-3 font-medium sidebar-text whitespace-nowrap">จัดการเงินเดือน</span>
                    </a>
                </div>` : ''}
            </nav>
            <div class="p-4 border-t border-zinc-800 text-[10px] text-zinc-600 text-center uppercase tracking-widest font-medium footer-text whitespace-nowrap">
                &copy; 2026 Lamsang Group
            </div>
            <!-- ข้อความลิขสิทธิ์ฉบับย่อตอนซ่อนเมนู -->
            <div class="p-4 border-t border-zinc-800 text-[10px] text-zinc-600 text-center font-black hidden collapsed-footer-text">
                LSG
            </div>
        </aside>
    `;

    // 2. จัดการ Topbar (เพิ่มปุ่ม Hamburger Menu ฝั่งซ้าย)
    const topbarHTML = `
        <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6 z-10 border-b border-zinc-200 shrink-0">
            <div class="flex items-center">
                <!-- ปุ่มย่อ/ขยาย Sidebar -->
                <button onclick="window.toggleSidebar()" class="text-zinc-500 hover:text-yellow-500 hover:bg-zinc-100 p-2 rounded-lg mr-4 transition-colors focus:outline-none">
                    <i class="fa-solid fa-bars text-xl"></i>
                </button>
                <h2 class="text-lg font-bold text-zinc-800 uppercase tracking-tight hidden sm:block">${document.title.split(' - ')[0]}</h2>
            </div>
            <div class="flex items-center space-x-4">
                <button class="text-zinc-400 hover:text-yellow-500 relative transition-colors p-2">
                    <i class="fa-regular fa-bell text-xl"></i>
                    <span class="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-white">3</span>
                </button>
                <div class="h-8 w-px bg-zinc-200 mx-2"></div>
                <a href="profile.html" class="flex items-center space-x-3 hover:bg-zinc-50 px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-zinc-100 group">
                    <img src="${avatarUrl}" class="w-8 h-8 rounded-full object-cover border-2 border-zinc-200 group-hover:border-yellow-500 transition-all">
                    <div class="text-sm leading-tight hidden md:block">
                        <p class="font-bold text-zinc-800 group-hover:text-yellow-600 transition-colors">${userProfile.name}</p>
                        <p class="text-[9px] text-zinc-400 font-black uppercase tracking-widest">${userProfile.role}</p>
                    </div>
                </a>
                <div class="h-8 w-px bg-zinc-200 mx-2 hidden md:block"></div>
                <button onclick="window.handleLogout()" class="text-xs text-red-500 hover:text-red-700 font-black uppercase tracking-widest flex items-center transition-colors bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg">
                    <i class="fa-solid fa-power-off sm:mr-2"></i> <span class="hidden sm:inline">ออกจากระบบ</span>
                </button>
            </div>
        </header>
    `;

    const sidebarTarget = document.getElementById('sidebar-placeholder');
    const topbarTarget = document.getElementById('topbar-placeholder');
    
    if (sidebarTarget) sidebarTarget.innerHTML = sidebarHTML;
    if (topbarTarget) topbarTarget.innerHTML = topbarHTML;

    // 3. ฟังก์ชันสำหรับย่อ/ขยาย Sidebar
    if (!window.toggleSidebar) {
        window.toggleSidebar = function() {
            const sidebar = document.getElementById('app-sidebar');
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
            }
        };

        // ตรวจสอบขนาดหน้าจอตอนโหลดเว็บ: ถ้าจอเล็กกว่า iPad (1024px) ให้ซ่อน Sidebar อัตโนมัติ
        setTimeout(() => {
            if (window.innerWidth < 1024) { 
                const sidebar = document.getElementById('app-sidebar');
                if (sidebar) sidebar.classList.add('collapsed');
            }
        }, 50);
    }
}
