import requests
import json
from datetime import datetime
import os
import google.generativeai as genai

# Configurações
WEBHOOK_URL = 'https://discord.com/api/webhooks/1367981556098011228/KOle7-dFazdlCv889kwXyunekTAoDeSs5Vu_T4espnzLDzMcwWj1ghgJ2iLjXizOsWA2'
LOG_OUT = '/home/ubuntu/.pm2/logs/bot-what-out.log'
LOG_ERROR = '/home/ubuntu/.pm2/logs/bot-what-error.log'
GEMINI_API_KEY = 'AIzaSyA2hQwUuABYheVcg6VwD4vAWRKmGvBi2fg'
LINES_TO_READ = 100

# Configurar a API do Gemini
genai.configure(api_key=GEMINI_API_KEY)

def read_logs(file_path, lines=LINES_TO_READ):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
            return ''.join(all_lines[-lines:]) if all_lines else 'Nenhum log encontrado.'
    except Exception as e:
        return f'Erro ao ler {file_path}: {str(e)}'

def analyze_logs(logs):
    prompt = (
        "Você é uma IA que analisa logs de um bot Node.js (WhatsApp + Discord). "
        "Aponte possíveis problemas, erros recorrentes ou tarefas executadas corretamente. "
        "Seja direto, técnico e prático. Aqui estão os logs:\n\n" + logs
    )
    try:
        model = genai.GenerativeModel(model_name='gemini-1.5-flash')
        chat = model.start_chat()
        response = chat.send_message(prompt)
        return response.text
    except Exception as e:
        return f'Erro ao analisar logs com Gemini: {str(e)}'

def send_discord_embed(insights):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    has_errors = '❌' in insights or 'Erro' in insights or 'Exception' in insights
    color = 0xFF0000 if has_errors else 0x00FF00

    chunks = [insights[i:i+1000] for i in range(0, len(insights), 1000)]

    for i, chunk in enumerate(chunks):
        embed = {
            'title': '🧠 Resumo dos Logs (Gemini AI)' if i == 0 else None,
            'description': f'Logs analisados às {timestamp} BRT' if i == 0 else None,
            'color': color,
            'fields': [
                {
                    'name': f'📊 Análise (parte {i+1})',
                    'value': chunk,
                    'inline': False
                }
            ],
            'footer': {'text': 'Bot WhatsApp - DOCES DA MORENA EMPRESA'} if i == len(chunks) - 1 else None
        }

        # Remove None para evitar erro no Discord
        embed = {k: v for k, v in embed.items() if v is not None}

        payload = {'embeds': [embed]}
        try:
            response = requests.post(WEBHOOK_URL, json=payload)
            if response.status_code != 204:
                print(f'❌ Erro ao enviar embed (parte {i+1}): {response.status_code} - {response.text}')
        except Exception as e:
            print(f'❌ Erro ao enviar embed ao Discord (parte {i+1}): {str(e)}')

def main():
    logs_out = read_logs(LOG_OUT)
    logs_error = read_logs(LOG_ERROR)
    insights = analyze_logs(logs_out + '\n\n---\n\n' + logs_error)
    send_discord_embed(insights)

if __name__ == '__main__':
    main()
