
# Libris - Book Tracking App (Python/KivyMD)

This is a mobile book tracking application built with Python and KivyMD.

## How to Run on Windows (VS Code)

### 1. Prerequisite
Ensure you have **Python 3.10 or 3.11** installed. (Kivy compatibility is best with these versions).

### 2. Set up Virtual Environment
Open your terminal in VS Code:
```bash
python -m venv venv
.\venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the App
```bash
python main.py
```

## Android Deployment (Linux/WSL required)

To build the APK, you need Linux (or WSL on Windows).
1. Install Buildozer: `pip install buildozer`
2. Install dependencies: `sudo apt install -y git zip unzip openjdk-17-jdk python3-pip autoconf libtool pkg-config zlib1g-dev libncurses5-dev libncursesw5-dev libtinfo5 cmake libffi-dev libssl-dev`
3. Connect your Android phone.
4. Run: `buildozer android debug deploy run`
