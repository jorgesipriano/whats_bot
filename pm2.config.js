module.exports = {
  apps: [{
    name: 'bot-what',
    script: './index.js',
    max_memory_restart: '300M',
    cron_restart: '0 0 * * *',
    env: {
      NODE_ENV: 'production',
      PYTHONPATH: '/home/ubuntu/meu-bot'
    }
  }]
};
