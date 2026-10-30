"""
Trains the two models used by the Community Safety Pulse ML service:

1. Severity classifier: TF-IDF + Logistic Regression over (description + category)
   text, predicting "Low" / "Medium" / "High".
2. Spam classifier: TF-IDF + Logistic Regression over description text,
   predicting "spam" / "valid".

Run with: python train.py
Outputs: model/severity_model.pkl, model/spam_model.pkl
"""

import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.pipeline import Pipeline

from training_data import severity_data, spam_data

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
os.makedirs(MODEL_DIR, exist_ok=True)


def train_pipeline(data, label_name):
    texts = [t for t, _ in data]
    labels = [l for _, l in data]

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), min_df=1)),
        ("clf", LogisticRegression(max_iter=1000))
    ])

    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    print(f"[{label_name}] test accuracy: {accuracy:.2f} (n_test={len(y_test)})")

    return pipeline


def main():
    print("Training severity classifier...")
    severity_model = train_pipeline(severity_data, "severity")
    joblib.dump(severity_model, os.path.join(MODEL_DIR, "severity_model.pkl"))

    print("Training spam classifier...")
    spam_model = train_pipeline(spam_data, "spam")
    joblib.dump(spam_model, os.path.join(MODEL_DIR, "spam_model.pkl"))

    print(f"Models saved to {MODEL_DIR}")


if __name__ == "__main__":
    main()
