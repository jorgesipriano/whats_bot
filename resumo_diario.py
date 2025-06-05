import gspread
from google.oauth2.service_account import Credentials
import requests
from datetime import datetime, timedelta
import os

# Configurações
SHEET_ID = '11YZJ7jMPUzPPcG0KY-KdqOuluBKt0YLbxwUPU2wv4zk'
CREDENTIALS_FILE = '/home/ubuntu/meu-bot/credentials.json'
ENDPOINT_BOT = 'http://localhost:3000/enviar-relatorio'
WEBHOOK_DISCORD = 'https://discord.com/api/webhooks/1367981556098011228/KOle7-dFazdlCv889kwXyunekTAoDeSs5Vu_T4espnzLDzMcwWj1ghgJ2iLjXizOsWA2'

# Verificar credentials.json
if not os.path.exists(CREDENTIALS_FILE):
    print(f'❌ Arquivo {CREDENTIALS_FILE} não encontrado')
    raise FileNotFoundError(f'{CREDENTIALS_FILE} não encontrado')

# Autenticando com Google Sheets
scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']
try:
    creds = Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=scopes)
    gc = gspread.authorize(creds)
except Exception as e:
    print(f'❌ Erro ao autenticar com Google Sheets: {e}')
    raise

def log_discord(mensagem):
    data = {'content': mensagem}
    try:
        response = requests.post(WEBHOOK_DISCORD, json=data)
        if response.status_code != 204:
            print(f'❌ Erro ao enviar log para Discord: {response.status_code} - {response.text}')
    except Exception as e:
        print(f'❌ Erro ao enviar log para Discord: {e}')

def buscar_valores(range_name):
    try:
        sheet = gc.open_by_key(SHEET_ID)
        worksheet = sheet.worksheet(range_name.split('!')[0])
        cell = worksheet.acell(range_name.split('!')[1]).value
        if not cell:
            log_discord(f'⚠️ Célula {range_name} vazia')
            return 0.0
        try:
            return float(cell.replace(',', '.'))
        except ValueError:
            log_discord(f'❌ Valor inválido em {range_name}: {cell}')
            return 0.0
    except gspread.exceptions.WorksheetNotFound:
        log_discord(f'❌ Planilha {range_name.split("!")[0]} não encontrada')
        return 0.0
    except gspread.exceptions.APIError as e:
        log_discord(f'❌ Erro na API do Google Sheets para {range_name}: {e}')
        return 0.0
    except Exception as e:
        log_discord(f'❌ Erro ao buscar valores de {range_name}: {e}')
        return 0.0

def enviar_resumo_diario():
    try:
        vendas = buscar_valores('Controle_Geral!B6')
        gastos = buscar_valores('Financeiro_semanal!D2')
        lucro = vendas - gastos
        data_atual = datetime.now().strftime('%d/%m/%Y')
        data_inicio = (datetime.now() - timedelta(days=7)).strftime('%d/%m/%Y')

        mensagem = (
            f'📊 *Resumo Diário - Doces da Morena*\n\n'
            f'📅 *Período:* {data_inicio} a {data_atual}\n'
            f'💰 *Vendas (7 dias):* R$ {vendas:.2f}\n'
            f'💸 *Gastos (7 dias):* R$ {gastos:.2f}\n'
            f'📦 *Lucro:* R$ {lucro:.2f}\n\n'
            f'🔍 Verifique o caixa e planeje as próximas vendas!'
        )

        response = requests.post(ENDPOINT_BOT, json={'mensagem': mensagem}, timeout=10)
        if response.status_code == 200:
            log_discord(f'✅ Resumo diário enviado com sucesso! {data_atual}')
        else:
            log_discord(f'❌ Erro ao enviar resumo diário: {response.status_code} - {response.text}')
    except Exception as e:
        log_discord(f'❌ Erro no resumo diário: {e}')
        raise

if __name__ == "__main__":
    enviar_resumo_diario()
