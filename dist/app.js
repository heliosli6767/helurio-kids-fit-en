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
  { id: "BOTTOM-05", type: "bottom", color: "yellow", colorLabel: "Sunshine yellow", name: "Sunny Yellow Track Pants", style: "White side stripe", image: "./assets/wardrobe/bottom-05-yellow-track.png", prompt: "sunny yellow relaxed track pants with a white side stripe" }
];

const state = {
  filter: "all",
  selected: { top: null, bottom: null },
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
  decisionTitle: $("#decisionTitle"), decisionDetail: $("#decisionDetail"), lookText: $("#lookText"), toast: $("#toast")
};

function renderWardrobe() {
  const visible = wardrobe;
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
  renderWardrobe();
  elements.lookText.textContent = currentLookText();
  elements.decisionTitle.textContent = `${source} selected ${selected.map(i => i.id).join(" · ")}`;
  elements.decisionDetail.textContent = selected.map(i => i.name).join(" + ");
  await applyLucyLook();
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
      top: { type: "choice", instructions: "Choose the kids top that best matches the user request. If the user did not request a change of top, choose NO_CHANGE.", criteria: tops },
      bottom: { type: "choice", instructions: "Choose the kids pants that best match the user request. If the user did not request a change of pants, choose NO_CHANGE.", criteria: bottoms }
    }
  };
  try {
    const response = await fetch(state.settings.startluxEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    const ids = [readDecisionLabel(result, "top"), readDecisionLabel(result, "bottom")].filter(id => id && id !== "NO_CHANGE");
    if (!ids.length) throw new Error("No clothing changes requested");
    await selectItems(ids);
    state.lastDecision = { ok: true, ids };
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
  canvas.width = 1024; canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f5f7fb"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const images = await Promise.all(selected.map(item => new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve({ image, item }); image.onerror = reject; image.src = item.image;
  })));
  const width = selected.length === 1 ? 650 : 470;
  images.forEach(({ image }, index) => {
    const scale = Math.min(width / image.width, 820 / image.height);
    const w = image.width * scale, h = image.height * scale;
    const x = selected.length === 1 ? (1024 - w) / 2 : index * 512 + (512 - w) / 2;
    ctx.drawImage(image, x, (1024 - h) / 2, w, h);
  });
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  return new File([blob], "startlux-outfit.png", { type: "image/png" });
}

async function applyLucyLook() {
  if (!state.cameraStream) { showToast("Outfit selected. Open the camera to try it on."); return; }
  if (!state.lucyClient) { showToast("Outfit updated. Add your Lucy API key to enable virtual try-on."); return; }
  const reference = await composeOutfitReference();
  const prompt = [state.selected.top?.prompt, state.selected.bottom?.prompt].filter(Boolean).join(" and ");
  try {
    elements.liveLabel.textContent = "LUCY APPLYING";
    await state.lucyClient.set({
      image: reference,
      prompt: `Dress the same person in ${prompt}. Keep the person's identity, face, body shape, pose, camera framing, lighting and background unchanged. Change only the clothing.`
    });
    elements.liveLabel.textContent = "LUCY LIVE";
    showToast("Lucy is updating your outfit");
  } catch (error) {
    elements.liveLabel.textContent = "LUCY ERROR";
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
    if (state.settings.lucyKey && !state.lucyClient) await connectLucy();
  } catch (error) { showToast(`Could not open the camera: ${error.message}`); }
}

async function connectLucy() {
  try {
    elements.liveLabel.textContent = "LUCY CONNECTING";
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
      }
    });
    if (state.selected.top || state.selected.bottom) await applyLucyLook();
  } catch (error) {
    state.lucyClient = null;
    elements.inputVideo.style.display = "block";
    elements.outputVideo.style.display = "none";
    elements.liveLabel.textContent = "CAMERA PREVIEW";
    showToast(`Lucy connection failed: ${error.message}`);
  }
}

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
