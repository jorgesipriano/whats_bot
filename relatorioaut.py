import gspread
from google.oauth2.service_account import Credentials
import requests
import json
from datetime import datetime

# Configurações
SHEET_ID = '*********'
CREDENTIALS_FILE = '******'
ENDPOINT_BOT = 'http://localhost:3000/enviar-relatorio'
WEBHOOK_DISCORD = '*************************'

# Autenticando com Google Sheets
scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']
creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=scopes)
gc = gspread.authorize(creds)

def log_discord(mensagem):
    data = {'content': mensagem}
    try:
        requests.post(WEBHOOK_DISCORD, json=data)
    except Exception as e:
        print(f'Erro ao enviar log para Discord: {e}')

def buscar_valores(range_name):
    try:
        sheet_url = f'https://docs.google.com/spreadsheets/d/{SHEET_ID}'
        sheet = gc.open_by_url(sheet_url)
        worksheet = sheet.worksheet(range_name.split('!')[0])
        cell = worksheet.acell(range_name.split('!')[1]).value
        return float(cell.replace(',', '.')) if cell else 0.0
    except Exception as e:
        log_discord(f'❌ Erro ao buscar valores de {range_name}: {e}')
        return 0.0

def gerar_relatorio():
    try:
        vendas = buscar_valores('Controle_Geral!B6')
        gastos = buscar_valores('Financeiro_semanal!D2')
        lucro = vendas - gastos
        percentual = (lucro / vendas * 100) if vendas else 0

        analise = '✅ Continue assim! Está cuidando bem do financeiro da empresa.'
        if percentual < 50:
            analise = '⚠️ Necessário precificar melhor para a próxima semana!'

        data_atual = datetime.now().strftime('%d/%m/%Y')
        mensagem = (
            f'📊 *Atualização Financeira Semanal*\n\n'
            f'📅 *Data:* {data_atual}\n'
            f'💰 *Total de Vendas:* R$ {vendas:.2f}\n'
            f'💸 *Total de Gastos:* R$ {gastos:.2f}\n'
            f'📦 *Fechamento do Caixa:* R$ {lucro:.2f}\n\n'
            f'{analise}'
        )

        response = requests.post(ENDPOINT_BOT, json={'mensagem': mensagem})
        if response.status_code == 200:
            log_discord(f'✅ Relatório enviado com sucesso! {data_atual}')
        else:
            log_discord(f'❌ Erro ao enviar relatório: {response.text}')

    except Exception as e:
        log_discord(f'❌ Erro no relatório financeiro: {e}')

# Executa o relatório
gerar_relatorio()
