import { Outlet } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

export default function AppLayout() {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full bg-sidebar transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: '280px' }}
      >
        <Sidebar />
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => useUIStore.getState().toggleSidebar()}
        />
      )}

      {/* Main content */}
      <div
        className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-sidebar' : ''}`}
      >
        <Header />
        <main className="min-h-screen p-4 pt-20 sm:p-6 sm:pt-20">
          <Outlet />
        </main>
      </div>

      {/* Chatbot */}
      <ChatbotWidget />
    </div>
  );
}
