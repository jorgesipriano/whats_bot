const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

const SHEET_ID = '11YZJ7jMPUzPPcG0KY-KdqOuluBKt0YLbxwUPU2wv4zk';
const PEDIDOS_SHEET = 'Pedidos_confeitaria';
const CATALOGO_SHEET = 'Catalogo_produtos';
const CREDENTIALS_PATH = './automacaocasas-6608713e559b.json';

async function authorizeGoogle() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return await auth.getClient();
}

async function buscarPrecoTotal(pedidoTexto) {
  const auth = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CATALOGO_SHEET}!A:C`
  });

  const catalogo = res.data.values;
  let total = 0;

  for (let linha of catalogo.slice(1)) {
    const [produto, precoStr, sabor] = linha;
    const preco = parseFloat(precoStr.replace(',', '.'));
    const regex = new RegExp(`(\\d+)\\s*${produto.trim()}.*?${sabor.trim()}`, 'gi');

    let match;
    while ((match = regex.exec(pedidoTexto)) !== null) {
      const quantidade = parseInt(match[1]);
      total += quantidade * preco;
    }
  }

  return total;
}

async function addPedidoAoSheet(pedidoData) {
  const authClient = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${PEDIDOS_SHEET}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [pedidoData]
    }
  });
}

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Bot está pronto!');
});

client.on('message', async (msg) => {
  try {
    const partes = msg.body.split(',');
    if (partes.length < 4) return;

    const nome = partes[0].trim();
    const endereco = partes[1].trim();
    const pedido = partes[2].trim();
    const dataHora = partes[3].trim();
    const total = await buscarPrecoTotal(pedido);
    const totalFormatado = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const numeroPedido = Math.floor(Math.random() * 1000000);
    const status = 'Aguardando pagamento';
    const observacoes = '';

    // Mensagem para cliente
    const mensagemCliente = `✅ Seu pedido está confirmadíssimo!\n\n📦 *Pedido:* ${pedido}\n🕒 *Entrega:* ${dataHora}\n💰 *Total:* ${totalFormatado}\n💳 Qual a forma de pagamento?\n🔢 Pix: 31984915396`;

    // Mensagem para controle interno
    const mensagemInterna = `🧾 Pedido registrado!\n\nNº: ${numeroPedido}\nCliente: ${nome}\nPedido: ${pedido}\nData/Hora: ${dataHora}\nTotal Pedido: ${totalFormatado}\nEndereço: ${endereco}\nStatus: ${status}\nObservações: ${observacoes}`;

    // Salvar no Google Sheets
    await addPedidoAoSheet([
      nome,
      endereco,
      pedido,
      dataHora,
      totalFormatado,
      status,
      observacoes,
      new Date().toLocaleString('pt-BR')
    ]);

    await msg.reply(mensagemCliente);

    const chat = await msg.getChat();
    await chat.sendMessage(mensagemInterna);
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
    msg.reply('❌ Ocorreu um erro ao registrar seu pedido. Tente novamente.');
  }
});

client.initialize();
