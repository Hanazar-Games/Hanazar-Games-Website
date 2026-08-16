export interface GameEntry {
  title: string;
  description: string;
  href: string;
  tag: string;
  image: string;
}

export interface ToolEntry extends GameEntry {
  cta: string;
}

export interface ToolGroup {
  title: string;
  label: string;
  tools: ToolEntry[];
}

export const games: GameEntry[] = [
  {
    title: "gameGuandanTitle",
    description: "gameGuandanDesc",
    href: "https://hanazar-games.github.io/Guandan-Webgame/",
    tag: "gameTagCard",
    image: "/games/guandan.jpg",
  },
  {
    title: "gameLiarsBarTitle",
    description: "gameLiarsBarDesc",
    href: "https://hanazar-games.github.io/Liars-Bar-webgame/",
    tag: "gameTagBluff",
    image: "/games/liars-bar.jpg",
  },
  {
    title: "aigcGpt56UltraTitle",
    description: "aigcGpt56UltraDesc",
    href: "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    tag: "gameTagPuzzle",
    image: "/aigc/gpt-56-sol-ultra.jpg",
  },
  {
    title: "gameWeidaTitle",
    description: "gameWeidaDesc",
    href: "https://hanazar-games.github.io/Go/",
    tag: "gameTagBoard",
    image: "/games/go.jpg",
  },
  {
    title: "gameCoreballTitle",
    description: "gameCoreballDesc",
    href: "https://hanazar-games.github.io/Core-Ball-Webgame/",
    tag: "gameTagArcade",
    image: "/games/coreball.jpg",
  },
  {
    title: "gameTicTacToeTitle",
    description: "gameTicTacToeDesc",
    href: "https://hanazar-games.github.io/Tic-Tac-Toe/",
    tag: "gameTagStrategy",
    image: "/games/tic-tac-toe.jpg",
  },
  {
    title: "gameMinesweeperTitle",
    description: "gameMinesweeperDesc",
    href: "https://hanazar-games.github.io/Minesweeper/",
    tag: "gameTagPuzzle",
    image: "/games/minesweeper.jpg",
  },
  {
    title: "game2048Title",
    description: "game2048Desc",
    href: "https://hanazar-games.github.io/3D-2048-webgame/",
    tag: "gameTagArcade",
    image: "/games/3d-2048.jpg",
  },
  {
    title: "gameBilliardsTitle",
    description: "gameBilliardsDesc",
    href: "https://hanazar-games.github.io/Billiards/",
    tag: "gameTagSports",
    image: "/games/billiards.jpg",
  },
  {
    title: "gameStellarDefenseTitle",
    description: "gameStellarDefenseDesc",
    href: "https://hanazar-games.github.io/Kimi2.6-AIGC-Webgame-Project/",
    tag: "gameTagShooter",
    image: "/games/stellar-defense.jpg",
  },
  {
    title: "gameNeonSalvageTitle",
    description: "gameNeonSalvageDesc",
    href: "https://hanazar-games.github.io/GPT-AIGC-Webgame-Project",
    tag: "gameTagAction",
    image: "/games/neon-salvage.jpg",
  },
  {
    title: "gameLumenDriftTitle",
    description: "gameLumenDriftDesc",
    href: "https://hanazar-games.github.io/GPT-MAX-AIGC-Webgame-Project",
    tag: "gameTagArcade",
    image: "/games/lumen-drift.jpg",
  },
  {
    title: "gameDoudizhuTitle",
    description: "gameDoudizhuDesc",
    href: "https://hanazar-games.github.io/Doudizhu-webgame",
    tag: "gameTagCard",
    image: "/games/doudizhu.jpg",
  },
  {
    title: "gameMahjongTitle",
    description: "gameMahjongDesc",
    href: "https://hanazar-games.github.io/Mahjong-Webgame",
    tag: "gameTagBoard",
    image: "/games/mahjong.jpg",
  },
  {
    title: "game24PointsTitle",
    description: "game24PointsDesc",
    href: "https://hanazar-games.github.io/24-Points-Webgame",
    tag: "gameTagMath",
    image: "/games/24-points.jpg",
  },
  {
    title: "gameXiangQiTitle",
    description: "gameXiangQiDesc",
    href: "https://hanazar-games.github.io/XiangQi-webgame/",
    tag: "gameTagChess",
    image: "/games/xiangqi.jpg",
  },
  {
    title: "game2048OriginalTitle",
    description: "game2048OriginalDesc",
    href: "https://hanazar-games.github.io/2048-Original",
    tag: "gameTagPuzzle",
    image: "/games/2048-original.jpg",
  },
  {
    title: "game2048NewEraTitle",
    description: "game2048NewEraDesc",
    href: "https://hanazar-games.github.io/2048-New-era/",
    tag: "gameTagPuzzle",
    image: "/games/2048-new-era.jpg",
  },
  {
    title: "gameSudokuTitle",
    description: "gameSudokuDesc",
    href: "https://hanazar-games.github.io/Sudoku-Webgame",
    tag: "gameTagPuzzle",
    image: "/games/sudoku.jpg",
  },
  {
    title: "gameSubwaySurfersTitle",
    description: "gameSubwaySurfersDesc",
    href: "https://hanazar-games.github.io/Subway-Surfers/",
    tag: "gameTagRunner",
    image: "/games/subway-surfers.jpg",
  },
];

export const homepageGames = games.slice(0, 3);

export const toolGroups: ToolGroup[] = [
  {
    title: "toolsMacTitle",
    label: "toolsMacLabel",
    tools: [
      {
        title: "toolClipoTitle",
        description: "toolClipoDesc",
        tag: "toolTagProductivity",
        cta: "ctaViewGithub",
        href: "https://github.com/hzagaming/Clipo",
        image: "/tools/clipo.jpg",
      },
      {
        title: "toolClassGodTitle",
        description: "toolClassGodDesc",
        tag: "toolTagUtility",
        cta: "ctaViewGithub",
        href: "https://github.com/hzagaming/ClassGod",
        image: "/tools/classgod.jpg",
      },
    ],
  },
  {
    title: "toolsWebTitle",
    label: "toolsWebLabel",
    tools: [
      {
        title: "toolAiugcTitle",
        description: "toolAiugcDesc",
        tag: "toolTagAiCreation",
        cta: "ctaViewGithub",
        href: "https://github.com/Mirako-Official/New-Aiugc-Pipeline",
        image: "/tools/aiugc-pipeline.jpg",
      },
      {
        title: "toolOcMakerTitle",
        description: "toolOcMakerDesc",
        tag: "toolTagCharacter",
        cta: "toolOpenButton",
        href: "https://hzagaming.github.io/Original-Character-Maker/",
        image: "/tools/oc-maker.jpg",
      },
      {
        title: "toolListenerTitle",
        description: "toolListenerDesc",
        tag: "toolTagMusicPlayer",
        cta: "toolOpenButton",
        href: "https://hzagaming.github.io/LIstener",
        image: "/tools/listener.jpg",
      },
      {
        title: "toolRhythmTitle",
        description: "toolRhythmDesc",
        tag: "toolTagMusicAi",
        cta: "ctaViewGithub",
        href: "https://github.com/Mirako-Official/AI-Rhythm-Game",
        image: "/tools/ai-rhythm-game.jpg",
      },
      {
        title: "toolTransferTitle",
        description: "toolTransferDesc",
        tag: "toolTagLocalTransfer",
        cta: "ctaViewProject",
        href: "https://hzagaming.github.io/HanazarTransfer/",
        image: "/tools/hanazar-transfer.jpg",
      },
    ],
  },
  {
    title: "toolsIosTitle",
    label: "toolsIosLabel",
    tools: [
      {
        title: "toolHeptTitle",
        description: "toolHeptDesc",
        tag: "toolTagHaptics",
        cta: "ctaViewReleases",
        href: "https://github.com/hzagaming/Hept/releases",
        image: "/tools/hept.jpg",
      },
    ],
  },
  {
    title: "toolsOtherTitle",
    label: "toolsOtherLabel",
    tools: [
      {
        title: "productLc300aTitle",
        description: "productLc300aDesc",
        tag: "productTagOperatingSystem",
        cta: "ctaViewGithub",
        href: "https://github.com/hzagaming/LC300A",
        image: "/products/lc300a.jpg",
      },
    ],
  },
];

export const homepageToolGroups: ToolGroup[] = toolGroups.map((group) => ({
  ...group,
  tools: group.tools.slice(0, 3),
}));

export const aigcExperiments: GameEntry[] = [
  {
    title: "aigcGpt56UltraTitle",
    description: "aigcGpt56UltraDesc",
    href: "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    tag: "aigcTagGpt56Ultra",
    image: "/aigc/gpt-56-sol-ultra.jpg",
  },
  {
    title: "aigcKimiTitle",
    description: "aigcKimiDesc",
    href: "https://hanazar-games.github.io/Kimi2.6-AIGC-Webgame-Project/",
    tag: "aigcTagKimi",
    image: "/aigc/kimi-26-code.jpg",
  },
  {
    title: "aigcGptMediumTitle",
    description: "aigcGptMediumDesc",
    href: "https://hanazar-games.github.io/GPT-AIGC-Webgame-Project",
    tag: "aigcTagGptMedium",
    image: "/aigc/gpt-55-medium.jpg",
  },
];
