const { google } = require('googleapis');
const path = require('path');

const SHEET_ID = '11YZJ7jMPUzPPcG0KY-KdqOuluBKt0YLbxwUPU2wv4zk';
const CLIENTES_SHEET = 'Cadastro_Clientes';
const PEDIDOS_SHEET = 'Pedidos_confeitaria';

async function authorizeGoogle() {
  const keyPath = path.join(__dirname, 'credentials.json');
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

async function addCliente(nome, endereco) {
  const auth = await authorizeGoogle();
  const sheets = google.sheets({ version: 'v4', auth });

  // Verifica se cliente já existe
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${CLIENTES_SHEET}!A:B`,
  });

  const clientes = res.data.values || [];
  const existe = clientes.some(row => row[0] === nome);

  if (!existe) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${CLIENTES_SHEET}!A:B`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[nome, endereco]],
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

module.exports = { addCliente, addPedidoAoSheet };
