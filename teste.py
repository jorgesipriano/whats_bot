import schedule
import time
import requests
from datetime import datetime

URL = "http://localhost:3000/enviar-relatorio"

def enviar_mensagem_teste():
    agora = datetime.now().strftime("%d/%m/%Y %H:%M")
    mensagem = f"🧪 Teste automático - {agora}"
    try:
        response = requests.post(URL, json={"mensagem": mensagem})
        print(f"✅ Teste enviado: {mensagem} | Status: {response.status_code}")
    except Exception as e:
        print(f"❌ Erro ao enviar mensagem de teste: {e}")

# ⏰ Agendamento de teste: a cada 15 minutos
schedule.every(15).minutes.do(enviar_mensagem_teste)

print("⏳ Agendador de teste rodando...")

while True:
    schedule.run_pending()
    time.sleep(1)
