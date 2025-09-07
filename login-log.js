document.addEventListener('DOMContentLoaded', () => {
    // ❗ مهم: لینک API خود را اینجا قرار دهید
    const API_URL = "https://script.google.com/macros/s/AKfycbyFhhTg_2xf6TqTBdybO883H4f6562sTDUSY8dbQJyN2K-nmFVD7ViTgWllEPwOaf7V/exec";

    // --- ۱. کد نگهبان و بررسی هویت ---
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData || !userData.token || userData.role !== 'admin') {
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
        return;
    }

    // --- شناسایی عناصر ---
    const logTableBody = document.getElementById('log-table-body');
    const loadingMessage = document.getElementById('loading-log');
    const userFilter = document.getElementById('user-filter');
    const roleFilter = document.getElementById('role-filter');
    const exportExcelButton = document.getElementById('export-excel');
    const paginationContainer = document.getElementById('pagination-container');

    // --- متغیرهای وضعیت ---
    let allLogs = [];
    let currentFilters = { user: '', role: 'all' };
    let currentPage = 1;
    const ITEMS_PER_PAGE = 30;

    // --- تابع کمکی برای تماس با API ---
    async function apiCall(action, payload) {
        try {
            const token = userData.token;
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action, payload, token })
            });
            const result = await response.json();
            if (result.status === 'error' && (result.message.includes('منقضی') || result.message.includes('نامعتبر'))) {
                alert(result.message);
                localStorage.removeItem('userData');
                window.location.href = 'index.html';
            }
            return result;
        } catch (error) {
            return { status: 'error', message: 'خطا در ارتباط با سرور.' };
        }
    }

    // --- توابع نمایش ---
    function renderPage() {
        const filteredLogs = applyFilters();
        const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
        currentPage = Math.min(currentPage, totalPages || 1);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageRecords = filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        renderTable(pageRecords);
        renderPagination(totalPages);
    }

    function renderTable(logs) {
        logTableBody.innerHTML = '';
        if (logs.length === 0) {
            logTableBody.innerHTML = '<tr><td colspan="3">رکوردی یافت نشد.</td></tr>';
            return;
        }
        logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.timestamp}</td>
                <td>${log.username}</td>
                <td>${log.role === 'admin' ? 'مدیر' : 'موسسه'}</td>
            `;
            logTableBody.appendChild(row);
        });
    }

    function renderPagination(totalPages) {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            if (i === currentPage) pageButton.classList.add('active');
            pageButton.addEventListener('click', () => {
                currentPage = i;
                renderPage();
            });
            paginationContainer.appendChild(pageButton);
        }
    }

    // --- منطق فیلترها ---
    function applyFilters() {
        let filtered = [...allLogs];
        if (currentFilters.user) {
            filtered = filtered.filter(log => log.username.toLowerCase().includes(currentFilters.user.toLowerCase()));
        }
        if (currentFilters.role !== 'all') {
            filtered = filtered.filter(log => log.role === currentFilters.role);
        }
        return filtered;
    }

    // --- مدیریت رویدادها ---
    userFilter.addEventListener('input', () => {
        currentFilters.user = userFilter.value;
        currentPage = 1;
        renderPage();
    });

    roleFilter.addEventListener('change', () => {
        currentFilters.role = roleFilter.value;
        currentPage = 1;
        renderPage();
    });

    exportExcelButton.addEventListener('click', () => {
        const dataToExport = applyFilters().map(log => ({
            "تاریخ و زمان": log.timestamp,
            "نام کاربری": log.username,
            "نقش": log.role === 'admin' ? 'مدیر' : 'موسسه'
        }));
        if (dataToExport.length === 0) {
            alert("داده‌ای برای خروجی گرفتن وجود ندارد.");
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "تاریخچه ورودها");
        XLSX.writeFile(workbook, "LoginHistory.xlsx");
    });
    
    // --- بارگذاری اولیه ---
    async function fetchLoginLog() {
        const result = await apiCall('getLoginLog', {});
        if (result.status === 'success') {
            loadingMessage.style.display = 'none';
            allLogs = result.data;
            renderPage();
        } else {
            loadingMessage.textContent = 'خطا در بارگذاری تاریخچه: ' + result.message;
        }
    }

    fetchLoginLog();
});
