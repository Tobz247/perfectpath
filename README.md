# PerfectPath

A phone app that helps singers find which voice part to sing in any song, and in what key.

The full plan lives in the [PerfectPath build plan](https://claude.ai/code/artifact/6d436565-6dc4-4e3a-b685-364c97871266).

## What's here

| Folder | What it is |
| --- | --- |
| `app/` | React Native (Expo) phone app. A welcome screen, a guided three-step range test, a "your voice" result, a home screen with recent songs, and a "find your part" screen that uploads a song or a choir score and ranks each vocal line by how well it fits you, with a key change suggestion. Screens live in `app/src/app/` (Expo Router). |
| `server/` | Python (FastAPI) analysis API. `POST /analyze` takes an uploaded song, separates the vocals with Demucs, tracks pitch with pYIN and returns the vocal line's range and tessitura. `POST /analyze-score` reads a MusicXML choir score with music21 and returns each part's range. |

## Running the app

The range test uses the microphone through `react-native-audio-api`, which is a native module, so it needs a development build rather than Expo Go.

```bash
cd app
npm install
npm test           # pitch detection, range tracking and part matching
npm run typecheck
EXPO_PUBLIC_API_URL=http://<your-computer's-LAN-IP>:8000 npx expo run:ios   # or run:android
```

`EXPO_PUBLIC_API_URL` points the app at the analysis server. On a real phone, `localhost` is the phone itself, so use your computer's network address and start the server with `--host 0.0.0.0`.

## Running the server

```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pip install --no-deps basic-pitch==0.4.0   # its numpy<1.24 pin no longer builds
pytest
uvicorn perfectpath_server.app:app --reload --host 0.0.0.0
```

`/analyze` separates the loudest 90 seconds of the song with Demucs, splits the lead singer from the backing singers with a karaoke model, and reads the backing harmonies with Basic Pitch, so a song comes back as a lead line plus up to three backing lines (high, middle, low), each with sol-fa. The first real call downloads the Demucs and karaoke models. The karaoke step needs FFmpeg on the PATH (on Windows: `winget install Gyan.FFmpeg`). Separation takes seconds on a GPU and a few minutes on a CPU, so production should move it onto a job queue on a GPU host.

## Ground rules

- Never download audio from YouTube, Spotify or other streaming links. Links may only be used to identify a song.
- Uploaded audio and separated stems are deleted after analysis; only the pitch summary is kept or returned.
- Users confirm they have the right to use any file they upload.

## Next steps

1. Live listening: record a clip of a song playing nearby and analyse it.
2. Paste a song link to identify the song (never to download it).
3. Lead versus backing vocal separation, so pop songs show harmony parts too.
4. Practice mode: sing along with your part and get a pitch score.
