from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

base_dir = Path("ios/Senderrappios/Images.xcassets/AppIcon.appiconset")
base_dir.mkdir(parents=True, exist_ok=True)

size = 1024
img = Image.new("RGBA", (size, size), "#1D4ED8")
draw = ImageDraw.Draw(img)

pad = 70
draw.rounded_rectangle((pad, pad, size - pad, size - pad), radius=220, fill="#2563EB")

draw.rounded_rectangle((size * 0.18, size * 0.72, size * 0.82, size * 0.79), radius=20, fill="#1E40AF")
draw.rounded_rectangle((size * 0.18, size * 0.81, size * 0.82, size * 0.88), radius=20, fill="#1E3A8A")

font = None
for name in [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Helvetica Neue Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]:
    try:
        font = ImageFont.truetype(name, 430)
        break
    except Exception:
        pass
if font is None:
    font = ImageFont.load_default()

text = "GS"
bbox = draw.textbbox((0, 0), text, font=font)
text_w = bbox[2] - bbox[0]
text_h = bbox[3] - bbox[1]
text_x = (size - text_w) / 2
text_y = (size - text_h) / 2 - 70

draw.text((text_x + 8, text_y + 10), text, font=font, fill="#1E3A8A")
draw.text((text_x, text_y), text, font=font, fill="white")

car_y = int(size * 0.70)
draw.rounded_rectangle((size * 0.32, car_y, size * 0.68, car_y + 95), radius=35, fill="white")
draw.rounded_rectangle((size * 0.40, car_y - 45, size * 0.60, car_y + 25), radius=25, fill="white")
draw.ellipse((size * 0.37, car_y + 70, size * 0.46, car_y + 160), fill="#1E3A8A")
draw.ellipse((size * 0.54, car_y + 70, size * 0.63, car_y + 160), fill="#1E3A8A")

sizes = {
    "Icon-20@2x.png": 40,
    "Icon-20@3x.png": 60,
    "Icon-29@2x.png": 58,
    "Icon-29@3x.png": 87,
    "Icon-40@2x.png": 80,
    "Icon-40@3x.png": 120,
    "Icon-60@2x.png": 120,
    "Icon-60@3x.png": 180,
    "Icon-1024.png": 1024,
}

for filename, px in sizes.items():
    out = img if px == 1024 else img.resize((px, px), Image.Resampling.LANCZOS)
    out.convert("RGB").save(base_dir / filename, format="PNG")

print(f"Generated {len(sizes)} icons in {base_dir}")
