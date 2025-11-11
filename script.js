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

// Blockchain Helper
async function blockchainCall(method, params = []) {
  try {
    const result = await contract[method](...params);
    return result;
  } catch (error) {
    console.error('Blockchain Error:', error);
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
    showMessage('Error loading blockchain data: ' + error.message, 'error');
  }
}

// Overview
async function loadOverview() {
  try {
    // Check blockchain connection
    const latestBlock = await provider.getBlockNumber();
    document.getElementById('healthStatus').textContent = 'Connected (Block: ' + latestBlock + ')';

    // Get total transaction count
    const totalTx = await blockchainCall('transactionCount');
    document.getElementById('totalTx').textContent = ethers.utils.formatUnits(totalTx, 0);

    // Recent activity - get recent events
    const filter = contract.filters.TransactionRecorded();
    const recentEvents = await contract.queryFilter(filter, latestBlock - 100, latestBlock);
    document.getElementById('recentActivity').textContent = recentEvents.length + ' recent events';
  } catch (error) {
    document.getElementById('healthStatus').textContent = 'Error';
    document.getElementById('totalTx').textContent = 'N/A';
    document.getElementById('recentActivity').textContent = 'Error loading';
    console.error('Blockchain overview error:', error);
  }
}

// Transactions
async function loadTransactions() {
  try {
    // Query recent TransactionRecorded events
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 100); // Last 100 blocks
    const filter = contract.filters.TransactionRecorded();
    const events = await contract.queryFilter(filter, fromBlock, currentBlock);
    
    // Get unique UUIDs (most recent first)
    const uniqueUUIDs = [...new Set(
      events
        .reverse()
        .slice(0, 10)
        .map(event => event.args.uuid)
    )];
    
    // Fetch full transaction details for each UUID
    const transactions = await Promise.all(
      uniqueUUIDs.map(async (uuid) => {
        try {
          const tx = await blockchainCall('getTransactionByUUID', [uuid]);
          return tx;
        } catch (error) {
          console.warn('Failed to fetch transaction details:', uuid, error.message);
          return null;
        }
      })
    );
    
    const validTxs = transactions.filter(tx => tx !== null);
    const tbody = document.getElementById('txBody');
    tbody.innerHTML = '';

    if (validTxs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No transactions found</td></tr>';
      return;
    }

    validTxs.forEach(tx => {
      const row = tbody.insertRow();
      const amount = ethers.utils.formatUnits(tx.amount, 0);
      const timestamp = new Date(Number(tx.timestamp) * 1000).toLocaleString();
      row.innerHTML = `
        <td>${ethers.utils.formatUnits(tx.id, 0)}</td>
        <td>${tx.transactionType}</td>
        <td>${parseFloat(amount).toFixed(2)}</td>
        <td><span class="status-${tx.status}">${tx.status}</span></td>
        <td>${timestamp}</td>
      `;
    });
  } catch (error) {
    const tbody = document.getElementById('txBody');
    tbody.innerHTML = '<tr><td colspan="5">Error loading transactions from blockchain</td></tr>';
    console.error('Blockchain transactions error:', error);
  }
}

// Analytics
async function loadAnalytics() {
  try {
    // Get total count
    const totalTx = await blockchainCall('transactionCount');
    
    // Query all TransactionRecorded events for historical data
    const filter = contract.filters.TransactionRecorded();
    const events = await contract.queryFilter(filter, 0); // From block 0 to get all events
    
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
    
    // Status breakdown from all available transactions (or recent if too many)
    const recentTxs = await blockchainCall('getRecentTransactions', [100]);
    const statusCounts = { confirmed: 0, pending: 0, failed: 0, other: 0 };
    recentTxs.forEach(tx => {
      if (statusCounts[tx.status]) {
        statusCounts[tx.status]++;
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
    const statusLabels = Object.keys(statusCounts).filter(key => key !== 'other').concat(statusCounts.other > 0 ? ['Other'] : []);
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
    document.getElementById('totalTx').textContent = totalTx.toString();

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