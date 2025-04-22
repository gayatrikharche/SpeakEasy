from utils import *
import os
import whisper
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
from transformers import BitsAndBytesConfig
from dotenv import load_dotenv
from huggingface_hub.hf_api import HfFolder

import warnings
warnings.filterwarnings("ignore")


config = get_config()

load_dotenv()
hf_token = os.getenv("HF_TOKEN")
HfFolder.save_token(hf_token)

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

audio_file = "../test/test1.wav"
transcribed_audio = transcribe_audio(audio_model, audio_file)

response = llm_pipeline(
    build_prompt(transcribed_audio), 
    max_new_tokens=config["llm"]["max_new_tokens"], 
    do_sample=False
)[0]["generated_text"]
print("Received response from LLM")

save_json_output(response, transcribed_audio, config["output"]["json_file"])
