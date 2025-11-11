module.exports = {
  apps: [{
    name: 'edn-blockchain-recorder',
    script: './src/server.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Resource limits
    max_memory_restart: '1G',
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Auto-restart
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_restarts: 10,
    min_uptime: '10s',
    // Node options
    node_args: '--max-old-space-size=1024',
    // Health check
    kill_timeout: 5000
  }]
};