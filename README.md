# **THE GLITCH: A SOCIAL DEDUCTION GAME FOR DEVELOPERS** 👾

**THE GLITCH** is a **REAL-TIME, MULTIPLAYER** social deduction game inspired by "Mafia" and "Among Us," but rebuilt from the ground up for a **TECHNICAL AUDIENCE**. Originally developed for a high-stakes **COLLEGE CLUB COMPETITION**, it forces players to choose between fixing broken systems or becoming the very bug that destroys them.

---

### **🎮 THE CORE CONCEPT**

In a world of clean code, one player is **THE GLITCH** (Imposter) while the rest are **ARCHITECTS** (Civilians).

* **ARCHITECTS:** Must complete **TECHNICAL MISSIONS** by fixing broken code snippets or proposing sound architectural solutions.
* **THE GLITCH:** Must blend in by providing **"PLAUSIBLE BUT FLAWED"** solutions to sabotage the system without being caught.
* **THE MEETING:** If suspicion arises, any player can trigger an **EMERGENCY MEETING** to debate and vote out the suspected imposter via a **REAL-TIME CHAT** interface.
---

### **🏗️ SYSTEM ARCHITECTURE**

The application is designed as a **HIGH-PERFORMANCE MONOLITH** capable of handling **100+ CONCURRENT STUDENTS**.

* **CENTRALIZED CLOUD:** Hosted on a **GOOGLE CLOUD COMPUTE ENGINE** instance.
* **EXECUTION SANDBOX:** Utilizes a self-hosted **JUDGE0** environment to safely run untrusted code.
* **FRONTEND DEPLOYMENT:** Hosted on **VERCEL** for lightning-fast UI delivery.
* **COMMUNICATION:** Uses **SECURED WEBSOCKETS (WSS)** for zero-latency game state synchronization.
<p align="center">
  <img src="image.png" alt="The Glitch Architecture" width="800">
</p>

---

### **🛠️ THE TECHNICAL STACK**

| **LAYER** | **TECHNOLOGIES USED** |
| --- | --- |
| **FRONTEND** | **REACT.js**, **TYPESCRIPT**, **TAILWIND CSS** (Vintage 8-bit Mario aesthetic) |
| **BACKEND** | **NODE.js**, **EXPRESS.js**, **SOCKET.io** (Bi-directional communication) |
| **EXECUTION** | **DOCKERIZED JUDGE0** (Secure code execution) |
| **DATABASE** | **POSTGRESQL** (Persistent stats) & **REDIS** (Volatile game state) |

---

### **✨ KEY FEATURES**

* **⚡ REAL-TIME INTERACTION:** Synchronized game states and live chat across all connected clients.
* **🛡️ SANDBOXED EXECUTION:** Securely evaluates user-submitted Python code against predefined test cases.
* **🍄 RETRO DESIGN:** Custom 8-bit UI components, pixelated fonts, and a Mario-inspired color palette.
* **🚫 PROFANITY FILTER:** Integrated monitoring to ensure clean nicknames and chat environments.
* **📂 DUAL GAMEPLAY MODES:** Choose your path—**SOURCE** (Write actual code) or **README** (Write high-level pointers).

---

### **🚀 GETTING STARTED**

This project was engineered to manage multiple concurrent game rooms during a live 100-student competition.

**CONTRIBUTE OR CLONE:**
You can access the full backend infrastructure and logic here:
👉 **[GitHub: The Glitch - Backend Engine](https://github.com/sahiverse/THE_GLITCH.git)**

