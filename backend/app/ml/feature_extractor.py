import numpy as np
from PIL import Image
from typing import List, Dict, Any

STAGE_NAMES = [
    "Seedling",
    "Vegetative",
    "Flowering",
    "Fruit Formation",
    "Maturity"
]

def extract_image_features(image_input) -> np.ndarray:
    """
    Extracts botanical and visual features from plant photograph:
    - Canopy coverage ratio
    - Green Leaf Index (GLI) & Excess Green (ExG)
    - Flower bloom chrominance (yellow spectrum)
    - Ripening fruit chrominance (red spectrum)
    - Unripe fruit clustering chrominance
    - Edge & texture gradient density
    - Color channel distributions (RGB and HSV)
    """
    if isinstance(image_input, (str, bytes)):
        img = Image.open(image_input).convert("RGB")
    elif isinstance(image_input, Image.Image):
        img = image_input.convert("RGB")
    else:
        raise ValueError("Unsupported image input type")

    # Resize to standard analysis resolution (256x256) for robust normalized feature extraction
    img = img.resize((256, 256))
    rgb = np.asarray(img, dtype=np.float32) / 255.0  # (256, 256, 3)
    
    r = rgb[:, :, 0]
    g = rgb[:, :, 1]
    b = rgb[:, :, 2]

    # Convert to HSV representation
    max_c = np.max(rgb, axis=-1)
    min_c = np.min(rgb, axis=-1)
    delta = max_c - min_c + 1e-7

    h = np.zeros_like(max_c)
    # Hue calculation
    mask_r = (max_c == r) & (delta > 1e-5)
    mask_g = (max_c == g) & (delta > 1e-5)
    mask_b = (max_c == b) & (delta > 1e-5)
    
    h[mask_r] = ((g[mask_r] - b[mask_r]) / delta[mask_r]) % 6.0
    h[mask_g] = ((b[mask_g] - r[mask_g]) / delta[mask_g]) + 2.0
    h[mask_b] = ((r[mask_b] - g[mask_b]) / delta[mask_b]) + 4.0
    h = (h / 6.0) % 1.0  # Normalized hue [0, 1]

    s = np.zeros_like(max_c)
    mask_val = max_c > 1e-5
    s[mask_val] = delta[mask_val] / max_c[mask_val]
    v = max_c

    # 1. Botanical Indices
    # Green Leaf Index (GLI) = (2G - R - B) / (2G + R + B + 1e-5)
    gli = (2.0 * g - r - b) / (2.0 * g + r + b + 1e-5)
    # Excess Green Index (ExG) = 2G - R - B
    exg = 2.0 * g - r - b

    # Canopy mask: pixels where green dominates
    canopy_mask = (gli > 0.05) & (s > 0.15) & (v > 0.15)
    canopy_coverage = np.mean(canopy_mask)

    # 2. Flowering Bloom Detection: Yellow petals (Hue ~ 0.10 - 0.18, Saturation > 0.35, Brightness > 0.4)
    yellow_flower_mask = (h >= 0.10) & (h <= 0.18) & (s >= 0.35) & (v >= 0.4)
    flower_ratio = np.mean(yellow_flower_mask)

    # 3. Ripening Fruit Detection: Red/Orange (Hue < 0.07 or Hue > 0.93, Saturation > 0.3, Brightness > 0.25)
    red_fruit_mask = ((h <= 0.07) | (h >= 0.93)) & (s >= 0.30) & (v >= 0.25)
    fruit_ripening_ratio = np.mean(red_fruit_mask)

    # 4. Unripe Green Fruit Feature: High green brightness & distinct hue (Hue 0.20-0.35, Sat > 0.45)
    unripe_fruit_mask = (h >= 0.22) & (h <= 0.35) & (s >= 0.45) & (v >= 0.30)
    unripe_fruit_ratio = np.mean(unripe_fruit_mask)

    # 5. Texture & Gradient Complexity
    # Simple Sobel-like finite difference gradient magnitude
    grad_x = np.abs(rgb[:, 1:, :] - rgb[:, :-1, :])
    grad_y = np.abs(rgb[1:, :, :] - rgb[:-1, :, :])
    mean_grad = (np.mean(grad_x) + np.mean(grad_y)) / 2.0

    features = np.array([
        np.mean(r), np.std(r),
        np.mean(g), np.std(g),
        np.mean(b), np.std(b),
        np.mean(h), np.std(h),
        np.mean(s), np.std(s),
        np.mean(v), np.std(v),
        np.mean(gli), np.percentile(gli, 90),
        np.mean(exg),
        canopy_coverage,
        flower_ratio,
        fruit_ripening_ratio,
        unripe_fruit_ratio,
        mean_grad
    ], dtype=np.float32)

    return features
