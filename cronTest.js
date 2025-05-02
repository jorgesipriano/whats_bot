const cron = require('node-cron');
const { enviarParaGrupo } = require('./mensagens');

function testarAgendamento(client) {
  cron.schedule('*/2 * * * *', async () => {
    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const mensagem = `⏰ Teste de cron às ${agora}`;
    console.log('✅ Executando cron de teste: ' + mensagem);
    
    try {
      await enviarParaGrupo(client, 'Mensagens', mensagem);
    } catch (erro) {
      console.error('❌ Erro ao enviar mensagem de teste:', erro);
    }
  }, {
    timezone: 'America/Sao_Paulo'
  });
}

module.exports = testarAgendamento;
