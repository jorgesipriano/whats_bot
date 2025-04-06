const { Client, LocalAuth } = require('whatsapp-web.js');
const { google } = require('googleapis');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const SHEET_ID = '11YZJ7jMPUzPPcG0KY-KdqOuluBKt0YLbxwUPU2wv4zk';
const PEDIDOS_SHEET = 'Pedidos_confeitaria';
const CLIENTES_SHEET = 'Cadastro_Clientes';
const CATALOGO_SHEET = 'Catalogo_produtos';
const CREDENTIALS_PATH = './automacaocasas-6608713e559b.json';

async function authorizeGoogle() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

async function buscarPrecoTotal(pedidoTexto) {
  const auth = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CATALOGO_SHEET}!C:D`, // NOME COMPLETO e PREÇO
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

async function addCliente(nome, endereco) {
  const auth = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CLIENTES_SHEET}!A:C`,
  });

  const clientes = res.data.values || [];
  const jaExiste = clientes.some(
    ([, nomeExistente, enderecoExistente]) =>
      nomeExistente?.toLowerCase() === nome.toLowerCase() &&
      enderecoExistente?.toLowerCase() === endereco.toLowerCase()
  );

  if (!jaExiste) {
    const id = Date.now().toString(36).toUpperCase();
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${CLIENTES_SHEET}!A:D`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[id, nome, endereco, dataHoje]],
      },
    });
  }
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
      values: [pedidoData],
    },
  });
}

const client = new Client({
  authStrategy: new LocalAuth(),
});

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('🤖 Bot está pronto!');
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
    const totalFormatado = total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const status = 'Aguardando pagamento';
    const obs = '';
    const numeroPedido = Date.now().toString().slice(-6);

    await addCliente(nome, endereco);
    await addPedidoAoSheet([
      numeroPedido,
      nome,
      pedido,
      dataHora,
      totalFormatado,
      endereco,
      status,
      obs,
    ]);

    await msg.reply(
      `✅ Seu pedido está confirmadíssimo!\n\n📦 *Pedido:* ${pedido}\n🕒 *Entrega:* ${dataHora}\n💰 *Total:* ${totalFormatado}\n💳 Qual a forma de pagamento?\n🔢 Pix: 31984915396`
    );

    await msg.reply(
      `🧾 *Pedido registrado!*\n\nNº: ${numeroPedido}\nCliente: ${nome}\nPedido: ${pedido}\nData/Hora: ${dataHora}\nTotal Pedido: ${totalFormatado}\nEndereço: ${endereco}\nStatus: ${status}\nObservações: ${obs}`
    );
  } catch (error) {
    console.error('Erro ao processar pedido:', error);
    msg.reply('❌ Ocorreu um erro ao registrar seu pedido.');
  }
});

client.initialize();
