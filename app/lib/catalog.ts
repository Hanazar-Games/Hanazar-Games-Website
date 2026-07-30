export interface GameEntry {
  title: string;
  description: string;
  href: string;
  tag: string;
  image: string;
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
