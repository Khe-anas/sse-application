import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Menu,
  Bell,
  LogOut,
  Globe,
  Moon,
  Sun,
  ChevronDown,
  CheckCheck,
  Inbox,
  Trash2,
  X,
  ArrowRight,
  Bot,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { changeLanguage, LANGUAGES } from '@/i18n';
import { useNotificationStore } from '@/stores/notificationStore';
import { API_BASE_URL } from '@/services/api';
import { authService } from '@/services/authService';
import { formatBackendShortDateTime } from '@/utils/date';
import type { Notification } from '@/types';

export default function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar, language, theme, toggleThemeForAccount, sidebarOpen, assistantOpen, toggleAssistant } = useUIStore();
  const { user, token, logout } = useAuthStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();
  const [langOpen, setLangOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const unreadReadyRef = useRef(false);
  const previousUnreadCountRef = useRef(0);
  const suppressNextUnreadPopupRef = useRef(false);

  const pageTitleKey = [
    ['/admin/users', 'navigation.users'],
    ['/admin/account-requests', 'navigation.accountRequests'],
    ['/admin/organismes', 'navigation.organismes'],
    ['/admin/evaluations', 'navigation.evaluations'],
    ['/admin/principes', 'navigation.principes'],
    ['/admin/reclamations', 'navigation.reclamations'],
    ['/admin/email-jobs', 'navigation.emailJobs'],
    ['/admin/notifications', 'navigation.notifications'],
    ['/admin/audit-logs', 'navigation.auditLogs'],
    ['/evaluateur/evaluations', 'navigation.evaluations'],
    ['/gouvernement/evaluations', 'navigation.evaluations'],
    ['/gouvernement/ranking', 'navigation.ranking'],
    ['/settings', 'navigation.settings'],
  ].find(([path]) => location.pathname.startsWith(path))?.[1] || 'navigation.dashboard';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    const refreshUnreadCount = () => {
      void fetchUnreadCount();
    };
    const refreshWhenVisible = () => {
      if (!document.hidden) {
        refreshUnreadCount();
      }
    };

    refreshUnreadCount();
    const interval = window.setInterval(refreshUnreadCount, 5000);
    window.addEventListener('focus', refreshUnreadCount);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshUnreadCount);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchUnreadCount, user]);

  useEffect(() => {
    if (!user) {
      unreadReadyRef.current = false;
      previousUnreadCountRef.current = 0;
      return;
    }

    if (!unreadReadyRef.current) {
      unreadReadyRef.current = true;
      previousUnreadCountRef.current = unreadCount;
      return;
    }

      if (unreadCount > previousUnreadCountRef.current) {
        if (suppressNextUnreadPopupRef.current) {
          suppressNextUnreadPopupRef.current = false;
        } else {
          playNotificationSound();
          toast.info(t('header.newNotification'), {
            description: t('header.newNotificationDesc'),
            duration: 6000,
          });
          void fetchNotifications();
        }
      }

    previousUnreadCountRef.current = unreadCount;
  }, [fetchNotifications, t, unreadCount, user]);

  useEffect(() => {
    if (!user || !token) return;

    const controller = new AbortController();
    let reconnectTimer: number | undefined;
    let stopped = false;

    const getNotificationTitleFromPayload = (notification: Partial<Notification>) => {
      if (language === 'ar') return notification.titleAr || notification.titleFr || t('header.newNotificationAr');
      if (language === 'en') return notification.titleEn || notification.titleFr || t('header.newNotificationEn');
      return notification.titleFr || t('header.newNotification');
    };

    const getNotificationMessageFromPayload = (notification: Partial<Notification>) => {
      if (language === 'ar') return notification.messageAr || notification.messageFr || t('header.newNotificationDescAr');
      if (language === 'en') return notification.messageEn || notification.messageFr || t('header.newNotificationDescEn');
      return notification.messageFr || t('header.newNotificationDesc');
    };

    const showLiveNotification = (notification: Partial<Notification>) => {
      suppressNextUnreadPopupRef.current = true;
      playNotificationSound();
      toast.info(getNotificationTitleFromPayload(notification), {
        description: getNotificationMessageFromPayload(notification),
        duration: 7000,
      });
      void fetchNotifications();
      void fetchUnreadCount();
    };

    const handleSseBlock = (block: string) => {
      const lines = block.trim().split(/\r?\n/);
      let eventName = 'message';
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }

      if (eventName !== 'notification' || dataLines.length === 0) {
        return;
      }

      try {
        showLiveNotification(JSON.parse(dataLines.join('\n')) as Partial<Notification>);
      } catch {
        showLiveNotification({});
      }
    };

    const connect = async () => {
      try {
        const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/notifications/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error('Notification stream unavailable');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() || '';
          blocks.forEach(handleSseBlock);
        }
      } catch {
        if (stopped || controller.signal.aborted) {
          return;
        }
      }

      if (!stopped) {
        reconnectTimer = window.setTimeout(connect, 5000);
      }
    };

    void connect();

    return () => {
      stopped = true;
      controller.abort();
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, [fetchNotifications, fetchUnreadCount, language, t, token, user]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  const handleLanguageChange = (code: string) => {
    changeLanguage(code);
    setLangOpen(false);
  };

  const openNotifications = () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      fetchNotifications();
    }
  };

  const getNotificationTitle = (notification: Notification) => {
    if (language === 'ar') return notification.titleAr || notification.titleFr;
    if (language === 'en') return notification.titleEn || notification.titleFr;
    return notification.titleFr;
  };

  const getNotificationMessage = (notification: Notification) => {
    if (language === 'ar') return notification.messageAr || notification.messageFr;
    if (language === 'en') return notification.messageEn || notification.messageFr;
    return notification.messageFr;
  };

  const formatNotificationDate = (date: string) => {
    return formatBackendShortDateTime(date, language);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    setNotificationsOpen(false);
    setSelectedNotification({ ...notification, isRead: true });
  };

  const handleDeleteNotification = async (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    await deleteNotification(id);
    if (selectedNotification?.id === id) {
      setSelectedNotification(null);
    }
  };

  const openSelectedNotificationLink = () => {
    if (!selectedNotification?.link) return;

    setSelectedNotification(null);
    navigate(selectedNotification.link);
  };

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext
        || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(980, audioContext.currentTime + 0.12);

      gain.gain.setValueAtTime(0.001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.22);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.24);
      oscillator.onended = () => {
        void audioContext.close();
      };
    } catch {
      // Some browsers block audio until the first user interaction.
    }
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 h-16 border-b bg-white/90 px-2 backdrop-blur-xl transition-[margin] duration-200 sm:px-4 dark:bg-[#132129]/90 ${sidebarOpen ? 'lg:ms-sidebar' : ''}`}
    >
      <div className="flex h-full items-center justify-between gap-4">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={toggleSidebar}
          className="icon-button border-0 bg-transparent shadow-none"
          title={t('navigation.dashboard')}
          aria-label={t('navigation.dashboard')}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-700 dark:text-primary-300">SSE · CNI</p>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t(pageTitleKey)}</h2>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 sm:gap-3">
        <button
          type="button"
          onClick={() => user && toggleThemeForAccount(user.id)}
          className="icon-button"
          title={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
          aria-label={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={toggleAssistant}
          aria-pressed={assistantOpen}
          aria-label={t('chatbot.title')}
          title={t('chatbot.title')}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
            assistantOpen
              ? 'border-primary-700 bg-primary-700 text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-primary-50 dark:border-slate-700 dark:bg-[#132129] dark:text-slate-200 dark:hover:bg-[#192a33]'
          }`}
        >
          <Bot className="h-4 w-4" />
        </button>

        {/* Language */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-gray-600 hover:bg-primary-50 dark:text-slate-200 dark:hover:bg-[#192a33]"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden text-sm font-medium md:inline">{LANGUAGES.find(l => l.code === language)?.name}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {langOpen && (
            <div className="absolute end-0 z-50 mt-2 w-44 rounded-xl border bg-white py-1.5 shadow-xl dark:bg-[#132129]">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="flex min-h-10 w-full items-center gap-2 px-4 py-2 text-start text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-200"
                >
                  <span>{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={openNotifications}
            className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label={t('navigation.notifications')}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute end-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-white shadow-xl dark:bg-[#132129]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{t('navigation.notifications')}</h3>
                  <p className="text-xs text-gray-500">{t('header.unreadCount', { count: unreadCount })}</p>
                </div>
                <button
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                  title={t('header.markAllRead')}
                >
                  <CheckCheck className="w-4 h-4" />
                  {t('header.markAllReadShort')}
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="p-6 text-center text-sm text-gray-500">{t('common.loading')}</div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    {t('header.notificationsEmpty')}
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start border-b border-gray-100 ${
                        notification.isRead ? 'bg-white' : 'bg-primary-50/60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-start hover:bg-gray-50"
                      >
                        <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                          notification.isRead ? 'bg-gray-300' : 'bg-primary-700'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">
                            {getNotificationTitle(notification)}
                          </p>
                          <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                            {getNotificationMessage(notification)}
                          </p>
                          <p className="mt-1.5 text-[11px] text-gray-400">
                            {formatNotificationDate(notification.createdAt)}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => handleDeleteNotification(event, notification.id)}
                        className="m-2 rounded p-2 text-gray-400 hover:bg-danger-50 hover:text-danger-600"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedNotification && (
            <div className="fixed end-4 top-20 z-[60] max-h-[calc(100vh-6rem)] w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-white shadow-2xl dark:bg-[#132129]">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-primary-700">
                    {t(`typeNotification.${selectedNotification.type}`)}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold leading-6 text-gray-900 break-words">
                    {getNotificationTitle(selectedNotification)}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatNotificationDate(selectedNotification.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                  title={t('common.close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                  {getNotificationMessage(selectedNotification)}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="btn-outline btn-sm"
                >
                  {t('common.close')}
                </button>
                {selectedNotification.link && (
                  <button
                    onClick={openSelectedNotificationLink}
                    className="btn-primary btn-sm gap-2"
                  >
                    {t('header.openPage')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white font-semibold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <ChevronDown className="w-3 h-3" />
          </button>
          {profileOpen && (
            <div className="absolute end-0 z-50 mt-2 w-56 rounded-xl border bg-white py-1.5 shadow-xl dark:bg-[#132129]">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex min-h-10 w-full items-center gap-2 px-4 py-2 text-start text-sm text-danger-600 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4" />
                {t('auth.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
