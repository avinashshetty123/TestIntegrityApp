import urllib.request
import os

def download_file(url, filename):
    """Download a file from URL to filename"""
    if not os.path.exists(filename):
        print(f"Downloading {filename}...")
        urllib.request.urlretrieve(url, filename)
        print(f"Downloaded {filename}")
    else:
        print(f"{filename} already exists")

# Download dlib models
models = {
    'shape_predictor_68_face_landmarks.dat': 
        'http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2',
    'dlib_face_recognition_resnet_model_v1.dat': 
        'http://dlib.net/files/dlib_face_recognition_resnet_model_v1.dat.bz2'
}

for filename, url in models.items():
    download_file(url, filename)
    
    # Extract if it's a .bz2 file
    if filename.endswith('.bz2'):
        import bz2
        extracted_name = filename.replace('.bz2', '')
        if not os.path.exists(extracted_name):
            print(f"Extracting {filename}...")
            with bz2.BZ2File(filename) as fr, open(extracted_name, 'wb') as fw:
                fw.write(fr.read())
            print(f"Extracted to {extracted_name}")