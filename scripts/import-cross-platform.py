"""Import the two reviewed screenshot sets without starting or modifying source apps."""
from pathlib import Path
import json
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
def read(p): return json.loads((ROOT / p).read_text(encoding='utf-8'))
def save(p, data): (ROOT / p).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
fresh = [('index','商城首页'),('category','商品分类'),('product-detail','商品详情'),('cart','购物车'),('checkout','订单结算'),('orders','我的订单'),('profile','个人中心'),('login','登录'),('membership','会员中心'),('support','客服支持'),('seller-dashboard','商家概览'),('seller-products','商家商品'),('seller-orders','商家订单'),('seller-profile','商家资料'),('admin-dashboard','管理概览'),('admin-products','商品管理'),('admin-orders','订单管理'),('admin-users','用户管理')]
configs = [
 ('fresh-miniapp','生鲜商城小程序','Fresh Miniapp','小程序','D:/Work/app/fresh-miniapp', ['TypeScript','微信小程序','Spring Boot','MySQL'], [(a+'__'+a+'.png',b) for a,b in fresh], ['商品选购与结算','会员与个人中心','商家商品与订单','管理员工作台'], '使用微信开发者工具导入 miniprogram；后端在 backend，使用 Spring Boot 与 MySQL，需配置自己的 AppID、接口地址及数据库。'),
 ('harmony-shop','HarmonyOS 网上商城','HarmonyOS Shop','鸿蒙','D:/project/harmonyOS/work/shoping',['ArkTS','ArkUI','Preferences'], [(f'{i:02}-{n}.png',n) for i,n in enumerate(['登录','用户注册','商城首页','商品详情','购物车','待支付','我的订单','个人中心','淘宝网页'],1)], ['账号登录与注册','商品浏览与购物车','订单与个人中心','内嵌网页'], '使用 DevEco Studio 导入 3501392850Mall/Mall；工程配置 HarmonyOS 6.0.1（API 21），使用 ArkTS、ArkUI 和 Preferences。支付页面不代表已接入真实支付。')]
assets=read('src/content/project-assets.json'); entries=read('src/content/new-projects.json'); manifest=read('docs/素材导入清单.json')
for slug,name,english,platform,source,tags,files,modules,note in configs:
    directory=Path(source)/'screenshots/项目截图'
    dest=ROOT/'public/images/projects'/slug; dest.mkdir(parents=True,exist_ok=True)
    def convert(file,stem,caption):
        with Image.open(directory/file) as img:
            img=img.convert('RGB'); w,h=img.size
            img.save(dest/(stem+'.webp'),'WEBP',quality=94)
            img.thumbnail((850,1300) if stem=='overview' else (480,1050))
            img.save(dest/(stem+'-preview.webp'),'WEBP',quality=88)
        base='/images/projects/'+slug+'/'+stem
        return dict(src=base+'-preview.webp',fullSrc=base+'.webp',alt=caption,caption=caption,width=w,height=h)
    assets[slug]=dict(cover=convert('页面总览.jpg','overview',name+' · 页面总览'),images=[convert(file,f'screen-{i:02}',caption) for i,(file,caption) in enumerate(files,1)])
    desc=('面向生鲜选购场景，提供用户、商家与管理员三类页面，包含商品分类、详情、购物车、订单和会员等界面。' if platform=='小程序' else '基于鸿蒙的商城应用，包含登录注册、商品详情、购物车、订单与个人中心，并提供内嵌淘宝网页入口。')
    entry=dict(slug=slug,name=name,english=english,platform=platform,category='电商购物',summary=desc,tagline=modules[0]+'，了解完整页面流程。',description=desc,color='mint' if platform=='小程序' else 'peach',keywords=[name,platform,*tags,*modules],tags=tags,features=[dict(title=m,text='对应界面见项目截图，实际数据与业务流程需结合源码配置核对。',icon='code') for m in modules],story=[dict(title='项目场景',text=desc),dict(title='开发与运行',text=note)],runtime=dict(minSdk=None,compileSdk=None,languages=['TypeScript','Java'] if platform=='小程序' else ['ArkTS'],note=note),previewNotice='展示项目已有截图，本次未重新启动应用。具体运行、接口与交付范围请购买前确认。')
    entries=[e for e in entries if e['slug']!=slug]+[entry]
    manifest=[e for e in manifest if e['slug']!=slug]+[dict(slug=slug,folder=platform+'商城截图',cover='页面总览.jpg',count=len(files))]
save('src/content/project-assets.json',assets);save('src/content/new-projects.json',entries);save('docs/素材导入清单.json',manifest)
print('Imported 2 projects, 27 screenshots and 2 overview covers.')
