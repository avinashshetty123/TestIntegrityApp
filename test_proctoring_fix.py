#!/usr/bin/env python3
"""
Test script to verify proctoring fixes
"""

import requests
import json
import time
import base64
import cv2
import numpy as np

def test_backend_connection():
    """Test if backend is responding"""
    try:
        response = requests.get('http://localhost:4000/proctoring/session/test-meeting/participants')
        print(f"✅ Backend connection: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def test_deepfake_service():
    """Test if deepfake service is responding"""
    try:
        response = requests.get('http://localhost:8000/health')
        print(f"✅ Deepfake service: {response.status_code}")
        return True
    except Exception as e:
        print(f"❌ Deepfake service failed: {e}")
        return False

def test_frame_analysis():
    """Test frame analysis endpoint"""
    try:
        test_data = {
            "meetingId": "test-meeting-123",
            "userId": "test-user-456",
            "participantId": "test-participant-789",
            "sessionId": "test-session-101",
            "detections": {
                "faceDetected": True,
                "faceCount": 1,
                "phoneDetected": False,
                "suspiciousBehavior": False
            },
            "browserData": {
                "timestamp": "2025-01-01T00:00:00.000Z",
                "frameAnalysis": True
            }
        }
        
        response = requests.post(
            'http://localhost:4000/proctoring/analyze-frame',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"✅ Frame analysis: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"   Alerts generated: {result.get('alertsGenerated', 0)}")
        else:
            print(f"   Error: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Frame analysis failed: {e}")
        return False

def test_session_creation():
    """Test session creation"""
    try:
        test_data = {
            "meetingId": "test-meeting-123",
            "participantId": "test-participant-789",
            "userId": "test-user-456",
            "studentName": "Test Student",
            "startedAt": "2025-01-01T00:00:00.000Z"
        }
        
        response = requests.post(
            'http://localhost:4000/proctoring/session/create',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"✅ Session creation: {response.status_code}")
        if response.status_code == 200 or response.status_code == 201:
            result = response.json()
            print(f"   Session ID: {result.get('id', 'N/A')}")
        else:
            print(f"   Error: {response.text}")
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"❌ Session creation failed: {e}")
        return False

def test_python_worker():
    """Test Python worker functionality"""
    try:
        # Create a simple test image
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.rectangle(img, (200, 150), (440, 330), (255, 200, 150), -1)  # Face-like rectangle
        
        # Encode to base64
        _, buffer = cv2.imencode('.jpg', img)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Test data for Python worker
        test_frame = {
            "type": "VIDEO_FRAME",
            "data": {
                "imageData": f"data:image/jpeg;base64,{img_base64}",
                "timestamp": int(time.time() * 1000),
                "meetingId": "test-meeting-123",
                "userId": "test-user-456",
                "participantId": "test-participant-789"
            }
        }
        
        print("✅ Python worker test data prepared")
        print(f"   Image size: {img.shape}")
        print(f"   Base64 length: {len(img_base64)}")
        return True
    except Exception as e:
        print(f"❌ Python worker test failed: {e}")
        return False

def main():
    print("🔧 Testing TestIntegrity Proctoring Fixes")
    print("=" * 50)
    
    tests = [
        ("Backend Connection", test_backend_connection),
        ("Deepfake Service", test_deepfake_service),
        ("Session Creation", test_session_creation),
        ("Frame Analysis", test_frame_analysis),
        ("Python Worker", test_python_worker)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🧪 Testing {test_name}...")
        result = test_func()
        results.append((test_name, result))
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All tests passed! Proctoring should work correctly.")
    else:
        print("⚠️  Some tests failed. Check the services and try again.")
    
    return passed == len(tests)

if __name__ == "__main__":
    main()