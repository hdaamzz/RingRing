<div align="center">

# 📞 Ring Ring

### *Crystal-Clear Connections, Anywhere, Anytime*

<img src="https://img.shields.io/badge/Angular-19%2B-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular">
<img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
<img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
<img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">

**A modern, secure, and feature-rich video calling platform built with the MEAN stack**

[Features](#-features) • [Quick Start](#-quick-start) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 🌟 Features

### 🔐 Authentication & Security
- **Google OAuth Integration** - Seamless sign-in with Firebase Authentication
- **JWT Token Management** - Secure authentication with HttpOnly cookies
- **Session Persistence** - Stay logged in across browser sessions
- **Protected Routes** - Auth guards for secure access control

### 🎥 Video Calling *(Coming Soon)*
- **1-on-1 & Group Calls** - Connect with friends, family, or teams
- **HD Video Quality** - Crystal-clear 4K video streaming
- **Screen Sharing** - Share presentations, documents, or your entire screen
- **Real-time Chat** - Text messaging during calls

### 🎨 User Interface
- **Modern Design** - Sleek, professional UI with Tailwind CSS
- **Glass Morphism** - Beautiful frosted-glass effects
- **Responsive Layout** - Perfect on desktop, tablet, and mobile
- **Dark Theme** - Easy on the eyes for long calls

### ⚡ Performance
- **Signal-Based Reactivity** - Lightning-fast state management with Angular Signals
- **Lazy Loading** - Optimized bundle size for faster load times
- **WebRTC Technology** - Peer-to-peer connections for low latency

---

## 🚀 Quick Start

### Prerequisites
node >= 18.x
npm >= 9.x
MongoDB >= 6.x
Angular CLI >= 19.x

### Installation

1. **Clone the repository**
git clone https://github.com/hdaamzz/RingRing.git
cd RingRing

2. **Install dependencies**

**Frontend (Angular):**
cd client
npm install

**Backend (Node.js):**
cd server
npm install

3. **Environment Configuration**

**Client (`client/src/app/core/config/firebase.config.ts`):**
export const firebaseConfig = {
apiKey: "YOUR_FIREBASE_API_KEY",
authDomain: "YOUR_AUTH_DOMAIN",
projectId: "YOUR_PROJECT_ID",
storageBucket: "YOUR_STORAGE_BUCKET",
messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
appId: "YOUR_APP_ID"
};

**Server (`server/.env`):**
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ringring
JWT_SECRET=your_super_secret_jwt_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
NODE_ENV=development

4. **Run the application**

**Start MongoDB:**
mongod
**Start Backend (Terminal 1):**
cd server
npm run dev
**Start Frontend (Terminal 2):**
cd client
npm start

5. **Open your browser**
http://localhost:4200

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Angular 19** | Modern web framework with Signals |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS** | Utility-first CSS framework |
| **Firebase Auth** | Google OAuth authentication |
| **RxJS** | Reactive programming |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express** | Web application framework |
| **TypeScript** | Type-safe development |
| **MongoDB** | NoSQL database |
| **Mongoose** | MongoDB object modeling |
| **JWT** | Token-based authentication |
| **TSyringe** | Dependency injection |

### DevOps & Tools
- **Git** - Version control
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Proxy Config** - Development API routing


### Design Patterns
- **Repository Pattern** - Clean separation of data access
- **Dependency Injection** - Loose coupling and testability
- **Service Layer** - Business logic abstraction
- **Guard Pattern** - Route protection
- **Interceptor Pattern** - HTTP request/response manipulation

---

## 🔒 Security Features

✅ **HttpOnly Cookies** - Prevents XSS attacks  
✅ **JWT with Expiration** - 1-hour token lifetime  
✅ **CORS Configuration** - Controlled cross-origin requests  
✅ **Environment Variables** - Sensitive data protection  
✅ **Firebase Admin SDK** - Secure token verification  
✅ **Password-less Auth** - OAuth 2.0 security

---

## 📸 Screenshots

### Landing Page
*Coming Soon*

### Video Call Interface
*Coming Soon*

### User Dashboard
*Coming Soon*

---

## 🗺 Roadmap

### Phase 1: Authentication ✅
- [x] Google OAuth integration
- [x] JWT token management
- [x] User profile display
- [x] Session persistence

### Phase 2: Core Features 🚧
- [ ] WebRTC video/audio calling
- [ ] Room creation and management
- [ ] Screen sharing
- [ ] Call controls (mute/unmute, camera on/off)

### Phase 3: Enhanced Features 📋
- [ ] Group video calls (3+ participants)
- [ ] In-call text chat
- [ ] Call recording
- [ ] Virtual backgrounds
- [ ] Reactions and emojis

### Phase 4: Advanced Features 🔮
- [ ] Call scheduling
- [ ] Calendar integration
- [ ] Call history & analytics
- [ ] AI noise cancellation
- [ ] End-to-end encryption

---

## 👨‍💻 Author

**Hamzathul Dilshad** ([@hdaamzz](https://github.com/hdaamzz))

- LinkedIn: [click here](https://linkedin.com/in/dilshhh)

<div align="center">

### ⭐ Star this repo if you find it helpful!

Made with ❤️ and ☕ by hamzathuldilshad 

</div>












