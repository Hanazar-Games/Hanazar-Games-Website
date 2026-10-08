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
}
type LocalizedText = Record<SkinServiceLanguage, string>;
const localized = (zhCN: string, en: string, ja: string): LocalizedText => ({ "zh-CN": zhCN, en, ja });

export const developerResourcesCompiledAt = "2026-10-09";

const officialSource = (title: string, path: string, kind: DeveloperSourceKind = "official"): DeveloperSource => ({
  title,
  href: encodeURI(`https://mc.163.com/dev/mcmanual/mc-dev/${path}.html`),
  kind,
  format: "article",
  publisher: "网易《我的世界》开发者官网",
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
  update37: {
    title: "开发者月刊 | Mod SDK 3.7 功能前瞻",
    href: "https://mc.163.com/dev/developer_cn/news/renew/20251128/37047_1273647.html",
    kind: "official", format: "news", publisher: "网易《我的世界》开发者官网", language: "zh-CN",
  },
} satisfies Record<string, DeveloperSource>;

export const developerResources: Array<{
  id: string;
  category: SkinArticleCategory;
  sourceId: keyof typeof developerSources;
  title: LocalizedText;
  summary: LocalizedText;
}> = [
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
];
