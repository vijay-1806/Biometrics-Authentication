# Live Demonstration Script (10-15 Minutes)

## Step-by-Step Demonstration Sequence

1. **Teacher Login & Course Setup**:
   - Log in as Teacher (`teacher@lms.edu`).
   - Navigate to **Teacher Dashboard**.
   - Select active course or click **Create New Course**.

2. **Assessment & Session PIN Generation**:
   - Click **Create Coding Assessment**. Enter Title, Description, Starter Code, Sample Input/Output.
   - Click **Live Sessions** -> **Generate Session PIN**.
   - Display 6-digit Session PIN (e.g., `849201`) and initial `WAITING` session state.

3. **Student Join & Waiting Lobby**:
   - In a separate browser tab, log in as Student (`student@lms.edu`).
   - Click **Join Assessment with PIN**. Enter PIN `849201`.
   - Display **Student Waiting Lobby** screen ("Waiting for teacher to start session...").

4. **Session Activation & Telemetry Start**:
   - On Teacher Proctor Dashboard, click **Start Assessment Session**.
   - Student tab automatically transitions to **Active Monaco Coding Interface**.
   - Point out top security indicator: `"Proctored Assessment Active | Keystroke Biometrics Online"`.

5. **Live Monitoring & Behavioral Scoring**:
   - Student types solution in Monaco Editor.
   - Every 5 seconds, telemetry window is scored.
   - Teacher Live Proctor Dashboard updates candidate row in real time:
     - **Trust Score**: `84%`
     - **Risk Level**: `LOW`
     - **Connection**: `Online`

6. **Security Event Detection (Tab Switch & Paste)**:
   - Student switches browser tab or pastes external code block.
   - Point out immediate counter updates on Proctor Dashboard:
     - **Tab Switches**: `1`
     - **Paste Events**: `1`

7. **Candidate Report Inspection**:
   - On Proctor Dashboard, click **View Detailed Report** for the student.
   - Display **BehaviorReportModal**:
     - **Verdict**: `AUTHENTICATED` / `REQUIRES REVIEW`
     - **Trust Score Trajectory**: Visual score bar history.
     - **Risk Timeline**: Chronological event escalation.

8. **Submission & Session Locking**:
   - Student clicks **Submit Assignment**.
   - Teacher clicks **End Proctoring Session**.
   - Student Monaco Editor becomes read-only and interaction locks.
