"use strict";

let soundEffects = false;
let backgroundMusic = false;

const errorMessages = {
  authentication_required: "登录已过期，请重新登录。",
  csrf_invalid: "会话已更新，请重试。",
  event_cursor_expired: "消息状态已重新同步。",
  invalid_credentials: "用户名或密码不正确。",
  invalid_message_body: "消息须为 1–4000 个有效字符。",
  message_nonce_conflict: "消息重试内容不一致，请重新发送。",
  message_version_conflict: "消息已被更新，请刷新后重试。",
  poll_limit_exceeded: "连接正在恢复，请稍候。",
  room_archived: "该会话已归档。",
  session_expired: "登录已过期，请重新登录。",
  session_invalid: "请重新登录。",
};

const state = {
  csrf: "",
  userId: null,
  rooms: [],
  roomsLoaded: false,
  currentRoom: null,
  eventCursor: null,
  pollController: null,
  typingTimer: null,
  typingRoomId: null,
  typingLastSentAt: 0,
  heartbeatTimer: null,
  toastTimer: null,
  roomRequestId: 0,
  sending: false,
  pendingSend: null,
  searchTimers: { direct: null, group: null },
  searchVersions: { direct: 0, group: 0 },
  sessionRecovery: null,
  sfx: soundEffects,
  bgm: backgroundMusic,
  audioContext: null,
  bgmOscillator: null,
  bgmGain: null,
  online: navigator.onLine,
  groupMembers: new Map(),
};

const elements = {
  loginView: document.querySelector("#loginView"),
  chatView: document.querySelector("#chatView"),
  loginForm: document.querySelector("#loginForm"),
  loginStatus: document.querySelector("#loginStatus"),
  roomList: document.querySelector("#roomList"),
  sidebar: document.querySelector("#chatSidebar"),
  conversation: document.querySelector(".conversation"),
  roomTitle: document.querySelector("#roomTitle"),
  presenceText: document.querySelector("#presenceText"),
  messageList: document.querySelector("#messageList"),
  messageForm: document.querySelector("#messageForm"),
  messageInput: document.querySelector("#messageInput"),
  sendButton: document.querySelector("#messageForm button[type='submit']"),
  characterCount: document.querySelector("#characterCount"),
  typingText: document.querySelector("#typingText"),
  connectionDot: document.querySelector("#connectionDot"),
  newChatDialog: document.querySelector("#newChatDialog"),
  userSearch: document.querySelector("#userSearch"),
  userResults: document.querySelector("#userResults"),
  directChatPanel: document.querySelector("#directChatPanel"),
  groupForm: document.querySelector("#groupForm"),
  groupName: document.querySelector("#groupName"),
  groupUserSearch: document.querySelector("#groupUserSearch"),
  groupUserResults: document.querySelector("#groupUserResults"),
  selectedMembers: document.querySelector("#selectedMembers"),
  mobileRoomsButton: document.querySelector("#mobileRoomsButton"),
  sidebarBackdrop: document.querySelector("#sidebarBackdrop"),
  toast: document.querySelector("#toast"),
};

async function api(path, options = {}, retryCsrf = true) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.method && options.method !== "GET") {
    headers["X-CSRF-Token"] = state.csrf;
  }
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    const error = new Error("服务返回了无效响应，请稍后重试。");
    error.code = "invalid_response";
    error.status = response.status;
    throw error;
  }
  if (!response.ok || !payload.ok) {
    const code = payload.error?.code || "request_failed";
    if (retryCsrf && code === "csrf_invalid" && options.method && options.method !== "GET") {
      const session = await api("/auth/session", {}, false);
      state.csrf = session.csrf;
      return api(path, options, false);
    }
    const error = new Error(errorMessages[code] || payload.error?.message || "请求失败");
    error.code = code;
    error.status = response.status;
    throw error;
  }
  return payload.data;
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function showToast(message) {
  if (state.toastTimer !== null) window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("visible");
    state.toastTimer = null;
  }, 2600);
}

function handleRequestError(error) {
  if (error?.status === 401) {
    void recoverAuthentication();
    return;
  }
  showToast(error?.message || "请求失败");
}

function setConnection(connected) {
  elements.connectionDot.classList.toggle("connected", connected);
  elements.connectionDot.setAttribute("aria-label", connected ? "已连接" : "连接中断");
}

function roomLabel(room) {
  return room.name || `私人会话 #${room.id}`;
}

function renderRooms() {
  clearNode(elements.roomList);
  if (state.rooms.length === 0) {
    const empty = document.createElement("p");
    empty.className = "emptyState";
    empty.textContent = "还没有会话，点击上方按钮开始聊天。";
    elements.roomList.append(empty);
    return;
  }
  state.rooms.forEach((room) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "roomButton";
    button.classList.toggle("active", state.currentRoom?.id === room.id);
    const name = document.createElement("strong");
    name.textContent = roomLabel(room);
    const meta = document.createElement("span");
    meta.textContent = room.archived ? "已归档" : room.kind === "dm" ? "私聊" : "群组";
    button.append(name, meta);
    if (room.unread_count > 0) {
      const badge = document.createElement("b");
      badge.className = "unreadBadge";
      badge.textContent = String(Math.min(room.unread_count, 99));
      button.append(badge);
    }
    button.addEventListener("click", () => void openRoom(room).catch(handleRequestError));
    elements.roomList.append(button);
  });
}

function appendMessageContent(container, body) {
  const expression = /(https?:\/\/[^\s]+)/giu;
  let cursor = 0;
  for (const match of body.matchAll(expression)) {
    if (match.index > cursor) container.append(document.createTextNode(body.slice(cursor, match.index)));
    try {
      const parsed = new URL(match[0]);
      const anchor = document.createElement("a");
      anchor.href = parsed.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = match[0];
      container.append(anchor);
    } catch {
      container.append(document.createTextNode(match[0]));
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < body.length) container.append(document.createTextNode(body.slice(cursor)));
}

function renderMessages(messages) {
  clearNode(elements.messageList);
  messages.forEach((message) => {
    const article = document.createElement("article");
    article.className = "message";
    article.classList.toggle("own", message.sender_user_id === state.userId);
    article.dataset.messageId = String(message.id);
    if (state.currentRoom?.kind === "group" && message.sender_user_id !== state.userId) {
      const author = document.createElement("span");
      author.className = "messageAuthor";
      author.textContent = message.sender_display_name || `成员 #${message.sender_user_id}`;
      article.append(author);
    }
    const body = document.createElement("p");
    if (message.deleted_at) {
      body.className = "deletedMessage";
      body.textContent = "消息已删除";
    } else {
      appendMessageContent(body, message.body || "");
    }
    const time = document.createElement("time");
    time.dateTime = new Date(message.created_at * 1000).toISOString();
    time.textContent = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(message.created_at * 1000);
    article.append(body, time);
    if (message.sender_user_id === state.userId && !message.deleted_at) {
      const actions = document.createElement("div");
      actions.className = "messageActions";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "编辑";
      editButton.addEventListener("click", () => editMessage(message));
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "删除";
      deleteButton.addEventListener("click", () => deleteMessage(message));
      actions.append(editButton, deleteButton);
      article.append(actions);
    }
    elements.messageList.append(article);
  });
  elements.messageList.scrollTop = elements.messageList.scrollHeight;
}

async function loadRooms() {
  state.rooms = await api("/rooms");
  state.roomsLoaded = true;
  if (state.currentRoom) {
    const current = state.rooms.find((room) => room.id === state.currentRoom.id) || null;
    if (!current) {
      stopTyping();
      ++state.roomRequestId;
      state.currentRoom = null;
      elements.roomTitle.textContent = "选择一个会话";
      elements.presenceText.textContent = "等待选择";
      elements.typingText.textContent = "";
      clearNode(elements.messageList);
      updateComposerState();
    } else {
      state.currentRoom = current;
      updateComposerState();
    }
  }
  renderRooms();
}

async function openRoom(room) {
  stopTyping();
  const requestId = ++state.roomRequestId;
  state.currentRoom = room;
  elements.roomTitle.textContent = roomLabel(room);
  updateComposerState();
  renderRooms();
  const result = await api(`/messages?room_id=${room.id}&limit=80`);
  if (requestId !== state.roomRequestId || state.currentRoom?.id !== room.id) return;
  renderMessages(result.messages);
  await markLatestRead(room.id, result.messages);
  await refreshPresence(room.id);
  if (requestId === state.roomRequestId) setRoomsOpen(false);
}

async function markLatestRead(roomId, messages) {
  if (messages.length === 0) return;
  const last = messages[messages.length - 1];
  const read = await api("/read", { method: "POST", body: { room_id: roomId, message_id: last.id } });
  const room = state.rooms.find((item) => item.id === roomId);
  if (room) {
    room.unread_count = 0;
    room.last_read_message_id = read.last_read_message_id;
    renderRooms();
  }
}

async function refreshMessages(markRead = false) {
  const roomId = state.currentRoom?.id;
  if (!roomId) return;
  const result = await api(`/messages?room_id=${roomId}&limit=80`);
  if (state.currentRoom?.id !== roomId) return;
  renderMessages(result.messages);
  if (markRead) await markLatestRead(roomId, result.messages);
}

function updateComposerState() {
  const disabled = !state.currentRoom || state.currentRoom.archived || state.sending;
  elements.messageInput.disabled = disabled;
  elements.sendButton.disabled = disabled;
}

async function editMessage(message) {
  const body = window.prompt("编辑消息", message.body || "");
  if (body === null || body === message.body) return;
  try {
    await api(`/messages/${message.id}`, { method: "PATCH", body: { body, version: message.version } });
    await refreshMessages();
  } catch (error) {
    handleRequestError(error);
  }
}

async function deleteMessage(message) {
  if (!window.confirm("确定删除这条消息？删除后正文无法恢复。")) return;
  try {
    await api(`/messages/${message.id}`, { method: "DELETE", body: { version: message.version } });
    await refreshMessages();
  } catch (error) {
    handleRequestError(error);
  }
}

async function refreshPresence(roomId = state.currentRoom?.id) {
  if (!roomId) return;
  const data = await api(`/presence?room_id=${roomId}`);
  if (state.currentRoom?.id !== roomId) return;
  const onlineMembers = data.members.filter((member) => member.status !== "offline");
  const typingMembers = data.members.filter((member) => member.typing && member.user_id !== state.userId);
  elements.presenceText.textContent = `${onlineMembers.length} 人在线 · ${data.members.length} 位成员`;
  elements.typingText.textContent = typingMembers.length > 0
    ? `${typingMembers.map((member) => member.display_name).join("、")} 正在输入…`
    : "";
}

async function resync() {
  if (!state.userId || document.hidden || !state.online) return;
  try {
    await loadRooms();
    if (state.currentRoom) await openRoom(state.currentRoom);
    setConnection(true);
  } catch (error) {
    if (error.status === 401) return void recoverAuthentication();
    setConnection(false);
  }
}

function abortPoll() {
  if (state.pollController) state.pollController.abort();
  state.pollController = null;
}

async function poll() {
  if (!state.userId || state.eventCursor === null || document.hidden || !state.online || state.pollController) return;
  const controller = new AbortController();
  state.pollController = controller;
  try {
    const data = await api(`/events?cursor=${state.eventCursor}&timeout_ms=25000`, { signal: controller.signal });
    state.eventCursor = data.cursor;
    if (!state.roomsLoaded || data.events.length > 0) {
      const hasUnseenMessage = data.events.some(
        (event) => event.type === "message.created" && event.room_id !== state.currentRoom?.id,
      );
      await loadRooms();
      if (state.currentRoom && data.events.some((event) => event.room_id === state.currentRoom.id)) {
        await refreshMessages(true);
        await refreshPresence();
      }
      if (hasUnseenMessage) playTone(660, 0.04);
    }
    setConnection(true);
  } catch (error) {
    if (error.name !== "AbortError") {
      setConnection(false);
      if (error.status === 401) {
        await recoverAuthentication();
      } else if (error.code === "event_cursor_expired") {
        try {
          await refreshEventCursor();
          await resync();
        } catch (recoveryError) {
          handleRequestError(recoveryError);
        }
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
    }
  } finally {
    if (state.pollController === controller) state.pollController = null;
  }
  if (state.userId && !document.hidden && state.online) poll();
}

function showLogin() {
  abortPoll();
  stopHeartbeat();
  stopTyping();
  resetAudioSession();
  ++state.roomRequestId;
  state.userId = null;
  state.eventCursor = null;
  state.currentRoom = null;
  state.roomsLoaded = false;
  state.sending = false;
  state.rooms = [];
  state.pendingSend = null;
  elements.roomTitle.textContent = "选择一个会话";
  elements.presenceText.textContent = "等待连接";
  elements.typingText.textContent = "";
  elements.messageInput.value = "";
  elements.characterCount.textContent = "0 / 4000";
  resizeMessageInput();
  clearNode(elements.messageList);
  renderRooms();
  updateComposerState();
  setRoomsOpen(false);
  elements.chatView.hidden = true;
  elements.loginView.hidden = false;
}

function showChat() {
  elements.loginView.hidden = true;
  elements.chatView.hidden = false;
  setRoomsOpen(false);
  setConnection(false);
}

function startHeartbeat() {
  stopHeartbeat();
  state.heartbeatTimer = window.setInterval(heartbeat, 30000);
}

function stopHeartbeat() {
  if (state.heartbeatTimer !== null) window.clearInterval(state.heartbeatTimer);
  state.heartbeatTimer = null;
}

async function refreshEventCursor() {
  const session = await api("/auth/session");
  if (!session.authenticated) throw Object.assign(new Error("请重新登录。"), { status: 401 });
  state.csrf = session.csrf;
  state.eventCursor = session.event_cursor;
}

async function recoverAuthentication(message = "登录已过期，请重新登录。") {
  if (state.sessionRecovery) return state.sessionRecovery;
  showLogin();
  const recovery = api("/auth/session")
    .then((session) => {
      state.csrf = session.csrf;
      elements.loginStatus.textContent = message;
    })
    .catch(() => {
      elements.loginStatus.textContent = "聊天服务暂时不可用，请稍后重试。";
    })
    .finally(() => {
      if (state.sessionRecovery === recovery) state.sessionRecovery = null;
    });
  state.sessionRecovery = recovery;
  return recovery;
}

async function bootstrap() {
  try {
    const session = await api("/auth/session");
    state.csrf = session.csrf;
    if (!session.authenticated) return showLogin();
    state.userId = session.user_id;
    state.eventCursor = session.event_cursor;
    await activateChatSession();
  } catch {
    showLogin();
    elements.loginStatus.textContent = "聊天服务暂时不可用，请稍后重试。";
  }
}

async function heartbeat() {
  if (!state.userId || document.hidden || !state.online) return;
  try {
    await api("/presence", { method: "POST", body: { status: "online" } });
    await refreshPresence();
  } catch (error) {
    if (error.status === 401) return void recoverAuthentication();
    setConnection(false);
  }
}

async function activateChatSession() {
  showChat();
  startHeartbeat();
  try {
    await loadRooms();
    await api("/presence", { method: "POST", body: { status: "online" } });
    setConnection(true);
  } catch (error) {
    setConnection(false);
    if (error.status === 401) await recoverAuthentication();
    else showToast("已登录，正在重新连接聊天服务…");
  }
  poll();
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = elements.loginForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  elements.loginStatus.textContent = "正在验证…";
  const form = new FormData(elements.loginForm);
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: { username: form.get("username"), password: form.get("password") },
    });
    state.userId = data.user_id;
    state.csrf = data.csrf;
    state.eventCursor = data.event_cursor;
    elements.loginForm.reset();
    elements.loginStatus.textContent = "";
    await activateChatSession();
  } catch (error) {
    elements.loginStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

elements.messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = elements.messageInput.value;
  const roomId = state.currentRoom?.id;
  if (!roomId || state.sending || !body.trim()) return;
  const pending = state.pendingSend;
  const clientNonce = pending?.roomId === roomId && pending.body === body
    ? pending.clientNonce
    : crypto.randomUUID();
  state.pendingSend = { roomId, body, clientNonce };
  state.sending = true;
  let sent = false;
  updateComposerState();
  elements.messageInput.value = "";
  elements.characterCount.textContent = "0 / 4000";
  resizeMessageInput();
  stopTyping();
  try {
    await api("/messages", {
      method: "POST",
      body: { room_id: roomId, body, client_nonce: clientNonce },
    });
    sent = true;
    state.pendingSend = null;
    playTone(420, 0.03);
    if (state.currentRoom?.id === roomId) await refreshMessages();
  } catch (error) {
    if (!sent && state.currentRoom?.id === roomId && !elements.messageInput.value) {
      elements.messageInput.value = body;
      elements.characterCount.textContent = `${Array.from(body).length} / 4000`;
      resizeMessageInput();
    }
    showToast(sent ? "消息已发送，但列表刷新失败。" : error.message);
  } finally {
    state.sending = false;
    updateComposerState();
  }
});

function stopTyping() {
  if (state.typingTimer !== null) window.clearTimeout(state.typingTimer);
  state.typingTimer = null;
  const roomId = state.typingRoomId;
  state.typingRoomId = null;
  state.typingLastSentAt = 0;
  if (roomId && state.userId) {
    api("/typing", { method: "POST", body: { room_id: roomId, typing: false } }).catch(() => {});
  }
}

function signalTyping() {
  const roomId = state.currentRoom?.id;
  if (!roomId) return;
  const now = Date.now();
  if (state.typingRoomId !== roomId || now - state.typingLastSentAt >= 4000) {
    if (state.typingRoomId !== null && state.typingRoomId !== roomId) stopTyping();
    state.typingRoomId = roomId;
    state.typingLastSentAt = now;
    api("/typing", { method: "POST", body: { room_id: roomId, typing: true } }).catch(() => {});
  }
  if (state.typingTimer !== null) window.clearTimeout(state.typingTimer);
  state.typingTimer = window.setTimeout(stopTyping, 1500);
}

function resizeMessageInput() {
  elements.messageInput.style.height = "auto";
  elements.messageInput.style.height = `${Math.min(elements.messageInput.scrollHeight, 160)}px`;
}

elements.messageInput.addEventListener("input", () => {
  elements.characterCount.textContent = `${Array.from(elements.messageInput.value).length} / 4000`;
  resizeMessageInput();
  if (!elements.messageInput.value.trim()) {
    stopTyping();
    return;
  }
  signalTyping();
});

elements.messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    elements.messageForm.requestSubmit();
  }
});
document.querySelector("#newChatButton").addEventListener("click", () => {
  setChatMode("direct");
  elements.newChatDialog.showModal();
  elements.userSearch.focus();
  queueUserSearch(elements.userSearch, renderDirectUsers, "direct");
});

async function searchUsers(query) {
  return api(`/users?q=${encodeURIComponent(query)}`);
}

function renderDirectUsers(users) {
  clearNode(elements.userResults);
  users.forEach((user) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${user.display_name} · @${user.username}`;
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const room = await api("/rooms/dm", { method: "POST", body: { user_id: user.id } });
        elements.newChatDialog.close();
        await loadRooms();
        await openRoom(room);
      } catch (error) {
        handleRequestError(error);
      } finally {
        button.disabled = false;
      }
    });
    elements.userResults.append(button);
  });
}

function queueUserSearch(input, render, key) {
  if (state.searchTimers[key] !== null) window.clearTimeout(state.searchTimers[key]);
  const version = ++state.searchVersions[key];
  state.searchTimers[key] = window.setTimeout(async () => {
    state.searchTimers[key] = null;
    try {
      const users = await searchUsers(input.value);
      if (state.searchVersions[key] === version) render(users);
    } catch (error) {
      if (state.searchVersions[key] === version) handleRequestError(error);
    }
  }, 180);
}

elements.userSearch.addEventListener("input", () => {
  queueUserSearch(elements.userSearch, renderDirectUsers, "direct");
});

function setChatMode(mode) {
  const direct = mode === "direct";
  const directButton = document.querySelector("#directModeButton");
  const groupButton = document.querySelector("#groupModeButton");
  elements.directChatPanel.hidden = !direct;
  elements.groupForm.hidden = direct;
  directButton.setAttribute("aria-selected", String(direct));
  groupButton.setAttribute("aria-selected", String(!direct));
  directButton.tabIndex = direct ? 0 : -1;
  groupButton.tabIndex = direct ? -1 : 0;
  if (!direct) {
    elements.groupName.focus();
    queueUserSearch(elements.groupUserSearch, renderGroupUsers, "group");
  }
}

function renderSelectedMembers() {
  const names = [...state.groupMembers.values()].map((user) => user.display_name);
  elements.selectedMembers.textContent = names.length > 0 ? `已选择：${names.join("、")}` : "尚未选择成员";
}

function renderGroupUsers(users) {
  clearNode(elements.groupUserResults);
  users.forEach((user) => {
    const selected = state.groupMembers.has(user.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "selectUserButton";
    button.setAttribute("aria-pressed", String(selected));
    button.textContent = `${selected ? "✓ " : "+ "}${user.display_name} · @${user.username}`;
    button.addEventListener("click", () => {
      if (state.groupMembers.has(user.id)) state.groupMembers.delete(user.id);
      else state.groupMembers.set(user.id, user);
      renderSelectedMembers();
      renderGroupUsers(users);
    });
    elements.groupUserResults.append(button);
  });
}

elements.groupUserSearch.addEventListener("input", () => {
  queueUserSearch(elements.groupUserSearch, renderGroupUsers, "group");
});

elements.groupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const room = await api("/rooms/group", {
      method: "POST",
      body: { name: elements.groupName.value, member_ids: [...state.groupMembers.keys()] },
    });
    state.groupMembers.clear();
    elements.groupForm.reset();
    renderSelectedMembers();
    elements.newChatDialog.close();
    await loadRooms();
    await openRoom(room);
  } catch (error) {
    handleRequestError(error);
  }
});

document.querySelector("#directModeButton").addEventListener("click", () => setChatMode("direct"));
document.querySelector("#groupModeButton").addEventListener("click", () => setChatMode("group"));
document.querySelector("#closeNewChat").addEventListener("click", () => elements.newChatDialog.close());
document.querySelector(".modeSwitch").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const direct = event.key === "ArrowLeft" || event.key === "Home";
  const target = document.querySelector(direct ? "#directModeButton" : "#groupModeButton");
  target.click();
  target.focus();
});
elements.newChatDialog.addEventListener("close", () => {
  for (const key of ["direct", "group"]) {
    if (state.searchTimers[key] !== null) window.clearTimeout(state.searchTimers[key]);
    state.searchTimers[key] = null;
    ++state.searchVersions[key];
  }
  elements.userSearch.value = "";
  elements.groupForm.reset();
  state.groupMembers.clear();
  clearNode(elements.userResults);
  clearNode(elements.groupUserResults);
  renderSelectedMembers();
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  try {
    await api("/auth/logout", { method: "POST", body: {} });
  } catch (error) {
    if (error.status !== 401) showToast(error.message);
  } finally {
    await recoverAuthentication("");
  }
});
document.querySelector("#refreshButton").addEventListener("click", resync);

const mobileRoomsMedia = window.matchMedia("(max-width: 760px)");

function setRoomsOpen(open) {
  const wasOpen = document.body.classList.contains("roomsOpen");
  open = open && mobileRoomsMedia.matches;
  document.body.classList.toggle("roomsOpen", open);
  elements.mobileRoomsButton.setAttribute("aria-expanded", String(open));
  elements.sidebarBackdrop.hidden = !open;
  elements.sidebar.inert = mobileRoomsMedia.matches && !open;
  elements.conversation.inert = open;
  if (open) document.querySelector("#newChatButton").focus();
  else if (wasOpen && elements.sidebar.contains(document.activeElement)) elements.mobileRoomsButton.focus();
}

elements.mobileRoomsButton.addEventListener("click", () => setRoomsOpen(!document.body.classList.contains("roomsOpen")));
elements.sidebarBackdrop.addEventListener("click", () => setRoomsOpen(false));
mobileRoomsMedia.addEventListener("change", () => setRoomsOpen(false));

function ensureAudio() {
  if (state.audioContext?.state === "closed") {
    state.audioContext = null;
    state.bgmOscillator = null;
    state.bgmGain = null;
  }
  if (!state.audioContext) {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (AudioEngine) state.audioContext = new AudioEngine();
  }
  return state.audioContext;
}

function playTone(frequency, duration) {
  if (!state.sfx) return;
  const context = ensureAudio();
  if (!context) return;
  if (context.state === "suspended") void context.resume().catch(() => {});
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.012, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function toggleBgm(enabled) {
  state.bgm = enabled;
  if (enabled) {
    const context = ensureAudio();
    if (context && !state.bgmOscillator) {
      if (context.state === "suspended") void context.resume().catch(() => {});
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 82;
      gain.gain.value = 0.0035;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      state.bgmOscillator = oscillator;
      state.bgmGain = gain;
    }
  } else if (state.bgmOscillator) {
    const oscillator = state.bgmOscillator;
    const gain = state.bgmGain;
    state.bgmOscillator = null;
    state.bgmGain = null;
    oscillator.stop();
    oscillator.disconnect();
    gain?.disconnect();
  }
}

function resetAudioSession() {
  state.sfx = false;
  toggleBgm(false);
  const sfxButton = document.querySelector("#sfxButton");
  const bgmButton = document.querySelector("#bgmButton");
  sfxButton.textContent = "提示音 关";
  sfxButton.setAttribute("aria-pressed", "false");
  bgmButton.textContent = "氛围音 关";
  bgmButton.setAttribute("aria-pressed", "false");
  if (state.audioContext?.state === "running") void state.audioContext.suspend();
}

document.querySelector("#sfxButton").addEventListener("click", (event) => {
  state.sfx = !state.sfx;
  event.currentTarget.textContent = `提示音 ${state.sfx ? "开" : "关"}`;
  event.currentTarget.setAttribute("aria-pressed", String(state.sfx));
  playTone(520, 0.05);
});
document.querySelector("#bgmButton").addEventListener("click", (event) => {
  toggleBgm(!state.bgm);
  event.currentTarget.textContent = `氛围音 ${state.bgm ? "开" : "关"}`;
  event.currentTarget.setAttribute("aria-pressed", String(state.bgm));
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopTyping();
    abortPoll();
    if (state.audioContext?.state === "running") void state.audioContext.suspend();
  } else {
    if (state.bgm && state.audioContext?.state === "suspended") void state.audioContext.resume();
    heartbeat();
    resync().then(poll);
  }
});
window.addEventListener("online", () => { state.online = true; resync().then(poll); });
window.addEventListener("offline", () => { state.online = false; stopTyping(); abortPoll(); setConnection(false); });
window.addEventListener("pageshow", (event) => { if (event.persisted) resync().then(poll); });
window.addEventListener("pagehide", () => { stopTyping(); abortPoll(); });
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("roomsOpen")) setRoomsOpen(false);
});

bootstrap();
