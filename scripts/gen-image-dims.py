"""扫描 public/images 下的所有图片，生成固有尺寸表 src/data/image-dims.json。

为什么需要：
- <img> 带 width/height 属性，浏览器才能在图片解码前就预留好位置；
  没有的话，图片加载完成的瞬间容器高度会变，CLS 上升。
- 现在所有图片都是**按固定比例裁切**显示的（aspect-ratio + object-fit: cover），
  布局本身不跳；但真实照片上线后，比例不再统一，这个预留就起作用了。
- 顺带把「真实素材管线」的最后一环补上：尺寸表由脚本生成，
  以后老师同学提供新照片，只要放进 public/images/ 再跑一次这个脚本即可，
  不必手工改数据。

用法：python scripts/gen-image-dims.py
输出：src/data/image-dims.json（{ 路径: [宽, 高] }）
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
IMAGES = ROOT / "public" / "images"
OUT = ROOT / "src" / "data" / "image-dims.json"

RASTER = (".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif")


def svg_size(path: pathlib.Path) -> tuple[int, int] | None:
    """从 SVG 的 viewBox / width / height 里取固有尺寸。"""
    text = path.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r'viewBox\s*=\s*"([\d.\s-]+)"', text)
    if m:
        parts = m.group(1).split()
        if len(parts) == 4:
            try:
                return int(round(float(parts[2]))), int(round(float(parts[3])))
            except ValueError:
                pass
    w = re.search(r'\bwidth\s*=\s*"([\d.]+)', text)
    h = re.search(r'\bheight\s*=\s*"([\d.]+)', text)
    if w and h:
        try:
            return int(round(float(w.group(1)))), int(round(float(h.group(1))))
        except ValueError:
            return None
    return None


def raster_size(path: pathlib.Path) -> tuple[int, int] | None:
    """位图的固有尺寸：优先读文件头，不依赖 Pillow。

    PNG：IHDR 里的宽高在固定偏移处。
    JPEG：扫描 SOF 段。
    WebP：VP8 / VP8L / VP8X 三种容器。
    """
    data = path.read_bytes()
    suffix = path.suffix.lower()

    if suffix == ".png" and len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
        return (
            int.from_bytes(data[16:20], "big"),
            int.from_bytes(data[20:24], "big"),
        )

    if suffix in (".jpg", ".jpeg"):
        i = 2
        while i < len(data) - 9:
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                i += 2
                continue
            seg_len = int.from_bytes(data[i + 2 : i + 4], "big")
            # SOF0..SOF15（排除 DHT=C4 / JPG=C8 / DAC=CC）
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                return (
                    int.from_bytes(data[i + 7 : i + 9], "big"),
                    int.from_bytes(data[i + 5 : i + 7], "big"),
                )
            i += 2 + seg_len
        return None

    if suffix == ".webp" and len(data) >= 30:
        if data[12:16] == b"VP8 ":
            return (
                int.from_bytes(data[26:28], "little") & 0x3FFF,
                int.from_bytes(data[24:26], "little") & 0x3FFF,
            )
        if data[12:16] == b"VP8L":
            bits = int.from_bytes(data[21:25], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
        if data[12:16] == b"VP8X":
            return (
                int.from_bytes(data[24:27], "little") + 1,
                int.from_bytes(data[27:30], "little") + 1,
            )

    return None


def main() -> None:
    result: dict[str, list[int]] = {}
    skipped: list[str] = []

    for path in sorted(IMAGES.rglob("*")):
        if not path.is_file():
            continue
        suffix = path.suffix.lower()
        size: tuple[int, int] | None = None
        if suffix == ".svg":
            size = svg_size(path)
        elif suffix in RASTER:
            size = raster_size(path)
        if size and size[0] > 0 and size[1] > 0:
            key = "/" + path.relative_to(ROOT / "public").as_posix()
            result[key] = [size[0], size[1]]
        elif suffix in RASTER or suffix == ".svg":
            skipped.append(path.name)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"已写入 {OUT.relative_to(ROOT)}：{len(result)} 张图片的固有尺寸")
    if skipped:
        print(f"跳过（读不出尺寸）{len(skipped)} 个：{', '.join(skipped[:8])}")


if __name__ == "__main__":
    main()
