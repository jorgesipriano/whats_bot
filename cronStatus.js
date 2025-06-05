const cron = require('node-cron');
const enviarStatus = require('./statusBot');

function iniciarMonitoramento(client) {
  // Verifica a cada 30 minutos
  cron.schedule('*/30 * * * *', () => {
    enviarStatus(client);
  });
}

module.exports = iniciarMonitoramento;
