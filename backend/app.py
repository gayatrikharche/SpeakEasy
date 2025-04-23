from utils import *
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_ngrok import run_with_ngrok
import whisper
import re, json, os
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from dotenv import load_dotenv
from huggingface_hub.hf_api import HfFolder
from pyngrok import ngrok

load_dotenv()
hf_token = os.getenv("HF_TOKEN")
ng_token = os.getenv("NG_TOKEN")
HfFolder.save_token(hf_token)
ngrok.set_auth_token(ng_token)

public_url = ngrok.connect(5000)
print("Public URL:", public_url)

config = get_config()
app = Flask(__name__)
CORS(app)
run_with_ngrok(app)

audio_model = whisper.load_model(config["audio"]["model_name"])
llm_model_name = config["llm"]["model_name"]

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype="float16"
)

tokenizer = AutoTokenizer.from_pretrained(llm_model_name)
llm_model = AutoModelForCausalLM.from_pretrained(
    llm_model_name,
    device_map="auto",
    quantization_config=bnb_config
)

llm_pipeline = pipeline("text-generation", model=llm_model, tokenizer=tokenizer)

@app.route("/transcribe", methods=["POST"])
def transcribe_audio_route():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No audio file provided"}), 400

    filepath = "temp_audio.webm"
    file.save(filepath)

    wav_path = "converted_audio.wav"
    os.system(f"ffmpeg -y -i {filepath} -ar 16000 -ac 1 {wav_path}")

    transcribed_text = transcribe_audio(audio_model, wav_path)

    response = llm_pipeline(
        build_prompt(transcribed_text),
        max_new_tokens=config["llm"]["max_new_tokens"],
        do_sample=False
    )[0]["generated_text"]

    json_block = re.search(r'\{.*?\}', response, re.DOTALL)
    json_output = json.loads(json_block.group(0)) if json_block else {}

    updated_output = update_date_from_message(json_output, transcribed_text)
    updated_output["transcript"] = transcribed_text

    return jsonify(updated_output)

if __name__ == "__main__":
    app.run(debug=True)
