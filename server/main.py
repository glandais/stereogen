import io
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import torch
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from PIL import Image
from transformers import pipeline

depth_estimator = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global depth_estimator
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading Depth Anything V2 model on {device}...")
    depth_estimator = pipeline(
        "depth-estimation",
        model="depth-anything/Depth-Anything-V2-Base-hf",
        device=device,
    )
    print("Model loaded.")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/depth")
async def estimate_depth(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # Resize if too large (max 1024px on longest side)
    max_size = 1024
    if max(image.size) > max_size:
        ratio = max_size / max(image.size)
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size, Image.LANCZOS)

    result = depth_estimator(image)
    depth_map = result["depth"]  # PIL Image

    # Normalize to full 0-255 range
    depth_array = np.array(depth_map, dtype=np.float32)
    d_min, d_max = depth_array.min(), depth_array.max()
    if d_max > d_min:
        depth_array = (depth_array - d_min) / (d_max - d_min) * 255
    depth_array = depth_array.astype(np.uint8)

    # Convert to PNG
    output_image = Image.fromarray(depth_array, mode="L")
    buf = io.BytesIO()
    output_image.save(buf, format="PNG")
    buf.seek(0)

    return Response(content=buf.read(), media_type="image/png")


# Serve frontend static files
_frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/", StaticFiles(directory=str(_frontend_dir), html=True), name="frontend")
