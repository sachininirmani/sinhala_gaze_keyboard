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
# Basic set of Sinhala combining marks and signs that should be ignored
# when extracting a "base" consonant for the previous syllable.
SINHALA_DIACRITICS = set(list("ාැෑිීුූෘෲෙේොෝෞ්ංඃෟ"))

def is_diacritic(ch: str) -> bool:
    return ch in SINHALA_DIACRITICS

def last_base_consonant(word: str) -> str:
    """
    Returns the most recent non-diacritic Sinhala character in `word`
    (used as the base consonant of the previous syllable). If none, returns "".
    """
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
    # naive prefix search; consider sorting/filtering by corpus frequency if needed
    predictions = [w for w in corpus_words if w.startswith(prefix)]
    return jsonify(predictions[:5])

@app.route("/predict/vowel")
def predict_vowel():
    """
    Expects:
      - prefix: entire current word AFTER user clicked the current char
      - current: the just-clicked current consonant (frontend sends it)
    Logic:
      - If there is no previous base consonant, fall back to bigrams for `current`.
      - Else, build key = previous_base_consonant + current_consonant
        and fetch from `vowel_prediction_map`.
    """
    prefix = request.args.get("prefix", "")
    current = request.args.get("current", "")

    if not prefix:
        return jsonify([])

    # Because the frontend sends `prefix` that already includes the just-typed `current`,
    # we exclude that last char when scanning backward for the previous base consonant.
    base_scope = prefix[:-1] if prefix else prefix
    prev_base = last_base_consonant(base_scope)

    # Determine the current consonant: prefer explicit param; fallback to last char.
    current_cons = current or (prefix[-1] if prefix else "")

    if not prev_base:
        # First letter of the word (or no detectable previous base):
        # Use bigram suggestions keyed by current consonant.
        suggestions = vowel_bigrams.get(current_cons, [])
        return jsonify(suggestions[:6])

    # Build bigram-of-consonants key for trigram-style map
    key = prev_base + current_cons
    suggestions = vowel_prediction_map.get(key, [])
    return jsonify(suggestions[:10])

# -------- Main --------
if __name__ == "__main__":
    # For dev only. In production, run behind a WSGI/ASGI server.
    app.run(host="0.0.0.0", port=5000, debug=True)
