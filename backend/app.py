from flask import Flask, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)  # allow all origins during development

# -------- Data loading --------
with open("data/word_frequency_clean.txt", "r", encoding="utf-8") as f:
    corpus_words = f.read().splitlines()

with open("data/vowel_bigrams.json", "r", encoding="utf-8") as f:
    vowel_bigrams = json.load(f)

with open("data/vowel_combination_map_Most_Used.json", "r", encoding="utf-8") as f:
    vowel_prediction_map = json.load(f)

# -------- Sinhala helpers --------
SINHALA_DIACRITICS = set(list("ාැෑිීුූෘෲෙේොෝෞ්ංඃෟ"))

def is_diacritic(ch: str) -> bool:
    return ch in SINHALA_DIACRITICS

def last_base_consonant(word: str) -> str:
    for ch in reversed(word):
        if not is_diacritic(ch):
            return ch
    return ""

# -------- Utilities --------
def get_last_word(text: str) -> str:
    return text.strip().split(" ")[-1] if text.strip() else ""

# -------- Routes --------
@app.route("/predict/word")
def predict_word():
    prefix = request.args.get("prefix", "")
    if not prefix:
        return jsonify([])
    predictions = [w for w in corpus_words if w.startswith(prefix)]
    return jsonify(predictions[:5])

@app.route("/predict/vowel")
def predict_vowel():
    """
    Expects:
      - prefix: entire current word AFTER user clicked the current char
      - current: the just-clicked current consonant (frontend sends it)
    """
    prefix = request.args.get("prefix", "")
    current = request.args.get("current", "")

    if not prefix:
        return jsonify([])

    base_scope = prefix[:-1] if prefix else prefix
    prev_base = last_base_consonant(base_scope)

    current_cons = current or (prefix[-1] if prefix else "")

    if not prev_base:
        # First letter or no detectable previous base → use bigrams for current consonant
        suggestions = vowel_bigrams.get(current_cons, [])
        return jsonify(suggestions[:10])  # return up to 10; frontend paginates to 5-per-page

    key = prev_base + current_cons
    suggestions = vowel_prediction_map.get(key, [])
    return jsonify(suggestions[:10])

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
