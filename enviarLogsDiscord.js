const fs = require('fs');
const axios = require('axios');

const webhookURL = 'https://discord.com/api/webhooks/1367827679122030656/96yTlvr388MTNapY3iNVwYaPrnQ0oilq73EpGA5tVi71fwz9_A99oqZV0DJgzrTrDbXy';
const logFilePath = '/home/ubuntu/.pm2/logs/bot-what-error.log';

function enviarLogsParaDiscord() {
  try {
    const logs = fs.readFileSync(logFilePath, 'utf8');
    const ultimasLinhas = logs.trim().split('\n').slice(-15).join('\n');

    axios.post(webhookURL, {
      content: `📄 **Últimos erros do bot:**\n\`\`\`\n${ultimasLinhas}\n\`\`\``
    }).then(() => {
      console.log('✅ Logs enviados para o Discord.');
    }).catch((error) => {
      console.error('❌ Erro ao enviar logs para o Discord:', error.message);
    });
  } catch (err) {
    console.error('❌ Erro ao ler o arquivo de log:', err.message);
  }
}

enviarLogsParaDiscord();

