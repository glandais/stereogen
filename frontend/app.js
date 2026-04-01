const PATTERNS = [
    { file: null, name: "Random Dots", randomDots: true },
    { file: "patterns/pattern-dots.png", name: "Dots" },
    { file: "patterns/pattern-checkerboard.png", name: "Checkerboard" },
    { file: "patterns/pattern-stripes.png", name: "Stripes" },
    { file: "patterns/pattern-noise.png", name: "Noise" },
    { file: "patterns/pattern-circles.png", name: "Circles" },
    { file: "patterns/pattern-triangles.png", name: "Triangles" },
    { file: "patterns/pattern-waves.png", name: "Waves" },
    { file: "patterns/pattern-mosaic.png", name: "Mosaic" },
    { file: "patterns/pattern-stars.png", name: "Stars" },
    { file: "patterns/pattern-hexagons.png", name: "Hexagons" },
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
    setupSamples();
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

function setupSamples() {
    document.querySelectorAll(".sample-thumb").forEach((thumb) => {
        thumb.addEventListener("click", async () => {
            const response = await fetch(thumb.src);
            const blob = await response.blob();
            const file = new File([blob], "sample.jpg", { type: blob.type });
            handleFile(file);
        });
    });
}

async function handleFile(file) {
    if (!file.type.startsWith("image/")) return;

    // Show original image
    const url = URL.createObjectURL(file);
    originalImage = await loadImage(url);
    drawImageToCanvas(canvasOriginal, originalImage);

    // Call depth API
    showLoading("Estimating depth...");
    try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(API_URL, { method: "POST", body: formData });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const blob = await response.blob();
        depthMapImage = await loadImage(URL.createObjectURL(blob));
        drawImageToCanvas(canvasDepth, depthMapImage);

        // Show next steps
        document.getElementById("step-pattern").classList.remove("hidden");
        document.getElementById("step-controls").classList.remove("hidden");
        document.getElementById("step-preview").classList.remove("hidden");

        // Auto-generate with current settings
        generateStereogram();
    } catch (err) {
        alert("Depth estimation error: " + err.message);
    } finally {
        hideLoading();
    }
}

// --- Patterns ---

function setupPatterns() {
    PATTERNS.forEach((p, i) => {
        let el;
        if (p.randomDots) {
            // Generate a random dots thumbnail on a canvas
            el = document.createElement("canvas");
            el.width = 80;
            el.height = 80;
            const ctx = el.getContext("2d");
            ctx.fillStyle = "#808080";
            ctx.fillRect(0, 0, 80, 80);
            for (let j = 0; j < 400; j++) {
                ctx.fillStyle = `rgb(${Math.random()*255|0},${Math.random()*255|0},${Math.random()*255|0})`;
                const x = Math.random() * 80;
                const y = Math.random() * 80;
                ctx.fillRect(x, y, 2, 2);
            }
        } else {
            el = document.createElement("img");
            el.src = p.file;
        }
        el.alt = p.name;
        el.title = p.name;
        el.className = "pattern-thumb";
        if (i === 0) {
            el.classList.add("selected");
            selectedPattern = p;
        }
        el.addEventListener("click", () => {
            document.querySelectorAll(".pattern-thumb").forEach((e) => e.classList.remove("selected"));
            el.classList.add("selected");
            selectedPattern = p;
            if (p.file) loadPatternImage(p.file);
        });
        patternGrid.appendChild(el);
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
    if (!depthMapImage || (!patternImage && !selectedPattern.randomDots)) {
        alert("Please upload an image and select a pattern first.");
        return;
    }

    showLoading("Generating autostereogram...");

    // Use requestAnimationFrame to let the loading screen render
    requestAnimationFrame(() => {
        setTimeout(() => {
            try {
                const amplitude = parseFloat(amplitudeSlider.value);
                const stripWidth = parseInt(patternWidthSlider.value);
                const invertDepth = invertDepthCheckbox.checked;
                const useRandomDots = selectedPattern.randomDots;

                // Get depth map data
                const depthCanvas = document.createElement("canvas");
                const width = depthMapImage.naturalWidth || depthMapImage.width;
                const height = depthMapImage.naturalHeight || depthMapImage.height;
                depthCanvas.width = width;
                depthCanvas.height = height;
                const depthCtx = depthCanvas.getContext("2d");
                depthCtx.drawImage(depthMapImage, 0, 0, width, height);
                const depthData = depthCtx.getImageData(0, 0, width, height);

                let patternData;
                if (useRandomDots) {
                    patternData = generateRandomDotsPattern(stripWidth, height);
                } else {
                    patternData = prepareSeamlessPattern(patternImage, stripWidth);
                }

                // Generate stereogram
                const output = createStereogram(width, height, depthData, patternData, stripWidth, amplitude, invertDepth);

                // Draw result
                canvasStereogram.width = width;
                canvasStereogram.height = height;
                const ctx = canvasStereogram.getContext("2d");
                ctx.putImageData(output, 0, 0);
            } catch (err) {
                alert("Generation error: " + err.message);
                console.error(err);
            } finally {
                hideLoading();
            }
        }, 50);
    });
}

function generateRandomDotsPattern(w, h) {
    const data = new ImageData(w, h);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
        if (Math.random() < 0.4) {
            d[i] = Math.random() * 255 | 0;
            d[i + 1] = Math.random() * 255 | 0;
            d[i + 2] = Math.random() * 255 | 0;
        } else {
            d[i] = 128;
            d[i + 1] = 128;
            d[i + 2] = 128;
        }
        d[i + 3] = 255;
    }
    return data;
}

function prepareSeamlessPattern(img, stripWidth) {
    // Resize pattern to stripWidth and blend edges for seamless tiling
    const pH = img.naturalHeight || img.height;
    const canvas = document.createElement("canvas");
    canvas.width = stripWidth;
    canvas.height = pH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, stripWidth, pH);
    const data = ctx.getImageData(0, 0, stripWidth, pH);
    const d = data.data;

    // Save a copy of the original pixel data before blending
    const original = new Uint8ClampedArray(d);

    // Blend the right edge with the left edge for seamless horizontal tiling
    const blendWidth = Math.min(20, Math.floor(stripWidth / 4));
    for (let y = 0; y < pH; y++) {
        for (let bx = 0; bx < blendWidth; bx++) {
            const t = bx / blendWidth; // 0 at seam, 1 at blend boundary
            const rightX = stripWidth - blendWidth + bx;
            const leftX = bx;
            const ri = (y * stripWidth + rightX) * 4;
            const li = (y * stripWidth + leftX) * 4;
            // Right edge blends toward left edge
            d[ri]     = Math.round(original[ri]     * t + original[li]     * (1 - t));
            d[ri + 1] = Math.round(original[ri + 1] * t + original[li + 1] * (1 - t));
            d[ri + 2] = Math.round(original[ri + 2] * t + original[li + 2] * (1 - t));
            // Left edge blends toward right edge
            d[li]     = Math.round(original[li]     * t + original[ri]     * (1 - t));
            d[li + 1] = Math.round(original[li + 1] * t + original[ri + 1] * (1 - t));
            d[li + 2] = Math.round(original[li + 2] * t + original[ri + 2] * (1 - t));
        }
    }

    return data;
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
