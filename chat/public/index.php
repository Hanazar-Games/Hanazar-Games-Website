<?php

declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
?>
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Hanazar Chat</title>
  <link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/app.css">
  <script defer src="/assets/app.js"></script>
</head>
<body>
  <a class="skipLink" href="#main">跳到聊天内容</a>
  <div class="ambient" aria-hidden="true"></div>
  <main id="main" class="appFrame">
    <section id="loginView" class="loginView" aria-labelledby="loginTitle">
      <div class="brandMark" aria-hidden="true"><span>H</span></div>
      <p class="eyebrow">HANAZAR GAMES</p>
      <h1 id="loginTitle">进入私人聊天</h1>
      <p class="muted">安全、轻量、只属于工作室成员的实时消息空间。</p>
      <form id="loginForm" class="loginForm">
        <label for="username">用户名</label>
        <input id="username" name="username" autocomplete="username" required maxlength="40">
        <label for="password">密码</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
        <button id="loginButton" class="primaryButton" type="submit">登录</button>
      </form>
      <p id="loginStatus" class="statusText" aria-live="assertive"></p>
      <a class="backLink" href="https://hanazar-games.github.io/Hanazar-Games-Website/">← 返回 Hanazar Games</a>
    </section>

    <section id="chatView" class="chatView" hidden aria-label="Hanazar Chat">
      <aside id="chatSidebar" class="sidebar">
        <header class="sideHeader">
          <div><p class="eyebrow">HANAZAR</p><h1>Chat</h1></div>
          <span class="connectionDot" id="connectionDot" aria-label="连接状态"></span>
        </header>
        <div class="sideActions">
          <button id="newChatButton" type="button">新建会话</button>
          <button id="refreshButton" type="button" aria-label="刷新会话">↻</button>
        </div>
        <nav id="roomList" class="roomList" aria-label="会话列表"></nav>
        <footer class="sideFooter">
          <div class="audioToggles">
            <button id="sfxButton" type="button" aria-pressed="false">提示音 关</button>
            <button id="bgmButton" type="button" aria-pressed="false">氛围音 关</button>
          </div>
          <button id="logoutButton" class="ghostButton" type="button">退出登录</button>
        </footer>
      </aside>
      <button id="sidebarBackdrop" class="sidebarBackdrop" type="button" aria-label="关闭会话列表" hidden></button>

      <section class="conversation">
        <header class="conversationHeader">
          <button id="mobileRoomsButton" class="mobileOnly" type="button" aria-label="打开会话列表" aria-controls="chatSidebar" aria-expanded="false">☰</button>
          <div><h2 id="roomTitle">选择一个会话</h2><p id="presenceText" class="muted">等待连接</p></div>
        </header>
        <div id="messageList" class="messageList" role="log" aria-live="polite" aria-relevant="additions text"></div>
        <div id="typingText" class="typingText" aria-live="polite"></div>
        <form id="messageForm" class="composer">
          <label class="srOnly" for="messageInput">消息</label>
          <textarea id="messageInput" rows="1" maxlength="4000" placeholder="输入消息…" disabled></textarea>
          <span id="characterCount" class="characterCount">0 / 4000</span>
          <button class="sendButton" type="submit" disabled aria-label="发送消息">发送</button>
        </form>
      </section>
    </section>
  </main>

  <dialog id="newChatDialog" aria-labelledby="newChatTitle">
    <div class="dialogCard">
      <header><h2 id="newChatTitle">新建会话</h2><button id="closeNewChat" type="button" aria-label="关闭">×</button></header>
      <div class="modeSwitch" role="tablist" aria-label="会话类型">
        <button id="directModeButton" type="button" role="tab" aria-selected="true" aria-controls="directChatPanel">私人会话</button>
        <button id="groupModeButton" type="button" role="tab" aria-selected="false" aria-controls="groupForm" tabindex="-1">群组</button>
      </div>
      <section id="directChatPanel" role="tabpanel" aria-labelledby="directModeButton">
        <label for="userSearch">搜索成员</label>
        <input id="userSearch" type="search" autocomplete="off" placeholder="用户名或显示名称">
        <div id="userResults" class="userResults" aria-live="polite"></div>
      </section>
      <form id="groupForm" role="tabpanel" aria-labelledby="groupModeButton" hidden>
        <label for="groupName">群组名称</label>
        <input id="groupName" maxlength="100" required placeholder="例如：新项目讨论">
        <label for="groupUserSearch">添加成员</label>
        <input id="groupUserSearch" type="search" autocomplete="off" placeholder="搜索并选择成员">
        <p id="selectedMembers" class="selectedMembers">尚未选择成员</p>
        <div id="groupUserResults" class="userResults" aria-live="polite"></div>
        <button class="primaryButton" type="submit">创建群组</button>
      </form>
    </div>
  </dialog>

  <div id="toast" class="toast" role="status" aria-live="polite"></div>
</body>
</html>
