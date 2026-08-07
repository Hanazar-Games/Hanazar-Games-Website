<?php

declare(strict_types=1);

namespace Hanazar\Chat;

final readonly class App
{
    public Database $database;
    public EventService $events;
    public PermissionService $permissions;
    public UserService $users;
    public RoomService $rooms;
    public MessageService $messages;
    public PresenceService $presence;
    public ShareService $shares;
    public RateLimiter $rateLimiter;
    public SessionManager $sessions;
    public Csrf $csrf;
    public Auth $auth;

    /** @param array<string, mixed> $sessionState */
    public function __construct(public Config $config, array &$sessionState)
    {
        $this->database = new Database($config);
        $this->database->initialize();
        $this->events = new EventService($this->database);
        $this->permissions = new PermissionService($this->database);
        $this->users = new UserService($this->database, $this->events);
        $this->rooms = new RoomService($this->database, $this->permissions, $this->events);
        $this->messages = new MessageService($this->database, $this->permissions, $this->events);
        $this->presence = new PresenceService($this->database, $this->events);
        $this->shares = new ShareService($this->database);
        $this->rateLimiter = new RateLimiter($config);
        $this->sessions = new SessionManager($config, $sessionState);
        $this->csrf = new Csrf($this->sessions);
        $this->auth = new Auth($this->database, $this->rateLimiter, $this->sessions, new AuditLogger($this->database), $config);
    }
}
