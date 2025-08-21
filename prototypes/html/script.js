// 全局变量
let sidebarCollapsed = false;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initTabs();
    initSearch();
    initMobileMenu();
    initNavigation();
    initPrototypeNav();
});

// 侧边栏功能
function initSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            sidebarCollapsed = !sidebarCollapsed;
            
            if (window.innerWidth <= 768) {
                // 移动端处理
                sidebar.classList.toggle('mobile-open');
            } else {
                // 桌面端处理
                if (sidebarCollapsed) {
                    sidebar.classList.add('collapsed');
                    mainContent.classList.add('sidebar-collapsed');
                } else {
                    sidebar.classList.remove('collapsed');
                    mainContent.classList.remove('sidebar-collapsed');
                }
            }
        });
    }
    
    // 菜单项点击事件
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // 处理子菜单展开/收起
            const chevron = this.querySelector('.fa-chevron-right, .fa-chevron-down');
            const submenu = this.nextElementSibling;
            
            if (chevron && submenu && submenu.classList.contains('submenu')) {
                if (chevron.classList.contains('fa-chevron-right')) {
                    chevron.classList.remove('fa-chevron-right');
                    chevron.classList.add('fa-chevron-down');
                    submenu.style.display = 'block';
                } else {
                    chevron.classList.remove('fa-chevron-down');
                    chevron.classList.add('fa-chevron-right');
                    submenu.style.display = 'none';
                }
            }
        });
    });
    
    // 子菜单项点击事件
    const submenuItems = document.querySelectorAll('.submenu-item');
    submenuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            // 移除其他当前状态
            submenuItems.forEach(si => si.classList.remove('current'));
            // 添加当前状态
            this.classList.add('current');
        });
    });
}

// 标签页功能
function initTabs() {
    const tabItems = document.querySelectorAll('.tab-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabItems.forEach((tab, index) => {
        tab.addEventListener('click', function() {
            // 移除所有活动状态
            tabItems.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // 添加当前活动状态
            this.classList.add('active');
            if (tabPanes[index]) {
                tabPanes[index].classList.add('active');
            }
        });
    });
}

// 搜索功能
function initSearch() {
    const searchInput = document.querySelector('.search-box input');
    
    if (searchInput) {
        // 快捷键支持
        document.addEventListener('keydown', function(e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInput.focus();
            }
        });
        
        // 搜索输入事件
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            // 这里可以添加实际的搜索逻辑
            console.log('搜索:', query);
        });
    }
}

// 移动端菜单
function initMobileMenu() {
    // 点击页面其他地方关闭移动端菜单
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        
        if (window.innerWidth <= 768 && 
            sidebar && 
            sidebar.classList.contains('mobile-open') &&
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
        }
    });
    
    // 窗口大小改变时的处理
    window.addEventListener('resize', function() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (window.innerWidth > 768) {
            // 桌面端
            sidebar.classList.remove('mobile-open');
            if (sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('sidebar-collapsed');
            }
        } else {
            // 移动端
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
        }
    });
}

// 工具函数
function formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 模拟数据更新
function updateStats() {
    // 这里可以添加实际的数据更新逻辑
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        // 模拟数据变化
        const currentValue = parseInt(stat.textContent);
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
        const newValue = Math.max(0, currentValue + change);
        stat.textContent = newValue;
    });
}

// 定期更新数据（可选）
// setInterval(updateStats, 30000); // 每30秒更新一次

// 页面导航功能
function initNavigation() {
    // 侧边栏导航
    const navItems = document.querySelectorAll('.menu-item, .submenu-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const text = this.querySelector('span').textContent.trim();
            let targetPage = '';
            
            switch(text) {
                case '仪表盘':
                case '集群列表':
                    targetPage = 'index.html';
                    break;
                case '集群详情':
                    targetPage = 'cluster-detail.html';
                    break;
                case '导入集群':
                    targetPage = 'cluster-import.html';
                    break;
                case '节点列表':
                    targetPage = 'node-list.html';
                    break;
                case '节点详情':
                    targetPage = 'node-detail.html';
                    break;
                case '节点操作':
                    targetPage = 'node-operations.html';
                    break;
                case 'Pod列表':
                    targetPage = 'pod-list.html';
                    break;
                case 'Pod详情':
                    targetPage = 'pod-detail.html';
                    break;
                case '工作负载':
                    targetPage = 'workload-list.html';
                    break;
                case '工作负载详情':
                    targetPage = 'workload-detail.html';
                    break;
                case '全局搜索':
                    targetPage = 'global-search.html';
                    break;
            }
            
            if (targetPage && !this.classList.contains('menu-group')) {
                window.location.href = targetPage;
            }
        });
    });
}

// 原型页面导航功能
function initPrototypeNav() {
    const navLinks = document.querySelectorAll('.prototype-nav .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        });
    });
}

// 导出函数供其他脚本使用
window.K8sPrototype = {
    formatTime,
    formatBytes,
    updateStats
};
