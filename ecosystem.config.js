module.exports = {
  apps: [
    {
      name: 'discount-hub-api', // Name of your application
      script: 'dist/main.js', // Path to your compiled NestJS main file
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      // Load environment variables from .env file
      env_file: '.env',
      env: {
        NODE_ENV: 'development',
        watch: 'true',
      },
      env_production: {
        NODE_ENV: 'production',
        watch: 'true',
      },
      // Logging
      log_file: './logs/app.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Auto restart settings
      ignore_watch: ['node_modules', 'logs'],
      max_memory_restart: '1G',
      // Advanced settings
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      // Health monitoring
      wait_ready: true,
      listen_timeout: 3000,
      kill_timeout: 5000,
    },
  ],
};
