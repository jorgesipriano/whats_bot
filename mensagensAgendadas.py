import requests

def enviar_culto_quarta():
    message = "Lembrete: Culto de Quarta às 20h! Já enviou sua confirmação?!"
    response = requests.post('http://localhost:3000/enviar-mensagem', json={'mensagem': message})
    return response.status_code == 200

def enviar_lembrete_terca():
    message = """
*Culto Quarta*

Débora 
Jorge 
Nael
Pra. Priscila 
Warlen

Sugestões:
"""
    response = requests.post('http://localhost:3000/enviar-mensagem', json={'mensagem': message})
    return response.status_code == 200

def enviar_culto_domingo():
    message = "Lembrete: Culto de Domingo já indicou as músicas, está tudo certo pro culto né?"
    response = requests.post('http://localhost:3000/enviar-mensagem', json={'mensagem': message})
    return response.status_code == 200

def enviar_lembrete_sexta():
    message = """
*Culto Domingo*

Débora 
Jorge 
Nael
Pra. Priscila 
Warlen

Sugestões:
"""
    response = requests.post('http://localhost:3000/enviar-mensagem', json={'mensagem': message})
    return response.status_code == 200
