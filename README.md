# **THE GLITCH** 👾

A **real-time multiplayer** social deduction game where developers write code together while one player secretly sabotages the solution. Built with **Socket.io**, **Redis**, and **Judge0** for live collaboration and secure code execution.

---

## **What It Does**

- **3-5 players** join a room and collaborate on a coding challenge
- **1 Imposter** sees secret "sabotage" test cases and tries to make the code fail them
- **2-4 Civilians** see real test cases and try to write correct code
- **Real-time code editor** with live cursors showing where everyone is typing
- **Emergency meetings** with chat to vote out suspected imposters
- **Automated code execution** via Judge0 to determine who wins

---

## **System Architecture**

<img width="1238" height="799" alt="TheGlitch_final ARCH" src="https://github.com/user-attachments/assets/64d0c7f6-dad8-4f3b-887a-27fa172f2f03" />

---

## **Tech Stack**

### **Frontend Layer**
| Technology | Purpose |
|------------|---------|
| **React 18** | Component-based UI with hooks for state management |
| **TypeScript** | Type-safe development with strict typing |
| **Vite** | Fast development server and optimized production builds |
| **TailwindCSS** | Utility-first styling with custom retro Mario-themed palette |
| **Monaco Editor** | VS Code's editor engine for professional code editing experience |
| **Socket.io-client** | Real-time bidirectional communication with automatic reconnection |

### **Backend Layer**
| Technology | Purpose |
|------------|---------|
| **Node.js** | Event-driven runtime for handling concurrent connections |
| **Express.js** | REST API framework for room management endpoints |
| **Socket.io** | WebSocket abstraction for real-time game events |
| **Redis** | In-memory data store for game state with persistence |
| **Judge0 API** | Sandboxed code execution environment for multiple languages |

### **DevOps & Infrastructure**
| Technology | Purpose |
|------------|---------|
| **Vercel** | Frontend CI/CD with automatic deployments |
| **Redis Cloud** | Managed Redis instance with high availability |
| **Docker** | Containerization for Judge0 code execution environment |
| **Environment Variables** | Secure configuration management for API keys and URLs |

---

## **⚡ Key Technical Features**

### **1. Real-Time Collaborative Editing**
- **Cursor Synchronization:** Live cursor positions with username tags and blinking animations
- **Code Sync:** 50ms debounced updates broadcast to all room participants
- **Selection Tracking:** Remote text selections visible to all players
- **Conflict Resolution:** Last-write-wins strategy with operational transformation

### **2. Sandboxed Code Execution**
- **Multi-Language Support:** Python, JavaScript, Java, C++, C#
- **Secure Isolation:** Judge0 containers prevent malicious code execution
- **Test Case Validation:** Real-time comparison against expected outputs
- **Resource Limits:** CPU time and memory constraints per execution

### **3. Game State Management**
- **Redis Persistence:** Game state survives server restarts
- **TTL Management:** Automatic cleanup of abandoned rooms after 2 hours
- **Atomic Operations:** Concurrent player actions handled safely
- **Disconnection Recovery:** Players can reconnect and resume games

### **4. Security Architecture**
- **Role-Based Data Segregation:** Imposters receive sabotage test cases, civilians receive real test cases
- **Input Validation:** Strict sanitization on all user inputs (nicknames, messages, room codes)
- **Socket Room Isolation:** Players only receive events from their assigned room
- **CORS Protection:** Configured for specific allowed origins

---

## **🎨 Design System**

### **Retro 8-Bit Aesthetic**
- **Color Palette:** Mario-inspired (#5c94fc sky blue, #ff0000 retro red, #ffff00 coin gold)
- **Typography:** "Press Start 2P" and "VT323" pixel fonts
- **Animations:** CSS keyframe animations for cursor blink and floating assets
- **Visual Effects:** Quincunx-pattern floating coins, hearts, diamonds, and bombs with parallax mouse tracking

### **UI Components**
- **CollaborativeEditor:** Monaco-based editor with remote cursor rendering
- **ChatPanel:** Real-time messaging with player colors and timestamps
- **FloatingAssets:** Background animation system using CSS transforms
- **MeetingOverlay:** Full-screen emergency meeting interface

---

## **🚀 Performance Optimizations**

| Optimization | Implementation |
|--------------|----------------|
| **Debouncing** | 50ms delay on code updates to reduce network traffic |
| **Selective Broadcasting** | Events only sent to relevant room participants |
| **Redis Pipelining** | Batched operations for state persistence |
| **Lazy Loading** | Editor components loaded on demand |
| **Asset Optimization** | Compressed images and GIFs for fast loading |

---

## **📊 System Capabilities**

- **Concurrent Rooms:** 50+ simultaneous game sessions
- **Players Per Room:** 3-5 players with real-time synchronization
- **Latency:** <100ms for cursor sync and chat messages
- **Code Execution:** Sub-second response for test case validation
- **Uptime:** Redis persistence ensures game continuity

---

## **🧪 Testing & Quality**

- **Socket Event Testing:** Verified real-time communication flows
- **Game Logic Testing:** Validated win conditions and role assignments
- **Integration Testing:** End-to-end room creation to game completion
- **Security Testing:** Input validation and role-based data access

---

## **🚦 Getting Started**

### **Prerequisites**
```bash
Node.js >= 18.x
Redis Cloud instance or local Redis server
Judge0 instance for code execution
```

### **Installation**
```bash
# Clone repository
git clone https://github.com/sahiverse/THE-GLITCH.git
cd THE-GLITCH

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Redis URL and Judge0 URL
```

### **Running Locally**
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
npm run dev
```
---

## **👨‍💻 Developer Notes**

### **Socket Event Architecture**
```
Client → Server:  join_room, code_update, cursor_update, send_message
Server → Client: room_joined, code_synced, cursor_synced, new_message, game_over
```

### **Redis Key Structure**
```
room:{code} → Room state (JSON)
player:{socketId} → Room code mapping
```

### **Win Detection Logic**
```javascript
if (allSabotageTestCasesPass) {
  winner = 'imposter';  // Code was sabotaged successfully
} else if (allRealTestCasesPass) {
  winner = 'civilians';  // Code is correct
}
```

---

## **🏆 Achievement Highlights**

- ✅ **Real-time synchronization** across 5 concurrent players per room
- ✅ **Secure code execution** via containerized Judge0 environment
- ✅ **Zero-latency chat** with message validation and error handling
- ✅ **Persistent game state** with Redis cloud infrastructure
- ✅ **Retro UI design** with custom animations and visual effects
- ✅ **Role-based security** ensuring imposters never see real test cases

---

## **📄 License**

MIT License - Built for educational and competitive gaming purposes.

---

