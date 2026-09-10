"""Read source evidence for reviewed additions, without copying source or credentials."""
from pathlib import Path
import json,re,zipfile
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'scripts/new-projects.json').read_text(encoding='utf8'))
rows+=json.loads((ROOT/'scripts/remaining-projects.json').read_text(encoding='utf8'))
archives={
 'custom-login-shop':'定制/Login电商app/Login.zip',
 'custom-jd-shop':'定制/京东app/e-commerce.zip',
 'custom-dessert':'定制/甜品定制文档/DessertApp.zip',
 'driver-classic':'咸鱼可出/驾考宝典app演示视频/Driverapp.zip',
 'switch-account-chat':'咸鱼可出/切换账号聊天app/chatapp.zip',
 'wechat-ai-chat':'咸鱼可出/微信聊天app一个人聊天ai回复/chatapp.zip',
}
result=[]
report=[]
for slug,folder,name,category,summary,modules in rows:
    directory=Path('D:/project/项目截图')/(folder+'静态预览')
    manifest=(directory/'页面清单.md').read_text(encoding='utf8')
    match=re.search(r'页面资源目录：`([^`]+)`',manifest)
    main=Path(match[1]) if match else Path('D:/project/a')/folder/'app/src/main'
    files=list(main.rglob('*.java'))+list(main.rglob('*.kt'))
    source='\n'.join(p.read_text(encoding='utf8',errors='replace') for p in files)
    builds=list(main.parent.parent.glob('build.gradle*'))
    build='\n'.join(p.read_text(encoding='utf8') for p in builds)
    if slug in archives:
        archive=Path('D:/project/a')/archives[slug]
        with zipfile.ZipFile(archive) as z:
            names=z.namelist()
            files=[Path(n) for n in names if '/src/main/' in n and n.endswith(('.java','.kt'))]
            source='\n'.join(z.read(str(p).replace('\\','/')).decode('utf8',errors='replace') for p in files)
            builds=[Path(n) for n in names if n.endswith(('/app/build.gradle','/app/build.gradle.kts'))]
            build='\n'.join(z.read(str(p).replace('\\','/')).decode('utf8',errors='replace') for p in builds)
    minima=set(re.findall(r'minSdk(?:Version)?\s*=?\s*(\d+)',build))
    compile_versions=set(re.findall(r'compileSdk(?:Version)?\s*=?\s*(\d+)',build))
    languages=[lang for ext,lang in [('.java','Java'),('.kt','Kotlin')] if any(p.suffix==ext for p in files)]
    tags=['Android']+languages
    for tag,term in [('SQLite','SQLiteOpenHelper'),('Room','androidx.room'),('Retrofit','retrofit'),('OkHttp','okhttp'),('Glide','glide'),('Jetpack Compose','@Composable'),('PyTorch','pytorch'),('高德地图 SDK','amap'),('ZXing','zxing')]:
        if term.lower() in (source+build).lower(): tags.append(tag)
    modules=modules.split('|')
    description=f'{name}是一款 Android 项目，页面覆盖'+ '、'.join(modules)+'。可通过总览与独立界面了解功能范围，再结合技术与运行要求确认是否适合你的需求。'
    if len(minima)==1 and len(compile_versions)==1:
        minimum=int(next(iter(minima)));compile_sdk=int(next(iter(compile_versions)))
        spec=f'源码配置 minSdk {minimum}、compileSdk {compile_sdk}。请安装对应 Android SDK，并按工程的 Gradle 与 JDK 配置导入 Android Studio。'
    else:
        minimum=None;compile_sdk=None
        spec=('源码同时包含不同 Gradle 配置：minSdk '+ '/'.join(sorted(minima))+'，compileSdk '+ '/'.join(sorted(compile_versions))+'。购买前需确认使用的构建文件与运行版本。') if minima and compile_versions else '已同步项目页面素材；当前可读取资料未能确认构建配置，开发语言、数据库与最低运行版本需购买前确认。'
    result.append(dict(slug=slug,name=name,english=folder,category=category,summary=summary,tagline=summary,description=description,color='cream',keywords=[folder,name]+modules,tags=tags,
        features=[dict(title=m,text=f'已有对应的{m}页面展示，可查看截图了解入口、字段和页面组织；具体业务效果以应用运行结果为准。',icon='grid') for m in modules],
        story=[dict(title='页面与功能组织',text='本次页面清单覆盖'+ '、'.join(modules)+'，总览用于查看整体结构，独立截图用于查看页面细节。'),dict(title='源码与技术组成',text='在对应工程源码与依赖中核对到：'+ '、'.join(tags)+'。'+spec)],
        runtime=dict(minSdk=minimum,compileSdk=compile_sdk,note=spec,languages=languages),
        previewNotice='图片依据项目源码静态还原，尚未编译、安装或运行验证；动态数据、网络服务与识别结果以实际运行配置为准。'))
    report.append(dict(slug=slug,source=str(main),builds=[str(p) for p in builds],tags=tags,runtime=spec))
(ROOT/'src/content/new-projects.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(ROOT/'docs/新增项目技术核对.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Verified',len(result),'project source trees')
