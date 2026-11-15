"""Genera los tres iconos PNG con la biblioteca estándar de Python."""
from pathlib import Path
from struct import pack
from zlib import compress, crc32

folder = Path(__file__).resolve().parent / "icons"
folder.mkdir(exist_ok=True)


def chunk(kind, data):
    return pack(">I", len(data)) + kind + data + pack(">I", crc32(kind + data))


def rounded(x, y, left, top, right, bottom, radius):
    cx = min(max(x, left + radius), right - radius)
    cy = min(max(y, top + radius), bottom - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def color(x, y):
    if rounded(x, y, .34, .40, .66, .47, .035):
        return (80, 69, 172)
    if rounded(x, y, .34, .53, .55, .60, .035):
        return (80, 69, 172)
    if rounded(x, y, .25, .29, .75, .71, .09):
        return (250, 248, 255)
    return (80, 69, 172)


for size, name in [(180, "apple-touch-icon"), (192, "icon-192"), (512, "icon-512")]:
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            samples = [color((x + dx) / size, (y + dy) / size)
                       for dx in (.25, .75) for dy in (.25, .75)]
            rows.extend(sum(channel) // 4 for channel in zip(*samples))
    header = pack(">2I5B", size, size, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
    png += chunk(b"IDAT", compress(rows)) + chunk(b"IEND", b"")
    (folder / (name + ".png")).write_bytes(png)
