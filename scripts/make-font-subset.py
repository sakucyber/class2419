"""把「ZCOOL KuaiLe」按本站实际用字切成子集，自托管到 src/assets/fonts/。

为什么：
- 站点 CSP 是 font-src 'self'，不能外链 Google Fonts；
- 全量中文字体几 MB，预缓存预算只有 1MB 上下；
- 但校园风的「手账标题感」依赖本机圆体/楷体，安卓机大多没有。
- 解法：用 Google Fonts 的 text= 参数按本站字符动态子集，只打包用到的字。

用法：python scripts/make-font-subset.py
输出：src/assets/fonts/campus-display.woff2（同时打印字符数与体积）
"""
import json
import pathlib
import re
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "fonts" / "campus-display.woff2"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"


def collect_text() -> str:
    """收集站点的真实用字：数据 JSON + 文章 Markdown + 常用 UI 文案。"""
    parts: list[str] = []
    for p in (ROOT / "src" / "data").rglob("*.json"):
        parts.append(p.read_text(encoding="utf-8"))
    for p in (ROOT / "src" / "data" / "articles").rglob("*.md"):
        parts.append(p.read_text(encoding="utf-8"))
    # UI 固定文案（标题、按钮、设置项等，保证界面字全覆盖）
    parts.append(
        "新屋岭初级中学班级空间首页相册视频文章关于搜索收藏设置我的打卡公告荣誉墙"
        "中考倒计时天时分秒初中三年进度了解我们逛逛随机回忆查看最新全部最新最早标题"
        "分类网格瀑布流加载更多没有找到相关内容换个关键词试试或前往列表看看全部相册视频文章标签"
        "分钟约作者返回首页去看看页面走丢了这份地址不存在你可以回到首页或去逛逛继续浏览本站"
        "数据管理导出备份导入重置本地数据清除浏览器数据会导致这些内容全部丢失建议定期"
        "安装到桌面已安装当前已是安装状态已取消安装安装指南关于本站项目技术栈部署数据来源视觉"
        "主题亮暗跟随系统强调色字号标准大中小动效与质感启用页面液态玻璃关闭后减少动画"
        "风格明暗可自由组合设置会保存在本机当前风格原版青春校园纸质年鉴 Japandi 硬边杂志"
        "操作失败请重试加载中上一篇下一篇相关推荐更多推荐全部下载收藏已收藏分享复制链接"
        "链接已复制播放速度画中画全屏音量播放暂停重新加载视频源暂不可用本地媒体可能已被清理"
        "整段加载转码中请稍候正在缓冲只能边下边看跳过预载直接播放加载用时打开浏览器不支持视频"
        "今日打卡点击留下今日脚印累计天您今日已打卡第次空还没有任何内容去添加"
        "访问地址说明打不开时先切换网络备用地址可能失效请优先保存永久地址纯前端静态站点"
        "数据仅保存在本地浏览器Class of 2027 EST 2024我们是班聚是一团火散是满天星"
        "笔锋所至皆是心之所向稳住咔嚓把时光存档动态记录声临其境笔尖下叁No.Class Plate"
    )
    text = "".join(parts)
    # 去重并保持稳定顺序（标点数字字母都要，字体子集越小越好，先过滤非展示用字符）
    seen: dict[str, None] = {}
    for ch in text:
        if ch.strip() or ch in "，。：；·！？…—":
            seen.setdefault(ch)
    return "".join(seen)


def main() -> None:
    text = collect_text()
    print(f"用字 {len(text)} 个")
    url = (
        "https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&display=swap&text="
        + urllib.parse.quote(text)
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    css = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
    # 子集请求的地址是 /l/font?kit=…（无扩展名），完整 CSS 则是 …woff2
    m = re.search(r"src:\s*url\((https://[^)]+)\)", css)
    if not m:
        raise SystemExit("没能在返回的 CSS 里找到字体地址")
    font_url = m.group(1)
    req = urllib.request.Request(font_url, headers={"User-Agent": UA})
    data = urllib.request.urlopen(req, timeout=60).read()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(data)
    print(f"已写入 {OUT}（{len(data) / 1024:.0f} KB）")


if __name__ == "__main__":
    main()
