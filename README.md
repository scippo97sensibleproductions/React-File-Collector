# 📄 File Collector

[![Build Status](https://github.com/scippo97sensibleproductions/FileCollectorReact/actions/workflows/build-windows.yml/badge.svg)](https://github.com/scippo97sensibleproductions/FileCollectorReact/actions/workflows/build-windows.yml)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A powerful desktop utility to streamline collecting, composing, and formatting file contents for Large Language Model (LLM) prompts.

File Collector is built to solve a common bottleneck in prompt engineering: manually copying and pasting code and text from multiple files. This utility provides a high-performance, native experience to let you focus on crafting the perfect prompt instead of juggling files.

![File Collector Screenshot](<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/31668d2f-c5d9-4280-b59f-6ae32c708d52" />)

---

### 🌟 Highlights

-   **🗂️ Effortless File Selection:** Navigate your project with a fast, virtualized file tree and powerful full-text search.
-   **⚙️ Smart Filtering:** Automatically honors a global, user-defined list of `.gitignore` patterns to hide irrelevant files.
-   **💾 Context Persistence:** Save and load entire sets of selected files as a "context," perfect for switching between projects or tasks.
-   **🤖 Reusable System Prompts:** Create, manage, and instantly prepend saved system prompts to your output.
-   **📊 Real-time Token Estimation:** Instantly see the estimated token count for your entire composition as you add files and write your prompt.
-   **📋 One-Click Copy:** A single click formats and copies the system prompt, all file contents, and your user prompt to the clipboard, ready for any LLM.

### 🚀 Usage

Using File Collector is a simple, three-step process:

1.  **Select a Folder:** Open your project directory. The file tree will populate, automatically filtering out ignored files.
2.  **Choose Your Files:** Use the file tree or the search panel to select the files you want to include in your context.
3.  **Compose & Copy:** Select an optional system prompt, write your user prompt, and click "Copy All". The perfectly formatted prompt is now on your clipboard.

### ⬇️ Installation

You can download the latest version for your operating system from the **[GitHub Releases](https://github.com/scippo97sensibleproductions/FileCollectorReact/releases)** page.

-   **Windows:** Download the `.msi` installer.
-   **macOS:** Download the `.dmg` disk image.
-   **Linux:** Download the `.deb` or `.AppImage` file.

### 🛠️ Development Setup

Interested in contributing? Great! Follow these steps to get a local development environment running.

#### Prerequisites

Ensure you have the necessary prerequisites for Tauri v2 development installed. Follow the official **[Tauri setup guide](https://v2.tauri.app/start/prerequisites/)** for your operating system. This includes:

-   Rust and Cargo
-   Node.js and npm
-   Platform-specific build tools (e.g., Visual Studio C++ Build Tools on Windows, Xcode Command Line Tools on macOS).

#### Running the App

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/scippo97sensibleproductions/file-collector.git
    cd file-collector
    ```

2.  **Install frontend dependencies:**
    ```sh
    npm install
    ```

3.  **Run in development mode:**
    This starts the Vite dev server and launches the Tauri app. Hot-reloading is enabled for both the frontend and Rust backend.
    ```sh
    npm run tauri dev
    ```

#### Building for Production

To create a native executable for your platform, run the build command:

```sh
npm run tauri build
```

The installers and executables will be located in `src-tauri/target/release/bundle/`.

### 💭 Feedback & Contributing

This project is open source and contributions are welcome!

-   **Found a bug?** Please [open an issue](https://github.com/scippo97sensibleproductions/FileCollectorReact/issues/new).
-   **Have a feature idea?** We'd love to hear it! Feel free to [start a discussion](https://github.com/scippo97sensibleproductions/FileCollectorReact/discussions).
-   **Want to contribute code?** Please fork the repository and submit a pull request.

### 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
