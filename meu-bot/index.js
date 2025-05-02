const client = require('./bot');
const handleMessage = require('./handlers');
const agendarMensagens = require('./agendamentos');
const iniciarMonitoramento = require('./monitor');
const { validarExecucoes } = require('./validadorCrons');
const { enviarParaGrupo } = require('./mensagens');
const express = require('express');
const app = express();

client.on('ready', async () => {
  console.log('🤖 Bot pronto!');

  try {
    // 🧊 Acorda a sessão (isso previne o Evaluation Failed)
    await client.getChats();
    console.log('📶 Sessão aquecida com sucesso.');

    // ✅ Mensagem de confirmação
    await enviarParaGrupo(client, 'Mensagens', '🤖 Bot inicializado e online! (sessão ativada)');
  } catch (err) {
    console.error('⚠️ Erro ao aquecer sessão:', err.message);
  }

  // ⏳ Espera 10 segundos antes de agendar crons (por segurança)
  setTimeout(() => {
    agendarMensagens(client);
    iniciarMonitoramento(client);
    validarExecucoes(client);
  }, 10000);
});

client.on('message', async msg => {
  const chat = await msg.getChat();
  const gruposPermitidos = ['Teste_bot', 'Mensagens'];

  if (chat.isGroup && gruposPermitidos.includes(chat.name)) {
    console.log(`📥 [${chat.name}] ${msg.author || 'Desconhecido'}: ${msg.body}`);
    await handleMessage(msg, client);
  }
});

client.initialize();

app.get('/', (_, res) => res.send('Bot rodando!'));
app.listen(3000, () => console.log('🌐 Servidor HTTP ativo na porta 3000'));
