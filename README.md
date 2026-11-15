# HELURIO Kids Fit Studio — EN

English edition of [HELURIO Kids Fit Studio](https://github.com/heliosli6767/helurio-kids-fit), prepared for a WAICY project demonstration.

The original ten garment images and try-on connection flow are retained. The wardrobe has 16 pieces, including striped, star-print, dinosaur-print, denim and gingham options. All interface labels, garment names, instructions, status messages and speech input are in English. The desktop layout allocates 60% to the camera and 40% to a compact, viewport-height-aware 4×4 wardrobe. Garment names wrap; supplementary descriptions are hidden to keep all 16 pieces on screen.

## Website

https://helurio-kids-fit-en.helios-li6767.chatgpt.site

The hosted edition needs access to your local StartLux service and a valid Lucy API key. A new URL has its own settings; enter your key in Connection settings. Browser local-network permissions and CORS still apply. If the browser blocks remote-to-local requests, use the local edition below.

## How it works

1. Click the microphone once and say an English outfit request.
2. StartLux-Decision-4B runs locally and selects a wardrobe label.
3. Lucy Virtual Try-On 3.5 receives the camera stream and garment reference.
4. The page displays the returned try-on video.

Example commands:

- “Put on a yellow T-shirt.”
- “Change to black pants.”
- “Give me a red top and green pants.”
- “Put on the lavender star T-shirt.”
- “Change to beige check pants.”

Listening continues until the microphone is clicked again. Browser recognition uses `en-US`; the optional local transcription fallback requests English (`en`).

## Change only the requested garment

StartLux answers an explicit clothing-region question (`TOP_ONLY`, `BOTTOM_ONLY`, `BOTH`, or `NO_CHANGE`) as well as the garment choices. The page filters out choices outside that region, so a top-only request cannot update the stored pants selection, and vice versa. All request interpretation still runs through the local StartLux model.

Lucy receives a region-specific substitute prompt that explicitly preserves the opposite garment and its colors and patterns. Prompt enhancement is disabled to avoid expanding a single-garment request into a matching outfit. When both garments have been selected, their reference is composed vertically (top above pants), retaining the previous selection as context. Lucy renders generative video; payload and selection tests do not guarantee pixel-level preservation in every frame.

## Run locally

Start StartLux from your installed StartLux-Decision checkout using your own model directory:

```bash
python -m startlux_decision.server \
  --model /path/to/StartLux-Decision-4B \
  --port 8090 \
  --int8
```

Start the CORS bridge in a separate terminal:

```bash
python3 startlux-cors-proxy.py
```

The bridge listens only on `127.0.0.1:8000` and forwards requests to `127.0.0.1:8090`. Its allowlist includes both English and Chinese page origins. If port 8000 is already used by the Chinese edition's bridge, stop that bridge before starting this one, or add the English origins to its allowlist.

Serve the English page:

```bash
python3 -m http.server 4174 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:4174>. In **Connection settings**, keep the StartLux endpoint at `http://127.0.0.1:8000/v1/systemone` and enter a valid Decart API Platform key. Open the camera, then choose a garment or use the microphone.

Browser speech recognition is preferred. If unavailable, configure a local OpenAI-compatible transcription service (default: `http://127.0.0.1:8001/v1/audio/transcriptions`). It must allow the English page origin through CORS.

## Privacy and dependencies

- API keys are entered at runtime and stored only in browser session storage; no keys or model weights are included.
- Lucy sends camera video and garment references to Decart and requires API access and available credits.
- Browser speech recognition may use the browser vendor's service; the fallback uses the configured local endpoint.
- Obtain appropriate consent for camera use, particularly for children.
- StartLux, its weights and Decart have their own licenses and terms. Check these before commercial use.

The Chinese edition remains a separate project. This repository contains the English implementation and identical garment images.

## Lucy diagnostics

Garment selection and virtual try-on are separate steps. A checkmark confirms the local model's choice; it does not confirm a Lucy connection or a rendered outfit.

The status below the camera preserves the latest Lucy connection or outfit-update error, including authentication errors, insufficient credits, session limits and video playback problems. `Outfit request accepted` means Lucy acknowledged the reference image, not that the visual result has been verified. Camera preview alone does not prove Lucy is connected.

The image request remains `realtimeClient.set({ image, prompt })`, which is supported by the official SDK. No key is sent to StartLux. Real Lucy verification requires the user's key, account credits, camera stream and a working realtime connection.

New assets were generated with the built-in image generation tool. See [asset prompts](./ASSET_PROMPTS.md) for the exact prompts and file paths.
