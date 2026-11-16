"""把多文件静态站点打包成一个可双击运行的单文件 HTML。

用法：python build.py
产物：dist/CS-LITE.html（单文件，离线可玩）与 dist/CS-LITE.zip
"""

import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"

MODULES = [
    "utils",
    "config",
    "input",
    "audio",
    "hud",
    "world",
    "player",
    "weapons",
    "bots",
    "main",
]

EXPORT_NAME = re.compile(
    r"^export\s+(?:const|let|var|function|class|async\s+function)\s+([A-Za-z_$][\w$]*)",
    re.M,
)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def bundle_three() -> str:
    source = read(ROOT / "vendor" / "three.module.js")
    match = re.search(r"export\s*\{([^{}]*)\};?\s*$", source)
    if not match:
        raise SystemExit("未找到 three.js 的导出块，vendor 文件可能已更新。")

    names = [item.strip() for item in match.group(1).split(",") if item.strip()]
    body = source[: match.start()]
    entries = ",\n".join(f"  {name}" for name in names)
    return f"const THREE = (function () {{\n{body}\nreturn {{\n{entries}\n}};\n}})();\n"


def bundle_module(name: str) -> str:
    source = read(ROOT / "src" / f"{name}.js")
    exported = EXPORT_NAME.findall(source)

    source = re.sub(r"^import\s[^\n]*;\s*$", "", source, flags=re.M)
    source = re.sub(
        r"^export\s+(?=(?:const|let|var|function|class|async\s+function)\b)",
        "",
        source,
        flags=re.M,
    )

    if not exported:
        return f"(() => {{\n{source}\n}})();\n"

    returns = ", ".join(exported)
    return (
        f"const __module_{name} = (() => {{\n{source}\nreturn {{ {returns} }};\n}})();\n"
        f"const {{ {returns} }} = __module_{name};\n"
    )


def main() -> None:
    chunks = [bundle_three()]
    chunks += [bundle_module(name) for name in MODULES]
    bundle = "\n".join(chunks)

    if "</script" in bundle:
        raise SystemExit("打包内容中出现 </script，需要转义后再内联。")

    html = read(ROOT / "index.html")
    css = read(ROOT / "styles.css")

    html = html.replace(
        '<link rel="stylesheet" href="./styles.css" />',
        f"<style>\n{css}\n</style>",
    )
    html = re.sub(r"\s*<script type=\"importmap\">[\s\S]*?</script>", "", html)
    bundled_script = "<script>\n'use strict';\n" + bundle + "</script>"
    html = html.replace(
        '<script type="module" src="./src/main.js"></script>',
        bundled_script,
    )

    DIST.mkdir(exist_ok=True)
    out = DIST / "CS-LITE.html"
    out.write_text(html, encoding="utf-8")

    readme = DIST / "使用说明.txt"
    readme.write_text(
        "CS-LITE · 沙漠突围\n\n"
        "双击 CS-LITE.html，用 Chrome / Edge 打开即可开始游戏，"
        "无需联网、无需安装。\n"
        "进入后点击「进入战场」会锁定鼠标，按 Esc 暂停并释放鼠标。\n\n"
        "操作：WASD 移动 / 鼠标瞄准 / 左键射击 / 右键开镜（AWP）/ R 换弹 / "
        "1 2 3 换枪 / Shift 静步 / Ctrl 蹲下 / 空格跳跃 / Tab 计分板\n",
        encoding="utf-8-sig",
    )

    archive = DIST / "CS-LITE.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.write(out, out.name)
        zf.write(readme, readme.name)

    print(f"单文件: {out}  ({out.stat().st_size / 1024 / 1024:.2f} MB)")
    print(f"压缩包: {archive}  ({archive.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
