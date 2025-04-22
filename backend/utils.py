import whisper
import yaml

def transcribe_audio(audio_model: whisper.model.Whisper, audio_file: str) -> str:
    assert audio_file.split(".")[-1] == "wav", "Only .wav files are supported"
    
    result = audio_model.transcribe(audio_file)
    
    return result["text"]

def build_prompt(user_message: str) -> str:
    return f"""
You are an intelligent assistant that extracts appointment details from natural language.

Given the user's message, extract and return a JSON object with the following fields:
- intent: (schedule, cancel, reschedule)
- person: (name of the person involved)
- date: (in YYYY-MM-DD format)
- time: (in 24-hour HH:MM format)
- purpose: (meeting, call, appointment, etc.)

User message: "{user_message}"

Only return the JSON. Do not include any explanations
"""