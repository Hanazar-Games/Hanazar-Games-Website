# Flash Photo

自托管的私密限时图片服务。管理员上传图片后只得到一次完整链接；访问者点击查看时，PHP 在服务器端原子启动 15、30 或 60 秒倒计时，过期或手动销毁后内容接口立即拒绝访问。

> 本项目降低误传播和长期暴露风险，但不是 DRM。浏览器已收到并显示的像素无法阻止截图、录屏、开发者工具抓取、恶意客户端保存或另一台设备拍摄。

## 工作方式

```text
管理员 -> /admin/upload.php -> MIME/尺寸校验 -> 可选 GD 重编码
                                      |-> 私有本地文件（Web root 之外）
                                      `-> SQLite（只保存 SHA-256(token)）

持有 43 字符链接的人 -> /v/{token} -> POST /api/redeem.php（原子首次打开）
                                     -> POST /api/content.php（PHP 每次鉴权并输出图片）
                                     -> heartbeat/status（使用服务器时间校准倒计时）

systemd timer/Cron -> scripts/cleanup.php -> 删除过期文件、限流垃圾和到期记录/日志
```

PHP 内容端点是唯一图片出口：Nginx 没有 `storage` 静态映射，且每次输出前都会检查状态、服务器截止时间和首位查看者绑定。浏览器倒计时只负责显示；客户端改时钟或停掉 JavaScript不能延长服务端期限。Cron 负责最终物理清理和保留策略，不承担访问控制，因此 Cron 延迟也不会让过期图片继续可读。

内容接口会在发送响应头前完整读取最多 `MAX_UPLOAD_BYTES` 的文件，再以事务重新核对数据库状态、截止时间和首位查看者绑定，只有最终授权成功才增加访问次数，因此读取期间发生的销毁或过期会被拒绝，`Content-Length` 也与实际响应体一致。截止时间后的新请求立即返回 404；已经通过最终授权并交给 Web 服务器或操作系统网络栈的单个响应无法撤回已发送字节，这也是任何 HTTP 实现都不能把已交付内容“远程收回”的边界。

查看页提供可选 SFX 和低音量环境音：声音默认关闭，只能由访问者主动点击开关后用浏览器 Web Audio 在本地合成，不下载媒体、不连接第三方，也不把偏好写入 Cookie 或 Web Storage。页面隐藏时立即暂停；恢复前台并通过服务器状态校验后，仍需再次点击才能恢复。浏览器不支持或拒绝音频时，查看与倒计时功能保持不变。

管理后台的完整记录页每页显示 100 条并提供上一页/下一页，因此超过 200 条后，保留期内的旧记录仍可查看和手动销毁。

链接 token 来自 32 字节随机数，编码为无填充 Base64URL 的 43 字符路径段。路径便于直接分享和严格路由；它是持有者凭证，不是公开 ID。数据库只保存 `SHA-256(token)`；原始 token 只存在于创建请求的进程内存和随后一次管理页响应中，从未写入 PHP Session、数据库或后台列表，因此无法从这些位置或数据库备份恢复。丢失完整链接只能重新上传。URL 片段不会发给服务器，无法用于服务端鉴权；查询字符串同样可能被日志记录，故这里采用固定长度路径并在 Nginx 对 `/v/` 与 API 关闭访问日志。

## 安全模型与边界

- 仅接受经 `fileinfo` 和 `getimagesize` 一致确认的 JPEG、PNG、WebP、GIF；拒绝 SVG、伪图片、危险扩展名、路径穿越、超大文件和超大像素图。
- 默认用 GD 重编码非 GIF 图片，减少附带数据和解析器攻击面；解码前会结合当前 PHP `memory_limit`、像素数和源文件大小做保守内存预算。`PRESERVE_GIF_ANIMATION=true` 时 GIF 为保留动画而原样复制，可能保留元数据，设为 `false` 时会通过 GD 重编码且只保留首帧。
- 存储随机改名、权限为 `0600`，目录在 Web root 外且拒绝符号链接。上传先进入私有 `.pending`，数据库提交后才移除发布标记；崩溃遗留由 cleanup 在宽限期后收敛。目录名虽曾为 `encrypted`，当前文件并未做应用层静态加密；需要磁盘加密、云盘加密或未来 OSS SSE-KMS 才能覆盖磁盘/快照泄露。
- SQLite 用 `BEGIN IMMEDIATE`、WAL、5 秒 busy timeout 保证首次兑换不重复启动或延长倒计时。
- `global` 模式让所有持有链接者共享一个服务端截止时间；`first` 模式再绑定首次浏览器的 HttpOnly 随机 cookie。cookie 可被控制终端的攻击者复制，清 cookie/换浏览器会失去访问，不应视为强身份认证。
- 管理登录有密码哈希、CSRF、Strict/HttpOnly/Secure session cookie、失败锁定和文件型速率限制。建议再叠加 Tailscale、固定 IP 或 Basic Auth。
- IP 和 User-Agent 仅以 HMAC 哈希记录；它们用于审计/限流，不是身份凭证。应用日志会剔除名称含 token、password、session、path 的上下文键。
- 页面设置严格 CSP（无 `unsafe-inline`）、`no-store`、`no-referrer`、禁止嵌入和索引；Nginx 不重复注入 CSP，避免覆盖 PHP 的按响应策略。
- `/assets` 下允许访问的 CSS/JS 使用固定文件名并返回 `Cache-Control: no-cache`，浏览器可保存副本，但每次使用前必须向服务器重新验证，避免发布后继续使用一小时内的旧资源；本地图标可缓存一小时。
- `robots.txt` 与 `noindex` 只减少正常爬虫收录，不构成访问控制；完整秘密链接本身就是 bearer 凭证，拿到链接的人即拥有相应访问能力。
- 无法阻止接收者在有效期内复制内容，也无法撤回已保存副本。服务器、root、数据库/文件备份、PHP 进程和终止 TLS 的上游代理均属于信任边界。
- ECS/云盘运营商、域名注册与解析服务商、TLS/反向代理服务商和访问者所用网络仍可能掌握域名、连接时间、流量大小或来源等元数据，即使应用没有记录原始 IP 和链接。

## 目录

```text
flash-photo/
├── app/
│   ├── AdminView.php
│   ├── Api.php
│   ├── Auth.php
│   ├── AuthException.php
│   ├── ClientIdentity.php
│   ├── Config.php
│   ├── Csrf.php
│   ├── Database.php
│   ├── FileStorage.php
│   ├── FlashService.php
│   ├── HttpException.php
│   ├── Logger.php
│   ├── NotFoundException.php
│   ├── RateLimitException.php
│   ├── RateLimiter.php
│   ├── Request.php
│   ├── Response.php
│   ├── RuntimeCleanupQueue.php
│   ├── SchemaValidator.php
│   ├── SecurityHeaders.php
│   ├── SessionCleanupRegistry.php
│   ├── ValidationException.php
│   ├── Validator.php
│   ├── ViewerIdentity.php
│   └── bootstrap.php
├── config/
│   ├── config.example.php
│   └── config.php
├── cron/
│   └── flash-photo
├── database/
│   ├── init.php
│   └── schema.sql
├── nginx/
│   └── flash-photo.conf
├── public/
│   ├── admin/{_bootstrap,destroy,index,list,login,logout,upload}.php
│   ├── api/{content,heartbeat,redeem,status}.php
│   ├── assets/{admin.js,app.css,viewer.js}
│   ├── 404.php
│   ├── favicon.svg
│   ├── health.php
│   ├── index.php
│   ├── robots.txt
│   └── view.php
├── scripts/
│   ├── check-permissions.php
│   ├── cleanup.php
│   ├── create-admin.php
│   └── rotate-secret.php
├── storage/
│   ├── encrypted/.gitkeep
│   ├── logs/.gitkeep
│   ├── rate-limits/.gitkeep
│   ├── sessions/.gitkeep
│   └── .gitkeep
├── systemd/
│   ├── flash-photo-cleanup.service
│   └── flash-photo-cleanup.timer
├── tests/
│   ├── AdminSessionAdmissionTest.php
│   ├── AdminUxHardeningTest.php
│   ├── CleanupTest.php
│   ├── DatabaseInitializationTest.php
│   ├── ExpiryTest.php
│   ├── FileStorageDurabilityTest.php
│   ├── FrontendContractTest.php
│   ├── PaginationTest.php
│   ├── RedeemTest.php
│   ├── SchemaValidatorTest.php
│   ├── SecurityTest.php
│   ├── TestCase.php
│   ├── TokenTest.php
│   ├── UploadValidationTest.php
│   ├── redeem-worker.php
│   └── bootstrap.php
├── .env.example
├── .gitignore
├── composer.json
├── LICENSE
├── phpunit.xml
└── README.md
```

生产状态不放在仓库：建议代码位于 `/var/www/flash-photo/current`，SQLite/图片/限流位于 `/var/lib/flash-photo`，应用日志位于 `/var/log/flash-photo`，机密位于 `/etc/flash-photo.env`。

## 运行要求

- Linux、Nginx、PHP 8.2+、PHP-FPM、SQLite 3。
- PHP 核心 `fsync()` 不得通过 `disable_functions` 禁用；上传发布与运行态删除依赖它持久化文件和目录元数据。
- 必需 PHP 扩展：`fileinfo`、`json`、`PDO`、`pdo_sqlite`、`session`；默认 `REENCODE_UPLOADS=true` 时还必须有 `gd`（含 JPEG/PNG/WebP 支持）。
- 文件名清洗使用 `mbstring`，因此它也是运行时必需；交互式管理员创建还需要可用的 `exec` 与系统 `stty`。PHPUnit 11 开发测试另需 `dom`、`xml`、`xmlwriter`。
- Composer 2（安装开发依赖并运行测试）；运行时有最小 PSR-4 回退加载器，但生产仍建议 `composer install --no-dev`。

Debian 12/Ubuntu（PHP 8.2 包源已配置）示例：

```bash
sudo apt update
sudo apt install -y nginx php8.2-cli php8.2-fpm php8.2-sqlite3 php8.2-gd php8.2-mbstring php8.2-opcache php8.2-xml sqlite3 composer certbot
php -r 'foreach (["fileinfo","json","pdo_sqlite","session","gd","mbstring"] as $e) { echo $e, ": ", extension_loaded($e) ? "ok\n" : "missing\n"; }'
```

Alibaba Cloud Linux/RHEL 系列的软件包名和 FPM 路径不同；先确认 `php -v` 为 8.2+，再把下文的 `/etc/php/8.2`、服务名和套接字路径替换为实际值。

## Alibaba ECS 部署

以下以 Debian/Ubuntu、域名 `s.hanazargames.com`、ECS 用户 `deploy` 为例。先在阿里云安全组仅放行管理来源的 SSH/22，以及公网 TCP 80/443；不要开放 FPM 或 SQLite。若服务器启用 UFW，也执行 `sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full'`。

### 1. DNS 与上传代码

在 DNS 控制台创建 `s.hanazargames.com` 的 A 记录指向 ECS 公网 IPv4；只有配置了公网 IPv6 时才创建 AAAA。等待：

```bash
dig +short A s.hanazargames.com
dig +short AAAA s.hanazargames.com
```

在本地项目根目录为每次发布创建全新的远端暂存目录，再上传独立项目（把地址替换成实际 ECS）：

```bash
set -euo pipefail
stage="$(ssh deploy@ECS_PUBLIC_IP 'umask 077; mktemp -d /tmp/flash-photo.XXXXXX')"
test -n "$stage"
rsync -az --exclude='.git/' --exclude='.env' --exclude='vendor/' --exclude='storage/' flash-photo/ "deploy@ECS_PUBLIC_IP:$stage/"
printf 'Remote staging directory: %s\n' "$stage"
```

在 ECS 上把下面的 `stage` 替换为上一条命令打印的精确路径，再创建只读发布目录。全新目录避免旧版本中已删除的文件混入新 release：

```bash
set -euo pipefail
stage="/tmp/flash-photo.ABC123"
test -d "$stage"
test ! -L "$stage"
release="/var/www/flash-photo/releases/$(date -u +%Y%m%d%H%M%S)"
sudo install -d -o root -g www-data -m 0750 "$release"
sudo cp -a "$stage/." "$release/"
cd "$release"
sudo env COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --classmap-authoritative --no-interaction
sudo chown -R root:www-data "$release"
sudo find "$release" -type d -exec chmod 0750 {} +
sudo find "$release" -type f -exec chmod 0640 {} +
sudo ln -s "$release" /var/www/flash-photo/current
```

首次部署用 `ln -s`；升级时使用后文的原子切换。命令用 root 只为在随后锁成只读前生成 `vendor`；更可审计的方式是在 CI/本地以锁文件生成 `vendor` 后一并上传。

### 2. 运行目录与机密

```bash
sudo install -d -o www-data -g www-data -m 0700 /var/lib/flash-photo
sudo install -d -o www-data -g www-data -m 0700 /var/lib/flash-photo/images
sudo install -d -o www-data -g www-data -m 0700 /var/lib/flash-photo/rate-limits
sudo install -d -o www-data -g www-data -m 0700 /var/lib/flash-photo/sessions
sudo install -d -o www-data -g www-data -m 0700 /var/lib/flash-photo/sessions/.cleanup
sudo install -d -o www-data -g www-data -m 0750 /var/log/flash-photo
sudo install -o root -g www-data -m 0640 /var/www/flash-photo/current/.env.example /etc/flash-photo.env
sudoedit /etc/flash-photo.env
```

应用首次启动会在 `STORAGE_PATH` 内创建权限为 `0700` 的 `.pending`；它只能由同一 FPM/cleanup 用户访问，不要预建为符号链接或与其他应用共用。

至少用 `openssl rand -hex 32` 分别生成 `APP_SECRET`、`IP_HASH_SECRET` 和 `HEALTH_TOKEN`，不要复用、粘贴到工单或提交仓库。确认 `APP_URL=https://s.hanazargames.com`，路径使用 `/var/lib` 与 `/var/log`。应用不会读取仓库内 `.env`，`/etc/flash-photo.env` 由 FPM/systemd 注入；它同时是 shell 兼容的简单 `KEY=value` 文件，值不要含未转义空格、引号或命令替换。

配置项：

| 变量 | 默认/示例 | 说明 |
| --- | --- | --- |
| `APP_ENV` / `APP_DEBUG` | `production` / `false` | 环境标识；生产禁止调试输出 |
| `APP_URL` / `APP_TIMEZONE` | HTTPS 域名 / `Asia/Shanghai` | 生成链接的基址；管理页显示时区 |
| `DATABASE_PATH` | `/var/lib/flash-photo/database.sqlite` | SQLite 文件，父目录须由 FPM 可写 |
| `STORAGE_PATH` | `/var/lib/flash-photo/images` | 私有图片目录，不得位于 `public/` |
| `LOG_PATH` | `/var/log/flash-photo` | JSON Lines 应用日志目录 |
| `RATE_LIMIT_PATH` | `/var/lib/flash-photo/rate-limits` | 文件型限流状态目录 |
| `MAX_UPLOAD_BYTES` | `10485760` | 源文件和处理后产物的应用上限；须不高于 Nginx/PHP 上限，并影响 GD 内存预算 |
| `MAX_IMAGE_PIXELS` | `40000000` | 解码前像素数上限；须与 FPM `memory_limit`、并发数和主机内存联动 |
| `DEFAULT_VIEW_SECONDS` | `30` | 仅允许 15、30、60 |
| `DEFAULT_UNUSED_EXPIRY_SECONDS` | `86400` | 未打开默认期限；上传允许 300–2592000 秒 |
| `REENCODE_UPLOADS` | `true` | GD 重编码非 GIF |
| `PRESERVE_GIF_ANIMATION` | `true` | 保留 GIF 动画并原样复制；`false` 时 GD 重编码为单帧 |
| `SESSION_NAME` / `SESSION_LIFETIME` | `__Secure-flash_admin` / `3600` | 管理 session cookie 名与秒数；生产 HTTPS 可用 `__Secure-`；本地 HTTP 还须设 `APP_ENV=development` 并改为无前缀名称；不要用要求 Path=/ 的 `__Host-` |
| `APP_SECRET` | 无默认 | 至少 32 字符；first-viewer HMAC 与限流文件键 |
| `IP_HASH_SECRET` | 无默认 | 至少 32 字符；IP/User-Agent HMAC |
| `HEALTH_TOKEN` | 无安全默认值 | `/health.php` 的 `X-Health-Token`；生产必须使用独立的至少 32 字符随机值，否则配置校验拒绝启动 |
| `TRUSTED_PROXIES` | 空 | 逗号分隔的精确代理 IP/CIDR；直连保持空 |
| `ADMIN_PATH` | `admin` | 单段公开路径；修改时须同步改 Nginx 中三处管理路由正则里的 `admin`，物理脚本目录仍保持 `public/admin/` |
| `LOG_RETENTION_DAYS` | `30` | cleanup 的应用日志保留期 |
| `DESTROYED_RECORD_RETENTION_DAYS` | `90` | cleanup 的已销毁/过期元数据保留期 |
| `RATE_ADMIN_SESSION_LIMIT/WINDOW` | `30` / `60` | 创建匿名管理 Session 前的独立 IP 次数/窗口秒数 |
| `RATE_LOGIN_LIMIT/WINDOW` | `10` / `900` | 登录次数/窗口秒数 |
| `RATE_REDEEM_LIMIT/WINDOW` | `30` / `60` | 兑换次数/窗口秒数 |
| `RATE_CONTENT_LIMIT/WINDOW` | `120` / `60` | 内容次数/窗口秒数 |
| `RATE_STATUS_LIMIT/WINDOW` | `120` / `60` | 状态/心跳次数/窗口秒数 |
| `RATE_UPLOAD_LIMIT/WINDOW` | `20` / `3600` | 上传次数/窗口秒数 |
| `RATE_PROBE_LIMIT/WINDOW` | `20` / `60` | 无效 token 探测次数/窗口秒数 |

`WINDOW` 均为秒。`LIMIT` 必须在 `1..1000000`，`WINDOW` 必须在 `1..31536000`；设为零不是受支持的“关闭”方式。

### 3. 独立 PHP-FPM pool

创建 `/etc/systemd/system/php8.2-fpm.service.d/flash-photo-env.conf`：

```ini
[Service]
EnvironmentFile=/etc/flash-photo.env
```

创建 `/etc/php/8.2/fpm/pool.d/flash-photo.conf`：

```ini
[flash-photo]
user = www-data
group = www-data
listen = /run/php/flash-photo.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
pm = dynamic
pm.max_children = 8
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
clear_env = no
security.limit_extensions = .php
php_admin_value[upload_max_filesize] = 10M
php_admin_value[post_max_size] = 11M
php_admin_value[memory_limit] = 768M
php_admin_value[max_execution_time] = 30
php_admin_value[session.save_path] = /var/lib/flash-photo/sessions
php_admin_value[session.gc_probability] = 0
php_admin_flag[display_errors] = off
php_admin_flag[log_errors] = on
```

`clear_env=no` 只放在此独立 pool，使它继承 systemd 的受保护环境文件；同机其他 pool 保持默认清空环境。原生 Session 概率 GC 必须关闭，由有界 cleanup 队列统一处理，避免 Web 请求触发无界目录扫描。GD 门禁按“当前已分配内存 + 12 × 像素数 + 2 × 源文件大小 + 16 MiB”估算；默认 4000 万像素和 10 MiB 源文件约需当前已分配内存之外再预留 494 MiB。该公式是保守启发式，不是精确峰值保证；仍须让 `memory_limit × pm.max_children` 与主机可用内存相容。修改 `MAX_UPLOAD_BYTES` 或 `MAX_IMAGE_PIXELS` 时，同步评估 `memory_limit`、FPM 并发，并调整上面两个上传值与 Nginx 管理上传路由中的 `client_max_body_size`；其他公开路由继续保持小请求体上限。

```bash
sudo systemctl daemon-reload
sudo php-fpm8.2 -t
sudo systemctl restart php8.2-fpm
sudo test -S /run/php/flash-photo.sock
```

### 4. 数据库与管理员

CLI 不读取 FPM 环境，使用受限用户在子 shell 中加载仓库外环境：

```bash
sudo -u www-data /bin/bash -c 'set -a; . /etc/flash-photo.env; set +a; exec /usr/bin/php /var/www/flash-photo/current/database/init.php'
sudo -u www-data /bin/bash -c 'set -a; . /etc/flash-photo.env; set +a; exec /usr/bin/php /var/www/flash-photo/current/scripts/create-admin.php --username=admin'
sudo -u www-data /bin/bash -c 'set -a; . /etc/flash-photo.env; set +a; exec /usr/bin/php /var/www/flash-photo/current/scripts/check-permissions.php --session-path=/var/lib/flash-photo/sessions'
```

`create-admin.php` 在 TTY 中隐藏读取密码，不接受命令行密码，避免 shell 历史和进程列表泄露。数据库初始化后应为 `0600`，SQLite WAL/SHM 会在同目录创建，所以只给 `www-data` 写父目录，不给 Nginx 公网路径权限。

### 5. HTTPS 与 Nginx

证书不存在时不要先启用引用证书路径的完整配置。先用只监听 HTTP 的临时站点完成 Webroot 验证，这样续期无需停 Nginx：

```bash
sudo install -d -o www-data -g www-data -m 0755 /var/www/letsencrypt
sudo tee /etc/nginx/sites-available/flash-photo-bootstrap.conf >/dev/null <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name s.hanazargames.com;
    access_log off;
    error_log /dev/null crit;
    location ^~ /.well-known/acme-challenge/ { root /var/www/letsencrypt; try_files $uri =404; }
    location / { return 404; }
}
NGINX
sudo ln -s /etc/nginx/sites-available/flash-photo-bootstrap.conf /etc/nginx/sites-enabled/flash-photo-bootstrap.conf
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/letsencrypt -d s.hanazargames.com --agree-tos -m YOUR_EMAIL --no-eff-email
sudo rm -f /etc/nginx/sites-enabled/flash-photo-bootstrap.conf /etc/nginx/sites-available/flash-photo-bootstrap.conf
sudo install -o root -g root -m 0644 /var/www/flash-photo/current/nginx/flash-photo.conf /etc/nginx/sites-available/flash-photo.conf
sudo ln -s /etc/nginx/sites-available/flash-photo.conf /etc/nginx/sites-enabled/flash-photo.conf
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx php8.2-fpm
sudo certbot renew --dry-run
```

如发行版有 `/etc/nginx/sites-enabled/default`，先审阅并禁用它，避免默认站点冲突；本配置自己的 HTTP 默认站点会直接拒绝未知 Host，所有跳转固定到正式域名。配置只允许首页、43 字符 `/v/`、四个 API、health、三个固定 CSS/JS、本地图标和六个管理 PHP 端点；其他 PHP 一律 404，并拒绝隐藏文件、配置、数据库、存储、脚本、依赖、日志和环境文件。CSS/JS 可由浏览器保存但每次重新验证，图标可缓存一小时，动态/API 不缓存；没有 `storage` alias。管理上传路由的 11 MiB 请求体上限为 multipart 开销留出空间，其他路由保持 16 KiB；真正的图片文件仍由应用按 `MAX_UPLOAD_BYTES=10 MiB` 拒绝。

若要隐藏默认管理路径，先把 `/etc/flash-photo.env` 中 `ADMIN_PATH` 改成新的单段随机名称，再只把 Nginx 三个管理 `location` 正则中的字面量 `admin` 改成同一名称；不要修改 `$document_root/admin/` 物理脚本映射。随后执行 `sudo nginx -t && sudo systemctl restart php8.2-fpm && sudo systemctl reload nginx`。隐藏路径只是减噪，仍须依赖 PHP 登录，并建议叠加固定 IP、Tailscale 或 Basic Auth。

证书自动续期通常由 Certbot timer 完成。检查 `systemctl list-timers | grep certbot`；若发行版没有 timer，创建每日 `certbot renew --quiet --deploy-hook 'systemctl reload nginx'` 的 systemd timer。

### 6. 定时清理：systemd（推荐）或 Cron

先手工预演：

```bash
sudo -u www-data /bin/bash -c 'set -a; . /etc/flash-photo.env; set +a; exec /usr/bin/php /var/www/flash-photo/current/scripts/cleanup.php --dry-run --verbose --limit=500 --session-path=/var/lib/flash-photo/sessions'
```

`--limit` 是每个独立数据库查询或清理队列分类最多检查的行数，不是删除成功数，也不是整次运行的全局总数。应用在创建 `.pending` 临时文件、限流状态和日志之前，先把严格校验后的 basename 与到期时间登记进 SQLite；Session 队列只保存不可用于重放 Cookie 的 64 位十六进制引用，引用在 `sessions/.cleanup` 的 `0600` sidecar 内映射到 Session 文件名。cleanup 按分类使用覆盖索引取出到期项，再只访问对应精确路径，不枚举运行目录；限流正式状态及其确定性 `.tmp` 崩溃残留会在同一锁内一起收敛。锁定、仍新鲜或暂时失败的首项会原子延期到队尾，因此不会永久饿死后续项；`--dry-run` 以 SQLite 只读打开标志和 `query_only` 运行，不删除文件、不改业务状态、不推进队列，也不切换 journal mode 或写入主数据库。SQLite 的只读 WAL 访问仍可能使用或维护 `-wal`/`-shm` 协调文件，因此数据库目录必须满足 SQLite 的访问要求；干净且已 checkpoint 的 WAL 数据库可在辅助文件缺失时打开并按需重建协调文件，仍依赖未 checkpoint WAL 内容却缺失或损坏辅助文件时则会安全失败，而不会回退为可写连接。

上传进程会持续锁住发布标记，提交成功后移除它；进程崩溃留下的标记至少一小时后才由 cleanup 非阻塞接管，并在 SQLite 写事务内再次确认 `storage_name`。数据库已有记录时只移除陈旧标记；没有记录时才删除对应随机文件和标记。符号链接永不跟随。手工放进运行目录、但未由应用登记的文件不属于此清理不变量，部署时必须以目录权限禁止其他写入者。

每个到期限流项只在状态重检、条件队列更新和删除期间短暂持有全局限流锁，日志与终端输出均在锁外；活动窗口首次超限后计数封顶，后续 429 不再重写状态或重复记录越界日志。Session 清理只接受精确的 `dirname(STORAGE_PATH)/sessions` 专用 sibling 及其 `0700` 的 `.cleanup`：显式 `--session-path` 不匹配会报错；省略参数时，仅当 PHP `session.save_path` 已精确指向该目录才会清理，否则安全跳过。Session 与 sidecar 均在非阻塞文件锁内复核，sidecar 文件及父目录变更在 Linux 上执行 `fsync`，SQLite/WAL/应用日志不会保存可重放的 Session ID。SQLite 以 `session_pending`、`session`、`session_delete` 三个非机密阶段记录文件系统操作：创建方通过 `BEGIN IMMEDIATE` 在 pending 所有权复核、sidecar 持久化和激活提交之间建立写入围栏，清理方先取得删除所有权时创建方不会再迟到发布；Session 删除进入终态后可在崩溃重试中幂等移除 sidecar 和队列。SQLite 与文件系统仍不是单一原子存储，但创建进程在提交前崩溃时，数据库会回滚到可恢复的 pending 阶段，由到期 cleanup 有界收敛。无法映射的 Session 文件不能在“不枚举目录、数据库不保存 Session ID”的安全边界内自动定位，发现此类异常时应在维护窗口使全部管理 Session 失效并重新登录。`destroyed_at` 表示业务上已终止，`storage_deleted_at` 表示物理文件删除完成；物理删除失败会延期重试，只有两者满足原始保留截止条件后才会删除数据库记录。

安装项目内唯一维护的 service 与 timer：

```bash
sudo install -o root -g root -m 0644 /var/www/flash-photo/current/systemd/flash-photo-cleanup.service /etc/systemd/system/flash-photo-cleanup.service
sudo install -o root -g root -m 0644 /var/www/flash-photo/current/systemd/flash-photo-cleanup.timer /etc/systemd/system/flash-photo-cleanup.timer
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now flash-photo-cleanup.timer
sudo systemctl start flash-photo-cleanup.service
sudo systemctl status flash-photo-cleanup.service --no-pager
```

若必须用 Cron，二选一，不要与 timer 重复运行。`/etc/cron.d/flash-photo`：

```cron
* * * * * www-data /bin/bash -c 'set -a; . /etc/flash-photo.env; set +a; exec /usr/bin/php /var/www/flash-photo/current/scripts/cleanup.php --limit=500 --session-path=/var/lib/flash-photo/sessions'
```

## 测试与验收

测试使用系统临时目录，不读取生产数据库。应在工作站/CI 或尚未切流的 release candidate 中先安装开发依赖并运行：

```bash
cd flash-photo
composer install
composer test
find app config database public scripts tests -name '*.php' -print0 | xargs -0 -n1 php -l
```

生产机切换前另运行 `sudo nginx -t`；验收后可执行 `composer install --no-dev --classmap-authoritative` 去掉测试依赖。

上线验收：

1. `curl -i https://s.hanazargames.com/health.php` 在设置 token 后应伪装为 404；`curl -i -H 'X-Health-Token: YOUR_TOKEN' .../health.php` 应返回 200/`ok`。不要把真实 token 写进共享终端历史。
2. 登录 `/admin/login.php`，上传小型测试图，选择 30 秒和 `global`，只在结果页复制完整链接。刷新后链接不再显示，后台/SQLite 无法恢复原 token。
3. 用无痕窗口打开链接。仅加载落地页不应启动倒计时或声音；声音开关默认关闭且刷新后仍关闭。点击“查看”后应从约 30 秒开始。换设备访问同一链接只能共享剩余时间，刷新、隐藏标签页或改客户端时钟不会重置服务器截止时间。
4. 30 秒后页面结束，原链接、`redeem`、`content`、`status` 都应返回 404/不可用；确认 Nginx access log 没有出现 `/v/{token}` 或 API 请求。
5. 再上传一张，在后台列表点击“销毁”；已打开页面的下一次 heartbeat 应结束，旧链接立即不可用。运行 cleanup 后确认对应随机文件已删除。
6. 用 `first` 模式验证另一浏览器得到 404；这只是浏览器 cookie 绑定，不是防复制保证。

## 运维

### 日志与隐私

- 应用：`/var/log/flash-photo/app-YYYY-MM-DD.log`（UTC 日期、JSON Lines、request ID）；cleanup 会记录每条实际删除和失败，无待处理项的成功运行以进程退出码及 systemd/Cron journal 为准。`LOG_RETENTION_DAYS` 由 cleanup 应用于这些文件。
- 审计：SQLite `audit_logs`；物理清除过期图片时写入一次 `automatic_destroy`，cleanup 同样按 `LOG_RETENTION_DAYS` 清理审计。备份仍包含创建时尚未过保留期的审计元数据。
- PHP-FPM：`journalctl -u php8.2-fpm`；cleanup：`journalctl -u flash-photo-cleanup.service`；Nginx：`/var/log/nginx/error.log` 与站点 access log。
- Nginx 使用不含 IP、路径、查询、Referer 和 User-Agent 的 `flash_photo_privacy` 格式记录普通站点状态；对 `/v/{token}` 与 `/api/*` 关闭 access log，并把 `/v/` 的 location 级 error log 丢弃，避免 bearer token 进入 Nginx 日志。不要启用记录 `$request`、`$request_uri` 或请求体的调试日志；上游 SLB、WAF、CDN、APM、浏览器历史和聊天预览机器人仍可能记录/提前访问路径，必须分别关闭或脱敏。
- 不要把 `HEALTH_TOKEN`、完整分享 URL、cookie 或 `/etc/flash-photo.env` 粘贴到日志/告警。排错优先使用响应 `X-Request-ID`。

### 备份与恢复

SQLite WAL 模式下不要只 `cp database.sqlite`。严格恢复点应先停止 PHP-FPM 写入，再停止实际采用的清理调度器并等待正在运行的 cleanup 退出：systemd 部署同时执行 `systemctl stop flash-photo-cleanup.timer flash-photo-cleanup.service`；Cron 部署先临时禁用 `/etc/cron.d/flash-photo`，再确认没有 `www-data` 的 `scripts/cleanup.php` 进程。完成下面的数据库与图片备份后再恢复 FPM 和原调度器。仅停止 timer 不会终止已经启动的 service，也不能影响 Cron。

使用一致性备份：

```bash
backup_dir="/var/backups/flash-photo/$(date -u +%Y%m%d%H%M%S)"
sudo install -d -o root -g root -m 0700 "$backup_dir"
sudo sqlite3 /var/lib/flash-photo/database.sqlite ".backup '$backup_dir/database.sqlite'"
sudo tar -C /var/lib/flash-photo -czf "$backup_dir/images.tar.gz" images
sudo cp -a /etc/flash-photo.env "$backup_dir/flash-photo.env"
sudo chmod -R go-rwx "$backup_dir"
```

图片与数据库在并发上传/cleanup 时可能不是同一瞬间；也可在停止写入并等待 cleanup 后使用文件系统快照。备份包含图片和机密，应使用独立加密、异地存储、最小权限与短保留期；过期内容若仍留在旧备份中就没有真正物理消失。定期在隔离主机演练恢复，并运行 `PRAGMA integrity_check;` 与 `check-permissions.php`。

### 升级与回滚

1. 先做数据库/图片/环境备份；在工作站或 CI 对同一新 release 运行 `composer install`、测试和 `php -l`，通过后再为生产安装 `composer install --no-dev --classmap-authoritative`。
2. 阅读 schema/脚本变更，并比较新 release 的 `nginx/flash-photo.conf`、systemd unit 及实际采用的 Cron 文件与 `/etc` 副本。`database/init.php` 只初始化空数据库或确认当前精确 schema，不会修改不兼容的现有表；这个未发布开发版本遇到旧 schema 时应从空数据库重新初始化，未来发布后的结构变化必须随版本提供显式迁移与回滚说明。
3. 执行 `cd /var/www/flash-photo/releases/NEW_RELEASE`，备份外部配置后安装新副本；systemd 与 Cron 仍然二选一。systemd 部署执行：`sudo install -o root -g root -m 0644 nginx/flash-photo.conf /etc/nginx/sites-available/flash-photo.conf && sudo install -o root -g root -m 0644 systemd/flash-photo-cleanup.service systemd/flash-photo-cleanup.timer /etc/systemd/system/ && sudo systemctl daemon-reload && sudo nginx -t`。Cron 部署将最后两个 unit 安装命令替换为 `sudo install -o root -g root -m 0644 cron/flash-photo /etc/cron.d/flash-photo`，仍须执行 `sudo nginx -t`。
4. 初始化/迁移成功后原子切换：`sudo ln -sfn /var/www/flash-photo/releases/NEW_RELEASE /var/www/flash-photo/current.new && sudo mv -Tf /var/www/flash-photo/current.new /var/www/flash-photo/current`。
5. `sudo systemctl reload php8.2-fpm && sudo systemctl reload nginx`，确认实际调度器已启用，再做 health、上传、销毁和 cleanup 冒烟测试。
6. 仅代码回滚必须同时恢复匹配的 Nginx、systemd/Cron 外部副本；数据库发生不可逆迁移时必须按对应迁移说明或从一致性备份恢复，不能只切符号链接。

轮换机密：

```bash
sudo /usr/bin/php /var/www/flash-photo/current/scripts/rotate-secret.php --target=both --output=/etc/flash-photo.env
sudo /usr/bin/php /var/www/flash-photo/current/scripts/rotate-secret.php --target=both --output=/etc/flash-photo.env --apply
sudo systemctl restart php8.2-fpm
```

不带 `--apply` 只显示影响；应用会原子保留其他环境行、属主和权限，且不打印新 secret。轮换 `APP_SECRET` 会让现有 `first` 查看者绑定失效并重置文件限流键；轮换 `IP_HASH_SECRET` 会改变 IP/User-Agent 审计哈希并重置按 IP 的限流标识。二者都不会签名 PHP session；重启 FPM 本身也不等同于删除 session 文件。

### 常见故障

| 现象 | 检查与处理 |
| --- | --- |
| `database is locked` | 确认只有一个定时器；保持数据库/`-wal`/`-shm` 同一块本地磁盘且目录可写；避免 NFS；找长事务/备份锁。代码已设置 WAL、`BEGIN IMMEDIATE` 和 5 秒 timeout，持续锁通常是部署/磁盘问题。 |
| 上传提示过大或内存不足 | 应用同时限制源文件、处理后产物和像素数；FPM `upload_max_filesize` 不低于 `MAX_UPLOAD_BYTES`，`post_max_size` 与 Nginx `client_max_body_size` 还要为 multipart 开销留余量。若 GD 内存门禁拒绝图片，降低 `MAX_IMAGE_PIXELS`，或在核对 `pm.max_children` 与主机总内存后提高 `memory_limit`。修改后 reload FPM/Nginx。 |
| Nginx `413` | 当前 10 MiB 图片对应管理上传路由中的 11 MiB 请求体上限；提高业务文件上限时同步给 PHP/Nginx 留 multipart 余量，然后执行 `nginx -t && systemctl reload nginx`。 |
| `502` 或 FPM socket denied | `systemctl status php8.2-fpm`、`ls -l /run/php/flash-photo.sock`；Nginx/FPM 用户需能访问 `0660` socket，配置路径必须一致。 |
| 500、数据库/图片不可写 | `namei -l /var/lib/flash-photo/database.sqlite`，以 `www-data` 运行 `check-permissions.php`；目录应归 `www-data`、图片/DB `0600`，代码只读。磁盘满也会表现为写失败。 |
| 登录循环、没有 Secure cookie | 生产必须 HTTPS，`APP_URL` 必须是 `https://`，可使用示例的 `__Secure-flash_admin`；本地 HTTP 要设 `APP_ENV=development` 并改成 `flash_admin`。Cookie Path 是配置的 `ADMIN_PATH`，不可使用要求 Path=/ 的 `__Host-`。FPM 注入环境后需重启；检查反代是否正确传递 HTTPS。 |
| 客户 IP/限流异常 | 直连时 `TRUSTED_PROXIES` 留空。反代时仅列终止连接的精确可信代理，并让代理覆盖而非追加不可信 `X-Forwarded-For`；绝不信任 `0.0.0.0/0` 或 `::/0`。 |
| WebP/GD 重编码失败 | 检查 `gd_info()` 的格式支持；安装对应 GD 包或在充分理解元数据风险后设置 `REENCODE_UPLOADS=false`。 |
| cleanup 不运行 | `systemctl list-timers flash-photo-cleanup.timer`、`journalctl -u flash-photo-cleanup.service`；确认 environment file 可读、代码路径和 `ReadWritePaths` 正确。 |

## 管理面加固

Nginx 配置内管理 location 已给出注释模板：

- **固定 IP**：在上传与其余脚本两个管理 location 中同时加入相同的精确 `allow PUBLIC_IP; deny all;`。动态家庭 IP 变化会锁住管理员，保留 SSH/ECS 控制台回退。
- **Tailscale**：让管理设备和 ECS 加入同一 tailnet，在两个管理脚本 location 中同时只允许具体设备的 Tailscale IPv4/IPv6，优于放行整个 `100.64.0.0/10`。公网分享路由仍保持开放；若请求经 Tailscale 直达 Nginx，access rule 才能看到 tail 地址。配合 tailnet ACL、设备审批和密钥过期。
- **Basic Auth**：用 `htpasswd` 创建 `/etc/nginx/flash-photo.htpasswd`（`0640 root:www-data`），在两个管理脚本 location 中同时启用相同的 `auth_basic` 两行。它是 PHP 登录之外的第二道凭证，必须走 HTTPS且使用不同密码。
- **反向代理**：源 IP 限制只在 Nginx 看到真实可信地址时有效。若启用 Nginx `set_real_ip_from`，只列精确代理地址、要求代理覆盖客户端传入的 XFF，此时应用看到的 `REMOTE_ADDR` 已是客户端，`TRUSTED_PROXIES` 通常留空。若不让 Nginx改写地址，则把精确代理 IP/CIDR 写入 `TRUSTED_PROXIES`，由应用从 XFF 解析，但 Nginx 的 `allow` 只能看到代理。两种模式不要混淆；同时检查代理访问日志、缓存、URI 采样和 TLS 终止策略不会泄露 token。

## OSS 迁移设计

当前 `FileStorage` 是本地实现。迁移阿里云 OSS 时应先抽象 `store/resolve-or-stream/delete` 接口，再提供单一 OSS 后端；完成迁移后删除临时双读/双写路径，避免长期兼容层。

- Bucket 必须私有、禁止静态网站和公共 ACL，开启版本控制/生命周期需结合“销毁后不可恢复”的合规要求；使用 RAM 实例角色和最小权限，不把 AccessKey 写入仓库。
- 对象 key 使用服务端随机值，不含 token、原文件名或用户信息；数据库继续只存 token hash 和对象 key。开启 OSS SSE-KMS、访问审计和备份保留约束。
- 最强期限语义是 PHP 鉴权后从 OSS 流式代理内容。短期签名 URL 可能被日志、客户端或 CDN 保存，且很难做到精确 15/30 秒撤销；若采用签名 URL，其 TTL 必须不超过数据库剩余秒数、禁缓存，并接受签名在到期前可脱离 PHP 使用的弱化。
- 迁移时校验 MIME、字节数和校验和，暂停写入或做一次有界迁移切换；切换前演练删除、过期、失败重试和孤儿对象扫描。OSS 生命周期只做兜底，PHP/cleanup 仍是业务状态权威。

## 卸载

先撤销分享、停止写入并按需要做加密备份。按实际采用的调度方式执行下面两组命令之一，并确认正在运行的 cleanup 已退出。

systemd 部署：

```bash
sudo systemctl disable --now flash-photo-cleanup.timer
sudo systemctl stop flash-photo-cleanup.service
sudo rm -f /etc/systemd/system/flash-photo-cleanup.service /etc/systemd/system/flash-photo-cleanup.timer
```

Cron 部署：

```bash
sudo rm -f /etc/cron.d/flash-photo
while sudo pgrep -u www-data -f '/var/www/flash-photo/current/scripts/cleanup\.php' >/dev/null; do sleep 1; done
```

以下命令删除生产数据且不可从本机恢复，逐项确认精确路径后再执行：

```bash
sudo rm -f /etc/systemd/system/php8.2-fpm.service.d/flash-photo-env.conf
sudo rm -f /etc/php/8.2/fpm/pool.d/flash-photo.conf
sudo rm -f /etc/nginx/sites-enabled/flash-photo.conf /etc/nginx/sites-available/flash-photo.conf
sudo rm -f /etc/flash-photo.env
sudo rm -r --one-file-system /var/www/flash-photo
sudo rm -r --one-file-system /var/lib/flash-photo
sudo rm -r --one-file-system /var/log/flash-photo
sudo systemctl daemon-reload
sudo systemctl restart php8.2-fpm nginx
```

随后删除 DNS A/AAAA、收紧 ECS 安全组、撤销 Tailscale 节点/RAM 权限，并决定是否由 Certbot 删除证书：`sudo certbot delete --cert-name s.hanazargames.com`。备份、ECS 快照、OSS 版本和外部日志不会随上述命令删除，必须按各自保留策略单独处理。

## License

[MIT](LICENSE)
