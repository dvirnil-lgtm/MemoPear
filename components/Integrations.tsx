import React from 'react';

interface AvailableIntegration {
  name: string;
  icon: string;
  iconBg: string;
  description: string;
}

const AVAILABLE: AvailableIntegration[] = [
  {
    name: 'Email',
    icon: '✉️',
    iconBg: 'bg-indigo-600',
    description: 'Send every captured contact straight to your own inbox, formatted and ready to forward or import.',
  },
  {
    name: 'Google Sheets',
    icon: '📊',
    iconBg: 'bg-emerald-600',
    description: 'One tap creates a brand-new spreadsheet in your Google Drive with every contact you\'ve captured.',
  },
  {
    name: 'HubSpot CRM',
    icon: '🧡',
    iconBg: 'bg-orange-600',
    description: 'Connect your HubSpot account and push captured leads straight in as Contacts — matched and updated by email.',
  },
];

// Coming-soon CRMs. We don't have licensed logo artwork for these brands, so
// each gets a plain wordmark chip in a color that evokes the brand rather
// than a reproduction of its actual logo mark.
const COMING_SOON: { name: string; accent: string }[] = [
  { name: 'Salesforce', accent: '#00A1E0' },
  { name: 'monday.com', accent: '#FF3D57' },
  { name: 'Zoho CRM', accent: '#E42527' },
  { name: 'Pipedrive', accent: '#1A1A1A' },
  { name: 'Microsoft Dynamics', accent: '#0078D4' },
];

export const Integrations: React.FC<{
  onBack: () => void;
  isLoggedIn: boolean;
  hubspotConnected: boolean;
  onConnectHubspot: () => void;
}> = ({ onBack, isLoggedIn, hubspotConnected, onConnectHubspot }) => {
  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500 pb-32">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 hover:text-pear-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        Go Back
      </button>

      <p className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">Integrations</p>
      <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-pear-600 dark:text-pear-400">
        Your leads, wherever your team already works.
      </h1>
      <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mb-12 max-w-2xl">
        Capture once in MemoPear, then send every contact to the tools your team already lives in.
      </p>

      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Available now</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {AVAILABLE.map((item) => {
          const isHubspot = item.name === 'HubSpot CRM';
          return (
            <div key={item.name} className="glass p-6 rounded-[2rem] border border-slate-200 dark:border-white/10 flex flex-col">
              {isHubspot ? (
                <img src="/hubspot-logo.png" alt="HubSpot" className="w-12 h-12 rounded-2xl shadow-lg mb-4" />
              ) : (
                <div className={`w-12 h-12 rounded-2xl ${item.iconBg} text-white flex items-center justify-center text-xl shadow-lg mb-4`}>
                  {item.icon}
                </div>
              )}
              <h3 className="font-black text-lg mb-2">{item.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed flex-grow">{item.description}</p>
              <div className="mt-6">
                {isHubspot ? (
                  hubspotConnected ? (
                    <span className="text-[9px] font-black uppercase px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full">Connected</span>
                  ) : (
                    <button onClick={onConnectHubspot} className="text-[9px] font-black uppercase px-4 py-2 bg-pear-600 text-white rounded-xl shadow-lg hover:scale-105 transition-all">
                      {isLoggedIn ? 'Connect' : 'Log in to connect'}
                    </button>
                  )
                ) : (
                  <span className="text-[9px] font-black uppercase px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full">Available</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass p-8 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-white/10">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">More to come</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">We're actively building out CRM support — here's what's next.</p>
        <div className="flex flex-wrap gap-3">
          {COMING_SOON.map((crm) => (
            <div
              key={crm.name}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 grayscale opacity-70"
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: crm.accent }} />
              <span className="text-xs font-black tracking-tight">{crm.name}</span>
            </div>
          ))}
          <div className="flex items-center px-4 py-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-white/20 text-slate-400">
            <span className="text-xs font-black uppercase tracking-widest">+ more</span>
          </div>
        </div>
      </div>
    </div>
  );
};
