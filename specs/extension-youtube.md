# YouTube Service (Extension)

> Status: 📋 PLANNED (as extension, post Phase 10)
>
> **Note:** This will be an optional extension (`uni install @uni/service-yt`), not a core service. Requires yt-dlp which not all users want.

## Overview
YouTube service wrapping `yt-dlp` for search, info, downloads, and transcripts. No API key required - just needs yt-dlp installed.

---

## Commands

### `uni yt search <query>`
Search for videos using yt-dlp.

```bash
uni yt search "TypeScript tutorial"
uni yt search "React 19 features" --limit 10
```

Options:
- `--limit, -l` - Number of results (default: 5)

Output:
```
🎬 React 19 Features Explained
   Channel: Fireship  •  12:34  •  2.1M views
   https://youtube.com/watch?v=abc123

🎬 What's New in React 19
   Channel: Theo  •  8:45  •  500K views
   https://youtube.com/watch?v=def456
```

---

### `uni yt info <video>`
Get video details.

```bash
uni yt info abc123
uni yt info "https://youtube.com/watch?v=abc123"
```

Output:
```
🎬 React 19 Features Explained

Channel:     Fireship
Duration:    12:34
Views:       2,100,000
Published:   2024-10-15
Resolution:  1080p

Description:
In this video we explore the new features in React 19...

https://youtube.com/watch?v=abc123
```

---

### `uni yt formats <video>`
List available download formats.

```bash
uni yt formats abc123
```

Output:
```
Video + Audio:
  22   mp4   1280x720   ~50MB
  18   mp4   640x360    ~20MB

Video Only:
  137  mp4   1920x1080  ~100MB
  136  mp4   1280x720   ~40MB

Audio Only:
  140  m4a   128kbps    ~5MB
  251  opus  160kbps    ~6MB
```

---

### `uni yt download <video>`
Download video.

```bash
uni yt download abc123
uni yt download abc123 --format 720p
uni yt download abc123 --output ~/Videos
uni yt download abc123 --name "react-19-features"
uni yt download <playlist-url> --playlist
```

Options:
- `--format, -f` - Quality: best (default), 1080p, 720p, 480p, worst
- `--output, -o` - Output directory (default: current dir)
- `--name` - Custom filename (without extension)
- `--playlist` - Download entire playlist

Output:
```
⬇ Downloading: React 19 Features Explained
  Format: 1080p mp4
  Size: ~95MB

[████████████████░░░░] 80% • 76MB/95MB • 2.1MB/s • ETA 9s

✓ Downloaded: ~/Videos/React 19 Features Explained.mp4
```

---

### `uni yt audio <video>`
Download audio only.

```bash
uni yt audio abc123
uni yt audio abc123 --format mp3
uni yt audio abc123 --format m4a
```

Options:
- `--format` - Audio format: mp3 (default), m4a, opus, wav
- `--output, -o` - Output directory
- `--name` - Custom filename

---

### `uni yt transcript <video>`
Get video transcript/subtitles.

```bash
uni yt transcript abc123
uni yt transcript abc123 --lang es
uni yt transcript abc123 --format srt
```

Options:
- `--lang` - Language code (default: en)
- `--format` - Output format: text (default), srt, json
- `--save` - Save to file instead of stdout

Output (text):
```
[00:00] Hey everyone, welcome back...
[00:05] Today we're going to talk about React 19...
[00:12] The first major feature is...
```

---

### `uni yt subs <video>`
Download subtitle file.

```bash
uni yt subs abc123
uni yt subs abc123 --lang en,es
uni yt subs abc123 --auto  # Include auto-generated
```

Options:
- `--lang` - Language codes (comma-separated)
- `--auto` - Include auto-generated subtitles
- `--output, -o` - Output directory

---

## Implementation

### Backend: yt-dlp CLI
Wrap `yt-dlp` for all operations:

| Command | yt-dlp equivalent |
|---------|------------------|
| search | `yt-dlp "ytsearch5:query" --dump-json` |
| info | `yt-dlp --dump-json <url>` |
| formats | `yt-dlp -F <url>` |
| download | `yt-dlp <url>` |
| audio | `yt-dlp -x --audio-format mp3 <url>` |
| transcript | `youtube-transcript` npm package |
| subs | `yt-dlp --write-subs <url>` |

### Why yt-dlp?
- No API key required
- Handles all YouTube edge cases
- Supports playlists, live streams, etc.
- Active development, always up to date
- Also works with other video sites (bonus!)

### Transcript Extraction
Use `youtube-transcript` npm package for inline text transcripts (easier for piping to LLM). Fall back to yt-dlp `--write-subs` for file downloads.

---

## Requirements

```bash
# Install yt-dlp
brew install yt-dlp      # macOS
pip install yt-dlp       # pip

# Optional: ffmpeg for format conversion
brew install ffmpeg
```

No environment variables needed!

---

## Files to Create

```
packages/service-yt/
├── package.json
├── src/
│   ├── index.ts
│   ├── ytdlp.ts          # yt-dlp wrapper
│   ├── transcript.ts     # Transcript extraction
│   └── commands/
│       ├── search.ts
│       ├── info.ts
│       ├── formats.ts
│       ├── download.ts
│       ├── audio.ts
│       ├── transcript.ts
│       └── subs.ts
```

---

## Dependencies

```json
{
  "dependencies": {
    "youtube-transcript": "^1.0.0"
  }
}
```

System dependencies:
- `yt-dlp` (required)
- `ffmpeg` (optional, for audio conversion)

---

## Use Cases

1. **Download for offline** - Save videos/audio for travel
2. **Research** - Get transcripts for summarization
3. **Podcasts** - Extract audio from video podcasts
4. **Content creation** - Download reference material
5. **Learning** - Save tutorials for offline study
6. **Archival** - Backup important videos

---

## Error Handling

- If yt-dlp not installed → Show install instructions
- If ffmpeg not installed (audio conversion) → Suggest installing
- If video unavailable → Clear error message
- If transcript not available → Fallback to auto-generated or error

---

## Testing Checklist
- [ ] yt-dlp detection and install prompt
- [ ] Search returns results
- [ ] Info shows video metadata
- [ ] Formats lists available options
- [ ] Download works with progress
- [ ] Audio extraction works
- [ ] Transcript extraction works
- [ ] Subtitle download works
- [ ] Playlist download works
- [ ] Handles private/unavailable videos gracefully
