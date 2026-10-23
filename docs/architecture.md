# LMS Technical Architecture

```
                    STUDENT
                       |
                       v
                React LMS Client
                       |
             Behaviour Tracking
                       |
                       v
              Node/Express API
                 /          \
                /            \
          MongoDB         FastAPI ML
                              |
                       Isolation Forest
                              |
                              v
                        Trust Score
                              |
                              v
                    Risk / Decision Engine
                              |
                              v
                     Teacher Proctor UI
```

## System Components
1. **Frontend**: Vite 5 + React 18 + Monaco Editor + TailwindCSS.
2. **Backend**: Express + Socket.IO + Mongoose (Node.js).
3. **ML Microservice**: FastAPI + scikit-learn (Isolation Forest) + NumPy / Pandas.
4. **Session Isolation**: Primary partitioning by `assessmentSessionId`.
5. **Real-time Channel**: `assessment-session:<assessmentSessionId>` Socket.IO room.
