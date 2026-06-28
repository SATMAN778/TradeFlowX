import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import Dashboard from './components/Dashboard';
import CaseDetails from './components/CaseDetails';
import TasksInbox from './components/TasksInbox';
import ActionHistory from './components/ActionHistory';
import AuditLog from './components/AuditLog';
import { RetentionDashboard } from './components/DocumentLifecycle';
import DataRegistry from './components/DataRegistry';
import { getMyTasks, getTradeOverview, type TradeOverview } from './services/casesService';
import {
  Package, LayoutDashboard, LogOut, Inbox, History,
  Ship, Globe, FileText, ShieldCheck, Activity,
  ChevronRight, User, Clock, Settings, Anchor, RefreshCw, Database
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SelectedCase {
  processKey: string;
  caseName: string;
}

interface SelectedInstance {
  instanceId: string;
  folderKey: string;
}

type ActiveView = 'dashboard' | 'inbox' | 'history' | 'audit' | 'retention' | 'registry';

// ─── Trade Stat Bar (live data) ───────────────────────────────────────────────

function useTradeOverview() {
  const [data, setData] = useState<TradeOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const overview = await getTradeOverview();
      setData(overview);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(() => fetch(true), 60000);
    return () => clearInterval(id);
  }, [fetch]);

  return { data, loading, refresh: () => fetch() };
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const dateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return <span>{dateStr} &bull; {timeStr} IST</span>;
}

function TradeStatBar() {
  const { data, loading, refresh } = useTradeOverview();

  // Summarise OFAC counts into a display label
  const ofacLabel = (() => {
    if (!data || !data.ofac || Object.keys(data.ofac).length === 0) return loading ? '…' : 'Enabled';
    const entries = Object.entries(data.ofac);
    if (entries.length === 1) return entries[0][0]; // e.g. "Clear"
    // e.g. "3 Clear · 1 Matched"
    return entries.map(([k, v]) => `${v} ${k}`).join(' · ');
  })();

  // Summarise ISF counts
  const isfLabel = (() => {
    if (!data || !data.isf || Object.keys(data.isf).length === 0) return loading ? '…' : 'Automated';
    const entries = Object.entries(data.isf);
    if (entries.length === 1) return entries[0][0];
    return entries.map(([k, v]) => `${v} ${k}`).join(' · ');
  })();

  // Routes to display — show up to 2, then "+N more"
  const routes = data?.routes ?? [];
  const displayRoutes = routes.slice(0, 2);
  const extraCount = routes.length - displayRoutes.length;

  // Active shipments
  const activeCount = data?.activeInstances ?? 0;

  return (
    <div className="trade-stat-bar">
      {/* Active shipments */}
      <div className="trade-stat-item">
        <Ship size={12} />
        {loading && !data ? (
          <span style={{ opacity: 0.5 }}>Loading…</span>
        ) : (
          <span>
            <strong>{activeCount}</strong> Active Shipment{activeCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="trade-stat-divider" />

      {/* Port routes — dynamic */}
      {displayRoutes.length > 0 ? (
        <>
          {displayRoutes.map((route, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="trade-stat-item">
                <Globe size={12} />
                <span>{route}</span>
              </div>
              {i < displayRoutes.length - 1 && <div className="trade-stat-divider" />}
            </span>
          ))}
          {extraCount > 0 && (
            <>
              <div className="trade-stat-divider" />
              <div className="trade-stat-item">
                <span style={{ fontStyle: 'italic' }}>+{extraCount} more route{extraCount !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="trade-stat-item">
          <Globe size={12} />
          <span style={{ opacity: loading ? 0.4 : 0.6 }}>
            {loading && !data ? 'Scanning routes…' : 'No active routes'}
          </span>
        </div>
      )}

      <div className="trade-stat-divider" />

      {/* OFAC */}
      <div className="trade-stat-item">
        <ShieldCheck size={12} />
        <span>OFAC: <strong>{ofacLabel}</strong></span>
      </div>

      <div className="trade-stat-divider" />

      {/* ISF */}
      <div className="trade-stat-item">
        <FileText size={12} />
        <span>ISF: <strong>{isfLabel}</strong></span>
      </div>

      <div className="trade-stat-divider" />

      {/* Clock */}
      <div className="trade-stat-item">
        <Clock size={12} />
        <LiveClock />
      </div>

      {/* Refresh button */}
      <button
        onClick={refresh}
        title="Refresh trade stats"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', marginLeft: 'auto', opacity: 0.5, transition: 'opacity 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
      >
        <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
      </button>
    </div>
  );
}

// ─── Top Header ──────────────────────────────────────────────────────────────

// ─── Top Header ──────────────────────────────────────────────────────────────
 
function TopHeader() {
  const { logout, activeRole, switchRole, userName } = useAuth();
  
  const rolesList = [
    { id: 'admin', name: 'System Admin', color: 'var(--accent-primary)' },
    { id: 'manager', name: 'Compliance Mgr', color: '#c2410c' },
    { id: 'reviewer_customs', name: 'Customs Specialist', color: '#0369a1' },
    { id: 'reviewer_freight_forwarder', name: 'Freight Forwarder', color: '#0d9488' },
    { id: 'reviewer_shipper', name: 'Shipper Ops', color: '#4f46e5' }
  ];

  const currentRole = rolesList.find(r => r.id === activeRole) || rolesList[0];

  return (
    <header className="top-header">
      <div className="top-header-logo">
        <div className="top-header-logo-icon">
          <Anchor size={18} color="white" />
        </div>
        <span className="top-header-brand">
          Trade<span>Flow</span> Portal
        </span>
      </div>

      <div className="top-header-divider" />
      <span className="top-header-tagline">Global Import &amp; Customs Intelligence Platform</span>

      <div className="top-header-right">
        {/* Active Role Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.06)', padding: '4px 8px 4px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Active Role:</span>
          <select
            value={activeRole}
            onChange={(e) => switchRole(e.target.value as any)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              paddingRight: '4px',
            }}
          >
            {rolesList.map(r => (
              <option key={r.id} value={r.id} style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)' }}>
                {r.name}
              </option>
            ))}
          </select>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: currentRole.color, marginLeft: '2px' }} />
        </div>

        <div className="top-header-trade-pill">
          <span className="dot" />
          UAE–USA Cross-Border
        </div>
        <div className="top-header-user">
          <User size={14} />
          <span>{userName || 'Operator Portal'}</span>
        </div>
        <button
          onClick={logout}
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', transition: 'background 0.2s' }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </header>
  );
}

// ─── App Footer ───────────────────────────────────────────────────────────────

function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="app-footer-top">
        <div className="app-footer-col">
          <h4>TradeFlow Portal</h4>
          <p>
            An intelligent Maestro-powered platform for UAE-to-USA cross-border shipment
            clearance, OFAC compliance screening, ISF filing automation, and CBP release
            management — built on UiPath Case Management.
          </p>
        </div>
        <div className="app-footer-col">
          <h4>Trade Workflow</h4>
          <ul>
            <li>PO Intake &amp; Validation</li>
            <li>Document Extraction (AI)</li>
            <li>HTS Code Classification</li>
            <li>ISF Filing Automation</li>
            <li>CBP Release Tracking</li>
          </ul>
        </div>
        <div className="app-footer-col">
          <h4>Compliance</h4>
          <ul>
            <li>OFAC Screening</li>
            <li>Customs Duty Calculation</li>
            <li>Entry Type Selection</li>
            <li>Importer of Record</li>
            <li>Audit &amp; Reporting</li>
          </ul>
        </div>
        <div className="app-footer-col">
          <h4>System</h4>
          <ul>
            <li>UiPath Orchestrator</li>
            <li>Maestro Case Engine</li>
            <li>Human-in-the-Loop</li>
            <li>Action Center Tasks</li>
            <li>Data Fabric Storage</li>
          </ul>
        </div>
      </div>
      <div className="app-footer-bottom">
        <span>
          &copy; {year} <span className="footer-gold">TradeFlow Portal</span> &mdash; Powered by UiPath Maestro &amp; Python Intelligence Layer
        </span>
        <div className="app-footer-bottom-links">
          <span>Customs &amp; Border Protection</span>
          <span>|</span>
          <span>OFAC Compliance</span>
          <span>|</span>
          <span>ISF 10+2 Filing</span>
          <span>|</span>
          <span>UAE–USA FTA</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Breadcrumb Bar ───────────────────────────────────────────────────────────

interface BreadcrumbBarProps {
  items: { label: string; onClick?: () => void }[];
}

function BreadcrumbBar({ items }: BreadcrumbBarProps) {
  return (
    <nav className="breadcrumb-bar">
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {i > 0 && <ChevronRight size={13} className="sep" />}
          {item.onClick ? (
            <button onClick={item.onClick}>{item.label}</button>
          ) : (
            <span className="current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  isOnDashboard: boolean;
  isOnInbox: boolean;
  isOnHistory: boolean;
  isOnAudit: boolean;
  isOnRetention: boolean;
  isOnRegistry: boolean;
  selectedCase: SelectedCase | null;
  selectedInstance: SelectedInstance | null;
  pendingTaskCount: number;
  onDashboard: () => void;
  onInbox: () => void;
  onHistory: () => void;
  onAudit: () => void;
  onRetention: () => void;
  onRegistry: () => void;
  onBackToInstances: () => void;
}

function Sidebar({
  isOnDashboard, isOnInbox, isOnHistory, isOnAudit, isOnRetention, isOnRegistry, selectedCase, selectedInstance,
  pendingTaskCount, onDashboard, onInbox, onHistory, onAudit, onRetention, onRegistry, onBackToInstances
}: SidebarProps) {
  const { activeRole } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand block */}
      <div className="sidebar-brand" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
        <div className="sidebar-brand-logo">
          <div className="sidebar-brand-icon">
            <Ship size={18} color="white" />
          </div>
          <div>
            <div className="sidebar-brand-name">TradeFlow Portal</div>
            <div className="sidebar-brand-sub">Case Management Portal</div>
          </div>
        </div>

        {/* Active Role Indicator in Sidebar */}
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: '6px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.78rem'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background:
              activeRole === 'admin' ? 'var(--accent-primary)' :
              activeRole === 'manager' ? '#c2410c' :
              activeRole === 'reviewer_customs' ? '#0369a1' :
              activeRole === 'reviewer_freight_forwarder' ? '#0d9488' : '#4f46e5',
            flexShrink: 0
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {
                activeRole === 'admin' ? 'System Administrator' :
                activeRole === 'manager' ? 'Compliance Manager' :
                activeRole === 'reviewer_customs' ? 'Customs Specialist' :
                activeRole === 'reviewer_freight_forwarder' ? 'Freight Forwarder' : 'Shipper Operations'
              }
            </span>
            <span className="text-secondary" style={{ fontSize: '0.7rem', marginTop: '1px' }}>Active Workspace</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-section-label">Operations</div>

        <button
          className={`sidebar-nav-item ${isOnDashboard ? 'active' : ''}`}
          onClick={onDashboard}
        >
          <LayoutDashboard size={17} />
          Command Center
        </button>

        <button
          className={`sidebar-nav-item ${isOnInbox ? 'active' : ''}`}
          onClick={onInbox}
          style={{ justifyContent: 'flex-start' }}
        >
          <Inbox size={17} />
          <span style={{ flex: 1, textAlign: 'left' }}>Tasks Inbox</span>
          {pendingTaskCount > 0 && (
            <span className="nav-badge">{pendingTaskCount > 99 ? '99+' : pendingTaskCount}</span>
          )}
        </button>

        <button
          className={`sidebar-nav-item ${isOnHistory ? 'active' : ''}`}
          onClick={onHistory}
          style={{ justifyContent: 'flex-start' }}
        >
          <History size={17} />
          <span style={{ flex: 1, textAlign: 'left' }}>Action History</span>
        </button>

        <button
          className={`sidebar-nav-item ${isOnRegistry ? 'active' : ''}`}
          onClick={onRegistry}
          style={{ justifyContent: 'flex-start' }}
        >
          <Database size={17} />
          <span style={{ flex: 1, textAlign: 'left' }}>Data Fabric Registry</span>
        </button>

        <div className="sidebar-nav-section-label" style={{ marginTop: '12px' }}>Compliance &amp; Audit</div>

        <button
          className={`sidebar-nav-item ${isOnAudit ? 'active' : ''}`}
          onClick={onAudit}
          style={{ justifyContent: 'flex-start' }}
        >
          <ShieldCheck size={17} />
          <span style={{ flex: 1, textAlign: 'left' }}>Compliance Audit</span>
        </button>

        {activeRole === 'admin' && (
          <button
            className={`sidebar-nav-item ${isOnRetention ? 'active' : ''}`}
            onClick={onRetention}
            style={{ justifyContent: 'flex-start' }}
          >
            <Clock size={17} />
            <span style={{ flex: 1, textAlign: 'left' }}>Document Retention</span>
          </button>
        )}

        {/* Case breadcrumb nav items */}
        {selectedCase && (
          <>
            <div className="sidebar-nav-section-label" style={{ marginTop: '12px' }}>Active Case</div>
            <button
              className={`sidebar-nav-item ${selectedCase && !selectedInstance ? 'active' : ''}`}
              onClick={onBackToInstances}
            >
              <Package size={17} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                {selectedCase.caseName}
              </span>
            </button>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-info">
          <p>
            <strong>Maestro Engine</strong><br />
            UiPath Process Automation<br />
            v1.0 &mdash; Trade Intelligence
          </p>
        </div>
        <button className="sidebar-nav-item" style={{ opacity: 0.7 }}>
          <Settings size={16} /> Settings
        </button>
      </div>
    </aside>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────

function MainLayout() {
  const [selectedCase, setSelectedCase] = useState<SelectedCase | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<SelectedInstance | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [pendingTaskCount, setPendingTaskCount] = useState<number>(0);

  const refreshTaskCount = useCallback(async () => {
    try {
      const tasks = await getMyTasks();
      setPendingTaskCount(tasks.length);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    refreshTaskCount();
    const interval = setInterval(refreshTaskCount, 30000);
    return () => clearInterval(interval);
  }, [refreshTaskCount]);

  const handleBackToDashboard = () => {
    setSelectedInstance(null);
    setSelectedCase(null);
    setActiveView('dashboard');
  };

  const handleBackToInstances = () => setSelectedInstance(null);

  const handleOpenInbox = () => {
    setActiveView('inbox');
    setSelectedCase(null);
    setSelectedInstance(null);
  };

  const handleOpenDashboard = () => {
    setActiveView('dashboard');
    setSelectedCase(null);
    setSelectedInstance(null);
  };

  const handleOpenHistory = () => {
    setActiveView('history');
    setSelectedCase(null);
    setSelectedInstance(null);
  };

  const handleOpenAudit = () => {
    setActiveView('audit');
    setSelectedCase(null);
    setSelectedInstance(null);
  };

  const handleOpenRetention = () => {
    setActiveView('retention');
    setSelectedCase(null);
    setSelectedInstance(null);
  };

  const handleOpenRegistry = () => {
    setActiveView('registry');
    setSelectedCase(null);
    setSelectedInstance(null);
  };

  const isOnDashboard = activeView === 'dashboard' && !selectedCase;
  const isOnInbox = activeView === 'inbox';
  const isOnHistory = activeView === 'history';
  const isOnAudit = activeView === 'audit';
  const isOnRegistry = activeView === 'registry';

  // Build breadcrumbs
  const breadcrumbs: { label: string; onClick?: () => void }[] = [
    { label: 'Command Center', onClick: activeView !== 'dashboard' || selectedCase ? handleBackToDashboard : undefined },
  ];
  if (isOnInbox) breadcrumbs.push({ label: 'Tasks Inbox' });
  if (isOnHistory) breadcrumbs.push({ label: 'Action History' });
  if (isOnAudit) breadcrumbs.push({ label: 'Compliance Audit' });
  if (activeView === 'retention') breadcrumbs.push({ label: 'Document Retention' });
  if (isOnRegistry) breadcrumbs.push({ label: 'Data Fabric Registry' });
  if (selectedCase) {
    breadcrumbs.push({ label: selectedCase.caseName, onClick: selectedInstance ? handleBackToInstances : undefined });
  }
  if (selectedInstance) breadcrumbs.push({ label: `Instance ${selectedInstance.instanceId.substring(0, 8)}` });

  return (
    <div className="page-shell">
      <TopHeader />

      <div className="app-container">
        <Sidebar
          isOnDashboard={isOnDashboard}
          isOnInbox={isOnInbox}
          isOnHistory={isOnHistory}
          isOnAudit={isOnAudit}
          isOnRetention={activeView === 'retention'}
          isOnRegistry={isOnRegistry}
          selectedCase={selectedCase}
          selectedInstance={selectedInstance}
          pendingTaskCount={pendingTaskCount}
          onDashboard={handleOpenDashboard}
          onInbox={handleOpenInbox}
          onHistory={handleOpenHistory}
          onAudit={handleOpenAudit}
          onRetention={handleOpenRetention}
          onRegistry={handleOpenRegistry}
          onBackToInstances={handleBackToInstances}
        />

        <div className="main-content">
          <TradeStatBar />
          <BreadcrumbBar items={breadcrumbs} />

          <div className="main-content-inner animate-fade-in">
            {isOnInbox && <TasksInbox onTaskCountChange={setPendingTaskCount} />}
            {isOnHistory && <ActionHistory />}
            {isOnAudit && <AuditLog />}
            {activeView === 'retention' && <RetentionDashboard />}
            {isOnRegistry && (
              <DataRegistry
                onInspectCase={(instId, fKey) => {
                  setSelectedCase({ processKey: 'maestro-app', caseName: 'Shipment Detail' });
                  setSelectedInstance({ instanceId: instId, folderKey: fKey });
                  setActiveView('dashboard');
                }}
              />
            )}

            {!isOnInbox && !isOnHistory && !isOnAudit && !isOnRegistry && activeView !== 'retention' && (
              <>
                {!selectedCase ? (
                  <Dashboard
                    onSelectCase={(processKey, caseName) => {
                      setSelectedCase({ processKey, caseName });
                      setActiveView('dashboard');
                    }}
                    onOpenInbox={handleOpenInbox}
                  />
                ) : !selectedInstance ? (
                  <CaseInstancesPanel
                    caseName={selectedCase.caseName}
                    processKey={selectedCase.processKey}
                    onBackToDashboard={handleBackToDashboard}
                    onSelectInstance={(instanceId, folderKey) => setSelectedInstance({ instanceId, folderKey })}
                  />
                ) : (
                  <CaseDetails
                    caseInstanceId={selectedInstance.instanceId}
                    folderKey={selectedInstance.folderKey}
                    onBack={handleBackToInstances}
                  />
                )}
              </>
            )}
          </div>

          <AppFooter />
        </div>
      </div>
    </div>
  );
}

// ─── Case Instances Panel ─────────────────────────────────────────────────────

import { getCaseInstances } from './services/casesService';
import type { CaseInstance } from './types/cases';

interface CaseInstancesPanelProps {
  caseName: string;
  processKey: string;
  onBackToDashboard: () => void;
  onSelectInstance: (id: string, folder: string) => void;
}

function CaseInstancesPanel({ caseName, processKey, onBackToDashboard, onSelectInstance }: CaseInstancesPanelProps) {
  const [instances, setInstances] = useState<CaseInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCaseInstances(processKey);
      setInstances(data);
    } catch {
      setError('Failed to load case instances');
    } finally {
      setIsLoading(false);
    }
  }, [processKey]);

  useEffect(() => { loadInstances(); }, [loadInstances]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="section-heading">
            <div className="section-heading-icon">
              <Package size={17} />
            </div>
            <h1 style={{ fontSize: '1.6rem' }}>{caseName}</h1>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px', marginLeft: '42px' }}>
            Select an active case execution instance to inspect and manage.
          </p>
        </div>
        <button onClick={onBackToDashboard} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
          ← Back
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem' }}>Execution Instances</h3>
          <span className="text-secondary" style={{ fontSize: '0.82rem' }}>{instances.length} instance(s)</span>
        </div>

        {isLoading && <div className="text-secondary" style={{ padding: '20px', textAlign: 'center' }}>Loading instances…</div>}
        {error && <div style={{ color: 'var(--danger)', padding: '20px', textAlign: 'center' }}>{error}</div>}
        {!isLoading && !error && instances.length === 0 && (
          <div className="text-secondary" style={{ padding: '20px', textAlign: 'center' }}>No active instances found for this case.</div>
        )}

        {!isLoading && !error && instances.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px', fontWeight: 500 }}>Instance ID</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Started At</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '12px', fontWeight: 500 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((inst) => (
                <tr key={inst.instanceId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {inst.id || inst.instanceId.substring(0, 8)}
                  </td>
                  <td style={{ padding: '16px 12px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} /> {inst.startedAt}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <span className={`status-badge ${
                      inst.status.toLowerCase() === 'inprogress' || inst.status.toLowerCase() === 'running'
                        ? 'status-info' : inst.status.toLowerCase() === 'completed'
                        ? 'status-success' : 'status-danger'
                    }`}>
                      {inst.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => onSelectInstance(inst.instanceId, inst.folderKey)}
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── App Content ──────────────────────────────────────────────────────────────

import { CodedActionApp } from '@uipath/coded-action-app';
import EmbeddedTaskView from './components/EmbeddedTaskView';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [embeddedTask, setEmbeddedTask] = useState<any>(null);
  const [detectingEmbedded, setDetectingEmbedded] = useState(true);

  useEffect(() => {
    async function detect() {
      // Check if we are running in an iframe
      if (window.self !== window.top) {
        try {
          const service = new CodedActionApp();
          // Wait up to 1.5 seconds for Action Center to respond
          const task = await Promise.race([
            service.getTask(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500))
          ]);
          console.log("Coded Action App detected:", task);
          setIsEmbedded(true);
          setEmbeddedTask(task);
        } catch (e) {
          console.log("Not running inside UiPath Action Center iframe or detection timed out:", e);
        }
      }
      setDetectingEmbedded(false);
    }
    detect();
  }, []);

  if (detectingEmbedded || isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={28} className="text-gradient animate-spin" />
          <span className="text-secondary" style={{ fontWeight: 500 }}>Initializing TradeFlow Portal…</span>
        </div>
      </div>
    );
  }

  if (isEmbedded && embeddedTask) {
    return <EmbeddedTaskView initialTask={embeddedTask} />;
  }

  return (
    <Routes>
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="/*" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
