from flask import Flask, request, jsonify
import cv2
import os
import tempfile
import uuid
from werkzeug.utils import secure_filename
from compare import compare_faces

app = Flask(__name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/recognize', methods=['POST'])
def recognize_face():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    
    data = request.get_json()
        
    faces_list = [data["frontPhoto"], data["leftPhoto"], data["rightPhoto"]]

    face2check = data["File2Check"]

    face2check = f"uploads/{face2check}"

    try:
        for face in faces_list:
            full_face = f"uploads/{face}"
            result = compare_faces(face2check, full_face)
            print(result)
        return jsonify({"error": str(1)}), 200
    
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)