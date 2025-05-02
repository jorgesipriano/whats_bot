// validadorCrons.js
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { enviarParaGrupo } = require('./mensagens');

const GRUPO = 'Mensagens';
const LOG_PATH = path.join(__dirname, 'logs', 'ultimos-crons.json');

const CRONS_ESPERADOS = {
  'culto_quarta': 'segunda-feira',
  'lembrete_terca': 'terça-feira',
  'culto_domingo': 'quinta-feira',
  'lembrete_sexta': 'sexta-feira',
  'relatorio_domingo': 'domingo'
};

function carregarLogs() {
  if (!fs.existsSync(LOG_PATH)) return {};
  const data = fs.readFileSync(LOG_PATH, 'utf8');
  return JSON.parse(data);
}

function salvarLog(nome) {
  const logs = carregarLogs();
  logs[nome] = new Date().toISOString();
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
}

function validarExecucoes(client) {
  cron.schedule('*/5 * * * *', async () => {
    const hoje = new Date();
    const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
    const logs = carregarLogs();
    const falhas = [];

    for (const [nome, diaEsperado] of Object.entries(CRONS_ESPERADOS)) {
      if (diaSemana !== diaEsperado) continue;

      const ultimaExecucao = logs[nome] ? new Date(logs[nome]) : null;
      const diferencaMin = ultimaExecucao ? (hoje - ultimaExecucao) / 60000 : Infinity;

      if (diferencaMin > 30) {
        falhas.push(`❌ *${nome}* não foi executado nas últimas 30 min.\nÚltima execução: ${ultimaExecucao?.toLocaleString('pt-BR') || 'N/A'}`);
      }
    }

    if (falhas.length > 0) {
      const mensagem = `⚠️ *Validação de Crons - Problemas detectados:*\n\n${falhas.join('\n\n')}`;
      await enviarParaGrupo(client, GRUPO, mensagem);
    } else {
      console.log('✅ Todos os crons validados com sucesso!');
    }
  });
}

// 👇 Exportar tudo que os outros arquivos usam
module.exports = {
  validarExecucoes,
  salvarLog,
  carregarLogs
};
