import re
import os
import json
import yaml
import whisper
from datetime import datetime, timedelta

def get_config(file_name: str = "config.yaml") -> dict:
    with open(file_name, "r") as f:
        config = yaml.safe_load(f)
        
    return config

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

def update_date_from_message(json_data: dict, user_message: str) -> dict:
    weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    user_message_lower = user_message.lower()
    weekday_in_message = next((day for day in weekdays if day in user_message_lower), None)

    if weekday_in_message:
        today = datetime.today()
        current_weekday = today.weekday()
        target_weekday = weekdays.index(weekday_in_message)

        days_ahead = (target_weekday - current_weekday + 7) % 7
        days_ahead = 7 if days_ahead == 0 else days_ahead

        next_date = today + timedelta(days=days_ahead)
        corrected_date = next_date.strftime("%Y-%m-%d")

        json_data["date"] = corrected_date

    return json_data

def save_json_output(response: str, user_message: str, file_path: str = "output.json") -> None:
    json_block = re.search(r'\{.*?\}', response, re.DOTALL)

    if json_block:
        json_output = json.loads(json_block.group(0))
        json_output = update_date_from_message(json_output, user_message)

        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                try:
                    data = json.load(f)
                    if not isinstance(data, list):
                        data = [data]
                except json.JSONDecodeError:
                    data = []
        else:
            data = []

        data.append(json_output)

        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)

    print("Output saved in JSON file!")