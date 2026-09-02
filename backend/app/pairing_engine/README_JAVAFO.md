# JaVaFo Pairing Engine Integration Guide

This module integrates the official FIDE-certified pairing engine (**JaVaFo**) for generating Dutch Swiss pairings.

---

## Architecture Context

- **Engine File**: `javafo.jar` is a compiled Java archive that executes calculations.
- **IPC Protocol**: Communicates via standard FIDE Tournament Report Files (TRF/TRFx).
- **Subprocess Execution**: Executed as a subprocess via the shell: `java -jar javafo.jar ...`.

---

## Requirements

To run Swiss pairings, the hosting environment must have a **Java Runtime Environment (JRE)** installed.

### 1. Local JRE Installation

Ensure `java` is in your environment `PATH`.

#### Windows
1. Download OpenJDK from [Adoptium](https://adoptium.net/) or Oracle.
2. Run the installer and check the option to **"Add to PATH"** and **"Set JAVA_HOME"**.
3. Re-open your terminal and verify:
   ```cmd
   java -version
   ```

#### macOS (Homebrew)
```bash
brew install openjdk
```

#### Ubuntu / Debian Linux
```bash
sudo apt-get update
sudo apt-get install default-jre
```

---

## 2. Docker / Deployment Setup

To include JRE support in your production Docker deployment, update your backend's `Dockerfile` to install a Java Runtime.

For **Debian/Ubuntu-based python images**:
```dockerfile
# Install system dependencies (Java JRE)
RUN apt-get update && \
    apt-get install -y --no-install-recommends default-jre && \
    rm -rf /var/lib/apt/lists/*
```

For **Alpine-based python images**:
```dockerfile
# Install openjdk JRE
RUN apk update && apk add openjdk11-jre-headless
```

---

## 3. Configuration & Paths

By default, the pairing engine expects to locate the `javafo.jar` file in the same directory as the module:
`backend/app/pairing_engine/javafo.jar`

If you place it elsewhere, specify the path by setting the environment variable:
```bash
JAVAFO_JAR_PATH=/absolute/path/to/javafo.jar
```
