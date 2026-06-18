import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Skull, BookOpen, ScrollText, Sparkles, User, Shield, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { USER_ROLE_LABEL } from '@/types';

const navItems = [
  { to: '/', icon: Skull, label: '世界观规则' },
  { to: '/chapters', icon: BookOpen, label: '章节编辑' },
  { to: '/endings', icon: ScrollText, label: '结局看板' },
  { to: '/curse-flow', icon: TrendingUp, label: '诅咒值走向' },
];

export default function Layout() {
  const location = useLocation();
  const currentUserId = useAppStore((s) => s.currentUserId);
  const writers = useAppStore((s) => s.writers);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const currentUser = writers.find((w) => w.id === currentUserId) ?? writers[0];

  return (
    <div className="relative z-10 min-h-screen flex">
      <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col border-r border-ink-700/60 bg-ink-950/80 backdrop-blur-sm">
        <div className="px-5 py-6 border-b border-ink-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-sm bg-blood-700/40 border border-blood-600/60 flex items-center justify-center shadow-glow-blood-sm">
              <Sparkles className="w-4.5 h-4.5 text-blood-400 animate-breath" />
            </div>
            <div>
              <h1 className="font-display text-base text-ash-200 tracking-wider leading-tight">
                CURSED
              </h1>
              <p className="text-[10px] text-ash-600 font-body uppercase tracking-[0.15em]">
                Narrative Workbench
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 mb-2 text-[10px] font-body uppercase tracking-[0.18em] text-ash-600">
            工作台
          </div>
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive =
              (to === '/' && location.pathname === '/') ||
              (to !== '/' && location.pathname.startsWith(to));
            return (
              <NavLink key={to} to={to}>
                <div
                  className={`nav-item ${
                    isActive ? 'nav-item-active' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-ink-700/60">
          <div className="label-dark">当前身份</div>
          <select
            value={currentUserId}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="input-dark !py-1.5 !text-xs"
          >
            {writers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} · {USER_ROLE_LABEL[w.role]}
              </option>
            ))}
          </select>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-ash-500">
            {currentUser?.role === 'lead' ? (
              <Shield className="w-3.5 h-3.5 text-blood-500" />
            ) : (
              <User className="w-3.5 h-3.5 text-ash-500" />
            )}
            <span>
              {currentUser?.role === 'lead'
                ? '可编辑全部内容'
                : currentUser?.role === 'writer'
                  ? '仅可编辑分配章节'
                  : '只读模式'}
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
