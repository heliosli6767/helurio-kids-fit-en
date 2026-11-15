const wardrobe = [
  { id: "TOP-01", type: "top", color: "yellow", colorLabel: "Sunshine yellow", name: "Sunshine Yellow T-shirt", style: "Cotton crew neck", image: "./assets/wardrobe/top-01-yellow-classic.png", prompt: "a sunshine-yellow classic cotton T-shirt" },
  { id: "TOP-02", type: "top", color: "red", colorLabel: "Red", name: "Cherry Red T-shirt", style: "Cotton crew neck", image: "./assets/wardrobe/top-02-red-classic.png", prompt: "a cherry-red classic cotton T-shirt" },
  { id: "TOP-03", type: "top", color: "white", colorLabel: "White", name: "Cloud White T-shirt", style: "Cotton crew neck", image: "./assets/wardrobe/top-03-white-classic.png", prompt: "a crisp white classic cotton T-shirt" },
  { id: "TOP-04", type: "top", color: "yellow", colorLabel: "Mustard yellow", name: "Mustard Pocket T-shirt", style: "Slub cotton pocket", image: "./assets/wardrobe/top-04-mustard-pocket.png", prompt: "a mustard-yellow slub cotton pocket T-shirt" },
  { id: "TOP-05", type: "top", color: "white-red", colorLabel: "White & red", name: "White & Red Ringer Tee", style: "Retro contrast trim", image: "./assets/wardrobe/top-05-white-red-ringer.png", prompt: "a white cotton ringer T-shirt with red collar and sleeve trim" },
  { id: "BOTTOM-01", type: "bottom", color: "red", colorLabel: "Red", name: "Bright Red Joggers", style: "Soft knit", image: "./assets/wardrobe/bottom-01-red-jogger.png", prompt: "bright red cotton jogger pants" },
  { id: "BOTTOM-02", type: "bottom", color: "white", colorLabel: "White", name: "Snow White Cargo Pants", style: "Lightweight cargo", image: "./assets/wardrobe/bottom-02-white-cargo.png", prompt: "crisp white lightweight cargo pants" },
  { id: "BOTTOM-03", type: "bottom", color: "black", colorLabel: "Black", name: "Black Straight-leg Jeans", style: "Soft denim", image: "./assets/wardrobe/bottom-03-black-jeans.png", prompt: "black straight-leg denim jeans" },
  { id: "BOTTOM-04", type: "bottom", color: "green", colorLabel: "Forest green", name: "Forest Green Chinos", style: "Cotton twill", image: "./assets/wardrobe/bottom-04-green-chino.png", prompt: "forest-green straight-leg chino pants" },
  { id: "BOTTOM-05", type: "bottom", color: "yellow", colorLabel: "Sunshine yellow", name: "Sunny Yellow Track Pants", style: "White side stripe", image: "./assets/wardrobe/bottom-05-yellow-track.png", prompt: "sunny yellow relaxed track pants with a white side stripe" },
  { id: "TOP-06", type: "top", color: "blue-white", colorLabel: "Navy & white", name: "Blue Striped T-shirt", style: "Sailor stripes", image: "./assets/wardrobe/top-06-blue-striped.png", prompt: "a cotton crewneck T-shirt with navy-blue and white horizontal sailor stripes" },
  { id: "TOP-07", type: "top", color: "purple", colorLabel: "Lavender", name: "Lavender Star T-shirt", style: "White star print", image: "./assets/wardrobe/top-07-lavender-stars.png", prompt: "a lavender purple cotton crewneck T-shirt with small repeating white stars" },
  { id: "TOP-08", type: "top", color: "orange", colorLabel: "Orange & green", name: "Orange Dinosaur T-shirt", style: "Dinosaur graphic", image: "./assets/wardrobe/top-08-orange-dinosaur.png", prompt: "a warm orange cotton T-shirt with a single friendly forest-green dinosaur graphic on the chest" },
  { id: "BOTTOM-06", type: "bottom", color: "blue", colorLabel: "Sky blue", name: "Light Blue Jeans", style: "Straight-leg denim", image: "./assets/wardrobe/bottom-06-blue-denim.png", prompt: "sky-blue full-length straight-leg denim jeans" },
  { id: "BOTTOM-07", type: "bottom", color: "beige-brown", colorLabel: "Beige & brown", name: "Beige Check Pants", style: "Gingham pattern", image: "./assets/wardrobe/bottom-07-beige-check.png", prompt: "full-length beige and brown gingham check cotton trousers with an elastic waistband" },
  { id: "BOTTOM-08", type: "bottom", color: "navy", colorLabel: "Navy & white", name: "Navy Star Joggers", style: "White star print", image: "./assets/wardrobe/bottom-08-navy-stars.png", prompt: "navy-blue full-length cotton jogger pants with a small repeating white star pattern" }
];

const state = {
  filter: "all",
  selected: { top: null, bottom: null },
  lastChangedTypes: [],
  cameraStream: null,
  lucyClient: null,
  recognition: null,
  recognitionRunning: false,
  voiceActive: false,
  usingRecordingFallback: false,
  voiceRestartTimer: null,
  recorder: null,
  recordingStream: null,
  recordingChunks: [],
  recordingTimer: null,
  discardRecording: false,
  commandQueue: Promise.resolve(),
  speechResultReceived: false,
  settings: {
    startluxEndpoint: sessionStorage.getItem("startluxEndpoint") || "http://127.0.0.1:8000/v1/systemone",
    startluxModel: sessionStorage.getItem("startluxModel") || "startlux",
    speechEndpoint: sessionStorage.getItem("speechEndpoint") || "http://127.0.0.1:8001/v1/audio/transcriptions",
    lucyKey: sessionStorage.getItem("lucyKey") || ""
  },
  lastDecision: { ok: false, error: "STARTLUX has not been called yet" }
};

const $ = (selector) => document.querySelector(selector);
const elements = {
  grid: $("#catalogGrid"), input: $("#commandInput"), mic: $("#micButton"), send: $("#sendButton"),
  camera: $("#cameraButton"), inputVideo: $("#inputVideo"), outputVideo: $("#outputVideo"), cameraEmpty: $("#cameraEmpty"),
  settingsButton: $("#settingsButton"), settingsDialog: $("#settingsDialog"), settingsForm: $("#settingsForm"),
  endpoint: $("#startluxEndpoint"), model: $("#startluxModel"), speechEndpoint: $("#speechEndpoint"), lucyKey: $("#lucyKey"),
  systemState: $("#systemState"), liveLabel: $("#liveLabel"), voiceHint: $("#voiceHint"),
  decisionTitle: $("#decisionTitle"), decisionDetail: $("#decisionDetail"), lookText: $("#lookText"), toast: $("#toast"),
  tryonTitle: $("#tryonTitle"), tryonDetail: $("#tryonDetail"), tryonStatus: $("#tryonStatus"), wardrobeCount: $("#wardrobeCount")
};

function renderWardrobe() {
  const visible = [...wardrobe].sort((a, b) => a.type === b.type ? a.id.localeCompare(b.id) : a.type === "top" ? -1 : 1);
  elements.wardrobeCount.textContent = `${wardrobe.length} pieces`;
  elements.grid.innerHTML = visible.map(item => `
    <button class="garment-card ${state.selected[item.type]?.id === item.id ? "selected" : ""}" type="button" data-id="${item.id}" aria-label="Try on ${item.name}">
      <span class="item-id">${item.id}</span><span class="checkmark">✓</span>
      <img src="${item.image}" alt="${item.name}" />
      <strong>${item.name}</strong><small>${item.colorLabel} · ${item.style}</small>
    </button>`).join("");
  elements.grid.querySelectorAll(".garment-card").forEach(card => card.addEventListener("click", () => selectItems([card.dataset.id], "Manual selection")));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("show"), 2800);
}

function setTryonStatus(title, detail, kind = "info") {
  elements.tryonTitle.textContent = title;
  elements.tryonDetail.textContent = detail;
  elements.tryonStatus.dataset.kind = kind;
}

function safeLucyError(error) {
  let message = String(error?.message || error?.reason || error || "Unknown error");
  if (state.settings.lucyKey) message = message.split(state.settings.lucyKey).join("[redacted]");
  return message.replace(/([?&](?:api_key|token)=)[^&\s]+/gi, "$1[redacted]");
}

function reportLucyError(error, stage) {
  const message = safeLucyError(error);
  const code = String(error?.code || "");
  let detail = `${code ? `${code}: ` : ""}${message}`;
  if (/invalid.*key|unauthori[sz]ed|authentication|401|token.expired/i.test(`${code} ${message}`)) {
    detail += " Check the key or token in Connection settings.";
  } else if (/credit|balance|payment|billing|quota|402/i.test(`${code} ${message}`)) {
    detail += " Check the Decart account credits and usage limits; generating a new key does not add credits.";
  } else if (/session.limit|concurrent/i.test(`${code} ${message}`)) {
    detail += " Close other Lucy sessions before reconnecting.";
  }
  setTryonStatus(stage, detail, "error");
}

function setBusy(busy) {
  elements.send.disabled = busy;
  elements.systemState.classList.toggle("online", !busy);
  elements.systemState.innerHTML = `<i></i> ${busy ? "STARTLUX is choosing" : "Ready"}`;
}

function setVoiceUi(active, message) {
  elements.mic.classList.toggle("listening", active);
  elements.mic.setAttribute("aria-label", active ? "Stop continuous voice selection" : "Start continuous voice selection");
  elements.mic.title = active ? "Stop listening" : "Start listening";
  if (message) elements.voiceHint.textContent = message;
}

function queueStartluxCommand(command) {
  state.commandQueue = state.commandQueue
    .catch(() => undefined)
    .then(() => decideWithStartlux(command));
  return state.commandQueue;
}

function friendlyFetchError(error, endpoint, serviceName) {
  const isFetchFailure = error instanceof TypeError || /failed to fetch|load failed|networkerror/i.test(error?.message || "");
  if (!isFetchFailure) return error.message;
  let localHttp = false;
  try {
    const url = new URL(endpoint);
    localHttp = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
  } catch (_) {}
  if (localHttp) {
    return `Cannot reach your local ${serviceName}. Start the service and allow this page through CORS / local network permissions: ${endpoint}`;
  }
  return `Cannot connect to ${serviceName}. Check the endpoint, network and CORS settings.`;
}

function currentLookText() {
  const names = [state.selected.top?.name, state.selected.bottom?.name].filter(Boolean);
  return names.length ? names.join(" + ") : "No clothes selected yet";
}

async function selectItems(ids, source = "STARTLUX") {
  const selected = ids.map(id => wardrobe.find(item => item.id === id)).filter(Boolean);
  if (!selected.length) throw new Error("STARTLUX did not return a valid garment label");
  selected.forEach(item => { state.selected[item.type] = item; });
  state.lastChangedTypes = [...new Set(selected.map(item => item.type))];
  renderWardrobe();
  elements.lookText.textContent = currentLookText();
  elements.decisionTitle.textContent = `${source} selected ${selected.map(i => i.id).join(" · ")}`;
  elements.decisionDetail.textContent = selected.map(i => i.name).join(" + ");
  await applyLucyLook(state.lastChangedTypes);
}

function readDecisionLabel(result, key) {
  const candidate = result?.results?.[key] ?? result?.answers?.[key] ?? result?.[key];
  if (typeof candidate === "string") return candidate;
  return candidate?.label ?? candidate?.choice ?? candidate?.value ?? candidate?.answer ?? null;
}

async function decideWithStartlux(command) {
  if (!command.trim()) return;
  setBusy(true);
  elements.voiceHint.textContent = `Choosing an outfit for: “${command}”`;
  const tops = Object.fromEntries(wardrobe.filter(i => i.type === "top").map(i => [i.id, `${i.colorLabel}, ${i.name}, ${i.style}`]));
  const bottoms = Object.fromEntries(wardrobe.filter(i => i.type === "bottom").map(i => [i.id, `${i.colorLabel}, ${i.name}, ${i.style}`]));
  tops.NO_CHANGE = "The user did not request a change of top";
  bottoms.NO_CHANGE = "The user did not request a change of pants";
  const payload = {
    model: state.settings.startluxModel,
    state: JSON.stringify({ user_request: command, current_top: state.selected.top?.id || null, current_bottom: state.selected.bottom?.id || null, language: "en-US" }),
    questions: {
      scope: {
        type: "choice",
        instructions: "Choose ONLY the clothing region explicitly requested by the user. Never infer a matching outfit from a color. 'Try yellow T-shirt' means TOP_ONLY; 'try yellow pants' means BOTTOM_ONLY. Use BOTH only for an explicit request for both regions or a whole outfit.",
        criteria: {
          TOP_ONLY: "Only a top, T-shirt, shirt, jacket or other upper-body garment was requested. Pants must not change.",
          BOTTOM_ONLY: "Only pants, jeans, trousers, shorts or other lower-body clothing was requested. The top must not change.",
          BOTH: "The user explicitly requested both a top and pants, or asked to replace the whole outfit.",
          NO_CHANGE: "No clothing change was requested, or the clothing region is unspecified."
        }
      },
      top: { type: "choice", instructions: "Choose the kids top that best matches the request. If a top or a whole outfit was not explicitly requested, choose NO_CHANGE. Do not create a matching outfit.", criteria: tops },
      bottom: { type: "choice", instructions: "Choose pants ONLY when the user explicitly requests pants, jeans, trousers, shorts or a whole outfit. A T-shirt request, even with a color, MUST return NO_CHANGE for pants. Never infer matching pants from the top color.", criteria: bottoms }
    }
  };
  try {
    const response = await fetch(state.settings.startluxEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const scope = readDecisionLabel(result, "scope");
    const regions = { TOP_ONLY: ["top"], BOTTOM_ONLY: ["bottom"], BOTH: ["top", "bottom"], NO_CHANGE: [] };
    if (!Object.hasOwn(regions, scope)) throw new Error("STARTLUX did not return a valid clothing region");
    const ids = regions[scope].map(type => {
      const id = readDecisionLabel(result, type);
      return wardrobe.find(item => item.id === id && item.type === type)?.id;
    }).filter(Boolean);
    if (!ids.length) {
      state.lastDecision = { ok: true, ids: [], scope };
      elements.decisionTitle.textContent = "No clothing changes requested";
      elements.decisionDetail.textContent = "Say which top or pants you would like to change.";
      elements.voiceHint.textContent = state.voiceActive ? "No outfit change · Still listening" : "No outfit change";
      return;
    }
    await selectItems(ids);
    state.lastDecision = { ok: true, ids, scope };
    elements.voiceHint.textContent = state.voiceActive ? `Applied: “${command}” · Still listening` : `Recognized: “${command}”`;
  } catch (error) {
    const message = friendlyFetchError(error, state.settings.startluxEndpoint, "STARTLUX");
    state.lastDecision = { ok: false, error: message };
    elements.decisionTitle.textContent = "STARTLUX connection failed";
    elements.decisionDetail.textContent = message;
    elements.voiceHint.textContent = state.voiceActive ? "STARTLUX is offline · Still listening" : "Start the local service and check CORS settings";
    showToast(message);
  } finally { setBusy(false); }
}

async function composeOutfitReference() {
  const selected = [state.selected.top, state.selected.bottom].filter(Boolean);
  if (!selected.length) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = selected.length === 2 ? 1536 : 1024;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f5f7fb"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const images = await Promise.all(selected.map(item => new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve({ image, item }); image.onerror = reject; image.src = item.image;
  })));
  images.forEach(({ image, item }) => {
    const slot = selected.length === 1 ? { y: 0, height: 1024 } : item.type === "top" ? { y: 0, height: 640 } : { y: 640, height: 896 };
    const scale = Math.min(850 / image.width, (slot.height - 32) / image.height);
    const w = image.width * scale, h = image.height * scale;
    ctx.drawImage(image, (1024 - w) / 2, slot.y + (slot.height - h) / 2, w, h);
  });
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  return new File([blob], "startlux-outfit.png", { type: "image/png" });
}

function buildLucyOutfitPrompt(changedTypes = state.lastChangedTypes) {
  const topChanged = changedTypes.includes("top");
  const bottomChanged = changedTypes.includes("bottom");
  const instructions = [];
  if (topChanged && state.selected.top) instructions.push(`Substitute only the current top with ${state.selected.top.prompt}. Apply the top reference only to the upper body.`);
  if (bottomChanged && state.selected.bottom) instructions.push(`Substitute only the current pants with ${state.selected.bottom.prompt}. Apply the pants reference only to the lower body.`);
  if (!bottomChanged) {
    instructions.push(state.selected.bottom
      ? `Keep the previously selected ${state.selected.bottom.prompt} exactly unchanged, including color and pattern.`
      : "Keep the person's existing pants, shorts or skirt exactly unchanged, including the original color, pattern, material and shape.");
    instructions.push("Do not recolor the pants to match the top. Do not extend the top's color or pattern onto the lower body.");
  }
  if (!topChanged) {
    instructions.push(state.selected.top
      ? `Keep the previously selected ${state.selected.top.prompt} exactly unchanged, including color and pattern.`
      : "Keep the person's existing top exactly unchanged, including the original color, pattern, material and shape.");
    instructions.push("Do not recolor the top to match the pants. Do not extend the pants' color or pattern onto the upper body.");
  }
  if (topChanged && bottomChanged) instructions.push("Treat the top and pants as separate garments. Keep each garment's specified color and pattern independent; do not create a single-color matching set unless both references specify it.");
  instructions.push("Preserve the same person's identity, face, body shape, pose, camera framing, lighting and background. Change only the explicitly requested garment regions.");
  return instructions.join(" ");
}

async function applyLucyLook(changedTypes = state.lastChangedTypes) {
  if (!state.cameraStream) {
    setTryonStatus("Outfit selected · camera is off", "Open the camera to begin virtual try-on.");
    showToast("Outfit selected. Open the camera to try it on."); return;
  }
  if (!state.lucyClient) {
    if (elements.tryonStatus.dataset.kind !== "error") setTryonStatus("Camera preview only", "Lucy is not connected. Check your key, then click Open camera to connect.");
    showToast("Outfit selected, but Lucy is not connected."); return;
  }
  const reference = await composeOutfitReference();
  const prompt = buildLucyOutfitPrompt(changedTypes);
  try {
    elements.liveLabel.textContent = "LUCY APPLYING";
    setTryonStatus("Sending outfit to Lucy", "STARTLUX selected the garments. Waiting for Lucy to acknowledge the reference image.");
    await state.lucyClient.set({
      image: reference,
      prompt,
      enhance: false
    });
    elements.liveLabel.textContent = "LUCY LIVE";
    setTryonStatus("Outfit request accepted", "Lucy acknowledged the garment image. This confirms the request, not the visual result. Check the live video.", "success");
    showToast("Lucy is updating your outfit");
  } catch (error) {
    elements.liveLabel.textContent = "LUCY ERROR";
    reportLucyError(error, "Lucy outfit update failed");
    showToast(`Lucy update failed: ${error.message}`);
  }
}

async function startCamera() {
  try {
    if (!state.cameraStream) state.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    elements.inputVideo.srcObject = state.cameraStream;
    elements.inputVideo.style.display = "block";
    elements.cameraEmpty.style.display = "none";
    elements.camera.textContent = "Camera is on";
    elements.systemState.classList.add("online");
    elements.systemState.innerHTML = "<i></i> Camera connected";
    if (!state.settings.lucyKey) setTryonStatus("Camera preview only · no Lucy key", "Add a Lucy API key in Connection settings to enable virtual try-on.");
    if (state.settings.lucyKey && !state.lucyClient) await connectLucy();
  } catch (error) { showToast(`Could not open the camera: ${error.message}`); }
}

async function connectLucy() {
  try {
    elements.liveLabel.textContent = "LUCY CONNECTING";
    setTryonStatus("Connecting to Lucy VTON 3.5", "The camera preview is not a try-on result. Waiting for the Lucy video connection.");
    elements.outputVideo.style.display = "none";
    elements.outputVideo.srcObject = null;
    const { createDecartClient, models } = await import("https://esm.sh/@decartai/sdk?bundle");
    const model = models.realtime("lucy-vton-3.5");
    const client = createDecartClient({ apiKey: state.settings.lucyKey });
    state.lucyClient = await client.realtime.connect(state.cameraStream, {
      model,
      mirror: "auto",
      onRemoteStream: (stream) => {
        elements.outputVideo.srcObject = stream;
        elements.outputVideo.style.display = "block";
        elements.inputVideo.style.display = "none";
        elements.liveLabel.textContent = "LUCY LIVE";
        setTryonStatus("Lucy video stream received", "A remote stream is attached. Waiting for video playback; select an outfit to send its reference image.");
      }
    });
    state.lucyClient.on("error", error => reportLucyError(error, "Lucy reported an error"));
    state.lucyClient.on("connectionChange", connection => {
      if (connection === "disconnected") setTryonStatus("Lucy disconnected", "The camera preview or last frame may still be visible. Lucy is not receiving new outfits.", "error");
      else if (connection === "reconnecting") setTryonStatus("Lucy reconnecting", "The video connection was interrupted. Waiting for the service to reconnect.");
    });
    state.lucyClient.on("sessionEnded", event => reportLucyError(event, "Lucy session ended"));
    if (state.selected.top || state.selected.bottom) await applyLucyLook();
  } catch (error) {
    state.lucyClient = null;
    elements.inputVideo.style.display = "block";
    elements.outputVideo.style.display = "none";
    elements.liveLabel.textContent = "CAMERA PREVIEW";
    reportLucyError(error, "Lucy connection failed · camera preview only");
    showToast(`Lucy connection failed: ${error.message}`);
  }
}

elements.outputVideo.addEventListener("playing", () => {
  if (elements.tryonStatus.dataset.kind !== "error") setTryonStatus("Lucy video is playing", "The remote video is playing. A selected garment still needs a successful outfit update.", "success");
});
elements.outputVideo.addEventListener("error", () => reportLucyError(new Error("The browser could not play the remote video."), "Lucy video playback failed"));

function setupVoice() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    elements.voiceHint.textContent = "Click once to listen continuously. Click again to stop.";
    return;
  }
  state.recognition = new Recognition();
  state.recognition.lang = "en-US";
  state.recognition.interimResults = false;
  state.recognition.continuous = true;
  state.recognition.onstart = () => {
    state.recognitionRunning = true;
    state.speechResultReceived = false;
    setVoiceUi(true, "Listening · Say “a yellow T-shirt” or “black pants”");
  };
  state.recognition.onend = () => {
    state.recognitionRunning = false;
    if (!state.voiceActive || state.usingRecordingFallback) return;
    clearTimeout(state.voiceRestartTimer);
    state.voiceRestartTimer = setTimeout(startRecognitionCycle, 300);
  };
  state.recognition.onerror = event => {
    state.recognitionRunning = false;
    if (!state.voiceActive || event.error === "aborted") return;
    if (["network", "service-not-allowed", "language-not-supported"].includes(event.error)) {
      elements.voiceHint.textContent = "Browser speech recognition unavailable. Switching to local recording…";
      state.usingRecordingFallback = true;
      startRecordingFallback();
    } else if (!['no-speech'].includes(event.error)) {
      elements.voiceHint.textContent = `Speech recognition failed: ${event.error}`;
    }
  };
  state.recognition.onresult = event => {
    state.speechResultReceived = true;
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      if (!event.results[index].isFinal) continue;
      const transcript = event.results[index][0].transcript.trim();
      if (!transcript) continue;
      elements.input.value = transcript;
      queueStartluxCommand(transcript);
    }
  };
}

function startRecognitionCycle() {
  if (!state.voiceActive || state.usingRecordingFallback || !state.recognition || state.recognitionRunning) return;
  try { state.recognition.start(); }
  catch (error) {
    if (error.name !== "InvalidStateError") {
      state.usingRecordingFallback = true;
      startRecordingFallback();
    }
  }
}

function stopVoiceSession() {
  state.voiceActive = false;
  clearTimeout(state.voiceRestartTimer);
  clearTimeout(state.recordingTimer);
  if (state.recognitionRunning) {
    try { state.recognition.stop(); } catch (_) {}
  }
  if (state.recorder?.state === "recording") {
    state.discardRecording = true;
    state.recorder.stop();
  }
  state.recordingStream?.getTracks().forEach(track => track.stop());
  state.recordingStream = null;
  state.usingRecordingFallback = false;
  setVoiceUi(false, "Voice stopped · Click the microphone to listen again");
}

async function startVoiceInput() {
  if (state.voiceActive) { stopVoiceSession(); return; }
  try {
    elements.voiceHint.textContent = "Requesting microphone access…";
    const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    permissionStream.getTracks().forEach(track => track.stop());
    state.voiceActive = true;
    state.usingRecordingFallback = !state.recognition;
    setVoiceUi(true, "Listening · Click the microphone again to stop");
    if (state.recognition) {
      startRecognitionCycle();
      return;
    }
    await startRecordingFallback();
  } catch (error) {
    state.voiceActive = false;
    setVoiceUi(false);
    elements.voiceHint.textContent = error.name === "NotAllowedError"
      ? "Allow microphone access and try again"
      : `Could not open the microphone: ${error.message}`;
    showToast(elements.voiceHint.textContent);
  }
}

async function startRecordingFallback() {
  if (!state.voiceActive || state.recorder?.state === "recording") return;
  if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
    elements.voiceHint.textContent = "Recording is unavailable in this browser. Please type your request.";
    stopVoiceSession();
    return;
  }
  try {
    if (!state.recordingStream?.active) state.recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.recordingChunks = [];
    state.discardRecording = false;
    const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
    state.recorder = new MediaRecorder(state.recordingStream, preferredType ? { mimeType: preferredType } : undefined);
    state.recorder.ondataavailable = event => { if (event.data.size) state.recordingChunks.push(event.data); };
    state.recorder.onstop = transcribeRecording;
    state.recorder.start();
    setVoiceUi(true, "Listening · Keep saying outfit requests. Click again to stop.");
    clearTimeout(state.recordingTimer);
    state.recordingTimer = setTimeout(() => { if (state.recorder?.state === "recording") state.recorder.stop(); }, 5500);
  } catch (error) {
    elements.voiceHint.textContent = `Could not start recording: ${error.message}`;
    stopVoiceSession();
  }
}

async function transcribeRecording() {
  clearTimeout(state.recordingTimer);
  const type = state.recorder?.mimeType || "audio/webm";
  const blob = new Blob(state.recordingChunks, { type });
  if (state.discardRecording || !blob.size) {
    state.recorder = null;
    state.discardRecording = false;
    return;
  }
  elements.voiceHint.textContent = "Transcribing speech locally…";
  try {
    const form = new FormData();
    form.append("file", new File([blob], "helurio-command.webm", { type }));
    form.append("model", "whisper-1");
    form.append("language", "en");
    const response = await fetch(state.settings.speechEndpoint, { method: "POST", body: form });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const transcript = result.text || result.transcript;
    if (!transcript) throw new Error("The transcription endpoint returned no text");
    elements.input.value = transcript;
    await queueStartluxCommand(transcript);
  } catch (error) {
    const message = friendlyFetchError(error, state.settings.speechEndpoint, "speech transcription service");
    elements.voiceHint.textContent = state.voiceActive ? "Speech service is offline · Retrying" : message;
    showToast(message);
  } finally {
    state.recorder = null;
    if (state.voiceActive && state.usingRecordingFallback) {
      setTimeout(startRecordingFallback, 250);
    } else {
      state.recordingStream?.getTracks().forEach(track => track.stop());
      state.recordingStream = null;
    }
  }
}

elements.send.addEventListener("click", () => queueStartluxCommand(elements.input.value));
elements.input.addEventListener("keydown", event => { if (event.key === "Enter") queueStartluxCommand(elements.input.value); });
elements.mic.addEventListener("click", startVoiceInput);
elements.camera.addEventListener("click", startCamera);
elements.settingsButton.addEventListener("click", () => {
  elements.endpoint.value = state.settings.startluxEndpoint;
  elements.model.value = state.settings.startluxModel;
  elements.speechEndpoint.value = state.settings.speechEndpoint;
  elements.lucyKey.value = state.settings.lucyKey;
  elements.settingsDialog.showModal();
});
elements.settingsForm.addEventListener("submit", event => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const previousLucyKey = state.settings.lucyKey;
  state.settings = { startluxEndpoint: elements.endpoint.value.trim(), startluxModel: elements.model.value.trim(), speechEndpoint: elements.speechEndpoint.value.trim(), lucyKey: elements.lucyKey.value.trim() };
  Object.entries(state.settings).forEach(([key, value]) => sessionStorage.setItem(key, value));
  elements.settingsDialog.close();
  showToast("Connection settings saved");
  if (previousLucyKey !== state.settings.lucyKey && state.lucyClient) {
    state.lucyClient.disconnect?.();
    state.lucyClient = null;
  }
  if (state.cameraStream && state.settings.lucyKey && !state.lucyClient) connectLucy();
});

function registerWebMCP() {
  if (!document.modelContext?.registerTool) return;
  document.modelContext.registerTool({
    name: "request_startlux_outfit",
    title: "Choose an outfit with STARTLUX",
    description: "Send an English outfit request to local STARTLUX and apply the selected kids clothing to the current virtual try-on stream.",
    inputSchema: { type: "object", properties: { request: { type: "string" } }, required: ["request"], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute(input) {
      if (!input || typeof input.request !== "string" || !input.request.trim()) throw new Error("request must be a non-empty string");
      elements.input.value = input.request;
      await decideWithStartlux(input.request);
      if (!state.lastDecision.ok) throw new Error(state.lastDecision.error);
      return { selectedTop: state.selected.top?.id || null, selectedBottom: state.selected.bottom?.id || null };
    }
  });
}

renderWardrobe();
setupVoice();
registerWebMCP();
elements.endpoint.value = state.settings.startluxEndpoint;
elements.model.value = state.settings.startluxModel;
elements.speechEndpoint.value = state.settings.speechEndpoint;
elements.lucyKey.value = state.settings.lucyKey;
