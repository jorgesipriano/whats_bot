const { google } = require('googleapis');
const path = require('path');
const { enviarParaGrupo } = require('./mensagens');
const { addCliente, addPedidoAoSheet } = require('./sheets-utils');

const SHEET_ID = '11YZJ7jMPUzPPcG0KY-KdqOuluBKt0YLbxwUPU2wv4zk';
const CATALOGO_SHEET = 'Catalogo_produtos';

async function authorizeGoogle() {
  const keyPath = path.join(__dirname, 'credentials.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

async function buscarPrecoTotal(pedidoTexto) {
  const auth = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CATALOGO_SHEET}!C:D`,
  });

  const catalogo = res.data.values;
  let total = 0;

  for (let i = 1; i < catalogo.length; i++) {
    const [nomeCompleto, precoStr] = catalogo[i];
    const preco = parseFloat(precoStr.replace(',', '.'));
    const regex = new RegExp(`(\\d+)\\s*${nomeCompleto}`, 'gi');
    let match;
    while ((match = regex.exec(pedidoTexto)) !== null) {
      const quantidade = parseInt(match[1]);
      total += quantidade * preco;
    }
  }

  return total;
}

async function handleMessage(msg, client) {
  try {
    const chat = await msg.getChat();
    const gruposPermitidos = ['Teste_bot']; // Adicione outros grupos aqui se quiser

    if (!chat.isGroup || !gruposPermitidos.includes(chat.name)) return;

    // 🔁 Comando de verificação
    if (msg.body.toLowerCase() === '/ping') {
      await msg.reply('🏓 Pong! Bot ativo e saudável.');
      return;
    }

    // 📝 Processamento de pedido
    const partes = msg.body.split(',');
    if (partes.length < 4) return;

    const nome = partes[0].trim();
    const endereco = partes[1].trim();
    const pedido = partes[2].trim();
    const dataHora = partes[3].trim();

    const total = await buscarPrecoTotal(pedido);
    const totalFormatado = total.toFixed(2).replace('.', ',');

    const obs = '';
    const numeroPedido = Date.now().toString().slice(-6);
    const hoje = new Date().toLocaleDateString('pt-BR');

    await addCliente(nome, endereco);
    await addPedidoAoSheet([
      numeroPedido,
      nome,
      pedido,
      dataHora,
      totalFormatado,
      endereco,
      hoje,
      '', // status
      obs,
    ]);

    await msg.reply(
      `✅ *Seu pedido foi registrado!*\n\n📦 *Pedido:* ${pedido}\n🕒 *Entrega:* ${dataHora}\n📍 *Endereço:* ${endereco}\n💰 *Total:* ${totalFormatado}\n\n💳 Qual a forma de pagamento?\n🔢 Pix: 31984915396`
    );

    await enviarParaGrupo(client, 'Teste_bot',
      `📦 *Pedido registrado*\n👤 ${nome}\n🧾 ${pedido}\n💰 ${totalFormatado}\n🕒 ${dataHora}\n📍 ${endereco}`
    );

  } catch (error) {
    console.error('❌ Erro ao processar pedido:', error);
    await msg.reply('❌ Ocorreu um erro ao registrar seu pedido.');
  }
}

module.exports = handleMessage;
