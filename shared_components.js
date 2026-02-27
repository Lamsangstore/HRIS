/**
 * Shared UI Components for Lamsang Group HRIS
 * วิธีใช้: เรียกใช้ฟังก์ชัน renderUI(userProfile, activePageId) ในทุกหน้า
 */

export function renderUI(userProfile, activePageId, isInitialLoad = false) {
    const logoUrl = "https://lh3.googleusercontent.com/d/1wFGzcl5Y3yEfd39sA2LTbrgeNkgVxm27";
    const avatarUrl = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.name)}&background=27272a&color=eab308&size=128`;
    const isAdmin = userProfile.role === 'admin';
    const isManager = userProfile.role === 'manager';

    // 1. จัดการ Sidebar (ใช้ CSS โหมด Collapsed ย่อขนาด)
    const sidebarHTML = `
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

    // ========================================================
    // จัดการหน้าจอหมุนโหลด (Spinner Overlay) เฉพาะพื้นที่เนื้อหา
    // ========================================================
    if (isInitialLoad) {
        const mainEl = document.querySelector('main');
        if (mainEl && !document.getElementById('page-transition-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'page-transition-overlay';
            overlay.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-5xl text-yellow-500 mb-4 drop-shadow-md"></i><p class="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Loading Workspace...</p>';
            mainEl.appendChild(overlay);
        }
    } else {
        // เมื่อข้อมูลจริงโหลดเสร็จแล้ว ให้ซ่อน Overlay หมุนๆ ทิ้งอย่างนุ่มนวล
        const overlay = document.getElementById('page-transition-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // ดักจับเวลากดเปลี่ยนเมนู เพื่อโชว์หน้าโหลดก่อนเด้งไปไฟล์ใหม่
    setTimeout(() => {
        const links = document.querySelectorAll('#app-sidebar a.nav-item');
        links.forEach(link => {
            link.removeEventListener('click', handleMenuClick);
            link.addEventListener('click', handleMenuClick);
        });
    }, 50);

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

// -------------------------------------------------------------
// ฟังก์ชันทำงานตอนกดเปลี่ยนแท็บเมนู (โชว์หมุนๆ ค้างไว้)
// -------------------------------------------------------------
function handleMenuClick(e) {
    const href = e.currentTarget.getAttribute('href');
    // ถ้าลิงก์ไม่ได้ชี้ไปหน้าปัจจุบัน และไม่ใช่ #
    if (href && href !== '#' && !e.currentTarget.classList.contains('bg-yellow-500')) {
        e.preventDefault();
        
        // โชว์หน้าโหลด (หมุนๆ) ทับแค่ส่วนเนื้อหา (main) โดยเหลือ Topbar/Sidebar ไว้
        const mainEl = document.querySelector('main');
        if (mainEl) {
            let overlay = document.getElementById('page-transition-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'page-transition-overlay';
                overlay.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-5xl text-yellow-500 mb-4 drop-shadow-md"></i><p class="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Switching Workspace...</p>';
                mainEl.appendChild(overlay);
            }
            overlay.style.opacity = '1';
        }
        
        // หน่วงเวลาเล็กน้อยให้ Animation ทำงานก่อนเปลี่ยนหน้าจริง
        setTimeout(() => { window.location.href = href; }, 100);
    }
}

// =========================================================
// IIFE: โหลด Sidebar / Topbar ขึ้นมาโชว์ "ทันที" ตั้งแต่ยังไม่โหลดข้อมูล
// เพื่อให้ดูเหมือนว่าเมนู "ค้างไว้" อย่างต่อเนื่องเมื่อสลับแท็บ
// =========================================================
(function renderInitialSkeleton() {
    // ฝัง CSS ที่ใช้ควบคุมโครงสร้างการย่อ/ขยาย และการโหลดพื้นหลัง
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        #page-transition-overlay {
            position: absolute;
            top: 64px; /* ความสูงของ Topbar (h-16 = 64px) */
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #fafafa; /* สีพื้นหลังกลืนไปกับข้อมูล */
            z-index: 40;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: opacity 0.3s ease;
        }
        main { position: relative; }
        
        /* Smooth fade in for content */
        main > div:not(#topbar-placeholder):not(#page-transition-overlay) {
            animation: softFadeIn 0.3s ease-out forwards;
        }
        @keyframes softFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Sidebar styles */
        #app-sidebar { transition: width 0.3s ease; }
        #app-sidebar.collapsed { width: 4rem; }
        #app-sidebar.collapsed .sidebar-text { display: none; }
        #app-sidebar.collapsed .nav-item { justify-content: center; padding-left: 0; padding-right: 0; }
        #app-sidebar.collapsed .nav-item i { margin-left: 0 !important; margin-right: 0 !important; font-size: 1.25rem; }
        #app-sidebar.collapsed .logo-container { padding: 1rem 0; } 
        #app-sidebar.collapsed .logo-container img { margin-right: 0; width: 2rem; height: 2rem; min-width: 2rem; } 
        #app-sidebar.collapsed .admin-panel-text { display: none; }
        #app-sidebar.collapsed .footer-text { display: none; }
        #app-sidebar.collapsed .collapsed-footer-text { display: block; }
    `;
    document.head.appendChild(styleEl);

    // เดาหน้าปัจจุบันจาก URL หรือ Title เพื่อไฮไลท์สีเมนูให้ถูกตั้งแต่แรก
    const currentPath = window.location.pathname;
    const pageTitle = document.title;
    let guessedPageId = 'home';
    if (currentPath.includes('time') || pageTitle.includes('เวลาทำงาน')) guessedPageId = 'time';
    else if (currentPath.includes('profile') || pageTitle.includes('โปรไฟล์')) guessedPageId = 'profile';
    else if (currentPath.includes('add-employee') || pageTitle.includes('จัดการพนักงาน')) guessedPageId = 'add-employee';

    // สร้างข้อมูลชั่วคราวเพื่อวาด UI ก่อนที่ Firebase จะโหลดเสร็จ
    const dummyUser = {
        name: "Loading...",
        role: "...",
        photoURL: "https://ui-avatars.com/api/?name=L&background=f4f4f5&color=a1a1aa"
    };
    
    // สั่งวาด UI ทันที (isInitialLoad = true) เพื่อล็อคเมนูให้ค้างไว้
    renderUI(dummyUser, guessedPageId, true);
})();
