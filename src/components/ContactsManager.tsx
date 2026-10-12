import React, { useState } from 'react';
import {
  Phone,
  MessageSquare,
  MessageCircle,
  Search,
  Plus,
  Star,
  User,
  Clock,
  ExternalLink,
  Check,
  X,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Send,
  Building,
  UserCheck,
} from 'lucide-react';
import { Contact } from '../types/assistant.ts';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'contact-1',
    name: 'Zubair Khan',
    nickname: 'Cheetah',
    role: 'Chief Operations Officer (COO)',
    phone: '+923001234567',
    whatsappNumber: '923001234567',
    email: 'zubair.khan@enterprise.pk',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    favorite: true,
    notes: 'Handles real-time ground execution and supply chain. Known as "Cheetah" for rapid dispatch.',
  },
  {
    id: 'contact-2',
    name: 'Kamran Siddiqui',
    nickname: 'Kaptaan',
    role: 'Board Chairman & Lead Investor',
    phone: '+923219876543',
    whatsappNumber: '923219876543',
    email: 'k.siddiqui@venturecapital.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    favorite: true,
    notes: 'Prefers crisp executive bullet points. Known as "Kaptaan".',
  },
  {
    id: 'contact-3',
    name: 'Sara Al-Mansoor',
    nickname: 'Sara CFO',
    role: 'Chief Financial Officer',
    phone: '+971501234987',
    whatsappNumber: '971501234987',
    email: 'sara.mansoor@gulfholding.ae',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    favorite: true,
    notes: 'Oversees treasury and capital allocation across Dubai and Singapore.',
  },
  {
    id: 'contact-4',
    name: 'Dr. Daniyal Ahmed',
    nickname: 'Doctor Sahab',
    role: 'Personal Physician & Wellness Advisor',
    phone: '+923335551212',
    whatsappNumber: '923335551212',
    email: 'dr.daniyal@mediclinic.org',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
    favorite: false,
    notes: 'Monitors HRV telemetry, bio-buffers and sleep recovery metrics.',
  },
  {
    id: 'contact-5',
    name: 'Fatima Tariq',
    nickname: 'Fatima Legal',
    role: 'General Counsel & VP Legal',
    phone: '+923458889900',
    whatsappNumber: '923458889900',
    email: 'fatima.t@lawgroup.com',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    favorite: false,
    notes: 'Reviews board resolutions and client cross-border contracts.',
  },
  {
    id: 'contact-6',
    name: 'Asad Malik',
    nickname: 'Chote / Driver',
    role: 'Executive Logistics & Chauffeur',
    phone: '+923124445566',
    whatsappNumber: '923124445566',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
    favorite: false,
    notes: 'Manages airport pick-and-drop and Tesla fleet maintenance.',
  },
];

interface ContactsManagerProps {
  contacts: Contact[];
  onAddContact?: (contact: Contact) => void;
  activeCall: { contact: Contact; startTime: number } | null;
  onInitiateCall: (contact: Contact) => void;
  onEndCall: () => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  contacts,
  onAddContact,
  activeCall,
  onInitiateCall,
  onEndCall,
}) => {
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Contact form
  const [newName, setNewName] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Call duration counter
  const [callDuration, setCallDuration] = useState(0);
  const [isCallMuted, setIsCallMuted] = useState(false);

  React.useEffect(() => {
    let timer: any;
    if (activeCall) {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeCall]);

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.nickname && c.nickname.toLowerCase().includes(q)) ||
      c.role.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  const handleOpenComposer = (contact: Contact, type: 'whatsapp' | 'sms') => {
    setSelectedContact(contact);
    setComposerType(type);
    setWhatsappMessage(
      type === 'whatsapp'
        ? `Salam ${contact.nickname || contact.name.split(' ')[0]}, meeting schedule updated on AURA.`
        : `AURA Notification: Please check board notes when free.`
    );
    setIsComposerOpen(true);
  };

  const handleSendDispatch = () => {
    if (!selectedContact) return;
    const cleanPhone = selectedContact.whatsappNumber.replace(/[^0-9]/g, '');

    if (composerType === 'whatsapp') {
      const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(
        whatsappMessage
      )}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const smsUrl = `sms:${selectedContact.phone}?body=${encodeURIComponent(whatsappMessage)}`;
      window.location.href = smsUrl;
    }
    setIsComposerOpen(false);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newContact: Contact = {
      id: `contact-${Date.now()}`,
      name: newName.trim(),
      nickname: newNickname.trim() || undefined,
      role: newRole.trim() || 'Executive Associate',
      phone: newPhone.trim(),
      whatsappNumber: newPhone.replace(/[^0-9]/g, ''),
      favorite: false,
    };

    onAddContact?.(newContact);
    setIsAddModalOpen(false);
    setNewName('');
    setNewNickname('');
    setNewRole('');
    setNewPhone('');
  };

  return (
    <div className="space-y-6">
      
      {/* Active Call Simulation Banner */}
      {activeCall && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/50 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-800 border-2 border-emerald-400">
                {activeCall.contact.avatar ? (
                  <img
                    src={activeCall.contact.avatar}
                    alt={activeCall.contact.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-400">
                    <User className="w-7 h-7" />
                  </div>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-500 text-emerald-300">
                  CELLULAR ACTIVE
                </span>
                <span className="text-xs font-mono text-emerald-400">{formatCallTime(callDuration)}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {activeCall.contact.name} {activeCall.contact.nickname && `("${activeCall.contact.nickname}")`}
              </h3>
              <p className="text-xs text-slate-300">{activeCall.contact.role} • {activeCall.contact.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCallMuted(!isCallMuted)}
              className={`p-3 rounded-2xl border transition-colors ${
                isCallMuted
                  ? 'bg-rose-950/60 border-rose-500 text-rose-400'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title={isCallMuted ? 'Unmute' : 'Mute Microphone'}
            >
              {isCallMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={onEndCall}
              className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 uppercase tracking-wider">
              TELEPHONY & WHATSAPP DISPATCH
            </span>
            <span className="text-xs text-slate-400">{contacts.length} Contacts Synced</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1.5">Executive Directory & Fast Comms</h2>
          <p className="text-xs text-slate-400 mt-1">
            Voice-directed phone calls, WhatsApp messages, and custom executive nicknames ("Cheetah", "Kaptaan").
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, nickname, role..."
              className="pl-9 pr-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      {/* Quick Voice Directives Guidance */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-white">Voice Directives Ready: </span>
          Say <span className="text-emerald-300 font-mono">"AURA, Cheetah ko call milao"</span>,{' '}
          <span className="text-emerald-300 font-mono">"Send WhatsApp to Kaptaan: Meeting set ho gayi hai"</span>, or{' '}
          <span className="text-emerald-300 font-mono">"Call Sara CFO"</span>. AURA resolves aliases instantly!
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-lg flex flex-col justify-between transition-all group"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                    {contact.avatar ? (
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{contact.name}</span>
                      {contact.favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />}
                    </h4>
                    <p className="text-xs text-slate-400">{contact.role}</p>
                  </div>
                </div>

                {contact.nickname && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                    "{contact.nickname}"
                  </span>
                )}
              </div>

              {contact.notes && (
                <p className="text-[11px] text-slate-400 mt-3 line-clamp-2 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                  {contact.notes}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs font-mono text-slate-400">
                <Phone className="w-3 h-3 text-emerald-400" />
                <span>{contact.phone}</span>
              </div>
            </div>

            {/* Action Buttons: WhatsApp & Cellular Call */}
            <div className="mt-5 grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80">
              <button
                onClick={() => onInitiateCall(contact)}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-emerald-950/40 hover:border-emerald-500/50 border border-slate-700 text-slate-200 hover:text-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                title="Cellular Mobile Call"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Call Now</span>
              </button>

              <button
                onClick={() => handleOpenComposer(contact, 'whatsapp')}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-950/40"
                title="Direct WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp / SMS Message Composer Drawer */}
      {isComposerOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsComposerOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Send WhatsApp to {selectedContact.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Phone: {selectedContact.phone} {selectedContact.nickname && `("${selectedContact.nickname}")`}
                </p>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="space-y-1.5 mb-3">
              <span className="text-[11px] text-slate-400 font-medium">Quick Executive Templates:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Meeting 15 min delayed, wrapping up previous call.',
                  'AURA generated the memo. Sending deck link shortly.',
                  'Please review the attached board proposal.',
                  'On the way now in the Tesla. ETA 12 mins.',
                ].map((tpl, i) => (
                  <button
                    key={i}
                    onClick={() => setWhatsappMessage(tpl)}
                    className="text-[11px] text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors text-left"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={4}
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder="Type message text here..."
              className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />

            <div className="mt-4 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsComposerOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendDispatch}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open in WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveContact}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white">Add Executive Contact</h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Tariq Mehmood"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Nickname / Custom Alias (What you call him/her)
              </label>
              <input
                type="text"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="e.g. Cheetah, Malik, Bhai, Doc"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Title & Role</label>
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. VP Engineering"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Phone / WhatsApp Number</label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. +923001234567"
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md"
              >
                Save Contact
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
