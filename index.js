const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

const SHEET_ID = '11YZJ7jMPUzPPcG0KY-KdqOuluBKt0YLbxwUPU2wv4zk';
const PEDIDOS_SHEET = 'Pedidos_confeitaria';
const CLIENTES_SHEET = 'Cadastro_Clientes';
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
  const auth = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth });

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

async function cadastrarCliente(nome, endereco) {
  const auth = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CLIENTES_SHEET}!B:C`
  });

  const clientes = res.data.values || [];
  const nomesExistentes = clientes.map(row => row[0]?.toLowerCase().trim());

  if (!nomesExistentes.includes(nome.toLowerCase().trim())) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${CLIENTES_SHEET}!A:C`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[Date.now(), nome, endereco]]
      }
    });
  }
}

// Bot WhatsApp
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

    // Mensagem para cliente
    const msgCliente = `✅ Seu pedido está confirmadíssimo!\n\n📦 Pedido: ${pedido}\n🕒 Entrega: ${dataHora}\n💰 Total: R$ ${total.toFixed(2)}\n💳 Qual a forma de pagamento?\n🔢 Pix: 31984915396`;

    // Mensagem para controle interno
    const numeroPedido = Math.floor(Math.random() * 1000000);
    const msgInterna = `🧾 Pedido registrado!\n\nNº: ${numeroPedido}\nCliente: ${nome}\nPedido: ${pedido}\nData/Hora: ${dataHora}\nTotal Pedido: R$ ${total.toFixed(2)}\nEndereço: ${endereco}\nStatus: Aguardando pagamento\nObservações:`;

    await msg.reply(msgCliente);
    await msg.reply(msgInterna);

    // Salva pedido na planilha
    await addPedidoAoSheet([
      numeroPedido,
      nome,
      endereco,
      pedido,
      dataHora,
      total.toFixed(2),
      'Aguardando pagamento',
      ''
    ]);

    // Cadastra cliente se ainda não existir
    await cadastrarCliente(nome, endereco);

  } catch (error) {
    console.error('❌ Erro ao processar a mensagem:', error);
    msg.reply('❌ Ocorreu um erro ao registrar seu pedido. Tente novamente.');
  }
});

client.initialize();
