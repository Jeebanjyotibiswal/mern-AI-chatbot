from fastapi import FastAPI
from pydantic import BaseModel
class ChatRequest(BaseModel):
    message: str
app = FastAPI()


from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from groq import Groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_response(message: str) -> str:
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": message}
            ],
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"Error: {str(e)}"

@app.post("/chat")
def chat(request: ChatRequest):
    response = generate_response(request.message)
    return {"reply": response}