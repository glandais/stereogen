const PATTERNS = [
    { file: "patterns/pattern-dots.png", name: "Points" },
    { file: "patterns/pattern-checkerboard.png", name: "Damier" },
    { file: "patterns/pattern-stripes.png", name: "Rayures" },
    { file: "patterns/pattern-noise.png", name: "Bruit" },
    { file: "patterns/pattern-circles.png", name: "Cercles" },
    { file: "patterns/pattern-triangles.png", name: "Triangles" },
    { file: "patterns/pattern-waves.png", name: "Vagues" },
    { file: "patterns/pattern-mosaic.png", name: "Mosaïque" },
    { file: "patterns/pattern-stars.png", name: "Étoiles" },
    { file: "patterns/pattern-hexagons.png", name: "Hexagones" },
];

const API_URL = "/api/depth";

// State
let originalImage = null;
let depthMapImage = null;
let selectedPattern = null;
let patternImage = null;

// DOM elements
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const patternGrid = document.getElementById("pattern-grid");
const amplitudeSlider = document.getElementById("amplitude");
const amplitudeValue = document.getElementById("amplitude-value");
const patternWidthSlider = document.getElementById("pattern-width");
const patternWidthValue = document.getElementById("pattern-width-value");
const invertDepthCheckbox = document.getElementById("invert-depth");
const btnGenerate = document.getElementById("btn-generate");
const btnDownload = document.getElementById("btn-download");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loading-text");

const canvasOriginal = document.getElementById("canvas-original");
const canvasDepth = document.getElementById("canvas-depth");
const canvasStereogram = document.getElementById("canvas-stereogram");

// --- Init ---

function init() {
    setupDropZone();
    setupPatterns();
    setupControls();
}

// --- Drop zone ---

function setupDropZone() {
    dropZone.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    });
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });
    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
}

async function handleFile(file) {
    if (!file.type.startsWith("image/")) return;

    // Show original image
    const url = URL.createObjectURL(file);
    originalImage = await loadImage(url);
    drawImageToCanvas(canvasOriginal, originalImage);

    // Call depth API
    showLoading("Analyse de la profondeur en cours...");
    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(API_URL, { method: "POST", body: formData });
        if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);
        const blob = await response.blob();
        depthMapImage = await loadImage(URL.createObjectURL(blob));
        drawImageToCanvas(canvasDepth, depthMapImage);

        // Show next steps
        document.getElementById("step-pattern").classList.remove("hidden");
        document.getElementById("step-controls").classList.remove("hidden");
        document.getElementById("step-preview").classList.remove("hidden");
    } catch (err) {
        alert("Erreur lors de l'estimation de profondeur: " + err.message);
    } finally {
        hideLoading();
    }
}

// --- Patterns ---

function setupPatterns() {
    PATTERNS.forEach((p, i) => {
        const img = document.createElement("img");
        img.src = p.file;
        img.alt = p.name;
        img.title = p.name;
        img.className = "pattern-thumb";
        if (i === 0) {
            img.classList.add("selected");
            selectedPattern = p;
            loadPatternImage(p.file);
        }
        img.addEventListener("click", () => {
            document.querySelectorAll(".pattern-thumb").forEach((el) => el.classList.remove("selected"));
            img.classList.add("selected");
            selectedPattern = p;
            loadPatternImage(p.file);
        });
        patternGrid.appendChild(img);
    });
}

async function loadPatternImage(src) {
    patternImage = await loadImage(src);
}

// --- Controls ---

function setupControls() {
    amplitudeSlider.addEventListener("input", () => {
        amplitudeValue.textContent = amplitudeSlider.value;
    });
    patternWidthSlider.addEventListener("input", () => {
        patternWidthValue.textContent = patternWidthSlider.value;
    });
    btnGenerate.addEventListener("click", generateStereogram);
    btnDownload.addEventListener("click", downloadStereogram);
}

// --- Stereogram generation ---

function generateStereogram() {
    if (!depthMapImage || !patternImage) {
        alert("Veuillez d'abord charger une image et sélectionner un pattern.");
        return;
    }

    showLoading("Génération de l'autostéréogramme...");

    // Use requestAnimationFrame to let the loading screen render
    requestAnimationFrame(() => {
        setTimeout(() => {
            try {
                const amplitude = parseFloat(amplitudeSlider.value);
                const stripWidth = parseInt(patternWidthSlider.value);
                const invertDepth = invertDepthCheckbox.checked;

                // Get depth map data
                const depthCanvas = document.createElement("canvas");
                const width = depthMapImage.naturalWidth || depthMapImage.width;
                const height = depthMapImage.naturalHeight || depthMapImage.height;
                depthCanvas.width = width;
                depthCanvas.height = height;
                const depthCtx = depthCanvas.getContext("2d");
                depthCtx.drawImage(depthMapImage, 0, 0, width, height);
                const depthData = depthCtx.getImageData(0, 0, width, height);

                // Get pattern data (tile to stripWidth x height)
                const patternCanvas = document.createElement("canvas");
                patternCanvas.width = stripWidth;
                patternCanvas.height = patternImage.naturalHeight || patternImage.height;
                const patternCtx = patternCanvas.getContext("2d");
                patternCtx.drawImage(patternImage, 0, 0, stripWidth, patternCanvas.height);
                const patternData = patternCtx.getImageData(0, 0, stripWidth, patternCanvas.height);

                // Generate stereogram
                const output = createStereogram(width, height, depthData, patternData, stripWidth, amplitude, invertDepth);

                // Draw result
                canvasStereogram.width = width;
                canvasStereogram.height = height;
                const ctx = canvasStereogram.getContext("2d");
                ctx.putImageData(output, 0, 0);
            } catch (err) {
                alert("Erreur lors de la génération: " + err.message);
                console.error(err);
            } finally {
                hideLoading();
            }
        }, 50);
    });
}

function createStereogram(width, height, depthData, patternData, stripWidth, amplitude, invertDepth) {
    const output = new ImageData(width, height);
    const pW = patternData.width;
    const pH = patternData.height;

    for (let y = 0; y < height; y++) {
        // For each row, build constraints from center outward
        // same[x] = the pixel that x should be constrained to match
        const same = new Int32Array(width);
        for (let x = 0; x < width; x++) same[x] = x;

        const mid = Math.floor(width / 2);

        // Process from center to the right
        for (let x = mid; x < width; x++) {
            processPixel(x, y, width, depthData, invertDepth, stripWidth, amplitude, same);
        }
        // Process from center to the left
        for (let x = mid - 1; x >= 0; x--) {
            processPixel(x, y, width, depthData, invertDepth, stripWidth, amplitude, same);
        }

        // Assign colors: traverse from center outward
        // Center strip gets pattern colors, then propagate outward
        for (let x = mid; x < width; x++) {
            assignPixelColor(x, y, width, pW, pH, same, patternData, output);
        }
        for (let x = mid - 1; x >= 0; x--) {
            assignPixelColor(x, y, width, pW, pH, same, patternData, output);
        }
    }

    return output;
}

function processPixel(x, y, width, depthData, invertDepth, stripWidth, amplitude, same) {
    const di = (y * width + x) * 4;
    let depth = depthData.data[di] / 255.0;
    if (invertDepth) depth = 1.0 - depth;

    const separation = Math.round(stripWidth * (1 - amplitude * depth));
    const left = x - Math.floor(separation / 2);
    const right = left + separation;

    if (left >= 0 && right < width) {
        let l = left;
        while (same[l] !== l) l = same[l];
        let r = right;
        while (same[r] !== r) r = same[r];
        if (l !== r) {
            if (l < r) same[r] = l;
            else same[l] = r;
        }
    }
}

function assignPixelColor(x, y, width, pW, pH, same, patternData, output) {
    let root = x;
    while (same[root] !== root) root = same[root];
    // Path compression
    let curr = x;
    while (same[curr] !== root) {
        const next = same[curr];
        same[curr] = root;
        curr = next;
    }

    const oi = (y * width + x) * 4;
    const px = ((root % pW) + pW) % pW;
    const py = y % pH;
    const pi = (py * pW + px) * 4;
    output.data[oi] = patternData.data[pi];
    output.data[oi + 1] = patternData.data[pi + 1];
    output.data[oi + 2] = patternData.data[pi + 2];
    output.data[oi + 3] = 255;
}

// --- Download ---

function downloadStereogram() {
    const link = document.createElement("a");
    link.download = "autostereogram.png";
    link.href = canvasStereogram.toDataURL("image/png");
    link.click();
}

// --- Utilities ---

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function drawImageToCanvas(canvas, img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0);
}

function showLoading(text) {
    loadingText.textContent = text;
    loading.classList.remove("hidden");
}

function hideLoading() {
    loading.classList.add("hidden");
}

// --- Start ---
init();
