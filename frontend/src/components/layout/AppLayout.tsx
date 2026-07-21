import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

export default function AppLayout() {
  const { sidebarOpen } = useUIStore();

  useEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      useUIStore.setState({ sidebarOpen: false });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[rgb(var(--sse-canvas))] text-gray-900 transition-colors duration-200 dark:text-slate-100">
      <a href="#main-content" className="skip-link">Aller au contenu</a>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 start-0 z-40 h-full bg-sidebar shadow-2xl shadow-primary-950/15 transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
        style={{ width: '264px' }}
        aria-label="Navigation principale"
      >
        <Sidebar />
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => useUIStore.getState().toggleSidebar()}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div
        className={`transition-[margin] duration-200 ${sidebarOpen ? 'lg:ms-sidebar' : ''}`}
      >
        <Header />
        <main id="main-content" tabIndex={-1} className="min-h-screen px-4 pb-10 pt-20 sm:px-6 sm:pt-24 xl:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Chatbot */}
      <ChatbotWidget />
    </div>
  );
}
