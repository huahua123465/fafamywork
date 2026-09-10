"""Import reviewed screenshot projects. Source folders are read-only."""
from pathlib import Path
from PIL import Image, ImageOps
import json
import re
import shutil
import filecmp

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('D:/project/项目截图')
MAPPING = [
    ('flower-shop', 'aflowershop静态预览', '14张页面总览.png', '全部14张'),
    ('travel', 'Android_app-行旅静态预览', '页面总览.jpg', '全部页面'),
    ('boxuegu', 'BoXueGu75静态预览', '页面总览.jpg', '全部页面'),
    ('campus-swap', 'CampusSwap静态预览', '页面总览.jpg', '全部页面'),
    ('chat-app', 'chatapp静态预览', '页面总览.jpg', ''),
    ('ai-chat', 'chatapp一个人聊天静态预览', '页面总览.jpg', ''),
    ('community-share', 'CommunitySharedItemsSystem静态预览', '页面总览.jpg', ''),
    ('computer-sales', 'ComputerSales静态预览', '页面总览.jpg', ''),
    ('dessert-shop', 'DessertApp甜品店静态预览', '页面总览.jpg', ''),
    ('e-commerce', 'e-commerce静态预览', '18页总览.png', '全部18页'),
    ('garment-shop', 'GarmentShopping服装商城静态预览', '页面总览.jpg', ''),
    ('student-attendance', 'StudentAttendance考勤系统静态预览', '页面总览.jpg', ''),
    ('wims', 'WIMS仓库管理静态预览', '页面总览.jpg', ''),
]
NEW = json.loads((ROOT / 'scripts/new-projects.json').read_text(encoding='utf-8'))
NEW += json.loads((ROOT / 'scripts/remaining-projects.json').read_text(encoding='utf-8'))
MAPPING += [(row[0], row[1] + '静态预览', '页面总览.jpg', '') for row in NEW]

def import_image(source: Path, slug: str, stem: str, caption: str, cover=False):
    dest = ROOT / 'public' / 'images' / 'projects' / slug
    dest.mkdir(parents=True, exist_ok=True)
    original = dest / (stem + source.suffix.lower())
    preview = dest / (stem + '-preview.webp')
    unchanged = original.exists() and preview.exists() and filecmp.cmp(source, original, shallow=False)
    if not unchanged:
        shutil.copy2(source, original)
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert('RGB')
        width, height = image.size
        if not unchanged:
            image.thumbnail((850, 1300) if cover else (480, 1050))
            image.save(preview, 'WEBP', quality=91, method=4)
    base = f'/images/projects/{slug}/'
    return {'src': base + preview.name, 'fullSrc': base + original.name,
            'alt': caption, 'caption': caption, 'width': width, 'height': height}

assets = {}
report = []
for slug, folder, overview, child in MAPPING:
    directory = SOURCE / folder
    files = sorted((directory / child).glob('*'), key=lambda p: p.name)
    details = [p for p in files if p.suffix.lower() in ('.png', '.jpg', '.jpeg') and re.match(r'^\d{2}[-_]', p.name)]
    assert details, folder
    cover = import_image(directory / overview, slug, 'overview', f'全部 {len(details)} 张页面总览', True)
    images = []
    for i, source in enumerate(details, 1):
        title = re.sub(r'^\d+[-_]', '', source.stem)
        title = re.sub(r'-(项目自带|静态补齐)$', '', title)
        images.append(import_image(source, slug, f'screen-{i:02}', title))
    assets[slug] = {'cover': cover, 'images': images}
    report.append({'slug': slug, 'folder': folder, 'cover': overview, 'count': len(images)})

(ROOT / 'src/content/project-assets.json').write_text(json.dumps(assets, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(ROOT / 'docs/素材导入清单.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'projects': len(assets), 'screens': sum(len(a['images']) for a in assets.values())}, ensure_ascii=False))
