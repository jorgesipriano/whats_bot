const cron = require('node-cron');
const { google } = require('googleapis');
const path = require('path');
const moment = require('moment-timezone');
const { enviarParaGrupo } = require('./mensagens');
const { salvarLog } = require('./validadorCrons');

// Configurar fuso horário para o Brasil
moment.tz.setDefault('America/Sao_Paulo');

// ID da planilha
const SHEET_ID = '11YZJ7jMPUzPPcG0KY-KdqOuluBKt0YLbxwUPU2wv4zk';

// Função para tentar "acordar" a sessão
async function ativarSessao(client) {
  try {
    await client.getChats(); // força comunicação com o WhatsApp
    console.log('💡 Sessão ativada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao ativar a sessão:', error);
  }
}

function agendarMensagens(client) {
  // Culto de Quarta - Segunda-feira
  cron.schedule('0 9 * * 1', async () => {
    await ativarSessao(client);

    const dataQuarta = moment().isoWeekday(3);
    const dataFormatada = dataQuarta.format('DD/MM/YYYY');

    const mensagem = `📅 *Culto Quarta (${dataFormatada})*\n\n` +
                     `Débora\nJorge ✅\nNael\nPra. Priscila\nWarlen\n\nSugestões:`;
    await enviarParaGrupo(client, 'Mensagens', mensagem);
    salvarLog('culto_quarta');
  });

  // Lembrete de terça
  cron.schedule('0 9 * * 2', async () => {
    await ativarSessao(client);

    const mensagem = '📣 Não se esqueça da confirmação e da sugestão dos louvores de quarta - por favor.';
    await enviarParaGrupo(client, 'Mensagens', mensagem);
    salvarLog('lembrete_terca');
  });

  // Culto de Domingo - Quinta-feira
  cron.schedule('0 9 * * 4', async () => {
    await ativarSessao(client);

    const dataDomingo = moment().isoWeekday(7);
    const dataFormatada = dataDomingo.format('DD/MM/YYYY');

    const mensagem = `📅 *Culto Domingo (${dataFormatada})*\n\n` +
                     `Débora\nJorge ✅\nNael\nPra. Priscila\nWarlen\n\nSugestões:`;
    await enviarParaGrupo(client, 'Mensagens', mensagem);
    salvarLog('culto_domingo');
  });

  // Lembrete de sexta
  cron.schedule('0 9 * * 5', async () => {
    await ativarSessao(client);

    const mensagem = '📣 Não se esqueça das sugestões e da confirmação no culto, por favor.';
    await enviarParaGrupo(client, 'Mensagens', mensagem);
    salvarLog('lembrete_sexta');
  });

  // 📊 Relatório financeiro - Domingo às 6h
  cron.schedule('0 6 * * 0', async () => {
    try {
      await ativarSessao(client);

      const auth = await authorizeGoogle();
      const sheets = google.sheets({ version: 'v4', auth });

      // Buscar dados do Google Sheets
      const [vendasResp, gastosResp] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Controle_Geral!B6' }),
        sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Financeiro_semanal!D2' }),
      ]);

      // Normalizar valores
      const vendas = parseFloat((vendasResp.data.values?.[0]?.[0] || '0').replace(',', '.')) || 0;
      const gastos = parseFloat((gastosResp.data.values?.[0]?.[0] || '0').replace(',', '.')) || 0;
      const lucro = vendas - gastos;
      const percentual = vendas ? (lucro / vendas) * 100 : 0;

      // Análise de desempenho
      let analise = '';
      if (percentual < 50) {
        analise = '⚠️ Necessário precificar melhor para a próxima semana!';
      } else {
        analise = '✅ Continue assim! Está cuidando bem do financeiro da empresa.';
      }

      const mensagem = `📊 *Atualização Financeira Semanal - Doces da Morena*\n\n` +
                       `💰 *Total de Vendas:* R$ ${vendas.toFixed(2)}\n` +
                       `💸 *Total de Gastos:* R$ ${gastos.toFixed(2)}\n` +
                       `📦 *Fechamento do Caixa:* R$ ${lucro.toFixed(2)}\n\n` +
                       `${analise}`;

      await enviarParaGrupo(client, 'DOCES DA MORENA EMPRESA', mensagem);
      salvarLog('relatorio_domingo');
    } catch (error) {
      console.error('Erro ao gerar relatório financeiro:', error);
    }
  });
}

// Função para autenticar com o Google Sheets
async function authorizeGoogle() {
  const keyPath = path.join(__dirname, 'credentials.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

module.exports = agendarMensagens;
