"""
InsightFace Microservice
Self-hosted face embedding and similarity computation service.
"""
import os
import io
import base64
import logging
from typing import List, Optional

import numpy as np
import requests
from PIL import Image
from flask import Flask, request, jsonify

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Lazy-load InsightFace model
_face_app = None


def get_face_app():
    global _face_app
    if _face_app is None:
        try:
            import insightface
            from insightface.app import FaceAnalysis
            _face_app = FaceAnalysis(
                name="buffalo_l",
                providers=["CPUExecutionProvider"]
            )
            _face_app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace model loaded")
        except ImportError:
            logger.warning("InsightFace not installed, using mock embeddings")
            _face_app = "mock"
    return _face_app


def load_image_from_url(image_url: str) -> Optional[np.ndarray]:
    """Load image from URL or base64 data URI."""
    try:
        if image_url.startswith("data:"):
            base64_data = image_url.split(",")[1]
            image_bytes = base64.b64decode(base64_data)
        else:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            image_bytes = response.content

        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return np.array(pil_image)
    except Exception as e:
        logger.error(f"Failed to load image: {e}")
        return None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "insightface"})


@app.route("/embed", methods=["POST"])
def embed():
    """Generate face embedding for an image."""
    data = request.get_json()
    if not data or "image_url" not in data:
        return jsonify({"error": "image_url required"}), 400

    image_url = data["image_url"]
    img = load_image_from_url(image_url)

    if img is None:
        return jsonify({"face_detected": False, "embedding": [], "error": "Failed to load image"}), 200

    face_app = get_face_app()

    if face_app == "mock":
        # Mock response when InsightFace is not installed
        embedding = np.random.randn(512).astype(np.float32)
        embedding = (embedding / np.linalg.norm(embedding)).tolist()
        return jsonify({"face_detected": True, "embedding": embedding, "mock": True})

    try:
        faces = face_app.get(img)
        if not faces:
            return jsonify({"face_detected": False, "embedding": []})

        # Return embedding of the largest/most confident face
        face = max(faces, key=lambda f: f.det_score)
        embedding = face.normed_embedding.tolist()
        return jsonify({
            "face_detected": True,
            "embedding": embedding,
            "bbox": face.bbox.tolist(),
            "det_score": float(face.det_score),
        })
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return jsonify({"face_detected": False, "embedding": [], "error": str(e)}), 200


@app.route("/similarity", methods=["POST"])
def similarity():
    """Compute cosine similarity between two embeddings."""
    data = request.get_json()
    if not data or "embedding1" not in data or "embedding2" not in data:
        return jsonify({"error": "embedding1 and embedding2 required"}), 400

    emb1 = np.array(data["embedding1"], dtype=np.float32)
    emb2 = np.array(data["embedding2"], dtype=np.float32)

    if emb1.shape != emb2.shape:
        return jsonify({"error": "Embeddings must have the same shape"}), 400

    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)

    if norm1 == 0 or norm2 == 0:
        return jsonify({"similarity": 0.0})

    similarity_score = float(np.dot(emb1, emb2) / (norm1 * norm2))
    return jsonify({"similarity": similarity_score})


@app.route("/batch-embed", methods=["POST"])
def batch_embed():
    """Generate embeddings for multiple images."""
    data = request.get_json()
    if not data or "image_urls" not in data:
        return jsonify({"error": "image_urls required"}), 400

    results = []
    for url in data["image_urls"]:
        img = load_image_from_url(url)
        if img is None:
            results.append({"face_detected": False, "embedding": []})
            continue

        face_app = get_face_app()
        if face_app == "mock":
            embedding = np.random.randn(512).astype(np.float32)
            embedding = (embedding / np.linalg.norm(embedding)).tolist()
            results.append({"face_detected": True, "embedding": embedding})
            continue

        try:
            faces = face_app.get(img)
            if faces:
                face = max(faces, key=lambda f: f.det_score)
                results.append({"face_detected": True, "embedding": face.normed_embedding.tolist()})
            else:
                results.append({"face_detected": False, "embedding": []})
        except Exception as e:
            results.append({"face_detected": False, "embedding": [], "error": str(e)})

    return jsonify({"results": results})


if __name__ == "__main__":
    # For direct execution only (development). In production, use gunicorn as configured in Dockerfile CMD.
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
