from deepface import DeepFace

def compare_faces(img1_path, img2_path):
    return DeepFace.verify(img1_path, img2_path, enforce_detection=False)