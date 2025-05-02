const { enviarParaGrupo } = require('./mensagens');
const client = require('./bot');

async function enviarStatus() {
  const mensagem = `📊 Status do Bot:\n🟢 Online\n✅ Crons ativos e monitorados\n🕒 ${new Date().toLocaleString('pt-BR')}`;
  await enviarParaGrupo(client, 'Mensagens', mensagem);
}

module.exports = enviarStatus;
