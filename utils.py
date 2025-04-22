import whisper
import yaml

def transcribe_audio(audio_file: str) -> str:
    assert audio_file.split(".")[-1] == "wav", "Only .wav files are supported"
    
    audio_model = whisper.load_model("tiny.en")
    result = audio_model.transcribe(audio_file)
    
    return result["text"]