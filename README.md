# Track Trimmer Pro

A desktop application for batch processing audio files with trim and fade out functionality.

## Features

- 🎵 Batch process multiple audio files from a directory
- ✂️ Trim audio files (set start and end times)
- 🔊 Apply fade out effect
- 📁 Easy folder selection
- 📊 Real-time progress tracking
- 🎨 Modern, user-friendly interface

## Supported Audio Formats

- MP3
- WAV
- FLAC
- M4A
- AAC
- OGG
- WMA
- MP4

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm (comes with Node.js)

### Setup Steps

1. Install dependencies:
```bash
npm install
```

2. Run the application:
```bash
npm start
```

## Usage

1. **Select Input Folder**: Click "Browse" to select the folder containing your audio files
2. **Select Output Folder**: Click "Browse" to select where processed files should be saved
3. **Configure Settings**:
   - **Start Time**: When to start trimming (leave empty to start from beginning)
   - **End Time**: When to stop trimming (leave empty to process to end)
   - **Fade Out Duration**: How long the fade out should last (in seconds)
4. **Process**: Click "Process Audio Files" to start batch processing

Processed files will be saved with "_processed" added to the filename (e.g., `song.mp3` → `song_processed.mp3`).

## Development

To run in development mode with DevTools:
```bash
npm run dev
```

## Building for Distribution

To build a distributable version:
```bash
npm run build
```

This will create platform-specific installers in the `dist` folder.

## Technical Details

- **Framework**: Electron
- **Audio Processing**: FFmpeg (via fluent-ffmpeg)
- **UI**: Vanilla HTML/CSS/JavaScript

## License

MIT





