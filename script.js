// Configuration
const API_BASE = 'http://localhost:3000'; // Change to production backend URL when deployed
const API_TIMEOUT = 10000;

// DOM Elements
const overviewBtn = document.getElementById('overviewBtn');
const transactionsBtn = document.getElementById('transactionsBtn');
const analyticsBtn = document.getElementById('analyticsBtn');
const sections = document.querySelectorAll('.dashboard-section');

// Charts
let volumeChart, statusChart;

// Event Listeners
overviewBtn.addEventListener('click', () => showSection('overview'));
transactionsBtn.addEventListener('click', () => showSection('transactions'));
analyticsBtn.addEventListener('click', () => showSection('analytics'));

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showSection('overview');
    loadData();
    setInterval(loadData, 30000); // Refresh every 30 seconds
});

// Navigation
function showSection(sectionId) {
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');

    // Update button states
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Load section-specific data
    if (sectionId === 'overview') loadOverview();
    if (sectionId === 'transactions') loadTransactions();
    if (sectionId === 'analytics') loadAnalytics();
}

// API Helper
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Load All Data
async function loadData() {
    try {
        await Promise.all([
            loadOverview(),
            loadTransactions(),
            loadAnalytics()
        ]);
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
    } catch (error) {
        showMessage('Error loading data: ' + error.message, 'error');
    }
}

// Overview
async function loadOverview() {
    try {
        const health = await apiCall('/health');
        document.getElementById('healthStatus').textContent = health.status === 'ok' ? 'Healthy' : 'Issues';

        const analytics = await apiCall('/api/analytics/overview');
        document.getElementById('totalTx').textContent = analytics.totalTransactions || 0;
        document.getElementById('recentActivity').textContent = `${analytics.recentTransactions || 0} in last hour`;
    } catch (error) {
        document.getElementById('healthStatus').textContent = 'Error';
        document.getElementById('totalTx').textContent = 'N/A';
        document.getElementById('recentActivity').textContent = 'Error loading';
    }
}

// Transactions
async function loadTransactions() {
    try {
        const data = await apiCall('/api/transactions/recent');
        const tbody = document.getElementById('txBody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No transactions found</td></tr>';
            return;
        }

        data.forEach(tx => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${tx.id || 'N/A'}</td>
                <td>${tx.type || 'N/A'}</td>
                <td>${tx.amount ? parseFloat(tx.amount).toFixed(2) : 'N/A'}</td>
                <td><span class="status-${tx.status}">${tx.status || 'N/A'}</span></td>
                <td>${new Date(tx.created_at).toLocaleString()}</td>
            `;
        });
    } catch (error) {
        document.getElementById('txBody').innerHTML = '<tr><td colspan="5">Error loading transactions</td></tr>';
    }
}

// Analytics
async function loadAnalytics() {
    try {
        const data = await apiCall('/api/analytics/overview');

        // Volume Chart (placeholder data if no real data)
        const volumeCtx = document.getElementById('volumeChart').getContext('2d');
        if (volumeChart) volumeChart.destroy();
        volumeChart = new Chart(volumeCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Transactions',
                    data: data.volumeData || [12, 19, 3, 5, 2, 3],
                    borderColor: '#667eea',
                    tension: 0.1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });

        // Status Chart
        const statusCtx = document.getElementById('statusChart').getContext('2d');
        if (statusChart) statusChart.destroy();
        statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Confirmed', 'Pending', 'Failed'],
                datasets: [{
                    data: data.statusBreakdown || [70, 20, 10],
                    backgroundColor: ['#27ae60', '#f39c12', '#e74c3c']
                }]
            },
            options: { responsive: true }
        });
    } catch (error) {
        showMessage('Error loading analytics: ' + error.message, 'error');
    }
}

// Utility Functions
function showMessage(message, type = 'info') {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `message ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// Status styling (add to CSS if needed)
const style = document.createElement('style');
style.textContent = `
    .status-confirmed { color: #27ae60; font-weight: bold; }
    .status-pending { color: #f39c12; font-weight: bold; }
    .status-failed { color: #e74c3c; font-weight: bold; }
`;
document.head.appendChild(style);