module.exports = {
  apps: [
    {
      name: 'bot-what',
      script: './index.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    }
  ]
};

