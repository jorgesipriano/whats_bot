import google.generativeai as genai

genai.configure(api_key='AIzaSyA2hQwUuABYheVcg6VwD4vAWRKmGvBi2fg')

model = genai.GenerativeModel('gemini-1.5-flash')
print("✅ Modelo Gemini carregado com sucesso!")
