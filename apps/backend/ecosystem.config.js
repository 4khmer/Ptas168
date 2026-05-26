module.exports = {
  apps: [
    {
      name: 'ptas168-api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        // NODE_ENV: 'development',
        PORT: 3001,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
