import requests

def enviar_culto_quarta():
    message = "Lembrete: Já enviou sua confirmação?!"
    response = requests.post('http://localhost:3000/enviar-mensagem', json={'mensagem': message})
    return response.status_code == 200

def enviar_lembrete_terca():
    message = """
*mensagem confirmação*
#
#
#
#
**** 
"""
    response = requests.post('http://localhost:3000/enviar-mensagem', json={'mensagem': message})
    return response.status_code == 200

def enviar_culto_domingo():
    message = "Lembrete: Já enviou sua confirmação?!"
    response = requests.post('http://localhost:3000/enviar-mensagem', json={'mensagem': message})
    return response.status_code == 200

def enviar_lembrete_sexta():
    message = """
*mensagem confirmação* 
#
#
#
#
**** 
"""
    response = requests.post('http://localhost:3000/enviar-mensagem', json={'mensagem': message})
    return response.status_code == 200
