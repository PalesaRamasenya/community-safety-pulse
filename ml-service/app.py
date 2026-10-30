"""
Flask ML microservice for Community Safety Pulse.

Endpoints:
    POST /ml/classify    -> {severity, confidence}
    POST /ml/spam-check  -> {spamScore, flagged}

Run with: python app.py   (listens on http://localhost:5000)
Models must exist first: python train.py
"""

import os
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
SEVERITY_MODEL_PATH = os.path.join(MODEL_DIR, "severity_model.pkl")
SPAM_MODEL_PATH = os.path.join(MODEL_DIR, "spam_model.pkl")

app = Flask(__name__)
CORS(app)

severity_model = None
spam_model = None
load_error = None

try:
    severity_model = joblib.load(SEVERITY_MODEL_PATH)
    spam_model = joblib.load(SPAM_MODEL_PATH)
    print("Models loaded successfully.")
except FileNotFoundError as e:
    load_error = str(e)
    print(f"WARNING: could not load models ({load_error}). Run 'python train.py' first.")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok" if severity_model and spam_model else "models_missing",
        "error": load_error
    })


@app.route("/ml/classify", methods=["POST"])
def classify():
    if severity_model is None:
        return jsonify({"error": "Severity model not loaded. Run train.py first."}), 503

    try:
        payload = request.get_json(force=True) or {}
        description = (payload.get("description") or "").strip()
        category = (payload.get("category") or "").strip()

        if not description:
            return jsonify({"error": "description is required"}), 400

        combined_text = f"{category} {description}".strip()

        prediction = severity_model.predict([combined_text])[0]
        probabilities = severity_model.predict_proba([combined_text])[0]
        confidence = float(max(probabilities))

        return jsonify({"severity": prediction, "confidence": round(confidence, 4)})
    except Exception as e:
        return jsonify({"error": f"Classification failed: {str(e)}"}), 500


@app.route("/ml/spam-check", methods=["POST"])
def spam_check():
    if spam_model is None:
        return jsonify({"error": "Spam model not loaded. Run train.py first."}), 503

    try:
        payload = request.get_json(force=True) or {}
        description = (payload.get("description") or "").strip()

        if not description:
            return jsonify({"error": "description is required"}), 400

        prediction = spam_model.predict([description])[0]
        probabilities = spam_model.predict_proba([description])[0]
        classes = list(spam_model.classes_)
        spam_index = classes.index("spam") if "spam" in classes else 0
        spam_score = float(probabilities[spam_index])

        return jsonify({
            "spamScore": round(spam_score, 4),
            "flagged": bool(prediction == "spam")
        })
    except Exception as e:
        return jsonify({"error": f"Spam check failed: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
