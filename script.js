// Configuration - Direct blockchain connection
const CONTRACT_ADDRESS = '0x93c67B21E43eB1c8D4cA8341F195f8C98871bEFc';
const RPC_URL = 'https://sepolia.base.org';
const ABI = [
  "function transactionCount() view returns (uint256)",
  "function getTransaction(uint256 id) view returns (tuple(uint256 id, string uuid, uint256 empresaId, string transactionType, int256 amount, uint256 timestamp, string status))",
  "function getTransactionsByEmpresa(uint256 empresaId, uint256 limit) view returns (tuple(uint256 id, string uuid, uint256 empresaId, string transactionType, int256 amount, uint256 timestamp, string status)[])",
  "function getTransactionByUUID(string uuid) view returns (tuple(uint256 id, string uuid, uint256 empresaId, string transactionType, int256 amount, uint256 timestamp, string status))",
  "event TransactionRecorded(uint256 indexed transactionId, uint256 indexed empresaId, string indexed transactionType, int256 amount, uint256 timestamp, string uuid)"
];
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

const sections = document.querySelectorAll('.dashboard-section');

// Charts
let volumeChart, statusChart;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setInterval(loadData, 30000); // Refresh every 30 seconds
});

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
      throw new Error(`API Error: ${response.status}`);
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
    // Health check
    const health = await apiCall('/health');
    document.getElementById('healthStatus').textContent = health.data.blockchain.status === 'ok'
      ? `Connected (Block: ${health.data.blockchain.latestBlock})`
      : 'Disconnected';

    // Get overview stats
    const stats = await apiCall('/api/analytics/overview');
    document.getElementById('totalTx').textContent = stats.data.totalTransactions;
    document.getElementById('recentActivity').textContent = stats.data.recentTransactions + ' recent events';
  } catch (error) {
    document.getElementById('healthStatus').textContent = 'Error';
    document.getElementById('totalTx').textContent = 'N/A';
    document.getElementById('recentActivity').textContent = 'Error loading';
    console.error('Overview error:', error);
  }
}

// Transactions
async function loadTransactions() {
  try {
    const response = await apiCall('/api/transactions/recent?limit=10');
    const transactions = response.data;
    const tbody = document.getElementById('txBody');
    tbody.innerHTML = '';

    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No transactions found</td></tr>';
      return;
    }

    transactions.forEach(tx => {
      const row = tbody.insertRow();
      const timestamp = new Date(tx.created_at || tx.timestamp).toLocaleString();
      row.innerHTML = `
        <td>${tx.id}</td>
        <td>${tx.type || tx.transactionType}</td>
        <td>${parseFloat(tx.amount).toFixed(2)}</td>
        <td><span class="status-${tx.status}">${tx.status}</span></td>
        <td>${timestamp}</td>
      `;
    });
  } catch (error) {
    const tbody = document.getElementById('txBody');
    tbody.innerHTML = '<tr><td colspan="5">Error loading transactions</td></tr>';
    console.error('Transactions error:', error);
  }
}

// Analytics
async function loadAnalytics() {
  try {
    // Get total count
    const totalTx = await blockchainCall('transactionCount');
    
    // Query recent TransactionRecorded events for historical data
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks for reasonable data
    const filter = contract.filters.TransactionRecorded();
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);
    
    // Group events by day for volume chart
    const dailyVolumes = {};
    events.forEach(event => {
      const timestamp = Number(event.args.timestamp);
      const date = new Date(timestamp * 1000);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      dailyVolumes[dateKey] = (dailyVolumes[dateKey] || 0) + 1;
    });
    
    // Get last 7 days
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      last7Days.push(dateKey);
    }
    
    const volumeData = last7Days.map(dateKey => dailyVolumes[dateKey] || 0);
    const labels = last7Days.map(dateKey => {
      const date = new Date(dateKey);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    // Status breakdown - fetch recent transactions
    const recentEvents = events.slice(-20); // Last 20 events
    const recentTxs = await Promise.all(
      recentEvents.map(async (event) => {
        try {
          const tx = await blockchainCall('getTransaction', [event.args.transactionId]);
          return tx;
        } catch (error) {
          console.warn('Failed to fetch transaction details:', event.args.transactionId, error.message);
          return null;
        }
      })
    );
    
    const validTxs = recentTxs.filter(tx => tx !== null);
    const statusCounts = { confirmed: 0, pending: 0, failed: 0, other: 0 };
    validTxs.forEach(tx => {
      const status = tx.status.toLowerCase();
      if (statusCounts[status]) {
        statusCounts[status]++;
      } else {
        statusCounts.other++;
      }
    });

    // Volume Chart
    const volumeCtx = document.getElementById('volumeChart').getContext('2d');
    if (volumeChart) volumeChart.destroy();
    volumeChart = new Chart(volumeCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Daily Transactions',
          data: volumeData,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.1,
          fill: true
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: {
          title: {
            display: events.length === 0,
            text: 'No transaction data yet - send some webhooks!'
          }
        }
      }
    });

    // Status Chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    if (statusChart) statusChart.destroy();
    const statusLabels = Object.keys(statusCounts).filter(key => key !== 'other' && statusCounts[key] > 0).concat(statusCounts.other > 0 ? ['Other'] : []);
    const statusData = statusLabels.map(key => statusCounts[key]);
    statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: statusLabels,
        datasets: [{
          data: statusData,
          backgroundColor: ['#27ae60', '#f39c12', '#e74c3c', '#95a5a6']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });

    // Update total
    document.getElementById('totalTx').textContent = ethers.utils.formatUnits(totalTx, 0);

  } catch (error) {
    showMessage('Error loading analytics from blockchain: ' + error.message, 'error');
    console.error('Blockchain analytics error:', error);
    
    // Fallback charts with error message
    const volumeCtx = document.getElementById('volumeChart').getContext('2d');
    if (volumeChart) volumeChart.destroy();
    volumeChart = new Chart(volumeCtx, {
      type: 'line',
      data: {
        labels: ['Error'],
        datasets: [{
          label: 'Transactions',
          data: [0],
          borderColor: '#e74c3c',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
        plugins: {
          title: {
            display: true,
            text: 'Analytics unavailable'
          }
        }
      }
    });

    const statusCtx = document.getElementById('statusChart').getContext('2d');
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Error'],
        datasets: [{
          data: [100],
          backgroundColor: ['#e74c3c']
        }]
      },
      options: { responsive: true }
    });
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