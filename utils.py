import whisper
import yaml

def transcribe_audio(audio_model: whisper.model.Whisper, audio_file: str) -> str:
    assert audio_file.split(".")[-1] == "wav", "Only .wav files are supported"
    
    result = audio_model.transcribe(audio_file)
    
    return result["text"]