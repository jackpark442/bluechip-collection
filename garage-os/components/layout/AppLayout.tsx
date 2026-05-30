import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
