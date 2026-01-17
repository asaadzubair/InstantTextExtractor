from PIL import Image, ImageDraw

def create_icon(size, filename):
    img = Image.new('RGBA', (size, size), color=(99, 102, 241, 255))
    draw = ImageDraw.Draw(img)
    # Draw a simple "T"
    padding = size // 4
    draw.rectangle([padding, padding, size - padding, padding + size // 10], fill=(255, 255, 255, 255))
    draw.rectangle([size // 2 - size // 20, padding, size // 2 + size // 20, size - padding], fill=(255, 255, 255, 255))
    img.save(filename)

create_icon(16, 'chrome-extension/icons/icon16.png')
create_icon(48, 'chrome-extension/icons/icon48.png')
create_icon(128, 'chrome-extension/icons/icon128.png')
