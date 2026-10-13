import type { SkinServiceLanguage } from "./skinServiceI18n";

export type SkinArticleCategory = "introduction" | "tools" | "creation" | "preparation" | "publishing" | "pricing" | "review" | "privacy";
export type DeveloperSourceKind = "official" | "tutorial" | "tools" | "community";
export type DeveloperSourceFormat = "article" | "video" | "tool" | "repository" | "news";
export interface DeveloperSource {
  title: string;
  href: string;
  kind: DeveloperSourceKind;
  format: DeveloperSourceFormat;
  publisher: string;
  language: "zh-CN" | "en";
  referenceHref?: string;
  publishedAt?: string;
  checkedAt?: string;
}
type LocalizedText = Record<SkinServiceLanguage, string>;
const localized = (zhCN: string, en: string, ja: string): LocalizedText => ({ "zh-CN": zhCN, en, ja });

export const developerResourcesCompiledAt = "2026-10-13";

const officialSource = (title: string, path: string, kind: DeveloperSourceKind = "official"): DeveloperSource => ({
  title,
  href: encodeURI(`https://mc.163.com/dev/mcmanual/mc-dev/${path}.html`),
  kind,
  format: "article",
  publisher: "网易《我的世界》开发者官网",
  language: "zh-CN",
});

const communityVideo = (title: string, id: string, publisher: string): DeveloperSource => ({
  title,
  href: `https://www.bilibili.com/video/${id}/`,
  kind: "community",
  format: "video",
  publisher: `${publisher} · 哔哩哔哩`,
  language: "zh-CN",
});

export const developerSources = {
  registration: officialSource("从零开始注册成为开发者", "mcguide/12-入门教程/10-注册成为开发者"),
  management: officialSource("认识作品管理模块", "mcguide/35-上架与入驻/课程04-认识作品管理模块"),
  upload: officialSource("我的世界中国版资源上传规则", "mcguide/35-上架与入驻/课程11-我的世界中国版资源上传规则"),
  studio: officialSource("包体的结构和导入", "mconline/10-addon教程/第18章：打包导出你的作品/课程01.包体的结构和导入", "tutorial"),
  pricing: officialSource("资源定价规则说明", "mcguide/35-上架与入驻/课程02-资源定价规则说明"),
  levels: officialSource("开发者等级说明", "mcguide/32-开发者账号与团队/课程14-开发者等级"),
  sync: officialSource("一键同步手机版组件至电脑版组件中心功能介绍", "mcguide/35-上架与入驻/课程14-一键同步手机版组件至电脑版组件中心功能介绍"),
  toolInstall: officialSource("安装MCSkin3D", "mconline/5-游戏入门与基础讲解/20-关于开发者账号和工具/4-安装与了解皮肤工具/2-安装MCSkin3D", "tools"),
  toolBasics: officialSource("MCSkin3D功能简介", "mconline/5-游戏入门与基础讲解/20-关于开发者账号和工具/4-安装与了解皮肤工具/3-MCSkin3D功能简介", "tools"),
  toolMobile: officialSource("Skinseed简介", "mconline/5-游戏入门与基础讲解/20-关于开发者账号和工具/4-安装与了解皮肤工具/1-Skinseed简介", "tools"),
  toolWeb: officialSource("PMCSkin3D简介", "mconline/5-游戏入门与基础讲解/20-关于开发者账号和工具/4-安装与了解皮肤工具/4-PMCSkin3D简介", "tools"),
  mcskin3dWorkshop: {
    ...officialSource("软件学习：MCskin3D软件教程", "mconline/60-我的世界创造营教程/皮肤制作基础教程/5-软件学习：MCskin3D软件教程", "tools"),
    checkedAt: "2026-10-13",
  },
  colorUvBasics: {
    ...officialSource("了解基础", "mconline/5-游戏入门与基础讲解/21-皮肤设计/2-了解基础", "tutorial"),
    checkedAt: "2026-10-13",
  },
  outerLayerDesign: {
    ...officialSource("独特设计", "mconline/5-游戏入门与基础讲解/21-皮肤设计/4-独特设计", "tutorial"),
    checkedAt: "2026-10-13",
  },
  studySkinStyles: {
    ...officialSource("分析优秀作品", "mconline/5-游戏入门与基础讲解/21-皮肤设计/5-分析优秀作品", "tutorial"),
    checkedAt: "2026-10-13",
  },
  posLayout: {
    ...officialSource("展示图（pos图）设计", "mconline/5-游戏入门与基础讲解/23-作品发布、品牌建立/5-展示图（pos图）设计", "tutorial"),
    checkedAt: "2026-10-13",
  },
  keyArtLayout: {
    ...officialSource("关键艺术作品（Key Art）设计", "mconline/5-游戏入门与基础讲解/23-作品发布、品牌建立/3-关键艺术作品", "tutorial"),
    checkedAt: "2026-10-13",
  },
  carouselLayout: {
    ...officialSource("轮播图设计与排列", "mconline/5-游戏入门与基础讲解/23-作品发布、品牌建立/4-轮播图设计", "tutorial"),
    checkedAt: "2026-10-13",
  },
  publishingImageCheck: {
    ...officialSource("发布与优化", "mconline/5-游戏入门与基础讲解/23-作品发布、品牌建立/6-发布与优化", "tutorial"),
    checkedAt: "2026-10-13",
  },
  planning: officialSource("制作皮肤的步骤和规范", "mconline/60-我的世界创造营教程/皮肤制作基础教程/3-制作皮肤的步骤和规范", "tutorial"),
  head: officialSource("MCskin3d 绘制皮肤－新建及头部的绘制", "mconline/40-美术教程/1.皮肤教程/03.MCskin3d 绘制皮肤.新建及头部的绘制", "tutorial"),
  body: officialSource("MCskin3d 绘制皮肤－身体的绘制", "mconline/40-美术教程/1.皮肤教程/04.MCskin3d 绘制皮肤.身体的绘制", "tutorial"),
  limbs: officialSource("MCskin3d 绘制皮肤－四肢的绘制及完稿", "mconline/40-美术教程/1.皮肤教程/05.MCskin3d 绘制皮肤.四肢的绘制及完稿", "tutorial"),
  shading: officialSource("皮肤设计：进阶技巧", "mconline/5-游戏入门与基础讲解/21-皮肤设计/3-进阶技巧", "tutorial"),
  model: officialSource("皮肤设计：上传并发布", "mconline/5-游戏入门与基础讲解/21-皮肤设计/7-上传并发布", "tutorial"),
  testing: officialSource("皮肤设计：导入与测试", "mconline/5-游戏入门与基础讲解/21-皮肤设计/6-导入与测试", "tutorial"),
  resolution: officialSource("让角色与众不同：了解皮肤的概念", "mconline/40-美术教程/1.皮肤教程/01.让角色与众不同.了解皮肤的概念", "tutorial"),
  marketing: officialSource("宣传与上传：制作宣传图并且上架开发者平台", "mconline/60-我的世界创造营教程/皮肤制作基础教程/7-宣传与上传：制作宣传图并且上架开发者平台", "tutorial"),
  submission: officialSource("正确上传作品的方式及途径", "mcguide/35-上架与入驻/课程05-正确上传作品的方式及途径"),
  developerFaq: officialSource("开发者常见问题汇总", "mcguide/50-常见问题答疑/86-开发者常见问题汇总"),
  contentReview: officialSource("开发者内容审核制度介绍", "mcguide/36-审核与下架/课程02-开发者内容审核制度介绍"),
  machineReview: officialSource("机器审核流程及指标介绍", "mcguide/36-审核与下架/课程03-机器审核流程及指标介绍"),
  videoExport: officialSource("作品视频格式导出与规范", "mcguide/35-上架与入驻/课程06-作品视频格式导出与规范"),
  packagingErrors: officialSource("我的世界中国版打包错误信息汇整", "mcguide/50-常见问题答疑/60-我的世界中国版打包错误信息汇整"),
  listingStandards: officialSource("组件上架的规范及过审攻略", "mcguide/35-上架与入驻/课程03-组件上架的规范及过审攻略"),
  clientTesting: officialSource("在手机和电脑上测试你的作品", "mconline/10-addon教程/第18章：打包导出你的作品/课程03.在手机和电脑上测试你的作品"),
  skinPackMirror: {
    title: "认识作品结构与打包：皮肤（EaseCation 文档镜像）",
    href: encodeURI("https://mcwiki.easecation.net/mconline/15-玩法组件教程/17-打包、导出并测试你的作品/1-认识作品结构与打包.html"),
    kind: "community" as const,
    format: "article" as const,
    publisher: "EaseCation 社区文档镜像",
    language: "zh-CN" as const,
  },
  blockbenchProject: {
    title: "Blockbench — README & License", href: "https://github.com/JannisX11/blockbench",
    kind: "tools", format: "repository", publisher: "JannisX11 / Blockbench", language: "en",
  },
  blockbenchWeb: {
    title: "Blockbench Web App", href: "https://web.blockbench.net/",
    kind: "tools", format: "tool", publisher: "Blockbench", language: "en",
  },
  blockbenchQuickstart: {
    title: "Blockbench Quickstart Wizard", href: "https://blockbench.net/quickstart/",
    kind: "tools", format: "article", publisher: "Blockbench", language: "en",
  },
  blockbenchFaq: {
    title: "Blockbench FAQ", href: "https://blockbench.net/wiki/blockbench/faq/",
    kind: "tools", format: "article", publisher: "Blockbench · JannisX11", language: "en",
    checkedAt: "2026-10-13",
  },
  blockbenchOverview: {
    title: "Blockbench Overview & Tips", href: "https://blockbench.net/wiki/guides/blockbench-overview-tips/",
    kind: "tools", format: "article", publisher: "Blockbench · MasterianoX", language: "en",
    checkedAt: "2026-10-13",
  },
  gimpProjectExport: {
    title: "Getting Images out of GIMP", href: "https://docs.gimp.org/3.0/en/gimp-images-out.html",
    kind: "tools", format: "article", publisher: "GIMP 官方用户手册", language: "en", checkedAt: "2026-10-13",
  },
  gimpPixelSize: {
    title: "Scale Image", href: "https://docs.gimp.org/3.0/en/gimp-image-scale.html",
    kind: "tools", format: "article", publisher: "GIMP 官方用户手册", language: "en", checkedAt: "2026-10-13",
  },
  gimpAddAlpha: {
    title: "Add Alpha Channel", href: "https://docs.gimp.org/3.0/en/gimp-layer-alpha-add.html",
    kind: "tools", format: "article", publisher: "GIMP 官方用户手册", language: "en", checkedAt: "2026-10-13",
  },
  gimpTransparentExport: {
    title: "Saving Images with Transparency", href: "https://docs.gimp.org/3.0/en/gimp-using-web-transparency.html",
    kind: "tools", format: "article", publisher: "GIMP 官方用户手册", language: "en", checkedAt: "2026-10-13",
  },
  videoSkin: {
    title: "This is how you upgrade to a HD minecraft skin", href: "https://www.youtube.com/watch?v=xC81Q3HGraE",
    kind: "community", format: "video", publisher: "ArtsByKev · YouTube", language: "en",
    referenceHref: "https://blockbench.net/quickstart/",
  },
  videoInterface: {
    title: "LEARN BLOCKBENCH #1 - 3D Interface Basics for Beginners", href: "https://www.youtube.com/watch?v=U9FLteWmFzg",
    kind: "community", format: "video", publisher: "ArtsByKev · YouTube", language: "en",
    referenceHref: "https://blockbench.net/quickstart/",
  },
  videoLowPoly: {
    title: "How to create a Low Poly 3D MODEL | Tutorial", href: "https://www.youtube.com/watch?v=WbyCbA1c8BM",
    kind: "community", format: "video", publisher: "Blockbench · YouTube", language: "en",
    referenceHref: "https://blockbench.net/quickstart/",
  },
  videoChinaUpload: communityVideo("网易我的世界自制皮肤上传详细教程！", "BV1bT421r7eH", "绯色色i"),
  videoChinaUploadFollowup: communityVideo("一个视频教你如何上传皮肤到网易", "BV1gLkDBeEQK", "想吃鱼的小狗awa"),
  videoMcskin3d: communityVideo("【德猫/Minecraft】教练我想学皮肤|手把手讲解MCSKIN3D", "BV1sb411B7Ya", "爱吃胡洛卜德猫"),
  videoSkinseedClothing: communityVideo("【我的世界皮肤教程/skinseed】那些漂亮衣服是怎么做的呢？", "BV1LB4y1a71S", "罗小娜咕了"),
  videoSkinEyes: communityVideo("【我的世界皮肤教程】盘点一下做皮肤的眼睛样式", "BV1kb411X7m8", "罗小娜咕了"),
  videoSkinGradient: communityVideo("我的世界新手皮肤制作教程——渐变制作", "BV1Fa41117ui", "罗小娜咕了"),
  videoSkinResolution: communityVideo("如何绘制64皮肤并把它绘制为128皮肤（我的世界皮肤教程）", "BV1CL411N7En", "晴空南浅酱"),
  videoBlockbenchPaint: communityVideo("你也许会需要的blockbench皮肤绘画教程[blockbench教程/白歌Dahurian]", "BV1fSE4zBETV", "白歌Dahurian"),
  videoBlockbenchModelLayers: communityVideo("【MC皮肤教程】Block bench切换皮肤体型、图层、调色插件讲解", "BV11ybKzmE73", "Jzium芥子"),
  videoBlockbenchMobile: communityVideo("Blockbench手机版（网页版）我的世界皮肤绘画教程（软件使用）", "BV1zWNTzmEo1", "屑牲-"),
  videoBlockbenchMobileImport: communityVideo("Blockbench手机版 我的世界皮肤导入教程", "BV15uwbzoEHW", "屑牲-"),
  videoSkinseedHair: communityVideo("Skinseed我的世界皮肤头发教程", "BV1XSNwzsEuF", "屑牲-"),
  videoHeadBasics: communityVideo("【MC皮肤教程】十分钟学会画头！", "BV1JHTbzjEGW", "Jzium芥子"),
  videoHairGradient: communityVideo("保姆级MC头发渐变教程", "BV1TMAQzSE2u", "斯末坚坚子"),
  videoSkinseedExport: communityVideo("如何在skinseed中导出皮肤文件", "BV1FY411Q7Rq", "TAC_两小伙"),
  videoBlockbenchExport: communityVideo("Blockbench导出png图片皮肤我的世界", "BV1iVGyzvEfB", "小夜禾"),
  videoSkinseedIosAlpha: communityVideo("一招解决skinseed在ios端无法导出透明底的问题", "BV1t2r2YpEPw", "StrSpring-13"),
  videoEthanUpload: {
    ...communityVideo("如何将自己的皮肤上传至网易-第一期 ETHAN工作室", "BV1sLg46VEJF", "一只Ethan"),
    publishedAt: "2026-07-23", checkedAt: "2026-10-13",
  },
  videoEthanPublish: {
    ...communityVideo("如何在网易我的世界发布自己的皮肤-第二期", "BV1C3ge6FEfi", "一只Ethan"),
    publishedAt: "2026-07-24", checkedAt: "2026-10-13",
  },
  videoJiangUpload: {
    ...communityVideo("教你网易我的世界上传皮肤", "BV1yubK6aEX7", "Minecraft_江弦月"),
    publishedAt: "2026-09-07", checkedAt: "2026-10-13",
  },
  videoRegister: {
    ...communityVideo("我的世界如何注册开发者", "BV1WtzrBXE3q", "好小的石头人"),
    publishedAt: "2026-01-24", checkedAt: "2026-10-13",
  },
  update37: {
    title: "开发者月刊 | Mod SDK 3.7 功能前瞻",
    href: "https://mc.163.com/dev/developer_cn/news/renew/20251128/37047_1273647.html",
    kind: "official", format: "news", publisher: "网易《我的世界》开发者官网", language: "zh-CN",
  },
} satisfies Record<string, DeveloperSource>;

const sourceUrls = Object.values(developerSources).map(source => new URL(source.href));

export function developerSourceQuery(query: string) {
  const input = query.trim();
  if (/[\t\r\n]/.test(input) || /[?#][^]*\s/u.test(input)) return query;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password) return query;
    const path = decodeURI(url.pathname).replace(/\/$/, "");
    const source = sourceUrls.find(source => source.origin === url.origin
      && decodeURI(source.pathname).replace(/\/$/, "") === path
      && [...source.searchParams].every(([key, value]) => url.searchParams.getAll(key).length === 1 && url.searchParams.get(key) === value));
    return source?.href ?? query;
  } catch { return query; }
}

export const developerResources: Array<{
  id: string;
  category: SkinArticleCategory;
  sourceId: keyof typeof developerSources;
  title: LocalizedText;
  summary: LocalizedText;
}> = [
  {
    id: "developer-gimp-project-export", category: "tools", sourceId: "gimpProjectExport",
    title: localized("GIMP 保存为什么得到 XCF？怎样另导出投稿用 PNG？", "Why does GIMP save XCF, and how do I export a submission PNG?", "GIMPで保存するとXCFになるのはなぜ？投稿用PNGを書き出すには？"),
    summary: localized(
      "GIMP 3.0 官方手册说明：“保存”保留 XCF 工程，包含图层等编辑信息，但不保存撤销（undo）历史；PNG 等其他格式使用“导出”。先留一份工程，再单独导出投稿用纹理，不要只把 .xcf 后缀改成 .png，也不要用工程截图代替纹理。导出不会改变当前工程，普通图片预览软件通常不能读取 XCF。本文是工具操作说明，不是网易上传规格；导出后仍需按目标端的现行规则检查格式、像素尺寸和透明度。",
      "The GIMP 3.0 manual distinguishes Save, which retains an XCF project with layers but no undo history, from Export for PNG and other formats. Keep an editable project and separately export the submission texture; renaming .xcf to .png or taking a screenshot does not produce a texture. Export does not change the current project, and ordinary image viewers generally cannot read XCF. This is tool guidance, not NetEase upload specifications. Check the exported format, pixel dimensions and transparency against current rules for the target edition.",
      "GIMP 3.0公式マニュアルでは「保存」はレイヤーなどを含むXCF制作ファイルを残しますが、取り消し（undo）履歴は保存しません。PNGなどは「エクスポート」を使います。編集用ファイルを保管し、投稿用テクスチャを別に書き出してください。.xcfを.pngに改名したり、画面のスクリーンショットで代用したりしないでください。書き出しても現在の制作ファイルは変わらず、一般的な画像ビューアはXCFを通常読めません。これは操作説明であり、NetEaseの投稿仕様ではありません。対象版の現行規則に従って形式・ピクセル寸法・透明度を確認してください。"),
  },
  {
    id: "developer-gimp-pixel-size", category: "preparation", sourceId: "gimpPixelSize",
    title: localized("修改 DPI 能改变皮肤像素尺寸吗？GIMP 缩放要检查什么？", "Does changing DPI resize a skin's pixels, and what should I check when scaling in GIMP?", "DPIの変更でスキンのピクセル寸法は変わる？GIMPの拡大縮小で何を確認しますか？"),
    summary: localized(
      "官方 Scale Image 说明可通过 Image → Scale Image 修改整个图像和画布的像素数量，不只是当前图层；宽高链条用于保持比例，解除后独立修改可能使图像变形。打印分辨率 DPI 与像素宽高是不同设置，单改 DPI 不能把纹理变成所需像素尺寸。放大通过插值计算像素，不会补出原图没有的细节；过度缩小也可能让小图层消失。先备份工程，按目标格式确认宽高，再导出并检查像素、UV 对齐及预览，不把任意拉伸后的图片当作可直接投稿的皮肤。",
      "The official Scale Image page uses Image → Scale Image to change the pixel count of the entire image and canvas, not just the active layer. The width/height chain preserves proportions; unlinking it may distort the image. Printing resolution in DPI is separate from pixel dimensions: changing DPI alone does not create the required texture size. Upscaling interpolates pixels without recovering detail absent from the original; excessive downscaling can remove small layers. Back up the project, confirm dimensions for the target format, then export and inspect pixels, UV alignment and the preview. Arbitrary stretching is not a submission-ready skin conversion.",
      "公式のScale ImageではImage → Scale Imageで現在のレイヤーだけでなく画像全体とキャンバスのピクセル数を変更します。幅と高さの鎖は縦横比を保ち、解除して別々に変えると歪む場合があります。印刷解像度DPIとピクセル寸法は別で、DPIだけ変えても必要なテクスチャ寸法にはなりません。拡大は補間でピクセルを計算し、元画像にない細部は復元しません。縮小しすぎると小さなレイヤーが消える場合もあります。制作ファイルをバックアップし、対象形式の寸法を確認してから書き出し、ピクセル・UVの位置・プレビューを点検してください。単に引き伸ばした画像を投稿用スキンと考えないでください。"),
  },
  {
    id: "developer-gimp-add-alpha", category: "tools", sourceId: "gimpAddAlpha",
    title: localized("GIMP 图层没有 Alpha 透明通道，应该从哪里添加？", "Where do I add an Alpha channel to a GIMP layer?", "GIMPのレイヤーにAlpha透明チャンネルを追加するには？"),
    summary: localized(
      "GIMP 3.0 官方手册给出 Layer → Transparency → Add Alpha Channel，也可从图层右键菜单操作。Alpha 表示透明度，多数非背景图层已具备，但部分导入格式可能没有；没有 Alpha 的图层名称在图层面板中以粗体显示。为选中图层添加通道后，再检查实际像素和背景，不要把“添加通道”等同于自动去背景或恢复丢失内容。此文解释工具操作，不许可任意隐形皮肤；最终 PNG 是否符合网易要求，仍需查阅官方格式与审核规定。",
      "The GIMP 3.0 manual provides Layer → Transparency → Add Alpha Channel, also available from the layer context menu. Alpha represents transparency. Most non-background layers already have it, but some imported formats may not; layer names without Alpha are bold in the Layers dialog. After adding it to the selected layer, inspect actual pixels and backgrounds. Adding a channel does not automatically remove a background or restore lost content. This tool operation does not authorize arbitrary invisible skins; check official format and review rules for the exported PNG.",
      "GIMP 3.0公式マニュアルはLayer → Transparency → Add Alpha Channelを案内し、レイヤーの右クリックメニューからも操作できます。Alphaは透明度を表します。背景以外の多くのレイヤーにはありますが、一部の読み込み形式にはなく、Alphaのないレイヤー名はレイヤーパネルで太字になります。選択レイヤーへ追加した後、実際のピクセルと背景を確認してください。追加だけで背景を自動削除したり失われた内容を復元したりはできません。操作説明は自由な透明スキンを許可するものではなく、最終PNGには公式の形式・審査規則を確認してください。"),
  },
  {
    id: "developer-gimp-transparent-export", category: "preparation", sourceId: "gimpTransparentExport",
    title: localized("GIMP 如何导出保留透明度的 PNG？棋盘格需要画进去吗？", "How do I export a PNG with transparency in GIMP, and should I paint the checkerboard?", "GIMPで透明度を保つPNGを書き出すには？市松模様を描く必要はありますか？"),
    summary: localized(
      "官方透明图像教程说明 PNG 用 Alpha 通道保存透明度。可在通道面板确认除红、绿、蓝之外是否存在 Alpha；没有时先添加。检查是否有背景图层遮住本应透明的区域，再导出 PNG；编辑器中的棋盘格只是透明区域提示，不是要画进皮肤的纹理。请保留原工程，重新打开导出文件检查透明度，不用截图、JPEG 或仅改后缀代替真正的 PNG。教程以普通图片演示透明导出，不代表皮肤允许任意半透明、隐形或其他审核限制之外的设计，最终以网易现行规则为准。",
      "The official transparency tutorial explains that PNG stores transparency in an Alpha channel. Check for Alpha alongside red, green and blue in the Channels dialog and add it if missing. Inspect background layers covering intended transparent areas before exporting PNG. The editor's checkerboard indicates transparency; it is not texture artwork to paint into a skin. Keep the project and reopen the exported file to inspect transparency. Screenshots, JPEG or merely renaming a suffix do not replace a real PNG. The tutorial uses a general image, not permission for arbitrary translucent or invisible skins; current NetEase rules still apply.",
      "公式の透明画像チュートリアルではPNGがAlphaチャンネルに透明度を保存すると説明します。チャンネルパネルで赤・緑・青に加えてAlphaがあるか確認し、なければ追加します。透明にしたい部分を背景レイヤーが覆っていないか点検してPNGを書き出してください。編集画面の市松模様は透明部分の表示で、スキンに描き込む模様ではありません。制作ファイルを保管し、書き出した画像を開き直して透明度を確認します。スクリーンショット、JPEG、拡張子の改名だけでは本物のPNGの代用になりません。一般画像の例であり、自由な半透明・不可視スキンなどを認める説明ではありません。NetEaseの現行規則に従ってください。"),
  },
  {
    id: "developer-publishing-image-check", category: "publishing", sourceId: "publishingImageCheck",
    title: localized("宣传图上传后，还要检查裁切和手机／电脑展示吗？", "After uploading promotional images, should I check cropping and mobile/desktop display?", "紹介画像のアップロード後に切り抜きとスマートフォン・PC表示も確認しますか？"),
    summary: localized(
      "网易“发布与优化”教程提醒在组件后台对应图片字段核对文件格式和尺寸，上传后查看裁切预览，避免角色、标题或关键细节被裁掉，并检查电脑和手机展示是否清晰。原文的 JPEG／PNG 说明针对宣传图片，不表示皮肤纹理可使用 JPEG。封面与纹理是不同文件，不能互相替代；图片字段、数量、规格与展示范围以当前后台为准。本文已核对，可作为上传后的自检入口，但不保证图片通过审核或替代原创、授权证明。",
      "NetEase's publishing and optimization lesson asks you to check format and dimensions for the appropriate image field, inspect the upload's crop preview so characters, titles and important details are not cut off, and check clarity on desktop and mobile. Its JPEG/PNG guidance concerns promotional images, not permission to submit a JPEG skin texture. Covers and textures are different files and cannot replace each other. Follow current portal fields, counts, specifications and visible areas. We checked this lesson as a post-upload checklist; it does not guarantee approval or replace evidence of originality or authorization.",
      "網易の「发布与优化」講座は管理画面の該当画像欄で形式・寸法を確認し、アップロード後の切り抜きプレビューでキャラクター・題名・重要な細部が切れないか点検し、PCとスマートフォンで鮮明さを確認するよう案内します。原文のJPEG／PNGは紹介画像の説明で、スキンのテクスチャにJPEGを使えるという意味ではありません。表紙とテクスチャは別ファイルで代用できません。欄・枚数・仕様・表示範囲は現行管理画面に従ってください。本文を確認した投稿後の点検資料ですが、審査通過の保証や独創性・許諾の証明の代わりにはなりません。"),
  },
  {
    id: "developer-key-art-layout", category: "preparation", sourceId: "keyArtLayout",
    title: localized("皮肤封面怎么安排主体、标题和裁切范围？", "How should I arrange the subject, title and crop of a skin cover?", "スキンの表紙で主役・題名・切り抜き範囲をどう配置しますか？"),
    summary: localized(
      "网易 Key Art 教程从构思、草图到成图，提醒先考虑不同尺寸的裁切，再安排核心角色、标题与辅助元素，避免文字遮挡关键细节，并保留适当留白、统一字体和画面风格。可用于规划皮肤封面，但原文的玩法场景示例不是皮肤必填要求。本文已核对；实际图片尺寸与展示范围以当前后台预览为准，锐化或放大不能替代原始细节，也不代表获得他人素材的使用权。",
      "NetEase's Key Art lesson moves from ideas and sketches to final layout: plan for different crops, then place the subject, title and supporting elements without covering important detail. Keep whitespace and a consistent visual style. Apply these principles to skin covers; gameplay examples are not mandatory skin fields. We checked the text. Confirm dimensions and visible areas in the current portal. Sharpening or scaling cannot replace original detail or grant rights to someone else's assets.",
      "網易のKey Art講座は構想・下描き・仕上げを扱い、サイズ別の切り抜きを先に考え、主役・題名・補助要素を配置し、文字で重要な細部を隠さず余白と統一感を保つよう勧めます。スキンの表紙にも参考になりますが、ゲーム場面の例はスキンの必須項目ではありません。本文を確認しました。寸法と表示範囲は現行管理画面で確認し、拡大やシャープ化を元の細部や他者の素材の利用許諾の代わりにしないでください。"),
  },
  {
    id: "developer-carousel-layout", category: "preparation", sourceId: "carouselLayout",
    title: localized("多张皮肤展示图怎么选择和排序，避免重复？", "How do I select and order skin showcase images without repetition?", "複数のスキン紹介画像を重複なく選び、並べるには？"),
    summary: localized(
      "官方轮播图教程强调用多张图片补充主图没有展示的亮点，每张图保持清晰、重点不同，并统一色调和视觉风格；原文包含皮肤案例。可据此选择不同角度、外层和局部细节，按理解顺序呈现，避免只换背景重复同一个画面。原文的背景、任务、系统、场景排序是可调整的玩法组件示例，不是皮肤投稿硬性规则。本次已核对正文，图片数量、尺寸和字段要求仍以当前网易后台为准。",
      "The official carousel lesson uses clear, visually consistent images to show highlights missing from the main cover, with skin examples included. Choose distinct views, outer-layer details and close-ups in a useful order instead of repeating the same pose against new backgrounds. The article's background/task/system/scene sequence is an adjustable gameplay example, not a mandatory skin-submission rule. We checked the text; the current NetEase portal determines image counts, sizes and required fields.",
      "公式の輪播画像講座は、主画像にない特徴を明瞭な複数画像で補い、色調とスタイルを統一する方法を説明し、スキンの例も掲載しています。別の角度・外層・細部を理解しやすい順で見せ、背景だけ変えた同じ構図の繰り返しを避ける参考になります。背景・任務・システム・場面の順は変更可能なゲーム向けの例で、スキン投稿の必須規則ではありません。本文を確認しました。枚数・寸法・必須項目は現在の網易管理画面を優先します。"),
  },
  {
    id: "developer-blockbench-web-preview", category: "tools", sourceId: "blockbenchFaq",
    title: localized("Blockbench 网页版的 3D 预览打不开，怎么排查？", "How do I troubleshoot a missing 3D preview in Blockbench's web app?", "Blockbenchウェブ版の3D表示が開かない場合は？"),
    summary: localized(
      "Blockbench 官方 FAQ 建议先检查浏览器是否支持 WebGL，必要时更新或更换浏览器；仍有问题时可能与显卡驱动有关。文档也说明网页环境受浏览器安全限制，部分导入／导出需要额外步骤，纹理有时必须手动加载。原页提供错误信息查看和问题报告入口，适合区分网页渲染故障与网易投稿失败。本次核对了正文；不建议关闭浏览器安全防护，分享报错截图前应遮住路径、账号和私密工程信息。",
      "Blockbench's official FAQ recommends checking WebGL support and updating or switching browsers; graphics drivers can also be involved. Browser security restrictions may require extra import/export steps and manually loading textures. The page explains error messages and bug reporting, helping distinguish editor rendering problems from NetEase submission failures. We checked the text. Do not disable browser security; redact paths, accounts and private-project information before sharing error screenshots.",
      "Blockbench公式FAQはWebGL対応を確認し、必要に応じてブラウザーを更新・変更するよう案内します。解決しなければGPUドライバーも原因になり得ます。ウェブ版では安全制限により入出力に追加操作やテクスチャの手動読み込みが必要な場合があります。エラー表示と報告方法も載っており、編集画面の故障と網易への投稿失敗を区別できます。本文を確認しました。安全機能を無効にせず、報告画像のパス・アカウント・非公開制作物は隠してください。"),
  },
  {
    id: "developer-blockbench-mobile-pwa", category: "tools", sourceId: "blockbenchFaq",
    title: localized("手机用 Blockbench 必须下载 APK 吗？", "Do I need to download an APK to use Blockbench on a phone?", "スマートフォンでBlockbenchを使うにはAPKが必要ですか？"),
    summary: localized(
      "官方 FAQ 说明 Blockbench 可作为 PWA 从浏览器安装，无需从第三方获取 APK，具体安装操作指向官网 Downloads 页面。可先使用已收录的官方网页入口，再按设备与浏览器实际提供的菜单操作；不同系统的安装和文件选择方式可能不同。FAQ 同时提醒网页端导入纹理有时需要手动处理。本次已核对原文，没有验证所有手机环境；添加到主屏幕不是工程备份，制作后仍应自行保存工程与 PNG，再按网易规则投稿。",
      "The official FAQ says Blockbench can be installed from a browser as a PWA, without a third-party APK, and points to its Downloads page for instructions. Start from the official web editor already linked here and use the options available on your device; installation and file selection differ by browser and OS. Web imports may need textures loaded manually. We checked the text, not every phone environment. Adding the app to your home screen is not a project backup: save the project and PNG before following NetEase submission rules.",
      "公式FAQはブラウザーからPWAとして導入でき、外部のAPKは不要と説明し、手順は公式Downloadsへ案内します。本ページの公式ウェブ版から始め、端末とブラウザーに実際にあるメニューを利用してください。導入やファイル選択はOSによって異なり、テクスチャを手動で読み込む場合もあります。本文の確認であり、全スマートフォンでの動作検証ではありません。ホーム画面への追加は制作物のバックアップではないため、プロジェクトとPNGを保存してから網易規則に従って投稿してください。"),
  },
  {
    id: "developer-blockbench-backups", category: "tools", sourceId: "blockbenchOverview",
    title: localized("Blockbench 工程丢失后，哪里查看自动备份？", "Where can I look for automatic backups after losing a Blockbench project?", "Blockbenchのプロジェクトを失ったら自動バックアップはどこで確認しますか？"),
    summary: localized(
      "官方操作指南的 Backups 一节写明默认每10分钟创建自动备份，可在设置中调整间隔，并通过 Help → Open Backup Folder 查找文件。在提供该菜单的桌面环境中，可先复制备份再检查是否为所需版本，保留独立的工程和 PNG 导出。本次核对了正文，不代表已经验证恢复操作；网页／手机环境不应假定有相同文件夹入口，自动备份也不保证保存最新修改或永久留存，不要用截图代替纹理原件。",
      "The official guide's Backups section describes a default 10-minute interval, adjustable in settings, and Help → Open Backup Folder to locate files. In desktop environments with that menu, copy a candidate before checking it and keep separate project and PNG exports. We checked the text, not a recovery procedure. Do not assume the web/mobile app exposes the same folder. Automatic backups do not guarantee the latest edits or permanent retention, and screenshots do not replace original textures.",
      "公式ガイドのBackups節では初期間隔が10分で設定から変更でき、Help → Open Backup Folderでファイルを探すと説明しています。このメニューがあるデスクトップ環境では候補をコピーしてから内容を確認し、プロジェクトとPNGも別に保存してください。本文の確認であり復元操作の検証ではありません。ウェブ・スマートフォンにも同じフォルダーがあると想定しないでください。最新変更や永続保存は保証されず、画面写真はテクスチャ原本の代わりになりません。"),
  },
  {
    id: "developer-blockbench-paint-tools", category: "creation", sourceId: "blockbenchOverview",
    title: localized("Blockbench 的取色、镜像画笔和 Alpha 锁定怎么学？", "Where can I learn Blockbench's color picker, mirror painting and alpha lock?", "Blockbenchの色選択・鏡像描画・Alpha固定はどこで学べますか？"),
    summary: localized(
      "官方指南的 Paint Mode 章节介绍模型表面和 UV 贴图绘画、取色、油漆桶、渐变及复制粘贴，并解释 Mirror Painting、像素网格和 Lock Alpha Channel。后者防止在透明部分绘画，并不自动补齐缺失的底层像素；工具的可用项取决于工程格式和软件版本。本次核对了正文，可用于理解画笔行为、减少误涂，导出后仍需检查 PNG、透明区域、外层与体型匹配，不能把编辑器预览当作网易审核结果。",
      "The official Paint Mode chapter covers painting on models and UV textures, picking colors, fills, gradients and copy/paste, plus Mirror Painting, the pixel grid and Lock Alpha Channel. Alpha lock prevents painting on transparent areas; it does not fill missing base-layer pixels. Available controls depend on the project format and version. We checked the text. Use it to understand tools and avoid mistakes, then check the exported PNG, alpha, outer layer and body model. An editor preview is not a NetEase review result.",
      "公式ガイドのPaint Mode章はモデル表面・UVでの描画、色選択・塗りつぶし・グラデーション・コピーと、Mirror Painting、ピクセル格子、Lock Alpha Channelを説明します。Alpha固定は透明部分への描画を防ぐ機能で、欠けた下層の画素を自動で補いません。利用できる操作は形式と版によります。本文を確認しました。誤描画を減らす参考にし、出力PNG・透明領域・外層・体型を別に確認してください。編集画面の表示は網易の審査結果ではありません。"),
  },
  {
    id: "developer-mcskin3d-workshop", category: "tools", sourceId: "mcskin3dWorkshop",
    title: localized("MCSkin3D 的面板、画笔和双层模型怎么用？", "How do I use MCSkin3D panels, brushes and two-layer models?", "MCSkin3Dのパネル・ブラシ・二層モデルの使い方は？"),
    summary: localized(
      "网易创造营教程逐项介绍菜单、工具栏、项目面板、2D 贴图、调色板和 3D 预览，并演示铅笔、橡皮擦、取色管、亮度刷及油漆桶。新建模型一节区分 Alex／Steve 双层模型与带 minimal 标签的旧单层模型，适合先认识界面再练习绘制。本次已核对正文；教程界面不代表当前软件版本，本站不提供第三方安装包，导出后仍需按目标端检查纹理与模型。",
      "NetEase's workshop explains menus, tools, projects, 2D textures, palettes and 3D preview, then introduces pencil, eraser, eyedropper, brightness brush and fill. Its model section distinguishes two-layer Alex/Steve models from older single-layer models labelled minimal. Read it before practising. We checked the article text; its screenshots do not establish the current software version. We host no third-party installers. Check the exported texture and model for your target edition.",
      "網易の講座はメニュー・ツール・プロジェクト・2Dテクスチャ・パレット・3D表示と、鉛筆・消しゴム・スポイト・明度ブラシ・塗りつぶしを説明します。モデル作成ではAlex／Steveの二層モデルとminimal表示の旧単層モデルを区別します。まず画面を学んでから練習できます。本文を確認しましたが、画像は現行版の保証ではありません。当サイトは外部インストーラーを配布しません。出力後も対象版のテクスチャとモデルを確認してください。"),
  },
  {
    id: "developer-color-uv-basics", category: "creation", sourceId: "colorUvBasics",
    title: localized("皮肤配色和 UV 展开图，入门从哪里学？", "Where can I learn skin color theory and UV layouts?", "スキンの配色とUV展開図はどこから学べますか？"),
    summary: localized(
      "官方“了解基础”讲解色相、饱和度、明度、UV 展开图，以及 64×64／128×128 和 3／4 像素手臂的区别；配色建议从适中饱和度开始，明暗变化也可结合色相调整。适合在绘制之前理解贴图像素如何对应身体区域。本次核对了正文，没有把教程中的尺寸说明当作所有客户端的通用支持承诺；投稿时仍要核对目标端规则、透明通道和模型匹配。",
      "The official basics lesson explains hue, saturation, value and UV layouts, plus 64×64 versus 128×128 textures and three- versus four-pixel arms. It recommends moderate saturation and hue changes alongside shading. Use it to understand how texture pixels map to body regions before painting. We checked the text; the lesson's size examples do not promise support in every client. Check target-edition rules, alpha and model matching before submission.",
      "公式の基礎講座は色相・彩度・明度・UV展開図、64×64／128×128と3／4ピクセル腕の違いを説明します。配色は適度な彩度から始め、明暗と色相を併せて調整する考え方です。描画前に各ピクセルと身体領域の対応を学べます。本文を確認しましたが、サイズ例は全クライアントの対応保証ではありません。投稿時は対象版の規則・アルファ・モデルとの一致を確認してください。"),
  },
  {
    id: "developer-outer-layer-design", category: "creation", sourceId: "outerLayerDesign",
    title: localized("帽子、袖口和背包怎样用外层做得更立体？", "How can outer layers add depth to hats, cuffs and backpacks?", "帽子・袖口・リュックを外層で立体的に見せるには？"),
    summary: localized(
      "官方“独特设计”分别用头发与帽子、袖口褶皱、背包和裤子说明外层细节，还讨论手表、腰带等小零件与角色故事感。重点是适量、有目的地增加层次，不是装饰越多越好。已核对正文，可配合本区导入与测试教程检查外层开启后的实际效果；设计建议不等于网易审核标准，也不保证添加某种配件就能过审，使用他人素材仍需授权。",
      "The official Unique Design lesson illustrates outer-layer hair, hats, cuff folds, backpacks and trousers, then discusses accessories and character storytelling. Add purposeful detail rather than filling every space. We checked the text. Pair it with the import/testing guide to inspect the actual enabled-layer result. These are design suggestions, not review rules or guaranteed approval through particular accessories; third-party material still requires permission.",
      "公式の独特なデザイン講座は髪・帽子・袖口のしわ・リュック・ズボンの外層と、小物や人物の物語性を説明します。装飾を増やし続けるのではなく、目的に合う適度な細部が重要です。本文を確認しました。読み込み・テスト講座も併用し、外層を有効にした実際の表示を確認してください。制作の助言は審査基準や特定の小物による通過保証ではなく、他者素材には許可が必要です。"),
  },
  {
    id: "developer-study-skin-styles", category: "creation", sourceId: "studySkinStyles",
    title: localized("如何分析不同皮肤画风，而不是照搬别人的作品？", "How can I study skin styles without copying another work?", "他者の作品を丸写しせずに画風を学ぶには？"),
    summary: localized(
      "官方“分析优秀作品”比较低对比度、强调明暗结构与强个人风格的案例，说明配色、层次错位和外层细节各自的作用，并建议观察像素艺术、整理色板和练习不同思路。正文明确区分学习风格与复制具体作品；本站也不授予案例作品的转载或投稿许可。已核对原文，可先归纳想学习的技法，再独立设计并保留自己的创作记录，不把练习临摹标成原创上架。",
      "The official study compares low-contrast, structural-shading and strongly personal styles, discussing palettes, layer offsets and outer details. It suggests observing pixel art, collecting palettes and practising approaches. The text distinguishes studying a style from copying a specific work; this site grants no rights to repost or submit examples. We checked the original. Identify techniques, design independently and retain your process records; do not list a copied practice piece as original.",
      "公式の作品分析は低コントラスト・明暗構造・個性的な画風を比較し、配色・層のずれ・外層細部を説明します。ピクセルアートの観察、パレット整理、考え方の練習も勧めています。本文は画風の学習と具体的な作品のコピーを区別し、当サイトも例の転載・投稿権を与えません。原文を確認しました。技法を整理して独自に制作し、制作記録を残してください。模写練習をオリジナルとして公開しないでください。"),
  },
  {
    id: "developer-pos-layout", category: "preparation", sourceId: "posLayout",
    title: localized("POS 展示图怎样排版，才不会在小界面看不清？", "How should I lay out a POS image for a small interface?", "小さい画面でも読めるPOS画像の配置は？"),
    summary: localized(
      "官方“展示图（pos图）设计”说明 POS 图用于购买付款界面的视觉展示，建议精简并放大元素，把核心信息放在中央或偏下、留出空白，保持与前端风格一致，也可表达对玩家的感谢。已核对正文；这篇讲的是展示图设计，不是皮肤 PNG 或投稿包体规范。具体尺寸、遮挡区域和是否需要该字段，请以当前后台预览与提示为准，不照搬旧截图，也不要添加未经核实的促销承诺。",
      "The official POS-image guide places the image in the purchase/payment interface. It recommends fewer, larger elements, central or lower key information, whitespace and consistent styling, with an optional thank-you message. We checked the text. This is presentation design, not skin-PNG or package rules. Confirm current dimensions, overlays and whether the field is required in the portal preview; do not copy old screenshots or invent promotional promises.",
      "公式のPOS画像講座は購入・支払い画面での表示を説明し、要素を減らして大きくする、重要情報を中央か下側に置く、余白と画面の統一感を保つ、感謝を伝える方法を紹介します。本文を確認しました。これは展示画像の制作であり、スキンPNGやパッケージの規則ではありません。寸法・重なる領域・項目の要否は現行管理画面のプレビューで確認し、旧画像の丸写しや未確認の販売約束を避けてください。"),
  },
  {
    id: "developer-video-register", category: "introduction", sourceId: "videoRegister",
    title: localized("注册开发者之前，有社区视频可以参考吗？", "Is there a community video to consult before developer registration?", "開発者登録の前に参考にできるコミュニティ動画は？"),
    summary: localized(
      "好小的石头人于 2026-01-24 发布的“我的世界如何注册开发者”。本次核对了原页标题、作者和发布日期，未逐帧核验视频步骤；可先观看了解作者介绍的注册操作，再对照本区官方注册教程与当前后台。实名认证、账号密码及验证码只在网易官方页面填写，不要发给本站或视频作者；注册成功也不等于作品已通过审核。",
      "好小的石头人 published this developer-registration video on 2026-01-24. We checked its original title, author and date, not every video step. Consult it alongside the official registration guide and current portal. Enter identity details, passwords and verification codes only on NetEase's official pages, never send them to this site or the creator. Registration is not resource approval.",
      "好小的石头人 が2026-01-24に公開した開発者登録の動画です。原ページの題名・作者・公開日を確認しましたが、手順を全編検証したものではありません。公式登録ガイドと現在の管理画面を併せて確認してください。本人確認情報・パスワード・認証コードは網易公式ページだけで入力し、当サイトや作者に送らないでください。登録完了は作品の審査通過ではありません。"),
  },
  {
    id: "developer-video-ethan-upload", category: "publishing", sourceId: "videoEthanUpload",
    title: localized("网易皮肤投稿系列视频：第一期从哪里看？", "Where can I watch part one of the NetEase skin-submission series?", "網易スキン投稿シリーズの第1回はどこで見られますか？"),
    summary: localized(
      "一只Ethan于 2026-07-23 发布的第一期，原页简介为“我的世界如何上传自己的皮肤”。本次核对了标题、作者、日期和简介，未完整核验视频操作；适合与官方“上传并发布”和资源上传规则对照观看。原页标注个人观点仅供参考、未经授权禁止转载；本站只提供直达链接，不搬运视频，也不为作者的代发服务或收费背书。",
      "一只Ethan published part one on 2026-07-23; its description introduces uploading one's own skin. We checked the page title, author, date and description, not the complete video procedure. Compare it with the official Upload and Publish guide and upload rules. The page identifies personal opinions and prohibits unauthorized reposting. This is a direct link, not a rehost or endorsement of paid publishing services.",
      "一只Ethan が2026-07-23に公開した第1回で、概要は自作スキンの投稿についてです。原ページの題名・作者・日付・概要を確認し、動画の全手順を検証したものではありません。公式の投稿・公開ガイドと投稿規則を併用してください。原ページは個人の見解で無断転載禁止と明記しています。当サイトは原文リンクのみを提供し、作者の代行・料金を推奨しません。"),
  },
  {
    id: "developer-video-ethan-publish", category: "publishing", sourceId: "videoEthanPublish",
    title: localized("网易皮肤投稿系列视频：第二期发布与电脑绘画？", "Where is part two on publishing and PC painting?", "公開とPCでの描画を扱う第2回の入口は？"),
    summary: localized(
      "一只Ethan于 2026-07-24 发布的第二期，作者简介明确写到“发布和PC绘画内容”，可接着第一期观看。本次核对了原页信息，没有逐帧复核绘画或投稿步骤；电脑制作与网易公开上架是不同操作，导出纹理后仍需按目标端自测并提交审核。视频不保证审核通过、上架时间或费用；适用规则以网易当前后台为准，原视频未经作者授权禁止转载。",
      "一只Ethan's 2026-07-24 second episode describes publishing and PC painting and can follow part one. We checked the source-page information, not every painting or submission step. Desktop editing and public listing are separate operations; test exported textures for the target edition and submit for review. The video does not guarantee approval, timing or fees. Current NetEase rules apply; unauthorized reposting is prohibited.",
      "一只Ethan による2026-07-24公開の第2回で、概要に公開とPC描画を扱うと記載されています。第1回の続きとして参照できます。原ページ情報を確認したもので、全手順の検証ではありません。PC編集と公開は別の操作です。出力後も対象版で自測し審査へ提出してください。審査通過・公開時期・料金の保証ではなく、現在の網易規則が優先です。作者の許可なく転載しないでください。"),
  },
  {
    id: "developer-video-jiang-upload", category: "publishing", sourceId: "videoJiangUpload",
    title: localized("想换一个视角看网易皮肤上传，有近期视频吗？", "Is there a recent alternative perspective on NetEase skin uploads?", "別の視点で網易スキン投稿を学べる最近の動画は？"),
    summary: localized(
      "Minecraft_江弦月于 2026-09-07 发布的“教你网易我的世界上传皮肤”，原页带有教学、皮肤和我的世界手机版标签。本次核对标题、作者和日期，未完整观看验证操作；可作为另一位创作者的参考入口，不把标题理解为普通客户端一定支持直接导入，也不推定手机版与电脑版流程相同。请结合官方资源上传规则、当前平台界面及本站 V5 协议；本站不替外部作者接单或承诺过审。",
      "Minecraft_江弦月 published this upload video on 2026-09-07, with tutorial, skin and mobile Minecraft tags. We verified its title, author and date, not the complete procedure. It offers another creator's perspective, not proof that the standard client supports direct import or that mobile and desktop submissions work identically. Consult official upload rules, the current portal and our separate V5 agreement. We do not take orders for the creator or promise approval.",
      "Minecraft_江弦月 が2026-09-07に公開し、教学・スキン・モバイル版のタグがある投稿動画です。題名・作者・日付を確認しましたが、全操作を検証したものではありません。別の作者の参考資料として利用し、通常クライアントへの直接読み込みやPC版と同じ手順を保証する題名と解釈しないでください。公式投稿規則・現在の管理画面・当サービスの独立したV5規約を確認してください。作者の注文受付や審査通過を保証しません。"),
  },
  {
    id: "developer-registration", category: "introduction", sourceId: "registration",
    title: {
      "zh-CN": "如何注册网易《我的世界》开发者账号？",
      en: "How do I register as a Minecraft China developer?",
      ja: "中国版マインクラフトの開発者アカウントを登録するには？",
    },
    summary: {
      "zh-CN": "官方教程介绍从官网“成为创造者”进入注册、填写账号信息及实名认证的流程。请只在网易官方页面办理，不要向本站提交身份证件或账号密码。",
      en: "The official guide covers the creator registration entry, account details and identity verification. Complete registration only on NetEase's official site; do not send identity documents or passwords to this site.",
      ja: "公式サイトのクリエイター登録入口、アカウント情報の入力、本人確認を説明する公式ガイドです。手続きは必ず網易の公式ページで行い、当サイトに身分証やパスワードを送らないでください。",
    },
  },
  {
    id: "developer-publish-entry", category: "publishing", sourceId: "management",
    title: {
      "zh-CN": "上传皮肤的投稿入口在哪里？",
      en: "Where do I submit a skin?",
      ja: "スキンの投稿入口はどこですか？",
    },
    summary: {
      "zh-CN": "登录开发者平台后，进入“作品管理 → 上架与资源管理”，切换手机版或电脑版，再选择“发布新资源”。皮肤属于组件资源，请按目标客户端选择分类，不要套用网络游戏入驻流程。",
      en: "In the developer portal, open Works Management → Listing and Resource Management, select mobile or desktop, then Publish New Resource. Skins are component resources; use the category for the target client, not the online-server admission process.",
      ja: "開発者プラットフォームの「作品管理 → 上架与资源管理」でモバイル版かPC版を選び、「发布新资源」へ進みます。スキンはコンポーネント資源です。対象クライアントの分類を選び、オンラインサーバーの申請手順と混同しないでください。",
    },
  },
  {
    id: "developer-skin-format", category: "preparation", sourceId: "upload",
    title: {
      "zh-CN": "普通皮肤上传 PNG 就可以吗，需要压缩包吗？",
      en: "Can I upload a regular skin as PNG, or do I need an archive?",
      ja: "通常のスキンは PNG のまま投稿できますか？圧縮は必要ですか？",
    },
    summary: {
      "zh-CN": "官方上传规则的手机版与电脑版皮肤小节说明，可直接上传带透明通道的 PNG 皮肤文件。请查看对应皮肤小节，不要把地图、模组的压缩包要求混用到普通纹理皮肤上。",
      en: "The mobile and desktop skin sections say that PNG skin files with an alpha channel can be uploaded directly. Read the relevant skin section; archive requirements for maps or mods do not describe ordinary texture skins.",
      ja: "公式ルールのモバイル版・PC版スキンの項目では、アルファチャンネル付き PNG を直接アップロードできると説明されています。通常のテクスチャスキンに、マップや MOD の圧縮形式の要件を当てはめないでください。",
    },
  },
  {
    id: "developer-mobile-size", category: "preparation", sourceId: "management",
    title: {
      "zh-CN": "手机版皮肤支持哪些尺寸和版本？",
      en: "Which skin sizes and edition does the mobile portal support?",
      ja: "モバイル版で投稿できるスキンのサイズとエディションは？",
    },
    summary: {
      "zh-CN": "作品管理文档列出的手机版皮肤尺寸为基岩版 64×64、128×128，手机版投稿平台不支持 Java 资源。准备文件时先确认投稿端与皮肤尺寸，具体可选项以当前后台为准。",
      en: "The works-management guide lists 64×64 and 128×128 Bedrock skins for mobile submissions; the mobile portal does not accept Java resources. Check the target client and dimensions, and confirm the options in the current portal.",
      ja: "作品管理ガイドには、モバイル版向けとして Bedrock の 64×64・128×128 が記載され、Java 資源は投稿対象外とされています。投稿先とサイズを確認し、実際の選択肢は現在の管理画面で確認してください。",
    },
  },
  {
    id: "developer-desktop-edition", category: "preparation", sourceId: "management",
    title: {
      "zh-CN": "电脑版皮肤的 Java 与基岩版分类有什么区别？",
      en: "How do Java and Bedrock skin categories differ on desktop?",
      ja: "PC版スキンの Java と Bedrock の分類はどう違いますか？",
    },
    summary: {
      "zh-CN": "电脑版“形象组件”在文档中按版本区分：Java 皮肤列出 64×32、64×64、128×128；基岩版列出 64×64、128×128。请选择与作品匹配的版本，不能把手机基岩版同步理解为自动转换 Java 版。",
      en: "The desktop appearance-component guide lists Java skins at 64×32, 64×64 and 128×128, and Bedrock skins at 64×64 and 128×128. Choose the correct edition; mobile Bedrock synchronization is not automatic conversion to Java.",
      ja: "PC版の「形象组件」では、Java は 64×32・64×64・128×128、Bedrock は 64×64・128×128 と記載されています。作品に合うエディションを選んでください。モバイル版 Bedrock の同期は Java 版への自動変換ではありません。",
    },
  },
  {
    id: "developer-studio-import", category: "publishing", sourceId: "studio",
    title: {
      "zh-CN": "怎样在 MCStudio 中本地导入皮肤？",
      en: "How do I import a skin locally in MCStudio?",
      ja: "MCStudio にスキンをローカルインポートするには？",
    },
    summary: {
      "zh-CN": "按官方教程进入“作品库 → 基岩版组件 → 本地导入”，分区选择“基岩版作品”、分类选择“皮肤”，再通过加号选择 PNG 文件。本地导入只是在工作台中加入作品，不等于已经上架或审核通过。",
      en: "Follow the guide through Works Library → Bedrock Components → Local Import, choose Bedrock Works and the Skin category, then select a PNG with the plus button. Local import adds the work to your workspace; it does not publish or approve it.",
      ja: "公式手順は「作品库 → 基岩版组件 → 本地导入」です。区分を「基岩版作品」、分類を「皮肤」にし、プラスボタンで PNG を選びます。ローカルインポートは作業環境への追加であり、公開や審査通過を意味しません。",
    },
  },
  {
    id: "developer-pricing", category: "pricing", sourceId: "pricing",
    title: {
      "zh-CN": "皮肤的定价档位和折扣规则在哪里查？",
      en: "Where can I check pricing tiers and discount rules?",
      ja: "スキンの価格帯や割引ルールはどこで確認できますか？",
    },
    summary: {
      "zh-CN": "官方“资源定价规则说明”介绍直购价格档位、折扣限制及部分档位的开发者等级要求。原文包含特定日期起施行的规则，设置价格前请结合当前后台核对，不要把旧截图当作现行价目表。",
      en: "The official pricing guide explains direct-purchase tiers, discount limits and developer-level requirements for certain tiers. It includes rules with stated effective dates; verify them against the current portal before pricing a skin.",
      ja: "公式の「资源定价规则说明」で、直接購入の価格帯、割引制限、一部価格帯に必要な開発者レベルを確認できます。施行日付きの規則が含まれるため、価格設定前に現在の管理画面と照合してください。",
    },
  },
  {
    id: "developer-price-change", category: "pricing", sourceId: "pricing",
    title: {
      "zh-CN": "已上架的皮肤能改成免费或更低的货币档吗？",
      en: "Can a listed skin be changed to free or a lower currency tier?",
      ja: "公開済みスキンを無料や下位の通貨区分に変更できますか？",
    },
    summary: {
      "zh-CN": "官方定价说明列出已上架资源的限制：钻石不能降为绿宝石或免费，绿宝石不能降为免费。它与同一货币内的价格、折扣调整不是一回事，操作前请阅读原文并核对当前后台提示。",
      en: "The official guide says listed diamond-priced resources cannot be downgraded to emeralds or free, and emerald-priced resources cannot become free. This is distinct from changing a price or discount within a currency; check the guide and current portal prompts first.",
      ja: "公式説明では、公開済み資源をダイヤからエメラルド・無料へ、またはエメラルドから無料へ変更することはできないとされています。同じ通貨内の価格・割引変更とは別なので、操作前に原文と管理画面の案内を確認してください。",
    },
  },
  {
    id: "developer-levels", category: "pricing", sourceId: "levels",
    title: {
      "zh-CN": "开发者能力贡献等级的规则在哪里查？",
      en: "Where are developer contribution levels explained?",
      ja: "開発者の貢献レベルのルールはどこで確認できますか？",
    },
    summary: {
      "zh-CN": "官方等级说明介绍能力贡献等级的评估与统计周期，包括每月上旬统计上月贡献的安排。若后台提示等级不足，可先了解评估规则，再查对应资源定价要求；具体门槛以官方现行说明为准。",
      en: "The level guide describes contribution assessment and its cycle, including assessment of the previous month's contributions early each month. If the portal reports an insufficient level, check this guide and the relevant pricing requirements for current thresholds.",
      ja: "公式ガイドでは、能力・貢献レベルの評価と集計周期を説明し、毎月上旬に前月分の貢献を集計するとしています。レベル不足と表示されたら、評価方法と対象価格帯の要件を確認してください。基準値は現行の公式説明を優先します。",
    },
  },
  {
    id: "developer-sync-entry", category: "publishing", sourceId: "sync",
    title: {
      "zh-CN": "为什么看不到“生成电脑版同步组件”按钮？",
      en: "Why is the desktop synchronization button missing?",
      ja: "PC版の同期コンポーネント生成ボタンが表示されないのはなぜ？",
    },
    summary: {
      "zh-CN": "官方同步 FAQ 说明，手机版组件审核通过后，列表才会显示“生成电脑版同步组件”。先确认原手机版作品的审核状态；此功能针对手机基岩版到电脑基岩版，并不是 Java 版转换入口。",
      en: "The official sync FAQ says Generate Desktop Synced Component appears only after the mobile component passes review. Check the original mobile submission's status. This feature synchronizes mobile Bedrock to desktop Bedrock, not to Java.",
      ja: "公式同期 FAQ では、モバイル版コンポーネントの審査通過後に「生成电脑版同步组件」が表示されると説明されています。元の作品の審査状況を確認してください。対象はモバイル版 Bedrock からPC版 Bedrock であり、Java への変換ではありません。",
    },
  },
  {
    id: "developer-sync-review", category: "review", sourceId: "sync",
    title: {
      "zh-CN": "电脑版同步组件还需要审核吗？",
      en: "Does a synchronized desktop component still need review?",
      ja: "同期したPC版コンポーネントも審査が必要ですか？",
    },
    summary: {
      "zh-CN": "需要。官方 FAQ 说明，同步后的电脑基岩版组件仍需提交审核，审核通过后才可以上架。手机版已通过不代表电脑版自动通过，本文不承诺固定审核时长或保证通过。",
      en: "Yes. The official FAQ says a synchronized desktop Bedrock component must still be submitted for review before listing. Mobile approval does not automatically approve the desktop version; no fixed review time or guaranteed approval is implied.",
      ja: "必要です。公式 FAQ では、同期後のPC版 Bedrock コンポーネントも審査に提出し、通過後に公開すると説明されています。モバイル版の承認がPC版へ自動的に引き継がれるわけではなく、審査期間や通過は保証されません。",
    },
  },
  {
    id: "developer-sync-recreate", category: "review", sourceId: "sync",
    title: {
      "zh-CN": "删除电脑版同步组件后，还能重新生成吗？",
      en: "Can I regenerate a deleted desktop synchronized component?",
      ja: "PC版の同期コンポーネントを削除した後、再生成できますか？",
    },
    summary: {
      "zh-CN": "官方 FAQ 说明，删除电脑基岩版同步组件后，原手机版组件处于“已审核－通过”状态时，会再次显示生成按钮。请先核对原作品状态；重新生成不意味着免审核或恢复原来的上架状态。",
      en: "The official FAQ says the generation button reappears after deleting a desktop Bedrock synced component if the original mobile component is in Reviewed–Approved status. Check that status first; regeneration does not imply waived review or restored listing status.",
      ja: "公式 FAQ によると、PC版 Bedrock の同期コンポーネントを削除しても、元のモバイル版が「已审核－通过」であれば生成ボタンが再表示されます。元の状態を確認してください。再生成は審査免除や以前の公開状態の復元を意味しません。",
    },
  },
  {
    id: "developer-mcskin-install", category: "tools", sourceId: "toolInstall",
    title: localized("MCSkin3D 怎么下载和启动，适合什么设备？", "How do I install MCSkin3D, and which devices suit it?", "MCSkin3D の入手・起動方法と対応端末は？"),
    summary: localized(
      "官方教程介绍了作者在 Planet Minecraft 发布的下载入口，以及完整解压后启动 MCSkin3D.exe 的操作。文档将它定位为 Windows 上的经典皮肤绘图工具，并指出高清绘制的限制。建议先阅读系统与工具能力说明，再按原文链接获取软件；教程中的版本号是文档当时的记录，不代表当前最新版。",
      "The official guide links to the author's Planet Minecraft release and explains extracting the complete archive before launching MCSkin3D.exe. It describes a classic Windows skin editor with limits on high-resolution painting. Check the platform and capabilities first, then use the download link in the guide; its recorded version is not necessarily today's latest release.",
      "公式ガイドには作者の Planet Minecraft 配布ページと、全ファイルを展開して MCSkin3D.exe を起動する手順があります。Windows 向けの従来型スキン編集ツールで、高清描画には制限があります。対応環境を確認し、原文の配布リンクを利用してください。掲載バージョンは現在の最新版とは限りません。"),
  },
  {
    id: "developer-mcskin-views", category: "tools", sourceId: "toolBasics",
    title: localized("2D、3D 和混合视图怎样帮助检查皮肤？", "How do 2D, 3D and mixed views help inspect a skin?", "2D・3D・混合ビューでスキンを確認するには？"),
    summary: localized(
      "MCSkin3D 功能教程说明了透视、纹理和混合三种视图，以及新建模板、画笔和部件显隐功能。2D 展开图方便检查具体像素，3D 预览方便检查模型上的效果，混合视图可同时对照两者。绘制手臂或身体时，可先隐藏其他部位，减少误涂；鼠标按键作用会随视图和工具变化，按原文说明操作。",
      "The MCSkin3D guide covers perspective, texture and mixed views, templates, painting tools and body-part visibility. The unfolded 2D view helps inspect pixels; the 3D view shows their appearance on the model. Mixed mode connects both. Hide unrelated parts when painting to avoid accidental marks, and check the guide for tool-specific mouse controls.",
      "MCSkin3D のガイドでは透視・テクスチャ・混合ビュー、テンプレート、描画ツール、部位の表示切替を説明しています。2D は画素の確認、3D は立体での見え方、混合は両者の照合に便利です。編集中は他の部位を隠すと誤描画を減らせます。マウス操作はツールとビューに応じて原文を確認してください。"),
  },
  {
    id: "developer-skinseed-mobile", category: "tools", sourceId: "toolMobile",
    title: localized("手机上可以用什么工具从模板制作皮肤？", "Which mobile tool can start a skin from a template?", "スマートフォンでテンプレートからスキンを作るには？"),
    summary: localized(
      "网易教程介绍了 Skinseed 的 Create Skin 入口，以及 Classic Skin 和 Slim-armed Skin 模板。文档还展示画笔、橡皮擦、吸管、亮度、撤销和选区等基础工具，适合先完成简单的原创练习。模板体型应与成品匹配；软件中的搜索或社区导入能力本身不代表获得商业发布授权，投稿前仍需核对作品来源。",
      "NetEase's Skinseed guide introduces Create Skin, Classic Skin and Slim-armed Skin templates, plus brushes, erasing, color picking, brightness, undo and selection tools. Start with a small original exercise and choose the matching body model. Search or community import features do not themselves grant commercial publishing rights; check the origin of any material you submit.",
      "網易の Skinseed ガイドは Create Skin、Classic Skin、Slim-armed Skin と、筆・消しゴム・スポイト・明度・取り消し・選択ツールを紹介しています。まず簡単なオリジナル作品で練習し、完成品に合う体型を選びましょう。検索やコミュニティからの取り込み機能だけで商用公開の許諾を得られるわけではありません。"),
  },
  {
    id: "developer-web-editor", category: "tools", sourceId: "toolWeb",
    title: localized("不安装桌面软件，可以在浏览器里画皮肤吗？", "Can I paint a skin in a browser without a desktop installation?", "デスクトップアプリなしでブラウザーから描けますか？"),
    summary: localized(
      "官方资料介绍了 PMCSkin3D，并提供 Planet Minecraft 的网页皮肤编辑器入口。它属于浏览器内运行的 WebApp，适合希望先体验绘图流程的用户。教程也提醒界面中文支持存在限制，可借助浏览器翻译理解菜单；导出后仍需确认 PNG 尺寸、体型和目标投稿端，网页编辑完成不等于已在网易平台发布。",
      "The official guide introduces PMCSkin3D and links to Planet Minecraft's browser-based skin editor. It is a WebApp for trying the painting workflow without installing a desktop editor. The guide notes limits on Chinese UI support and suggests browser translation. After export, check PNG dimensions, body model and target portal; editing online does not publish a skin to NetEase.",
      "公式資料ではブラウザーで動く PMCSkin3D を紹介し、Planet Minecraft の編集ページへ案内しています。デスクトップアプリを入れずに描画を試せます。中国語表示の制限とブラウザー翻訳にも言及しています。書き出し後は PNG の寸法・体型・投稿先を確認してください。オンライン編集だけで網易への公開は完了しません。"),
  },
  {
    id: "developer-hd-tools", category: "tools", sourceId: "resolution",
    title: localized("想画更精细的皮肤，绘图工具有限制吗？", "Do skin editors limit higher-detail painting?", "細かいスキンを描く場合、ツールの制限はありますか？"),
    summary: localized(
      "皮肤概念教程说明了分辨率与可绘制细节之间的关系，并建议初学者先掌握基础贴图。文档提到 MCSkin3D 对更高规格绘制的限制，以及使用 Blockbench 的选择。这里的绘制精度与投稿文件尺寸需要分别理解：工具能够创建某个分辨率，并不表示目标客户端和开发者后台一定接收该文件。",
      "The skin-concept guide explains how resolution affects available detail and recommends learning the basic texture first. It notes MCSkin3D's limits at higher resolutions and Blockbench as an option. Painting detail and submission dimensions are separate checks: an editor's ability to create a resolution does not mean the target client or portal accepts it.",
      "スキン概念ガイドは解像度と描ける細部の関係を説明し、初心者には基本サイズでの練習を勧めています。MCSkin3D の高解像度制限と Blockbench の選択肢にも触れています。制作時の解像度と投稿可能な寸法は別です。作成できるサイズでも、対象クライアントや管理画面が受け付けるとは限りません。"),
  },
  {
    id: "developer-design-plan", category: "creation", sourceId: "planning",
    title: localized("开始画皮肤前，需要先做哪些设计准备？", "What should I plan before painting a skin?", "描き始める前に何を準備すればよいですか？"),
    summary: localized(
      "官方基础教程建议先确定角色设定、整体风格、服装样式和配色，再用草稿或参考图组织细节。低分辨率贴图的像素有限，眼睛、头发、嘴部和衣服装饰需要有所取舍。先划分皮肤、头发和服装的主色，再安排头部、身体和四肢的绘制顺序，可以减少做到一半反复改色或空间不足的问题。",
      "The foundation lesson recommends defining the character, style, clothing and palette, then organizing details with a sketch or references. Low-resolution textures have limited pixels, so prioritize facial features, hair and clothing details. Establish skin, hair and clothing colors before painting the head, torso and limbs to reduce repeated recoloring and cramped detail.",
      "基礎講座は、キャラクター・作風・服装・配色を決め、下絵や参考画像で細部を整理するよう勧めています。低解像度では使える画素が限られるため、顔・髪・衣服の装飾には取捨選択が必要です。肌・髪・服の基本色と描く順序を決めておくと、途中の塗り直しや細部の場所不足を減らせます。"),
  },
  {
    id: "developer-paint-head", category: "creation", sourceId: "head",
    title: localized("头部、头发和眼睛从哪里开始画？", "Where do I start painting the head, hair and eyes?", "頭・髪・目はどこから描けばよいですか？"),
    summary: localized(
      "教程从新建单层 Steve 模板和开启 2D/3D 混合模式开始，依次说明头部各面的底色、头发的明暗、刘海所在外层区域及五官安排。它还对比常规两格眼睛和日式画法，帮助理解少量像素如何改变表情。阅读时可一边对照展开图，一边检查模型正面、侧面与后脑，不要只完成正面就忽略其他面。",
      "This lesson starts with a single-layer Steve template and mixed 2D/3D mode, then covers base colors on every head face, hair shading, outer-layer bangs and facial features. It compares conventional two-pixel eyes with a Japanese-style approach. Follow the unfolded texture while checking front, side and rear views, rather than painting only the face.",
      "単層 Steve テンプレートと 2D/3D 混合表示から始め、頭の各面の下塗り、髪の明暗、外層の前髪、顔の配置を説明します。通常の二画素の目と日本風の描き方も比較できます。展開図とモデルの正面・側面・後頭部を照合し、顔だけで他の面を塗り忘れないようにしましょう。"),
  },
  {
    id: "developer-paint-body", category: "creation", sourceId: "body",
    title: localized("衣服和身体怎样绘制，避免配饰挤在一起？", "How do I paint clothing without crowding accessories?", "服や胴体で装飾が詰まらないように描くには？"),
    summary: localized(
      "身体绘制教程建议先隐藏无关部位、清除原始纹理并铺好底色，再提前勾勒衣领、纽扣、背带等配饰位置。它结合服装参考和配色思路说明如何建立身体层次，避免衣服与头发颜色过近导致轮廓不清。适合已经完成头部、需要把角色设计延伸到衣服的用户；绘制后再检查身体与手臂、腿部的衔接。",
      "The torso lesson recommends hiding other parts, clearing the original texture, laying base colors and reserving space for collars, buttons or straps. It explains clothing references and palettes that distinguish the torso from the hair. Use it after the head design, then inspect the joins between clothing, arms and legs.",
      "胴体の講座は、他の部位を隠し、元のテクスチャを消して下塗りした後、襟・ボタン・吊り紐などの位置を先に決める方法を紹介します。服の参考と配色を使って髪と服の輪郭を分けます。頭部を描いた後の衣装制作に適しており、最後に腕・脚とのつなぎ目も確認してください。"),
  },
  {
    id: "developer-paint-limbs", category: "creation", sourceId: "limbs",
    title: localized("手臂和腿部怎么画，完稿前检查什么？", "How do I paint limbs and check the completed skin?", "腕・脚の描き方と完成前の確認事項は？"),
    summary: localized(
      "教程展示了单独显示四肢、按袖子或裸露皮肤选择颜色、铺底色并通过阴影区分手臂结构的方法。单层模板与双层模板的镜像处理有所不同，应按所用模板检查两侧。完稿时重新显示全身，观察服装、手臂和腿部是否衔接，再补充小装饰；这里的完稿检查是绘图质量检查，不代表审核一定通过。",
      "The lesson covers isolating limbs, choosing sleeve or skin colors, base painting and shading arm structure. Mirroring differs between single- and double-layer templates, so inspect both sides. Restore the full model to check the joins and add final details. This is a painting-quality check, not a guarantee of approval.",
      "四肢を単独表示し、袖か肌かに合わせて配色し、下塗りと陰影で腕の構造を表す方法を紹介します。単層・二層テンプレートでは左右の扱いが異なるため、両側を確認してください。全身表示に戻してつなぎ目を確認し、最後に細かい装飾を加えます。完成確認は品質の点検であり、審査通過の保証ではありません。"),
  },
  {
    id: "developer-paint-shading", category: "creation", sourceId: "shading",
    title: localized("皮肤看起来很平，怎样增加明暗和材质层次？", "How can shading make a flat-looking skin more expressive?", "平坦に見えるスキンに明暗や質感を付けるには？"),
    summary: localized(
      "进阶技巧教程从基础色出发，解释如何调整色相、明度和小范围对比，表现头发、衣服等材质。重点是先遵循角色结构，再用有限的渐变色表现体积，而不是给每一个像素添加不同颜色。适合已经完成轮廓和底色的用户；可先在一个部位练习，再把相同的光照方向应用到全身。",
      "The advanced lesson explains adjusting hue, brightness and local contrast from a base palette to depict hair and clothing. Follow the structure and use a restrained set of gradients instead of assigning a different color to every pixel. Practice on one completed part, then apply a consistent light direction across the model.",
      "進階講座では、基本色から色相・明度・局所的な対比を調整し、髪や服の質感を表す方法を説明します。構造に沿って限られた階調を使い、画素ごとに色を増やしすぎないことがポイントです。輪郭と下塗りが完成したら一部位で練習し、同じ光の方向を全身に適用しましょう。"),
  },
  {
    id: "developer-arm-model", category: "preparation", sourceId: "model",
    title: localized("Steve 宽手臂和 Alex／Slim 窄手臂怎么选？", "How do I choose classic Steve or slim Alex arms?", "Steve の通常腕と Alex／Slim の細腕はどう選びますか？"),
    summary: localized(
      "官方皮肤设计教程说明，标准体型对应四格宽手臂，Slim 体型对应三格宽手臂，上传时应选择与贴图匹配的体型。若模型上出现手臂边缘错位、空白或异常颜色，先核对绘制模板与预览体型是否一致。该教程解释的是体型匹配，具体投稿界面的体型字段和可选项仍需以当前客户端及后台为准。",
      "The official skin-design guide distinguishes four-pixel classic arms from three-pixel Slim arms and says the selected model must match the texture. If arm edges look displaced or blank, compare the painting template with the preview model first. The lesson explains model matching; available portal fields and options depend on the current client and backend.",
      "公式のスキン設計ガイドでは通常体型の腕は四画素、Slim は三画素と説明し、テクスチャに合う体型の選択を求めています。腕の縁のずれや空白があれば、制作テンプレートとプレビュー体型を照合してください。投稿画面の項目と選択肢は現在のクライアント・管理画面を優先します。"),
  },
  {
    id: "developer-preview-check", category: "preparation", sourceId: "testing",
    title: localized("投稿前怎么检查漏画、空白和连接处？", "How do I check missing pixels and seams before submission?", "投稿前に塗り忘れやつなぎ目を確認するには？"),
    summary: localized(
      "导入与测试教程介绍了将导出的 PNG 导入 MCStudio 并预览整体效果的思路。检查时重点观察头部下方、手臂内侧、脚内侧和各部位连接处，这些区域容易在只看正面时被忽略。建议保留原始工程与导出文件，调整后重新导出并预览；绘图工具里的效果与目标客户端实际显示都应检查。",
      "The import-and-test guide describes exporting PNG, importing it into MCStudio and reviewing the whole skin. Inspect below the head, inside the arms and feet, and at body-part joins—areas easily missed in a front-only preview. Keep both the editable project and export, then re-export and test after changes in the editor and target client.",
      "導入・テストの講座では、PNG を書き出して MCStudio に取り込み、全体を確認する流れを紹介します。頭の下、腕や足の内側、各部位のつなぎ目は正面だけでは見落としがちです。編集用プロジェクトと書き出しファイルを残し、修正後に再出力して編集ソフトと対象クライアントの両方で確認しましょう。"),
  },
  {
    id: "developer-resolution-choice", category: "preparation", sourceId: "resolution",
    title: localized("更高分辨率一定更好吗，制作精度和图片尺寸怎么区分？", "Is a higher resolution always better, and how does it relate to file size?", "高解像度ほどよいですか？描画精度と画像寸法の違いは？"),
    summary: localized(
      "皮肤概念教程把分辨率作为影响细节表现的因素，并建议新手先从基础贴图练习。教程中的 16x、32x 等绘制精度描述，不应直接当作整张 PNG 的宽高填写。投稿时需要检查导出图片的实际像素尺寸，并结合手机版、电脑版和对应版本的官方资源分类确认；不要只凭“高清”标签判断文件合规。",
      "The skin-concept lesson links resolution to available detail and recommends basic textures for beginners. Its 16x or 32x painting-scale descriptions should not be entered as the dimensions of the entire PNG. Check the exported image's actual pixel dimensions and the official category for the target mobile or desktop edition; an HD label alone does not establish compliance.",
      "概念講座は解像度を細部の表現に関わる要素として説明し、初心者には基本テクスチャを勧めています。16x・32x などの描画尺度を PNG 全体の縦横寸法として入力しないでください。書き出し画像の実寸と、投稿先のモバイル版・PC版の資源分類を照合します。「高清」の表示だけでは適合性を判断できません。"),
  },
  {
    id: "developer-marketing-images", category: "publishing", sourceId: "marketing",
    title: localized("皮肤宣传图做好以后，怎样进入发布流程？", "How do promotional images fit into skin publishing?", "スキンの紹介画像を用意した後、公開へ進むには？"),
    summary: localized(
      "皮肤专门的宣传与上传教程串起了制作宣传图、进入作品管理、发布新资源、填写组件信息、按位置上传图片、保存与申请审核的流程。适合已经有成品 PNG，但不熟悉后台发布顺序的用户。应展示与实际作品一致的内容，并按当前表单要求准备各位置图片；提交审核、审核通过与正式上架是不同阶段。",
      "This skin-specific promotion lesson connects promotional images, Works Management, a new resource, component details, image placement, saving and review submission. It suits creators with a finished PNG who need the portal workflow. Show the actual work and follow current image fields; submitting, approval and listing are distinct stages.",
      "スキン専用の紹介・投稿講座は、紹介画像、作品管理、新規資源、コンポーネント情報、画像配置、保存、審査申請までをつなげて説明します。PNG は完成したものの公開手順に不慣れな方に向いています。実作品と一致する内容を示し、現在の画像欄の要件に従ってください。申請・承認・公開は別段階です。"),
  },
  {
    id: "developer-cover-fields", category: "publishing", sourceId: "submission",
    title: localized("作品封面、购买页图片和轮播图分别是什么？", "What are the cover, purchase image and carousel fields?", "作品表紙・購入画面画像・カルーセル画像の違いは？"),
    summary: localized(
      "官方上传教程说明了后台图片字段的展示位置：新 icon 用于作品封面，文档称为“POS机”的图片用于购买组件时展示，轮播图用于资源详情页的宣传。按用途分别准备图片，避免把一张图不加检查地放进所有位置。截图中的旧名称和规格可能变化，上传前还要核对当前表单的比例、尺寸与文件提示。",
      "The official upload lesson explains the image placements: the new icon is the cover, the field called POS in the guide appears during purchase, and carousel images promote the resource on its detail page. Prepare each for its purpose. Labels and specifications in old screenshots may change, so check the current form's aspect ratios, dimensions and file hints.",
      "公式投稿講座では、新 icon は作品表紙、「POS机」は購入時の画像、カルーセルは資源詳細の紹介画像と説明しています。用途ごとに用意し、同じ画像を確認せず全欄へ使わないようにしましょう。古い画面の名前や仕様は変わる可能性があるため、現在の縦横比・寸法・ファイル案内も確認してください。"),
  },
  {
    id: "developer-resource-description", category: "publishing", sourceId: "submission",
    title: localized("作品介绍和更新纪要分别该写什么？", "What belongs in the description and update notes?", "作品説明と更新記録には何を書けばよいですか？"),
    summary: localized(
      "上传教程把详细信息与更新纪要分开说明：前者介绍作品内容，可使用图片和富文本；后者用于作品上新或更新时的通知展示。简介可写明角色设计、体型、适用端和作品特色，更新纪要则说明本次实际修改。文档还提供文字长度与长图的建议，提交时以当前后台限制为准，避免把广告或无关内容代替作品说明。",
      "The upload guide separates detailed information, which can use images and rich text, from update notes used in new-release or update notifications. Describe the character, model, target client and features; use update notes for actual changes. The guide also gives length and long-image recommendations, subject to current portal limits.",
      "投稿講座は、画像やリッチテキストを使える詳細説明と、新作・更新通知に使う更新記録を分けています。作品説明にはデザイン・体型・対象端末・特徴、更新記録には今回の変更を書きます。文章量や縦長画像の目安もありますが、現在の管理画面の制限を確認してください。"),
  },
  {
    id: "developer-save-submit", category: "publishing", sourceId: "submission",
    title: localized("点了“保存”就提交审核了吗？", "Does clicking Save submit the work for review?", "「保存」を押すと審査申請も完了しますか？"),
    summary: localized(
      "官方教程分别介绍了“保存”组件信息和“立即提交审核”的操作，两者不能混为一步。填写资料、上传文件和图片后，先核对资源类别、定价和作品信息，再按后台提供的提交入口提审。完成后查看作品当前状态和后台反馈；本地导入成功、资料已保存或按钮点击过，都不应被当作审核通过的证明。",
      "The official guide distinguishes saving component information from Submit for Review Now. After completing files, images and details, verify category, pricing and resource information before using the review action. Then check the actual portal status. A local import, saved draft or clicked button is not evidence of approval.",
      "公式講座では、情報の「保存」と「立即提交审核」を別の操作として説明しています。ファイル・画像・情報を整え、分類・価格・作品情報を確認してから申請してください。その後は管理画面の実際の状態を確認します。ローカル導入や下書き保存、ボタンを押したことは承認の証明にはなりません。"),
  },
  {
    id: "developer-paid-skin-video", category: "publishing", sourceId: "submission",
    title: localized("付费皮肤必须上传介绍视频吗？", "Must a paid skin include a promotional video?", "有料スキンには紹介動画が必須ですか？"),
    summary: localized(
      "“正确上传作品的方式及途径”在手机版资源说明中写明：付费内容除皮肤类型作品外，均须上传视频介绍。这说明该文档对皮肤列有例外，不能仅凭付费地图或模组教程判断皮肤也必须上传视频。请先确认作品类型，再检查当前后台的必填项；如主动提供视频，内容仍应与成品相符，格式要求需另看原文。",
      "In its mobile-resource section, the official upload guide says paid content requires an introductory video except for skin-type works. Skins therefore have a stated exception in that guide; paid map or mod tutorials alone cannot establish a skin requirement. Confirm the resource type and current required fields. Any optional video should match the work and follow the documented format rules.",
      "公式投稿ガイドのモバイル資源の説明では、スキン類を除く有料作品に紹介動画が必要としています。この例外があるため、有料マップや MOD の説明だけでスキンにも必須と判断しないでください。資源分類と現在の必須項目を確認し、任意で動画を付ける場合は実作品と形式要件に合わせます。"),
  },
  {
    id: "developer-diamond-deposit", category: "pricing", sourceId: "submission",
    title: localized("钻石定价作品的押金规则去哪里核对？", "Where should I check deposit rules for diamond-priced works?", "ダイヤ価格の作品の保証金ルールはどこで確認できますか？"),
    summary: localized(
      "官方上传教程在钻石定价说明中提到按价格缴纳一定比例押金，并指向开发者平台的“问题与反馈中心”查询具体规则。文档没有在这段中给出可通用于所有作品的固定金额，因此应在设置价格前阅读当前后台提示。这里提供查询路径，不代替实际付款说明；请结合定价规则与自己作品的资源类型核对。",
      "The official upload guide mentions a price-related deposit for diamond-priced works and directs developers to the portal's Questions and Feedback Center for the rules. That section does not establish one fixed amount for every work. Read the current portal prompts before pricing and check the relevant category and pricing rules.",
      "公式投稿講座はダイヤ価格に応じた保証金に触れ、詳細を開発者管理画面の「问题与反馈中心」で確認するよう案内しています。この部分に全作品共通の固定額は示されていません。価格設定前に現在の案内を読み、作品の分類と価格ルールを照合してください。"),
  },
  {
    id: "developer-approved-listing", category: "review", sourceId: "marketing",
    title: localized("审核通过以后，作品就自动上架了吗？", "Is an approved work automatically listed?", "審査通過後は自動で公開されますか？"),
    summary: localized(
      "皮肤宣传与上传教程描述的流程是先保存并申请审核，审核通过后再点击上架按钮展示作品。因此，看到审核通过时，还应检查当前后台的上架操作与实际资源状态。不同界面可能调整操作顺序，按自己的作品页提示办理；已通过、已上架与手机端同步电脑版等状态应分别确认。",
      "The skin-publishing lesson describes saving, requesting review and clicking the listing button after approval. When a work passes, check the current portal's listing action and actual resource status. Interface workflows can change, so follow your work page; approval, listing and desktop synchronization should each be confirmed separately.",
      "スキン公開講座では、保存・審査申請の後、通過してから公開ボタンで作品を掲載する流れを説明しています。承認表示が出たら、現在の公開操作と資源状態も確認してください。画面の手順は変わることがあるため作品ページの案内に従い、承認・公開・PC版同期をそれぞれ確認します。"),
  },
  {
    id: "developer-skin-pack-china", category: "preparation", sourceId: "skinPackMirror",
    title: localized("国际基岩版的皮肤包，可以直接按原包投稿网易吗？", "Can an international Bedrock skin pack be submitted unchanged to NetEase?", "国際 Bedrock 版のスキンパックをそのまま網易へ投稿できますか？"),
    summary: localized(
      "EaseCation 的开发文档镜像在“认识作品结构与打包”的皮肤小节说明：中国版上传皮肤使用带透明通道的 PNG 图片，不适用文中提到的基岩版皮肤包形式。可将它作为理解差异的社区参考，并与网易官方上传规则交叉核对。此条只讨论普通纹理皮肤，不据此推断所有特殊模型或 4D 皮肤的投稿要求。",
      "EaseCation's developer-documentation mirror says the skin section uses an alpha-channel PNG for China Edition rather than the Bedrock skin-pack format discussed there. Use this community mirror to understand the distinction and cross-check NetEase's official upload rules. This entry concerns ordinary texture skins, not every custom-model or 4D submission.",
      "EaseCation の開発文書ミラーでは、中国版スキンの投稿はアルファチャンネル付き PNG であり、説明中の Bedrock スキンパック形式は使わないとしています。相違点を理解する参考として、網易公式の投稿ルールとも照合してください。通常のテクスチャスキンの説明で、特殊モデルや 4D 全般の要件ではありません。"),
  },
  {
    id: "developer-skinseed-hd", category: "tools", sourceId: "toolMobile",
    title: localized("Skinseed 怎样把已有皮肤复制成 128×128 项目？", "How does Skinseed duplicate a skin into a 128×128 project?", "Skinseed で既存スキンを 128×128 に複製するには？"),
    summary: localized(
      "Skinseed 官方介绍教程记录了在皮肤预览页菜单中选择“Duplicate as 128x128”，以原图为基础创建更高分辨率项目的方式。复制放大可以增加后续绘制空间，但不会自动补出原图没有的细节。文档同时记录了工具对适用版本的提示；导出后仍需按目标投稿端的尺寸与版本要求核对，不要直接把软件提示当作网易上架规则。",
      "NetEase's Skinseed introduction records Duplicate as 128x128 in the preview menu, creating a higher-resolution project from the existing image. Upscaling gives room for further painting but does not invent missing detail. The guide also records the editor's edition warning. Verify exported dimensions and the target portal's edition requirements rather than treating tool prompts as NetEase listing rules.",
      "網易の Skinseed 紹介講座には、プレビューのメニューで「Duplicate as 128x128」を選び、元画像から高解像度のプロジェクトを作る方法があります。拡大は描ける余地を増やしますが、細部を自動生成するものではありません。ツールの対応版表示も記載されています。出力後は投稿先の寸法・版の要件を別に確認してください。"),
  },
  {
    id: "developer-blockbench-project", category: "tools", sourceId: "blockbenchProject",
    title: localized("Blockbench 的源码、许可证和官方入口在哪里？", "Where are Blockbench's source, license and official entry points?", "Blockbench のソース・ライセンス・公式入口は？"),
    summary: localized(
      "这是 Blockbench 作者维护的开源项目，README 介绍了像素纹理、低多边形模型、Minecraft Java／基岩版相关格式和软件官网入口。项目说明源码采用 GPLv3，工具本身的源码许可与作品所用素材的版权需要分别理解。适合核对软件来源、了解项目能力或查阅许可证；普通绘图用户可以按 README 指向的官网使用工具，无需先从源码构建。",
      "The author's project README describes pixel textures, low-poly modeling, Minecraft Java and Bedrock formats, and the official website. It states that the source uses GPLv3; the software license and rights to materials used in a work are separate matters. Use this entry to verify the project and license. Ordinary artists can follow the official website link instead of building the source.",
      "作者の開源プロジェクトです。README はピクセルテクスチャ、低ポリモデル、Java・Bedrock 向け形式と公式サイトを紹介します。ソースは GPLv3 とされ、ソフトのライセンスと作品に使う素材の権利は別に確認します。出所や機能、ライセンスの確認に利用でき、通常の描画ではソースからの構築は不要です。"),
  },
  {
    id: "developer-blockbench-web", category: "tools", sourceId: "blockbenchWeb",
    title: localized("如何直达 Blockbench 网页版开始制作？", "How do I open the Blockbench web editor?", "Blockbench のウェブ版を直接開くには？"),
    summary: localized(
      "这个入口直达 Blockbench 作者提供的网页应用，适合先体验工具，或在浏览器中进行皮肤与纹理相关创作。进入后应根据作品选择对应格式，并结合官网的 Quickstart 和界面入门教程学习。请保留自己的工程与导出文件；网页工具完成制作后，仍需按网易官方资料核对 PNG、体型、尺寸和投稿信息，再走开发者平台发布流程。",
      "This opens the author's Blockbench web application for trying the editor and creating skin or texture work in a browser. Choose the format for your asset and use the official Quickstart and interface lessons. Keep your projects and exports. Finished work still needs NetEase's PNG, model, dimension and submission checks before developer-portal publication.",
      "作者が提供する Blockbench のウェブアプリへの直接入口です。制作物に合う形式を選び、Quickstart と操作講座を参照してください。編集用プロジェクトと書き出しは保管します。ブラウザーで制作しても投稿は別で、網易の PNG・体型・寸法・情報の要件を確認して管理画面から申請します。"),
  },
  {
    id: "developer-blockbench-quickstart", category: "tools", sourceId: "blockbenchQuickstart",
    title: localized("Blockbench 里皮肤与模型格式怎么区分，去哪找教程？", "How do I choose a Blockbench format and find lessons?", "Blockbench のスキン・モデル形式と講座はどこで確認できますか？"),
    summary: localized(
      "Blockbench 官网的 Quickstart 根据目标游戏与资源类型，引导用户选择格式，并列出注意事项和推荐教程。制作普通皮肤时，可选择 Minecraft 下的“My Minecraft skin or an entity texture”路径；皮肤分支强调输出 PNG 纹理而不是模型文件，并推荐了本页收录的皮肤编辑视频。这是工具格式导引，网易投稿分类和审核要求仍以网易后台为准。",
      "Blockbench's Quickstart selects a format by target game and asset type, then lists caveats and recommended lessons. For regular skins, follow Minecraft → My Minecraft skin or an entity texture. The skin branch describes PNG textures rather than model exports and recommends the skin-editing video archived here. NetEase's portal still determines publishing categories and review rules.",
      "公式 Quickstart は対象ゲームと資源から形式を選び、注意事項と推奨講座を案内します。通常のスキンは Minecraft の「My Minecraft skin or an entity texture」へ進みます。スキン分岐はモデルではなく PNG テクスチャの出力を説明し、本ページの編集動画を紹介しています。網易の投稿分類・審査要件は管理画面を優先します。"),
  },
  {
    id: "developer-video-hd-skin", category: "creation", sourceId: "videoSkin",
    title: localized("想看高清皮肤编辑的操作视频，可以从哪里开始？", "Which video introduces HD skin editing?", "高清スキン編集の操作動画はどこから見ればよいですか？"),
    summary: localized(
      "这段 ArtsByKev 视频由 Blockbench 官网的 Skin 分支推荐，原标题为“This is how you upgrade to a HD minecraft skin”。适合想通过视频理解皮肤编辑与高清制作方向的用户，原视频为英语，可按播放器实际提供的字幕辅助观看。它是制作教程，不是网易上架规范；观看后应对照本页的投稿尺寸、体型匹配和 PNG 上传问答检查导出文件。",
      "Blockbench's Skin Quickstart recommends ArtsByKev's This is how you upgrade to a HD minecraft skin. It is a starting point for visual guidance on skin editing and higher-detail work. The video is in English; use captions where available. It is a creation lesson, not a NetEase publishing rule—check export dimensions, body model and PNG requirements separately.",
      "Blockbench の Skin 分岐が推薦する ArtsByKev の「This is how you upgrade to a HD minecraft skin」です。編集と高清制作を動画で理解したい方の入口になります。英語の動画で、利用可能な字幕を参照できます。制作講座であり網易の公開規則ではないため、寸法・体型・PNG の投稿要件は別に確認してください。"),
  },
  {
    id: "developer-video-interface", category: "tools", sourceId: "videoInterface",
    title: localized("第一次用 Blockbench，哪里有界面入门视频？", "Where can a first-time Blockbench user learn the interface?", "Blockbench 初回利用者向けの画面操作動画は？"),
    summary: localized(
      "这是 ArtsByKev 的“LEARN BLOCKBENCH #1 - 3D Interface Basics for Beginners”，也被 Blockbench 官网教程导航引用。适合先熟悉编辑器界面的用户，可作为皮肤教程之前的工具基础学习。该视频属于通用 3D 工具入门，不作为网易开发者平台投稿规则的依据；学习界面后，再选择皮肤格式并阅读网易官方的导入、测试与上传说明。",
      "ArtsByKev's LEARN BLOCKBENCH #1 - 3D Interface Basics for Beginners is referenced by the tool's Quickstart. Use it to learn the editor before a skin-specific lesson. This general 3D lesson is not a source of submission rules for the NetEase developer portal. Afterwards, choose the skin format and follow the official China Edition import, test and upload documents.",
      "公式導引から参照されている ArtsByKev の「LEARN BLOCKBENCH #1 - 3D Interface Basics for Beginners」です。スキン講座の前に編集画面へ慣れるために利用できます。一般的な 3D ツールの入門で、網易の投稿規則の根拠にはなりません。操作を学んだ後にスキン形式を選び、中国版の公式導入・テスト・投稿資料を確認してください。"),
  },
  {
    id: "developer-video-low-poly", category: "creation", sourceId: "videoLowPoly",
    title: localized("想拓展到立体造型，有低多边形建模入门视频吗？", "Is there an introductory low-poly modeling video?", "立体制作へ進むための低ポリモデル入門動画は？"),
    summary: localized(
      "这段“How to create a Low Poly 3D MODEL | Tutorial”来自 Blockbench 的 YouTube 频道，并由官网 Generic 格式分支推荐。它面向低多边形建模，适合需要补充立体造型基础的创作者；普通 PNG 皮肤作者可以把它作为拓展阅读。该视频不等于 4D 皮肤上架教程，也不证明任意模型能作为网易皮肤投稿，特殊模型仍应另查对应官方要求。",
      "Blockbench's YouTube channel publishes How to create a Low Poly 3D MODEL | Tutorial, recommended in the Generic-format Quickstart. It develops 3D modeling fundamentals and is optional background for ordinary PNG skin artists. It is not a 4D publishing tutorial or proof that an arbitrary model can be submitted as a NetEase skin; special models need their own official requirements.",
      "Blockbench の YouTube チャンネルによる「How to create a Low Poly 3D MODEL | Tutorial」で、公式 Generic 分岐から推薦されています。立体造形の基礎を学ぶ拡張資料として利用できます。4D の公開講座や、任意のモデルが網易スキンとして投稿できる根拠ではありません。特殊モデルは対応する公式要件を別に確認します。"),
  },
  {
    id: "developer-4d-test-update", category: "preparation", sourceId: "update37",
    title: localized("MCStudio 支持 4D 皮肤测试，是否代表能按普通 PNG 投稿？", "Does MCStudio 4D testing imply ordinary PNG submission rules apply?", "MCStudio の 4D テスト対応で通常 PNG と同じ投稿ができますか？"),
    summary: localized(
      "这份 2025 年 11 月 28 日的官方月刊说明，MC Studio 自 3.6 版本起支持在 PC 端测试 4D 皮肤与模组的兼容性，可从游戏菜单、存档配置或启动开发测试时选择皮肤。它描述的是历史版本的测试能力，不是所有特殊皮肤的上传规范。请先区分兼容性测试与组件发布，再核对当前工作台、客户端和开发者平台对作品类型的要求。",
      "The official November 28, 2025 newsletter states that MC Studio 3.6 introduced PC testing of 4D-skin compatibility with mods, with selection through menus, save configuration or development-test startup. This records historical testing capabilities, not upload rules for every special skin. Distinguish compatibility testing from publishing and check the current editor, client and portal requirements.",
      "2025 年 11 月 28 日の公式月刊は、MC Studio 3.6 からPCで 4D スキンと MOD の互換性をテストでき、メニュー・保存設定・開発テスト起動時に選べると説明しています。過去バージョンの試験機能の記録であり、特殊スキン全般の投稿規則ではありません。互換性試験と公開を分け、現在の制作環境と管理画面の要件を確認してください。"),
  },
  {
    id: "developer-alpha-preview", category: "preparation", sourceId: "developerFaq",
    title: localized("为什么皮肤预览和游戏内的颜色不同，半透明变成了色块？", "Why do translucent pixels look different in the preview and game?", "プレビューとゲームで色が異なり、半透明が色の塊になるのはなぜ？"),
    summary: localized(
      "官方 FAQ 说明，资源中心与游戏内的皮肤渲染机制不同，皮肤组件不支持半透明图层，半透明颜色可能显示为纯色块，建议擦除相应颜色后检查。PNG 带透明通道不等于支持任意半透明效果；保留原文件，修改副本，并在目标客户端自测，不要仅凭编辑器预览判断最终效果。",
      "The official FAQ says Resource Center and in-game skin rendering differ, and skin components do not support semitransparent layers. Translucent colors may become solid blocks; the FAQ suggests erasing those colors. An alpha channel does not imply support for arbitrary translucency. Keep the original, edit a copy and test in the target client rather than relying solely on the editor preview.",
      "公式 FAQ は資源センターとゲーム内の描画方式が異なり、スキンでは半透明レイヤーをサポートせず、色の塊として表示される場合は該当色を消して確認すると説明しています。PNG のアルファチャンネルは任意の半透明効果の対応を意味しません。原本を残して複製を編集し、対象クライアントでテストしてください。"),
  },
  {
    id: "developer-review-delay", category: "review", sourceId: "developerFaq",
    title: localized("审核一直没有结果，应该在哪里查进度或反馈？", "Where can I ask about a delayed review?", "審査結果が出ない場合、どこで状況を問い合わせますか？"),
    summary: localized(
      "官方 FAQ 的“催审”小节提供参考周期，并引导开发者通过“开发者平台 → 问题与反馈中心”选择审核问题提单。参考时间不是固定承诺，组件审核也不能套用网络游戏的周期。先核对作品编号、提交时间、目标端和当前状态，再按后台要求反馈；本站批次表不代替网易后台，也不保证审核通过。",
      "The official FAQ's review-follow-up section gives indicative timelines and directs developers to Developer Portal → Questions and Feedback Center for a review ticket. These estimates are not guarantees, and online-game timelines do not describe component reviews. Check the work ID, submission time, target client and status before reporting. This site's batch tracker does not replace the NetEase portal or guarantee approval.",
      "公式 FAQ の「催审」は参考期間と、開発者管理画面の「问题与反馈中心」で審査問題を問い合わせる方法を示します。期間は保証ではなく、ネットワークゲームとコンポーネントの周期も別です。作品 ID・提出時刻・対象版・状態を確認して問い合わせてください。当サイトの一覧は網易の管理画面や承認を代替しません。"),
  },
  {
    id: "developer-upload-cdn", category: "review", sourceId: "developerFaq",
    title: localized("上传 CDN 失败、错误代码退回和内容退审怎么区分？", "How do CDN failures, error codes and content rejections differ?", "CDN アップロード失敗・エラーコード・内容の差し戻しはどう違いますか？"),
    summary: localized(
      "官方 FAQ 分开说明：错误代码应查打包错误文档并修改；上传 CDN 失败可等待一段时间后重新提审；常规内容退审则按审核意见修改或补充申述。先保存完整报错与作品信息，确认属于哪一类，再按对应路径处理。这里不是普通 PNG 皮肤的通用修复命令，也不建议绕过审核或在没有改动时反复刷提交。",
      "The official FAQ separates error codes, which need packaging-document checks, CDN upload failures, for which it suggests waiting before resubmitting, and content rejections, which require changes or an explanatory statement. Preserve the full error and work details, then choose the relevant path. This is not a universal PNG-skin fix or a reason to bypass review or repeatedly submit unchanged work.",
      "公式 FAQ は、エラーコードなら梱包エラー文書を参照して修正、CDN 失敗なら時間を置いて再申請、通常の内容差し戻しなら指摘に沿う修正や説明、と区別しています。エラー全文と作品情報を保存し、該当する方法を選んでください。通常 PNG の万能な修正手順や審査回避、未修正での連投を勧める資料ではありません。"),
  },
  {
    id: "developer-review-appeal", category: "review", sourceId: "developerFaq",
    title: localized("不理解审核意见，或对退审结果有异议怎么办？", "What if review feedback is unclear or I disagree with a rejection?", "審査の指摘が不明、または結果に異議がある場合は？"),
    summary: localized(
      "官方 FAQ 建议先阅读上架规范与内容审核制度，按意见修改后重新提交；有异议时，在开发者平台问题与反馈中心选择审核问题提单。反馈可整理作品编号、审核意见原文、对应截图与具体疑问，避免只有“为什么不通过”。本站只能提供资料入口，不能替官方撤销结果或承诺申诉一定成功。",
      "The official FAQ recommends reading listing and content-review rules, making the requested changes and resubmitting. Disputes can be raised as review tickets in the portal's Questions and Feedback Center. Organize the work ID, exact feedback, relevant screenshots and a specific question instead of a bare complaint. This site supplies references; it cannot overturn an official decision or guarantee an appeal.",
      "公式 FAQ は公開規則・審査制度を確認し、指摘に沿って修正して再提出するよう案内しています。異議は管理画面の「问题与反馈中心」から審査問題として問い合わせます。作品 ID・指摘原文・画像・具体的な疑問を整理してください。当サイトは資料を案内するだけで、公式判断の取消しや異議申立ての成功を保証しません。"),
  },
  {
    id: "developer-resubmit-cooldown", category: "review", sourceId: "developerFaq",
    title: localized("为什么更新后提示“请三天后再次上传”？", "Why does the portal ask me to wait three days before uploading again?", "更新後に「3日後に再アップロード」と表示されるのはなぜ？"),
    summary: localized(
      "官方 FAQ 说明，上架或更新组件后，同一资源存在三天提审冷却期；如线上作品有紧急 bug，可通过官方反馈入口说明情况。请以当前后台提示为准，不要换账号或换作品规避限制。这个平台冷却期与本站反馈墙的本机五分钟修改期无关，也不是皮肤审核必定耗时三天的意思。",
      "The official FAQ describes a three-day resubmission cooldown for the same resource after listing or updating. Urgent live bugs can be reported through the official feedback channel. Follow the current portal prompt rather than changing accounts or works to evade it. This cooldown is unrelated to this site's five-minute feedback editing window and does not mean every skin review takes three days.",
      "公式 FAQ は公開・更新後の同一資源に3日間の再申請待機期間があると説明し、緊急の不具合は公式窓口へ相談するよう案内します。現在の管理画面に従い、別アカウントなどで制限を回避しないでください。当サイトのフィードバックを編集できる5分間とは別で、スキン審査が必ず3日かかるという意味でもありません。"),
  },
  {
    id: "developer-source-backup", category: "preparation", sourceId: "developerFaq",
    title: localized("可以把云端仓库下载的组件当作源文件，再修改上传吗？", "Can I edit and re-upload a component downloaded from the cloud repository?", "クラウドから取得したコンポーネントを原本として編集・再投稿できますか？"),
    summary: localized(
      "官方 FAQ 说明，进入审核或自测流程的基岩版组件默认加密，从工作台云端下载的测试组件不能作为原工程再次上传。制作时应自行保管原始工程、源 PNG 和独立备份；“上传成功”不等于平台替你保存了可编辑源文件。不要尝试解密他人组件，普通皮肤与特殊模型的备份内容也应按实际工程分别保存。",
      "The official FAQ says Bedrock components entering review or self-testing are encrypted by default, and cloud-downloaded test components cannot be re-uploaded as the original project. Keep your editable project, source PNG and independent backups. A successful upload does not mean the platform stores an editable source for you. Do not decrypt other creators' components; preserve the files appropriate to your skin or model project.",
      "公式 FAQ によると、審査・自測に進んだ Bedrock コンポーネントは既定で暗号化され、クラウドから取得するテスト用データを原本として再投稿できません。編集用プロジェクト・元 PNG・別のバックアップを保管してください。投稿成功は編集可能な原本の保管保証ではありません。他人のデータの復号はせず、制作形式に合う原本を残します。"),
  },
  {
    id: "developer-unlisting", category: "review", sourceId: "developerFaq",
    title: localized("皮肤如何申请下架，“弱下架”是什么意思？", "How do I request unlisting, and what is weak unlisting?", "スキンの公開停止申請と「弱下架」とは何ですか？"),
    summary: localized(
      "官方 FAQ 描述了从作品管理编辑已上线组件，在上架设置中申请下架、填写原因并再次提审的流程，审核通过后才进入下架状态。原文对“弱下架”的说明是不能搜索、查看与购买，但已购买玩家仍能使用。它不等同于删除源文件、追回所有玩家副本或转移版权，具体操作与状态以当前后台为准。",
      "The official FAQ describes editing a listed component in Works Management, requesting unlisting under listing settings, giving a reason and submitting for review; unlisting follows approval. It defines weak unlisting as preventing search, viewing and purchases while existing buyers retain use. This is not source deletion, recall of all player copies or a copyright transfer. Confirm the current portal workflow and status.",
      "公式 FAQ は公開済み作品の編集から公開設定で停止を申請し、理由を記入して再審査に出し、承認後に停止となる流れを説明します。「弱下架」は検索・閲覧・購入ができなくなっても購入済みプレイヤーは利用できる状態です。原本削除・全配布物の回収・著作権移転ではありません。現在の管理画面と状態を確認します。"),
  },
  {
    id: "developer-delegated-rights", category: "privacy", sourceId: "developerFaq",
    title: localized("官方怎样提醒代投、代发的版权和收益风险？", "What does the official FAQ say about delegated publishing rights and revenue?", "公式 FAQ は代理投稿の権利・収益リスクをどう説明していますか？"),
    summary: localized(
      "官方 FAQ 建议尽量避免他人代发，以防权益纠纷；如已有或计划代发，建议与代发人签署相关纸质协议并做好备案，约定版权归属与收益分配。原文同时说明平台结算认准资源上传账号。请先阅读官方提醒和本站条款，弄清作者、上传账号与收益安排；网页勾选同意不等于网易认可代发，也不能代替双方应完成的权属约定。",
      "The official FAQ advises avoiding delegated publication to prevent rights disputes. If delegation exists or is planned, it recommends a paper agreement and records covering copyright and revenue sharing, and says platform settlement recognizes the uploading account. Read that warning and this site's terms before clarifying authorship, account and revenue arrangements. A website checkbox is not NetEase endorsement or a substitute for the parties' rights agreement.",
      "公式 FAQ は紛争防止のため代理公開をできるだけ避けるよう勧め、行う場合は紙の契約と記録で著作権・収益配分を定めるよう案内します。精算対象はアップロードしたアカウントとされています。公式注意事項と当サイトの条項を読み、作者・投稿先・収益の取決めを確認してください。ウェブでの同意は網易の承認や当事者の権利契約を代替しません。"),
  },
  {
    id: "developer-account-transfer", category: "privacy", sourceId: "developerFaq",
    title: localized("换团队或更换代发人，已上传作品能转到另一个账号吗？", "Can a published work move to another account after changing teams or publishers?", "チームや代理投稿者を変えると、作品を別アカウントへ移せますか？"),
    summary: localized(
      "官方 FAQ 在团队成员离队问题中说明，目前平台不支持把作品转移至另一个开发者账号，并提到等级与付费资源结算的关联。因此代发前应先确认上传账号和后续维护安排，不要相信“以后随时能转账号”的口头承诺。变更合作关系、下架、重新投稿与作品转移是不同操作，应结合当前官方政策及双方协议核对。",
      "In its team-departure question, the official FAQ says works cannot currently be transferred to another developer account, citing level and paid-resource settlement implications. Confirm the upload account and maintenance arrangements before delegation; do not rely on verbal promises of an easy future transfer. Changing a collaboration, unlisting, resubmitting and transferring a work are different actions. Check current policy and the parties' agreement.",
      "公式 FAQ のチーム離脱の項目では、レベルや有料資源の精算に関係するため、作品を別の開発者アカウントへ移転する機能は現在ないと説明しています。代理投稿前に投稿先と保守方法を確認し、後から自由に移せるという口約束を信用しないでください。協力関係の変更・公開停止・再投稿・作品移転は別の操作です。"),
  },
  {
    id: "developer-infringement-report", category: "privacy", sourceId: "developerFaq",
    title: localized("发现皮肤被盗用，向网易举报应准备哪些证据？", "What evidence should I prepare when reporting a stolen skin to NetEase?", "スキンの盗用を網易へ通報する際、どんな証拠が必要ですか？"),
    summary: localized(
      "官方 FAQ 的组件版权小节要求提供链接、截图等有价值的证据，并通过开发者内容管理平台的问题与反馈中心反馈。可整理原作品地址、发布时间记录、涉嫌侵权组件信息和对比截图，选择当前后台对应的问题分类。平台工作人员负责核查，本站不能裁定侵权；如果涉及本页资料归档，请使用页面下方的侵权反馈／联系删除入口。",
      "The official FAQ's copyright section asks for useful evidence such as links and screenshots through the developer portal's Questions and Feedback Center. Organize the original work's address and publication record, suspected component details and comparison images, then select the relevant current ticket category. The platform investigates; this site does not adjudicate infringement. Issues with this archive can use its takedown contact below.",
      "公式 FAQ の著作権項目は、リンク・画像などの証拠を管理画面の「问题与反馈中心」へ提出するよう案内しています。原作品の URL・公開記録・対象コンポーネント・比較画像を整理し、現在の該当分類を選びます。調査はプラットフォームが行い、当サイトは侵害を判定しません。本アーカイブへの申立ては下部の削除相談入口を利用してください。"),
  },
  {
    id: "developer-authorized-materials", category: "preparation", sourceId: "contentReview",
    title: localized("下载到的皮肤、改色作品和同人形象，能直接当原创投稿吗？", "Can downloaded, recolored or fan-character skins be submitted as original work?", "取得したスキン・色替え・二次創作キャラクターをオリジナルとして投稿できますか？"),
    summary: localized(
      "官方内容审核制度禁止未经授权搬运、使用或改编他人作品，并保护独创人物形象、设计和艺术风格。能下载、免费分享或做过改色不等于获得发布与商业使用许可，也不应把教程示例直接标为原创。提交前核对素材授权范围、角色形象权利与实际创作来源；不确定时向权利人或官方咨询，本站不能替你取得授权或给出法律结论。",
      "The official content-review policy prohibits unauthorized copying, use or adaptation of others' work and protects original character designs and artistic styles. Downloadability, free sharing or recoloring does not establish publishing or commercial permission, and tutorial examples should not be labeled as your original work. Check material licenses, character rights and provenance before submitting. Ask the rights holder or platform when unsure; this site cannot grant permission or legal clearance.",
      "公式審査制度は無断の転載・利用・改変を禁止し、独自の人物設計や芸術表現も保護しています。ダウンロード・無料配布・色替えだけでは公開や商用利用の許諾にならず、講座の例を自作と表示することも避けてください。素材の許諾範囲・キャラクターの権利・制作元を確認し、不明なら権利者や公式へ相談します。当サイトは許諾や法的判断を提供しません。"),
  },
  {
    id: "developer-promotional-links", category: "preparation", sourceId: "contentReview",
    title: localized("作品宣传图、介绍里可以放 QQ、微信或二维码吗？", "Can a work's promotional images or description include QQ, WeChat or QR codes?", "紹介画像や説明に QQ・微信・QR コードを入れられますか？"),
    summary: localized(
      "官方内容审核制度的“素材不良陈述”小节限制未经许可的外部引流，包括 QQ、微信、二维码、外部链接等，并要求宣传与实际提审内容一致。准备上架素材时，应按官方规范和当前后台要求检查联系方式、引流文案和效果图。本站社群入口不表示这些内容可以照搬进网易组件介绍，也不要使用与成品不符的封面或未实现功能作宣传。",
      "The official policy's misleading-materials section restricts unapproved external promotion, including QQ, WeChat, QR codes and external links, and requires promotional material to match the submitted work. Check contact details, redirecting copy and images against current rules. This site's community links do not authorize copying them into NetEase component descriptions. Do not advertise inaccurate covers or features that do not exist.",
      "公式制度の素材規定は、許可のない QQ・微信・QR コード・外部リンクなどの誘導を制限し、紹介と申請内容の一致を求めています。連絡先・誘導文・画像を現行規則と照合してください。当サイトに社群入口があっても、網易の作品紹介へ転載してよいという意味ではありません。実作品と異なる表紙や未実装機能の宣伝も避けます。"),
  },
  {
    id: "developer-transparent-review", category: "review", sourceId: "contentReview",
    title: localized("隐形或大面积透明皮肤能保证过审吗？", "Can an invisible or mostly transparent skin be guaranteed approval?", "透明・ほぼ見えないスキンの承認は保証されますか？"),
    summary: localized(
      "不能保证。官方内容审核制度把“皮肤过多透明部分”列为可能影响平衡、需要更严格审核的内容，并要求皮肤正常、完整显示。PNG 允许透明通道只是文件格式说明，不是隐形皮肤的过审许可。不要把利用渲染 bug、隐藏内容或绕过检测的视频当作官方教程；实际结果以当前规范、自测效果及后台审核意见为准。",
      "No. The official policy lists excessive skin transparency among balance-affecting content subject to stricter review and requires skins to display normally and completely. PNG alpha support is a format rule, not permission for invisible skins. Videos exploiting rendering bugs, hidden content or detection bypasses are not official lessons. Current rules, target-client testing and portal feedback determine the result.",
      "保証できません。公式制度は過度な透明部分をバランスに影響し得る厳格審査の対象とし、正常・完全な表示を求めています。PNG のアルファ対応はファイル形式の説明で、透明スキンの許可ではありません。描画バグ・隠し内容・検出回避の動画を公式手順と混同せず、現行規則・自測・管理画面の指摘を確認してください。"),
  },
  {
    id: "developer-machine-review", category: "review", sourceId: "machineReview",
    title: localized("机器审核会检查什么，机审退回通知去哪里看？", "What does automated review check, and where are rejection notices?", "機械審査の確認内容と差し戻し通知の確認先は？"),
    summary: localized(
      "官方文档介绍代码机审、组件核价、性能检测三个环节，代码机审不通过时可在开发者平台右上角邮箱查看站内通知。文中的性能数据包含截至 2025 年 3 月 5 日的统计，面向组件整体流程，不代表每个普通 PNG 皮肤都执行相同的代码或性能检测。按通知中的实际错误与资源类型排查，不能把历史性能表当作当前皮肤通用门槛。",
      "The official document describes code review, pricing checks and performance testing, with code-review failures reported through the portal's top-right inbox. Its performance data includes statistics as of March 5, 2025 and describes a general component workflow, not identical code or performance checks for every ordinary PNG skin. Investigate the actual notice and resource type; historical performance tables are not universal current skin thresholds.",
      "公式文書はコード審査・価格確認・性能試験の3段階を説明し、コード審査の不合格通知は管理画面右上の受信箱で確認するとしています。2025年3月5日時点の性能統計を含む一般的なコンポーネント資料で、すべての通常 PNG に同じ検査が行われる根拠ではありません。通知と資源分類に沿って確認し、過去の表を現行スキンの共通基準としないでください。"),
  },
  {
    id: "developer-demo-video-format", category: "preparation", sourceId: "videoExport",
    title: localized("如果为皮肤制作展示视频，导出格式在哪里核对？", "Where can I check export requirements for an optional skin showcase video?", "スキンの紹介動画を付ける場合、書き出し形式はどこで確認できますか？"),
    summary: localized(
      "官方视频规范原文列出 H.264 编码 MP4、1080P、AAC 音频、16:9、一分半以内及 50M 大小限制。准备展示视频时可据此检查导出，并再核对当前后台提示；这份格式文档不表示所有皮肤都必须附视频，是否必填还应结合资源类型和上传规则。音乐、图片与演示素材也应有相应使用授权，视频内容应与成品一致。",
      "The official video document lists H.264 MP4, 1080p, AAC audio, 16:9, a maximum of one and a half minutes and a 50M size limit. Use it to check exports, then confirm current portal prompts. Format guidance does not make videos mandatory for every skin; required fields depend on resource type and upload rules. Ensure rights to music, images and demonstration materials, and show the actual finished work.",
      "公式の形式文書は H.264 の MP4・1080P・AAC 音声・16:9・1分半以内・50M 制限を記載しています。出力を確認してから現在の管理画面とも照合してください。形式の説明はすべてのスキンへの動画添付義務ではなく、必須項目は分類・投稿ルールで確認します。音楽・画像などの利用権も確認し、完成品に合う映像を用意してください。"),
  },
  {
    id: "developer-video-china-upload", category: "publishing", sourceId: "videoChinaUpload",
    title: localized("想看网易自制皮肤上传的中文短视频，从哪里开始？", "Which Chinese short video introduces skin uploads to Minecraft China?", "中国版への自作スキン投稿を紹介する中国語短編動画は？"),
    summary: localized(
      "绯色色i 于 2024 年 9 月 1 日发布的上传教程，可作为了解中国版自制皮肤上传的社区视频入口。它记录的是当时的操作，不代表当前后台界面或所有开发者上架场景都相同。观看时与本页官方作品管理、PNG 上传和提交审核问答对照；自行使用皮肤、本地导入与资源中心上架也要区分，不据视频标题承诺审核结果。",
      "绯色色i published this upload tutorial on September 1, 2024. It is a community-video introduction to custom-skin uploads in China Edition, recording the workflow at that time rather than every current portal or developer-listing scenario. Cross-check the official works-management, PNG-upload and review entries here. Personal use, local import and Resource Center publication are distinct; the title does not promise approval.",
      "绯色色i が2024年9月1日に公開した、中国版の自作スキン投稿を紹介する社区動画です。当時の操作であり、現在の管理画面や全公開経路と同じとは限りません。本ページの公式作品管理・PNG 投稿・審査申請と照合してください。個人利用・ローカル導入・資源センターへの公開は別で、タイトルは承認を保証しません。"),
  },
  {
    id: "developer-video-china-upload-followup", category: "publishing", sourceId: "videoChinaUploadFollowup",
    title: localized("还有另一份网易皮肤上传视频可以对照吗？", "Is there another Minecraft China skin-upload video to compare?", "中国版のスキン投稿を比較できる別の動画は？"),
    summary: localized(
      "这是想吃鱼的小狗awa 于 2025 年 11 月 9 日发布的“一个视频教你如何上传皮肤到网易”。可与官方图文交叉对照，帮助辨别教程发布时间不同带来的界面差异。来源页同时有作者自己的代发联系介绍，本站只归档视频，不推荐其服务或转账渠道；不要向陌生人提供密码、验证码或证件，实际提交要求以网易当前后台为准。",
      "想吃鱼的小狗awa published this alternative upload video on November 9, 2025. Compare it with official articles to recognize interface differences between tutorials. The source page also promotes the author's delegated-publishing contact; this archive links the video without endorsing that service or payment channels. Do not share passwords, verification codes or identity documents with strangers. Current NetEase portal requirements govern submissions.",
      "想吃鱼的小狗awa が2025年11月9日に公開した別の投稿動画です。公式記事と比較し、公開時期による画面の相違を確認できます。元ページは作者の代理投稿窓口も紹介していますが、当サイトは動画のみを案内し、サービスや送金先を推奨しません。見知らぬ相手にパスワード・認証コード・身分証を渡さず、現行の公式要件を優先します。"),
  },
  {
    id: "developer-video-mcskin3d", category: "tools", sourceId: "videoMcskin3d",
    title: localized("MCSkin3D 有没有中文操作讲解视频？", "Is there a Chinese walkthrough of MCSkin3D?", "MCSkin3D の中国語操作講座はありますか？"),
    summary: localized(
      "爱吃胡洛卜德猫于 2019 年 3 月 3 日发布的 MCSKIN3D 讲解，适合把官方工具说明与视频操作结合阅读。简介提到 Net4.0 与 Mcskin3D，属于较早的桌面工具教程，不是当前所有设备的安装指南。软件应优先从作者或官方工具文档指向的来源获取，不运行不明安装包；工具学习与网易投稿审核是两件事。",
      "爱吃胡洛卜德猫's March 3, 2019 MCSKIN3D walkthrough complements the official tool notes. The description mentions Net4.0 and Mcskin3D, so it is an older desktop lesson rather than an installation guide for every current device. Obtain software from its author or sources linked by official tool documentation, and avoid unknown installers. Learning an editor is separate from NetEase submission and review.",
      "爱吃胡洛卜德猫 による2019年3月3日の MCSKIN3D 講座で、公式のツール説明と併用できます。概要には Net4.0 と Mcskin3D があり、古いデスクトップ講座で全端末の現行インストール手順ではありません。ソフトは作者や公式文書の案内先から取得し、不明なインストーラーは避けてください。操作学習と網易の審査は別です。"),
  },
  {
    id: "developer-video-skinseed-clothing", category: "creation", sourceId: "videoSkinseedClothing",
    title: localized("Skinseed 的衣服绘制，有中文视频参考吗？", "Is there a Chinese video reference for painting clothing in Skinseed?", "Skinseed で服を描く中国語動画は？"),
    summary: localized(
      "罗小娜咕了于 2022 年 7 月 14 日发布的 Skinseed 衣服教程，属于其皮肤／建模新手教程合集，适合补充身体与服装绘制的视觉参考。先看自己的模板和体型，再在副本上练习，保留独立设计，不把示例照搬为原创投稿。它是绘制参考，不是网易的投稿规范；完成后仍需检查接缝、透明区域和目标客户端显示。",
      "罗小娜咕了's July 14, 2022 Skinseed clothing lesson belongs to a beginner skin/model tutorial collection. Use it as a visual reference alongside body and clothing guides. Check your template and body model, practice on a copy and create your own design rather than claiming a copied example as original. It is an art lesson, not NetEase policy; check seams, transparency and the target client's display afterwards.",
      "罗小娜咕了 の2022年7月14日の Skinseed 服装講座で、初心者向けスキン・モデル合集に含まれます。胴体と服の制作を視覚的に理解する参考です。自分のテンプレート・体型を確認し、複製で練習して独自に設計してください。制作例を自作として投稿せず、完成後はつなぎ目・透明部分・対象版の表示を別に確認します。"),
  },
  {
    id: "developer-video-skin-eyes", category: "creation", sourceId: "videoSkinEyes",
    title: localized("皮肤眼睛怎么选样式，有视频对照吗？", "Where can I compare Minecraft skin eye styles in a video?", "スキンの目の表現を比較できる動画は？"),
    summary: localized(
      "罗小娜咕了于 2023 年 2 月 19 日发布的眼睛样式盘点，可作为头部绘制时的审美与像素布局参考，来源页标注了 MCSkin3D 和 Skinseed。它介绍的是绘图样式，不是发光、眨眼等模组功能的保证。可结合官方头部教程练习，并在三维预览中检查比例；借鉴方法不等于获得原作品、角色形象或素材的转载授权。",
      "罗小娜咕了's February 19, 2023 eye-style overview is a visual and pixel-layout reference for head painting; the source tags MCSkin3D and Skinseed. It concerns painted styles, not guaranteed glowing or blinking mod features. Combine it with the official head guide and check proportions in a 3D preview. Learning a method does not grant rights to redistribute the creator's work, character designs or materials.",
      "罗小娜咕了 による2023年2月19日の目の表現の紹介です。元ページには MCSkin3D・Skinseed のタグがあり、頭部のピクセル配置の参考になります。発光・まばたきなど MOD の機能保証ではありません。公式の頭部講座と併用して3Dで比率を確認し、技法の学習と作品・キャラクター・素材の転載許諾は分けてください。"),
  },
  {
    id: "developer-video-skin-gradient", category: "creation", sourceId: "videoSkinGradient",
    title: localized("新手想练习皮肤渐变，有短视频教程吗？", "Is there a short beginner video for skin gradients?", "初心者向けのスキングラデーション短編講座は？"),
    summary: localized(
      "这份罗小娜咕了于 2022 年 2 月 16 日发布的渐变制作视频，适合在官方明暗与进阶技巧图文之外获得直观参考。可以先在小块区域练习配色，再观察三维模型，避免只看平面展开图。渐变颜色与透明度不是同一件事，网易不支持半透明图层的说明仍需单独核对；不要把艺术效果当作自动过审依据。",
      "罗小娜咕了's February 16, 2022 gradient lesson offers a visual companion to official shading and advanced-technique articles. Practice a small area first, then check the 3D model rather than only its flat layout. Color gradients and alpha transparency are different; the China Edition FAQ's semitransparent-layer restriction still needs a separate check. An artistic effect is not proof of automatic approval.",
      "罗小娜咕了 が2022年2月16日に公開したグラデーション講座で、公式の明暗・応用記事を補う視覚資料です。小さい範囲で練習し、展開図だけでなく3Dでも確認します。色の段階表現と透明度は別です。中国版の半透明レイヤー制限も確認し、表現効果を承認保証と混同しないでください。"),
  },
  {
    id: "developer-video-skin-resolution", category: "creation", sourceId: "videoSkinResolution",
    title: localized("从 64 分辨率画到 128，有头部细化视频吗？", "Is there a head-detailing video for moving from 64 to 128 resolution?", "64 から128へ細部を描き直す頭部の動画は？"),
    summary: localized(
      "晴空南浅酱于 2022 年 3 月 5 日发布的“如何绘制64皮肤并把它绘制为128皮肤”，简介明确写着“这期视频只讲头”。适合学习头部细化，不应把它当作完整全身教程或自动放大转换工具。高分辨率创作完成后，要按目标投稿端核对尺寸、体型和版本；更多像素不意味着所有 Java、基岩版或网易场景都能直接使用。",
      "晴空南浅酱's March 5, 2022 video concerns painting at 64 and 128 resolution; its description explicitly says this episode covers only the head. Treat it as head-detailing guidance, not a full-body lesson or automatic conversion tool. Check exported dimensions, body model and target edition. More pixels do not establish compatibility with every Java, Bedrock or Minecraft China workflow.",
      "晴空南浅酱 による2022年3月5日の64・128解像度の制作動画で、概要には「今回は頭だけ」と明記されています。頭部の細部制作の参考で、全身の講座や自動拡大ツールではありません。完成後は寸法・体型・対象版を確認してください。ピクセル数が多くても、すべての Java・Bedrock・中国版でそのまま使えるとは限りません。"),
  },
  {
    id: "developer-video-blockbench-paint", category: "creation", sourceId: "videoBlockbenchPaint",
    title: localized("Blockbench 皮肤绘画，有较完整的中文视频吗？", "Is there a longer Chinese Blockbench skin-painting video?", "Blockbench のスキン描画を学べる長めの中国語動画は？"),
    summary: localized(
      "白歌Dahurian 于 2025 年 5 月 16 日发布的约 28 分钟皮肤绘画教程，可作为中文视觉学习入口；来源页声明为个人观点、仅供参考。适合结合工具官方 Quickstart 与本站基础绘图问答阅读，软件功能以当前版本为准。这里只链接原视频，不搬运讲解或素材；绘图完成后，仍需走网易的文件检查、自测与发布流程。",
      "白歌Dahurian's roughly 28-minute skin-painting lesson was published on May 16, 2025 and labeled by its author as personal views for reference. Use it alongside the official Blockbench Quickstart and basic art Q&As, checking features against the current version. This archive links rather than republishes the lesson or assets. Completed artwork still needs NetEase file checks, testing and publication steps.",
      "白歌Dahurian が2025年5月16日に公開した約28分の描画講座で、作者は個人的な見解・参考用と表示しています。公式 Quickstart と本サイトの制作 Q&A を併用し、機能は現行版で確認してください。当サイトは動画・素材を転載せず原動画へ案内します。完成後も網易のファイル確認・自測・公開手順が必要です。"),
  },
  {
    id: "developer-video-blockbench-model-layers", category: "tools", sourceId: "videoBlockbenchModelLayers",
    title: localized("Blockbench 怎么切换粗细手臂、开启图层和调色插件？", "How do I switch arm models, enable layers and find palette plugins in Blockbench?", "Blockbench で腕の太さ・レイヤー・配色プラグインを設定するには？"),
    summary: localized(
      "Jzium芥子于 2025 年 8 月 10 日发布的视频，简介明确列出粗臂／细臂体型、开启图层和调色插件三个常见问题。适合遇到体型或编辑器配置问题时对照操作，插件可用性与菜单名称应以当前软件为准。编辑图层并不代表网易支持半透明图层；导出后继续检查 PNG 与实际体型，插件也应只从可信来源安装。",
      "Jzium芥子's August 10, 2025 description explicitly covers classic/slim arms, enabling layers and palette plugins. Use it when checking model selection or editor configuration, noting that plugin availability and menus may change. Editor layers do not imply NetEase support for semitransparent skin layers. Verify the exported PNG and body model, and install plugins only from trusted sources.",
      "Jzium芥子 の2025年8月10日の動画概要は、通常・細腕の切替、レイヤー有効化、配色プラグインの3点を明記しています。体型や設定の確認に使えますが、メニュー・プラグインは現行版を優先します。編集レイヤーは網易での半透明対応を意味しません。PNG と体型を確認し、プラグインは信頼できる配布元から取得してください。"),
  },
  {
    id: "developer-video-blockbench-mobile", category: "tools", sourceId: "videoBlockbenchMobile",
    title: localized("手机使用 Blockbench 网页版画皮肤，有操作视频吗？", "Is there a video about painting skins in the mobile Blockbench web editor?", "スマートフォン版 Blockbench ウェブ編集の動画は？"),
    summary: localized(
      "屑牲-于 2026 年 3 月 8 日发布的手机版／网页版皮肤绘画视频，简介说明只介绍作者高频使用的功能，并非所有功能的完整教程，部分操作节奏较快。适合手机用户配合 Blockbench 官方网页版入口学习，可暂停对照。这里的“手机版”是网页工具使用场景，不代表网易手机投稿已完成；请保管工程并另行检查导出文件与目标端要求。",
      "屑牲- published this mobile/web skin-painting video on March 8, 2026. The description says it covers frequently used functions rather than every feature and that some actions are fast. Mobile users can pause it alongside the official web editor. Mobile editor use does not complete a NetEase mobile submission; retain projects and separately check exports and target-client requirements.",
      "屑牲- が2026年3月8日に公開したモバイル・ウェブ版の制作動画です。概要ではよく使う機能のみで、全機能の説明ではなく操作が速い部分もあるとしています。公式ウェブ版と併用して一時停止しながら確認できます。モバイルでの編集は網易への投稿完了ではありません。プロジェクトを保存し、出力と投稿先の要件を別に確認します。"),
  },
  {
    id: "developer-missing-alpha", category: "preparation", sourceId: "packagingErrors",
    title: localized("上传提示“皮肤图片必须包含 Alpha 通道”，怎么处理？", "How do I resolve the skin image missing an Alpha channel error?", "スキン画像に Alpha チャンネルが必要と表示されたら？"),
    summary: localized(
      "官方错误汇整说明，这个提示表示图片缺少 Alpha 通道，可用图像编辑器检查颜色通道并重新导出 PNG，或在 MCSkin3D、Skinseed 中导入原文件后再导出。不要只改扩展名，也不要用截图代替原始纹理。拥有 Alpha 通道不等于可以制作隐形或任意半透明皮肤，透明区域仍需符合审核规范；保留原件，在副本上调整后重新自测。",
      "The official error guide says this notice means the image lacks an Alpha channel. Check channels in an image editor and re-export as PNG, or import and re-export the original with MCSkin3D or Skinseed. Renaming an extension or using a screenshot is not a substitute. An Alpha channel does not authorize invisible or arbitrarily semitransparent skins; review rules still apply. Keep the original, edit a copy and retest.",
      "公式のエラー集によると、画像に Alpha チャンネルがありません。画像編集ソフトでチャンネルを確認して PNG を再出力するか、原本を MCSkin3D・Skinseed に読み込んで再出力します。拡張子の変更やスクリーンショットでは代用できません。Alpha があっても透明・半透明の表現が無条件で認められるわけではありません。原本を残し、複製を修正して再確認してください。"),
  },
  {
    id: "developer-listing-interface-failure", category: "review", sourceId: "packagingErrors",
    title: localized("提示“上架接口调用失败”，先排查哪些内容？", "What should I check when the listing API call fails?", "公開インターフェース呼び出し失敗では何を確認しますか？"),
    summary: localized(
      "官方错误文档建议检查打包文件夹中的中文或特殊符号，以及作者简介、作品介绍里无法解析的字符，例如 Emoji。按实际报错检查相关字段，不要把它扩展成所有中文标题都禁止。调整后仍失败，可通过开发者平台常见问题中的“反馈其他问题”提交错误信息，处理结果到平台邮箱查看；勿在公开反馈中贴出密码、验证码或私人资料。",
      "The official error guide recommends checking Chinese or special characters in package-folder names and unparseable characters, such as Emoji, in author and work descriptions. Check the fields implicated by the error; this is not a blanket ban on Chinese titles. If changes do not help, report the error through the portal FAQ's other-problems form and check the portal inbox. Do not post passwords, verification codes or private data publicly.",
      "公式文書はパッケージのフォルダー名にある中国語・特殊記号、作者紹介や作品説明の解析できない文字（Emoji など）を確認するとしています。エラーに関係する項目を確認し、中国語の題名すべてが禁止と解釈しないでください。改善しなければ管理画面の FAQ の問題報告から連絡し、受信箱で結果を確認します。認証情報や個人情報を公開しないでください。"),
  },
  {
    id: "developer-package-path-errors", category: "publishing", sourceId: "packagingErrors",
    title: localized("打包报错 16 或 27，文件名和路径怎么检查？", "How do I check names and paths for packaging errors 16 or 27?", "パッケージエラー16・27では名前やパスをどう確認しますか？"),
    summary: localized(
      "官方汇整将 16（FileOrPathNameError）解释为 ZIP 内文件名包含不可解析字符，将 27（NameOverSizeError）解释为文件名过长。只有实际提交包体并出现相应代码时才按此检查路径与命名；不要因此给普通 PNG 皮肤随意加 ZIP、清单或行为包。先备份再改名，若作品存在文件引用也需同步核对，不确定的内部错误应向官方反馈。",
      "The official guide defines 16 (FileOrPathNameError) as unparseable characters in ZIP filenames and 27 (NameOverSizeError) as an overlong filename. Apply these checks when an actual package submission returns the relevant code, not by adding a ZIP, manifest or behavior pack to an ordinary PNG skin. Back up before renaming and check any file references affected. Report uncertain internal errors to official support.",
      "公式の16（FileOrPathNameError）は ZIP 内の解析できないファイル名、27（NameOverSizeError）は長すぎる名前です。実際にパッケージを提出して該当コードが出た場合に確認し、通常 PNG スキンへ勝手に ZIP・マニフェスト・ビヘイビアーパックを追加しないでください。変更前に保存し、参照するパスも確認します。不明な内部エラーは公式窓口へ報告してください。"),
  },
  {
    id: "developer-package-structure-errors", category: "publishing", sourceId: "packagingErrors",
    title: localized("打包报错 DirError 或 UnZipError，和普通皮肤格式是同一件事吗？", "Are DirError and UnZipError the same as ordinary skin-format errors?", "DirError・UnZipError は通常スキンの形式エラーと同じですか？"),
    summary: localized(
      "官方文档中的 6（DirError）是组件目录组织不能解析，7（UnZipError）是 ZIP 本身无法解压；对应章节主要解释地图和附加包等包体问题。请先确认资源分类和后台实际错误，再检查目录层级或压缩包完整性。普通纹理皮肤应对照官方皮肤 PNG 小节，不要照搬地图需要的 level 文件或模组文件结构，也不要把所有打包失败都归因于图片尺寸。",
      "The official guide defines 6 (DirError) as an unparseable component directory layout and 7 (UnZipError) as a ZIP that cannot be extracted. Its examples concern packages such as maps and add-ons. Confirm the resource type and actual error before checking hierarchy or archive integrity. For ordinary texture skins, use the official PNG skin section, not map level files or mod layouts; image dimensions do not explain every packaging failure.",
      "公式の6（DirError）はコンポーネントのフォルダー構造を解析できない場合、7（UnZipError）は ZIP を展開できない場合で、例は主にマップ・アドオンです。分類と実際の通知を確認してから階層や圧縮ファイルを調べます。通常のテクスチャスキンは PNG の公式項目に従い、マップの level ファイルや MOD 構造を転用しないでください。すべての失敗が画像サイズの問題ではありません。"),
  },
  {
    id: "developer-missing-skin-preview", category: "review", sourceId: "listingStandards",
    title: localized("审核说“皮肤贴图缺失／无浏览图”，该检查什么？", "What should I check when review reports a missing skin texture or preview?", "スキンのテクスチャ・プレビュー欠落と指摘されたら？"),
    summary: localized(
      "官方上架攻略指出，皮肤在组件介绍页缺少浏览图可能与格式不正确有关，并建议在测试端确认显示和使用是否正常。先核对原始 PNG、透明通道、尺寸及所选体型，再按照实际退回意见排查；宣传封面与皮肤纹理不是同一种文件。不要只补一张截图就认定资源已修好，自测正常也不代表审核必然通过。",
      "The official listing guide says a missing preview on the component page may indicate an incorrect skin format, and recommends checking display and use in the test client. Verify the original PNG, alpha channel, dimensions and selected body model against the rejection notice. A promotional cover is not the skin texture. Adding a screenshot alone does not establish that the asset is fixed, and passing a self-test does not guarantee approval.",
      "公式の公開ガイドは、紹介ページにスキンプレビューがない原因として形式不正を挙げ、テストクライアントで表示・使用を確認するよう勧めています。原本 PNG・透明チャンネル・寸法・体型を通知と照合します。宣伝用の表紙とスキンのテクスチャは別です。スクリーンショットの追加だけで修正済みと判断せず、自測成功も審査通過保証とはしないでください。"),
  },
  {
    id: "developer-originality-vanilla", category: "review", sourceId: "listingStandards",
    title: localized("把原版僵尸或方块贴图拼成皮肤，为什么可能被退回？", "Why can skins assembled from vanilla mob or block textures be rejected?", "標準モブ・ブロックのテクスチャを組み合わせたスキンが差し戻される理由は？"),
    summary: localized(
      "官方上架攻略用僵尸与基岩贴图皮肤举例，说明大量使用原版材质、作品过于简单或缺乏原创细节可能被拒绝。裁剪、拼接并不自动成为充分的原创设计。可据退回意见重新设计服装、结构和细节，同时核对素材权利；添加装饰只是修改方向，不是固定数量的过审公式，也不能解决未经授权使用他人作品的问题。",
      "The official guide uses zombie and bedrock-texture skins as examples of excessive vanilla material use, simplicity and insufficient original detail. Cropping or compositing alone does not establish enough original design. Rework clothing, structure and details according to the notice while checking material rights. Extra decoration is a revision direction, not a numerical approval formula, and does not resolve unauthorized use of another creator's work.",
      "公式ガイドはゾンビ・岩盤のテクスチャを例に、標準素材の多用・単純さ・独自の細部不足による不合格を説明しています。切り抜きや合成だけで十分な独創性になるとは限りません。通知を基に服・構造・細部を再設計し、素材の権利も確認します。装飾の追加は改善方向で、個数による承認公式でも、無断利用の解決でもありません。"),
  },
  {
    id: "developer-recolor-rejection", category: "review", sourceId: "listingStandards",
    title: localized("同款皮肤只换颜色，为什么可能被认为重复？", "Why might recolors of the same skin be treated as repetitive submissions?", "同じスキンの色替えが重複と判断される理由は？"),
    summary: localized(
      "官方上架攻略列出“已有多款同类型皮肤（只是更换了颜色）”这一退回情形，建议增加有特色的饰品、装饰或细节创意。应结合具体反馈提升设计差异，而不是把色相批量变化当作独立原创作品保证。保留制作记录与授权依据；这项说明不能推导出允许无限次重复投稿或一定通过的最低修改幅度。",
      "The official guide lists many same-type skins differing only in color as a rejection scenario and suggests distinctive accessories, decoration or creative detail. Address the specific notice with meaningful design differences rather than treating bulk hue changes as guaranteed independent originals. Keep creation records and permissions. The guide establishes neither unlimited duplicate submissions nor a minimum change that guarantees approval.",
      "公式ガイドは、同型で色だけが違うスキンが多数ある場合の差し戻しを説明し、特色のあるアクセサリー・装飾・細部を勧めています。色相の一括変更を独立した自作の保証とせず、通知に沿って設計を差別化してください。制作記録と許諾を保管し、無制限の再投稿や必ず合格する最低変更量があるとは解釈しないでください。"),
  },
  {
    id: "developer-incentivized-reviews", category: "preparation", sourceId: "listingStandards",
    title: localized("简介能写“好评送红包／钻石”吗？", "Can my description offer cash or diamonds in exchange for favorable ratings?", "説明に高評価で現金・ダイヤを配ると書けますか？"),
    summary: localized(
      "官方上架攻略将“下载后好评，再抽取玩家赠送现金红包或钻石”列为诱导消费情形，要求删除对应文字。投稿介绍应如实说明作品内容，不以奖励交换评分，也不把删除违规句子当成整份作品已经符合全部规则。其他宣传链接、二维码、版权与透明区域仍要分别检查，最终以当前官方规则和实际审核意见为准。",
      "The official listing guide identifies favorable-rating lotteries for cash gifts or diamonds as inducement and calls for removing the wording. Describe the work honestly without exchanging rewards for ratings. Removing one offending sentence does not establish compliance with every rule. Check promotional links, QR codes, rights and transparency separately, using current official policy and the actual review notice.",
      "公式ガイドは、ダウンロード後の高評価と引き換えに抽選で現金・ダイヤを渡す説明を誘導行為として挙げ、該当文の削除を求めています。報酬で評価を交換せず、作品内容を正確に記載します。一文を削除しても全規則への適合は確定しません。外部リンク・QR・権利・透明部分も別に確認し、現行規則と実際の通知を優先してください。"),
  },
  {
    id: "developer-mobile-self-test", category: "preparation", sourceId: "clientTesting",
    title: localized("手机自测客户端从哪里获取，自测是否等于公开上架？", "Where do I get the mobile test client, and does self-testing publish my work?", "モバイル自測クライアントの入手先は？自測は公開になりますか？"),
    summary: localized(
      "官方测试教程通过 MCSTUDIO“工具箱 → 手机测试版启动器”进入官方测试客户端下载入口，并介绍基岩版资源在“待提交审核”状态下选择自测的流程。自测资源仅用于开发者测试，不等于公开资源中心已经上架或人工审核通过。文中菜单、账号与机审选项应结合当前工具核对，不从陌生私聊或不明网盘下载所谓审核客户端。",
      "The official lesson opens the mobile test-client download from MCSTUDIO's Toolbox → Mobile Test Launcher and describes self-testing Bedrock resources while awaiting review submission. These resources are for developer testing, not a public Resource Center listing or human-review approval. Confirm menus, account requirements and automated-test options in the current tools. Do not obtain supposed review clients from strangers or unknown file shares.",
      "公式講座は MCSTUDIO の「工具箱 → 手机测试版启动器」から公式のダウンロード先へ進み、審査提出待ちの Bedrock 資源を自測する流れを説明しています。自測用の資源は一般公開や人による審査通過とは別です。メニュー・アカウント要件・機械審査の選択肢は現行ツールと照合し、不明な共有場所や個別連絡から審査用クライアントを取得しないでください。"),
  },
  {
    id: "developer-edition-test-clients", category: "preparation", sourceId: "clientTesting",
    title: localized("Java 和基岩版作品，应该分别用什么测试端？", "Which clients should I use to test Java and Bedrock works?", "Java と Bedrock の作品はそれぞれどの環境でテストしますか？"),
    summary: localized(
      "官方测试文档区分 Java 资源的 PC 测试，以及基岩版资源的手机自测客户端或 ModPC 测试；MCSTUDIO 可按作品分类启动相应测试环境。先匹配作品版本，再观察皮肤体型、接缝、外层和实际游戏显示。这是一般作品测试文档，不表示一个 PNG 在不同版本自动兼容，也不表示所有联机或自测入口对每类皮肤均适用，具体以当前官方工具为准。",
      "The official testing guide separates PC testing for Java resources from mobile self-testing or ModPC for Bedrock resources, with MCSTUDIO launching the environment for the work category. Match the edition before checking skin models, seams, outer layers and in-game appearance. This is a general testing guide, not automatic cross-edition PNG compatibility or proof that every multiplayer and self-test entry applies to every skin type. Current official tools govern availability.",
      "公式文書は Java 資源の PC テストと、Bedrock 資源のモバイル自測・ModPC を区別し、MCSTUDIO から分類に合う環境を起動します。版を合わせて体型・つなぎ目・外層・ゲーム内表示を確認してください。一般的な作品テストの説明で、PNG の版間互換や、全スキンにすべての自測・マルチプレイ入口が使える保証ではありません。現行の公式ツールで確認します。"),
  },
  {
    id: "developer-video-blockbench-mobile-import", category: "tools", sourceId: "videoBlockbenchMobileImport",
    title: localized("手机 Blockbench 怎么导入已有皮肤，有视频吗？", "Is there a video for importing an existing skin into mobile Blockbench?", "モバイル Blockbench に既存スキンを読み込む動画は？"),
    summary: localized(
      "屑牲-于 2026-03-14 发布的手机皮肤导入教程，简介说明同时包含图层的基础使用，可与此前的网页版绘画视频配合学习。这里是导入编辑器，不是上传网易或公开上架。先保存原始 PNG，在副本上尝试，并确认体型与图层显示；完成编辑后仍需另行导出纹理、自测并按目标端提交，手机系统和浏览器菜单可能与视频不同。",
      "屑牲-'s 2026-03-14 mobile skin-import video also covers basic layer use according to its description, complementing the web-editor painting lesson. This imports into an editor, not NetEase or a public listing. Keep the original PNG, practice on a copy and check the body model and layers. Export the texture, test and submit separately; operating-system and browser menus may differ from the recording.",
      "屑牲- による2026-03-14公開のモバイル読み込み講座で、概要にはレイヤーの基礎も含むとあります。ウェブ版描画動画と併用できます。編集ソフトへの読み込みで、網易への投稿・公開ではありません。原本 PNG を保存し、複製で体型・レイヤーを確認してから、別途出力・自測・提出を行います。OS・ブラウザーのメニューは動画と異なる場合があります。"),
  },
  {
    id: "developer-video-skinseed-hair", category: "creation", sourceId: "videoSkinseedHair",
    title: localized("Skinseed 画头发，有专门的手机视频教程吗？", "Is there a dedicated Skinseed hair-painting video for mobile users?", "Skinseed の髪を描くモバイル向け動画は？"),
    summary: localized(
      "屑牲-于 2026-03-07 发布的“Skinseed我的世界皮肤头发教程”，是其皮肤教程合集中的独立头发主题入口。适合与官方头部绘制图文对照练习，不把它当作完整全身制作或网易上传教程。练习后在三维模型中检查发型与脸部、后脑和外层的衔接；学习方法不代表获得原示例或人物设计的转载、商用授权。",
      "屑牲-'s 2026-03-07 Skinseed video is a dedicated hair lesson within the author's skin-tutorial collection. Use it alongside the official head-painting article, not as a full-body or NetEase-upload guide. Check how your hairstyle meets the face, back of the head and outer layer in 3D. Learning the method does not grant redistribution or commercial rights to example skins or character designs.",
      "屑牲- が2026-03-07に公開した Skinseed の髪の講座で、スキン制作合集の独立した髪の項目です。公式の頭部描画記事と併用し、全身制作・網易投稿の講座とは区別してください。3Dで顔・後頭部・外層とのつながりを確認します。技法の学習は例のスキンや人物デザインの転載・商用利用許諾ではありません。"),
  },
  {
    id: "developer-video-head-basics", category: "creation", sourceId: "videoHeadBasics",
    title: localized("零基础画 64 分辨率头部，有入门演示吗？", "Is there a beginner demonstration of painting a 64-resolution skin head?", "64 解像度の頭部を描く初心者向け実演は？"),
    summary: localized(
      "Jzium芥子于 2025-06-06 发布的头部教程，简介明确定位为 64 分辨率、零基础速画，并说明不是进阶绘画课程。可作为入门演示，配合官方头部与明暗图文逐步练习，不把“十分钟”当作学习效果保证。原页示例仅供交流学习且未经授权禁止转载、商用；本站不搬运模板或网盘软件，工具优先从官方来源获取。",
      "Jzium芥子's 2025-06-06 head lesson describes a 64-resolution, beginner quick-painting approach rather than advanced art training. Combine the demonstration with official head and shading articles; the ten-minute title is not a learning guarantee. The source restricts examples to learning and prohibits unauthorized redistribution or commercial use. This site does not mirror templates or shared-drive installers; prefer official tool sources.",
      "Jzium芥子 の2025-06-06公開の頭部講座は、64解像度の初心者向け速描きで、上級絵画講座ではないと説明しています。公式の頭部・明暗記事と併用し、「10分」を上達保証と解釈しないでください。例は学習用で無断転載・商用利用は禁止と明記されています。当サイトはテンプレートや共有インストーラーを転載せず、公式のツール配布先を優先します。"),
  },
  {
    id: "developer-video-hair-gradient", category: "creation", sourceId: "videoHairGradient",
    title: localized("头发渐变的基础，有较长一点的视频参考吗？", "Is there a longer beginner reference for painting hair gradients?", "髪のグラデーションを学べる長めの基礎動画は？"),
    summary: localized(
      "斯末坚坚子于 2026-02-27 发布的头发渐变教程，约 12 分钟，简介定位为基础教程并提供皮肤示例供研究。可补充头发主题的视觉参考，区分颜色渐变与透明度，完成后检查模型各面的连续性。原页分享示例不等于授予网易投稿或商业使用权，借鉴绘图方法后应独立设计；其他进阶课程是否可用，以作者合集当前页面为准。",
      "斯末坚坚子's 2026-02-27 hair-gradient video runs about 12 minutes and is described as a basic lesson with example skins for study. Use it as a hair-painting reference, distinguishing color gradients from transparency and checking continuity across model faces. Shared examples do not establish NetEase-publication or commercial rights; create an independent design. Check the author's current collection for any further lessons.",
      "斯末坚坚子 が2026-02-27に公開した約12分の髪のグラデーション動画で、基礎講座と研究用スキン例を紹介しています。色の段階表現と透明度を区別し、各面のつながりを確認する参考にできます。例の共有は網易への投稿・商用利用許諾を意味しません。技法を学んで独自に設計し、追加講座は作者の現行合集で確認してください。"),
  },
  {
    id: "developer-video-skinseed-export", category: "tools", sourceId: "videoSkinseedExport",
    title: localized("Skinseed 做完后怎么导出皮肤文件，有短视频吗？", "Is there a short video about exporting a completed Skinseed skin?", "Skinseed で完成したスキンを書き出す短編動画は？"),
    summary: localized(
      "TAC_两小伙于 2023-01-28 发布的“如何在skinseed中导出皮肤文件”，约 45 秒，可作为导出操作的快速视频入口。它记录的是当时版本的操作，并不代表当前每种手机界面都相同。保留工程与原始纹理，导出后核对 PNG、尺寸和透明通道，不用三维预览截图代替皮肤文件；导出完成也不等于网易已收到投稿。",
      "TAC_两小伙's 2023-01-28 Skinseed export video is about 45 seconds long and serves as a quick export reference for that version. Current mobile interfaces may differ. Retain your project and original texture, then verify the exported PNG, dimensions and alpha channel. A 3D preview screenshot is not the skin file, and exporting does not submit anything to NetEase.",
      "TAC_两小伙 による2023-01-28公開の約45秒の Skinseed 出力動画です。当時の版の操作で、現在の全スマートフォンの画面と同じとは限りません。プロジェクト・原本を保存し、PNG・寸法・透明チャンネルを確認してください。3Dプレビューの画像はスキンファイルの代わりではなく、書き出しは網易への提出でもありません。"),
  },
  {
    id: "developer-video-blockbench-export", category: "tools", sourceId: "videoBlockbenchExport",
    title: localized("Blockbench 如何导出 PNG 皮肤，而不是只保存工程？", "How do I export a PNG skin from Blockbench rather than only saving the project?", "Blockbench でプロジェクト保存だけでなく PNG スキンを書き出すには？"),
    summary: localized(
      "小夜禾于 2025-04-29 发布的“Blockbench导出png图片皮肤我的世界”，可作为纹理导出的视频参考。工程文件用于继续编辑，投稿需要的普通 PNG 纹理应另外检查；根据当前软件菜单操作，确认尺寸、体型和透明通道。来源简介也提到皮肤展示网站，能下载或预览并不代表具有再投稿权，素材授权仍要独立核实。",
      "小夜禾's 2025-04-29 Blockbench PNG-export video is a texture-export reference. Project files support further editing; separately check the ordinary PNG texture intended for submission, using current menus and verifying dimensions, model and alpha channel. The description also mentions a skin-browsing site. Download or preview access does not grant republication rights; check material permissions independently.",
      "小夜禾 の2025-04-29公開の Blockbench PNG 出力動画は、テクスチャ出力の参考です。プロジェクトは再編集用で、投稿する通常 PNG は別に寸法・体型・透明チャンネルを確認し、現行メニューを使います。概要はスキン閲覧サイトにも触れますが、閲覧・ダウンロードできても再投稿権は確定しません。素材の許諾を別途確認してください。"),
  },
  {
    id: "developer-video-skinseed-ios-alpha", category: "tools", sourceId: "videoSkinseedIosAlpha",
    title: localized("iOS Skinseed 导出丢失透明底，有范围明确的视频吗？", "Is there a scoped video reference for lost transparency in iOS Skinseed exports?", "iOS の Skinseed 出力で透明背景が失われる場合の動画は？"),
    summary: localized(
      "StrSpring-13 于 2025-01-07 发布的视频，简介明确说方法仅适用于 64×64，128 暂无其提供的办法，并记载 2026-02-26 更换音频。只能作为这个限定场景的社区参考，不能声称修复所有分辨率或 iOS 版本。导出后检查 Alpha 通道和目标客户端；透明底、网易半透明图层支持与审核允许的透明范围是不同问题，请另对照官方错误与审核文档。",
      "StrSpring-13's 2025-01-07 video explicitly limits its method to 64×64, provides no method for 128 and notes an audio replacement on 2026-02-26. Treat it as a community reference for that limited scenario, not a fix for every resolution or iOS version. Check the exported Alpha channel and target client. Transparent backgrounds, NetEase support for semitransparent layers and permitted transparency are separate issues; cross-check official error and review guidance.",
      "StrSpring-13 の2025-01-07公開の動画概要は、方法を64×64に限定し、128には方法を提供していないと明記し、2026-02-26の音声差し替えも記録しています。全解像度・iOS版の修正ではなく、限定条件の参考です。Alpha チャンネルと対象版を確認し、背景透過・網易の半透明レイヤー対応・審査で許可される透明範囲を区別して公式文書と照合してください。"),
  },
];
