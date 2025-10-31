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

## 📋 Prerequisites

Before running TestIntegrity, ensure you have the following installed:

- **Docker Desktop** (latest version)
- **Docker Compose** (included with Docker Desktop)
- **Git** (for cloning the repository)
- **Node.js** (v18 or higher) - for frontend development
- **npm** or **yarn** - package manager

---

## 🚀 Quick Start Guide

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/TestIntegrityApp.git
cd TestIntegrityApp
```

### 2. Start All Services with Docker

```bash
# Start all backend services (LiveKit, Redis, PostgreSQL, Backend API)
docker-compose -f fix-video-call.yml up -d

# Wait for all services to be ready (about 30-60 seconds)
docker ps
```

### 3. Start the Frontend

```bash
# Navigate to frontend directory
cd appfrontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **LiveKit Server**: http://localhost:7880
- **PostgreSQL**: localhost:5433 (admin/admin123)

---

## 🐳 Docker Services Overview

The application runs the following Docker containers:

| Service | Container Name | Port | Description |
|---------|---------------|------|-------------|
| **LiveKit Server** | `livekit-server` | 7880, 7881, 50000-50010/udp | Real-time video/audio server |
| **Redis** | `livekit-redis` | 6379 | LiveKit session storage |
| **PostgreSQL** | `test-integrity-postgres` | 5433 | Main database |
| **Backend API** | `test-integrity-backend` | 4000 | NestJS REST API |
| **TURN Server** | `coturn-server` | 3478/udp, 5349 | NAT traversal (optional) |

---

## 🔧 Configuration

### Environment Variables

The backend uses the following environment variables (configured in `backend/backend/.env.docker`):

```env
# LiveKit Configuration
LIVEKIT_API_KEY=avinashashokshettyandchatgptpartnership
LIVEKIT_API_SECRET=avinashashokshettyandchatgptpartnership
LIVEKIT_SERVER_URL=ws://livekit-server:7880
LIVEKIT_CLIENT_URL=ws://localhost:7880

# Database Configuration
DATABASE_HOST=test-integrity-postgres
DATABASE_PORT=5432
DATABASE_USERNAME=admin
DATABASE_PASSWORD=admin123
DATABASE_NAME=TestIntegrityDb

# Authentication
JWT_SECRET=JWT_SECRET
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### LiveKit Configuration

LiveKit server configuration is in `livekit-fixed.yaml`:

```yaml
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50010
  use_external_ip: true
  
redis:
  address: livekit-redis:6379
  
keys:
  avinashashokshettyandchatgptpartnership: avinashashokshettyandchatgptpartnership
```

---

## 🎯 Usage Instructions

### For Tutors (Proctors)

1. **Sign Up/Login**: Create an account or login at http://localhost:3000
2. **Create Meeting**: Go to Tutor Dashboard → Create Meeting
3. **Start Meeting**: Click "Start Meeting" to begin the session
4. **Share Join Link**: Copy and share the join link with students
5. **Monitor Participants**: View all participants and their video feeds
6. **End Meeting**: Click "End Meeting" when done

### For Students

1. **Join Meeting**: Use the join link provided by the tutor
2. **Allow Permissions**: Grant camera and microphone access
3. **Enter Meeting**: Your video will be visible to the proctor
4. **Take Exam**: Follow proctor instructions during the exam

---

## 🛠️ Development Setup

### Backend Development

```bash
# Navigate to backend directory
cd backend/backend

# Install dependencies
npm install

# Start in development mode (requires Docker services running)
npm run start:dev
```

### Frontend Development

```bash
# Navigate to frontend directory
cd appfrontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. **Connection Failed to LiveKit Server**
```bash
# Check if LiveKit container is running
docker ps | grep livekit-server

# Check LiveKit logs
docker logs livekit-server

# Restart LiveKit service
docker restart livekit-server
```

#### 2. **Database Connection Error**
```bash
# Check PostgreSQL container
docker ps | grep postgres

# Check database logs
docker logs test-integrity-postgres

# Reset database
docker-compose -f fix-video-call.yml down
docker-compose -f fix-video-call.yml up -d
```

#### 3. **Video Not Showing Between Participants**
- Ensure both participants are in the same room
- Check browser console for WebRTC errors
- Verify firewall settings allow UDP traffic on ports 50000-50010
- Try using different browsers or incognito mode

#### 4. **Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :7880

# Kill the process or change port in docker-compose.yml
```

### Debug Commands

```bash
# View all container logs
docker-compose -f fix-video-call.yml logs

# View specific service logs
docker logs livekit-server --tail 50 -f

# Check container status
docker ps -a

# Restart all services
docker-compose -f fix-video-call.yml restart

# Clean restart (removes all data)
docker-compose -f fix-video-call.yml down -v
docker-compose -f fix-video-call.yml up -d
```

---

## 📁 Project Structure

```
TestIntegrityApp/
├── appfrontend/                 # Next.js React frontend
│   ├── app/                     # Next.js app router pages
│   ├── components/              # React components
│   │   └── VideoCall.tsx        # Main video call component
│   ├── lib/                     # Utility libraries
│   └── package.json
├── backend/                     # NestJS backend
│   └── backend/
│       ├── src/
│       │   ├── auth/            # Authentication module
│       │   ├── meetings/        # Meeting management
│       │   ├── livekit/         # LiveKit integration
│       │   └── user/            # User management
│       └── package.json
├── callserver_deepfakePy/       # Python AI services
│   ├── python_deepfake/         # Deepfake detection
│   └── livekit-services/        # LiveKit Python services
├── fix-video-call.yml           # Main Docker Compose file
├── livekit-fixed.yaml           # LiveKit server configuration
└── README.md                    # This file
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

If you encounter any issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Search existing [GitHub Issues](https://github.com/yourusername/TestIntegrityApp/issues)
3. Create a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Docker logs (`docker-compose logs`)
   - Browser console errors

---

## 🔮 Roadmap

- [ ] AI-powered cheating detection
- [ ] Eye tracking implementation
- [ ] Mobile device detection
- [ ] Session recording and playback
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Cloud deployment guides

---

**Built with ❤️ for secure online education**