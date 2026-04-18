import React from 'react';

export const PrivacyPolicy: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="p-8 max-w-3xl mx-auto animate-in fade-in duration-500 pb-32">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 hover:text-pear-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        Go Back
      </button>
      <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-pear-600 dark:text-pear-400">Privacy Policy</h1>
      <p className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest">Effective Date: April 18, 2026</p>
      
      <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
        <p>At Memopear, we value your privacy. This policy explains what information we collect, how we use it, and your rights regarding your data. By using our app, you agree to the practices described below.</p>
        
        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">1. Information We Collect</h2>
          <p className="mb-4">We only collect information that is necessary to provide you with a great experience:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account Information:</strong> Your email address and name when you register.</li>
            <li><strong>User Content:</strong> The notes, memos, or data you voluntarily input into the app.</li>
            <li><strong>Usage Data:</strong> Technical information such as your device type, operating system, and how you interact with our app features to help us improve performance.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">2. How We Use Your Information</h2>
          <p className="mb-4">We use your data to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve Memopear features.</li>
            <li>Manage your subscription and process payments.</li>
            <li>Communicate with you regarding updates, support, or account-related notifications.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">3. Data Sharing and Security</h2>
          <p>We do not sell your personal information to third parties. We only share data with trusted service providers (like payment processors or cloud hosting) necessary to run the app. We use industry-standard encryption to protect your data from unauthorized access.</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">4. Your Rights and Data Deletion</h2>
          <p>You have the right to access, update, or delete your personal information at any time. If you wish to delete your account and all associated data, please contact us at the email address below.</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">5. Third-Party Services</h2>
          <p>Our app may use third-party services (such as Google AI tools or payment gateways). These services have their own privacy policies, and we encourage you to review them.</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">6. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy within the app or via email.</p>
        </section>

        <section className="p-8 bg-slate-100 dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">Contact Us</h2>
          <p>If you have any questions about this Privacy Policy or our data practices, please reach out to:</p>
          <p className="font-bold text-pear-600 mt-2">Email: info@memopear.com</p>
        </section>
      </div>
    </div>
  );
};

export const TermsAndConditions: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="p-8 max-w-3xl mx-auto animate-in fade-in duration-500 pb-32">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 hover:text-pear-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        Go Back
      </button>
      <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter text-pear-600 dark:text-pear-400">Terms & Conditions</h1>
      <p className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest">Last Updated: April 2026</p>
      
      <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
        <p>Welcome to Memopear. By using our app, you agree to the following terms. We’ve kept them short and easy to understand.</p>
        
        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">1. Our Service</h2>
          <p>Memopear provides digital services and tools as described within the app. While we strive for perfection, the service is provided on an "as is" and "as available" basis.</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">2. User Responsibilities</h2>
          <p>You agree to use Memopear for lawful purposes only. You are responsible for maintaining the security of your account credentials.</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">3. Subscriptions and Billing</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Subscription fees are billed in advance on a recurring basis (monthly or annually).</li>
            <li>By subscribing, you authorize us to charge the payment method on file for the renewal term.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">4. Cancellation & Refund Policy</h2>
          <p className="mb-4">We believe in a straightforward process for our users:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>How to Cancel:</strong> To stop your subscription, simply email us at <strong>info@memopear.com</strong>.</li>
            <li><strong>Processing:</strong> Once we receive your email, we will process your request and stop future billing.</li>
            <li><strong>Refunds:</strong> We do not offer partial refunds for the remaining days of a month. You will retain access to your premium features until the end of your current paid billing cycle.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">5. Data & Privacy</h2>
          <p>Your privacy matters. We handle your data according to our Privacy Policy and do not sell your personal information. You retain ownership of the content you create within the app.</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">6. Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.</p>
        </section>

        <section className="p-8 bg-slate-100 dark:bg-white/5 rounded-[2rem] border border-slate-200 dark:border-white/10">
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">Contact Us</h2>
          <p>For support, feedback, or cancellation requests, please contact:</p>
          <p className="font-bold text-pear-600 mt-2">Email: info@memopear.com</p>
        </section>
      </div>
    </div>
  );
};

export const ContactUs: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="p-8 max-w-2xl mx-auto animate-in fade-in duration-500 pb-32">
      <button onClick={onBack} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest mb-8 hover:text-pear-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        Go Back
      </button>
      <h1 className="text-5xl font-black mb-4 tracking-tighter text-pear-600 dark:text-pear-400">Contact Us</h1>
      <p className="text-sm font-medium text-slate-500 mb-12 leading-relaxed">Have questions about MemoPear? Our team of command officers is standing by to assist with your field operations.</p>
      
      <div className="space-y-6">
        <a href="mailto:info@memopear.com" className="block glass p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/10 hover:border-pear-500/50 transition-all group shadow-xl">
          <div className="w-16 h-16 bg-pear-600 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Strategic Intelligence</h3>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Operations Support</p>
          <p className="text-2xl font-black text-pear-600">info@memopear.com</p>
        </a>

        <div className="glass p-10 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl">
          <h3 className="text-xl font-black mb-4 uppercase tracking-tight">Response Time</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">Our command center typically responds within 24 operational hours. For urgent billing issues, please include "PRIORITY" in your subject line.</p>
        </div>
      </div>
    </div>
  );
};
