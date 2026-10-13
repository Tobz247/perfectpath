# PerfectPath

A phone app that helps singers find which voice part to sing in any song, and in what key.

The full plan lives in the [PerfectPath build plan](https://claude.ai/code/artifact/6d436565-6dc4-4e3a-b685-364c97871266).

## What's here

| Folder | What it is |
| --- | --- |
| `app/` | React Native (Expo) phone app. Today: a live range test that shows the note you're singing, your lowest and highest held notes, your comfortable range and your closest voice type. Also the part-matching logic that picks the best line and key shift for a song. |
| `server/` | Python (FastAPI) analysis API. `POST /analyze` takes an uploaded song, separates the vocals with Demucs, tracks pitch with pYIN and returns the vocal line's range and tessitura. |

## Running the app

The range test uses the microphone through `react-native-audio-api`, which is a native module, so it needs a development build rather than Expo Go.

```bash
cd app
npm install
npm test           # pitch detection, range tracking and part matching
npm run typecheck
npx expo run:ios   # or run:android, or: npx eas-cli@latest build --profile development
```

## Running the server

```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest
uvicorn perfectpath_server.app:app --reload
```

The first real `/analyze` call downloads the Demucs model. Separation takes seconds on a GPU and a few minutes on a CPU, so production should move it onto a job queue on a GPU host.

## Ground rules

- Never download audio from YouTube, Spotify or other streaming links. Links may only be used to identify a song.
- Uploaded audio and separated stems are deleted after analysis; only the pitch summary is kept or returned.
- Users confirm they have the right to use any file they upload.

## Next steps

1. Upload screen in the app that calls `/analyze` and shows `matchParts` results.
2. Choir mode: read a MusicXML score and match against each part.
3. Live listening: record a clip of a song playing nearby and analyse it.
