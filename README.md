# 🛡️ TestIntegrity - AI-Powered Online Proctoring Platform

![TestIntegrity Banner](https://user-images.githubusercontent.com/yourusername/banner.png)  

TestIntegrity is a cutting-edge **online examination proctoring system** designed to ensure academic integrity. Leveraging **AI, computer vision, and deepfake detection**, it provides a secure and seamless testing environment with real-time monitoring.

---

## 🚀 Features

### 1. **Real-Time Video Call**
- Fully integrated **video conferencing** for live exams and interviews.
- Supports **multi-participant sessions** with minimal latency.
- Real-time **audio/video streaming** for remote proctoring.

### 2. **AI-Based Cheating Detection**
- Monitors participant behavior during exams.
- Detects:
  - **Deepfake or synthetic faces**
  - **Unusual facial expressions or movements**
  - **Suspicious gaze or eye tracking patterns**
- Alerts proctors if **potential cheating** is detected.

### 3. **Eye Tracking**
- Tracks **eye movement** to detect where the candidate is looking.
- Identifies if the participant is looking at:
  - Off-screen distractions
  - Mobile devices (phones) or other unauthorized materials
- Heatmaps generated for analysis of attention span.

### 4. **Test Analysis**
- Automatically records and analyzes test sessions.
- Metrics include:
  - **Time spent per question**
  - **Focus and attention scores**
  - **Interaction with other participants**
- Generates **comprehensive reports** post-exam.

### 5. **Device & Environment Monitoring**
- Detects visible **mobile phones** or other electronic devices.
- Monitors **screen changes** and tab activity.
- Uses **computer vision** to ensure the participant remains compliant.

### 6. **Secure Architecture**
- **End-to-end encrypted video and audio**.
- Cloud or self-hosted **server deployment**.
- Supports **scalable real-time communication** using LiveKit or WebRTC.

### 7. **Recording & Playback**
- Full **session recording** for auditing purposes.
- Exportable **video + analysis logs** for examiners.
- Supports **automatic archiving** of suspicious activity clips.

---

## 🖥️ Technology Stack

| Component                     | Technology / Library                     |
|-------------------------------|-----------------------------------------|
| Frontend                       | React.js, Next.js                        |
| Backend                        | Python, NestJS                           |
| Real-Time Communication         | LiveKit, WebRTC                           |
| Video & Eye Tracking            | OpenCV, Mediapipe                        |
| AI Detection                    | TensorFlow, PyTorch, Deepfake detection |
| Database                        | PostgreSQL / MongoDB                      |
| Deployment                      | Docker, Docker Compose                    |

---

## 🧩 How It Works

1. **Candidate joins exam** through secure web interface.
2. **Video and audio streaming** starts via LiveKit server.
3. **AI modules** monitor participant:
   - Eye tracking
   - Deepfake detection
   - Suspicious behavior alerts
4. **Cheating events** trigger real-time notifications.
5. **Test analytics** and recordings are stored securely for evaluation.


