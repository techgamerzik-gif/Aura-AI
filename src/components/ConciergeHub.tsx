import React, { useState, useEffect } from 'react';
import {
  Compass,
  Plane,
  Film,
  UtensilsCrossed,
  ShoppingBag,
  Sparkles,
  Search,
  CheckCircle,
  ExternalLink,
  DollarSign,
  Star,
  Tag,
  ShieldCheck,
  Calendar,
  Car,
  Clock,
  BatteryCharging,
  Thermometer,
  Navigation,
  MessageCircle,
  Check,
  Copy,
  Plus,
  RotateCcw,
  Send,
  FileText,
  AlertCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  ConciergeOption,
  ConciergeResult,
  LanguageMode,
  EmailMessage,
  CarTelemetry,
  ScheduleEvent,
} from '../types/assistant.ts';
import { soundEffects } from '../utils/audioChime.ts';
import {
  parseFlightEmail,
  parseAllFlightEmails,
  calculateOptimalGroundTransport,
  SAMPLE_FLIGHT_CONFIRMATION_TEMPLATES,
  ParsedFlight,
  GroundTransportRecommendation,
  addMinutesToTime,
} from '../utils/flightParser.ts';

interface ConciergeHubProps {
  language: LanguageMode;
  onBookItem?: (option: ConciergeOption) => void;
  emails?: EmailMessage[];
  carState?: CarTelemetry;
  onUpdateCar?: (car: CarTelemetry) => void;
  onAddEvent?: (event: ScheduleEvent) => void;
}

export const ConciergeHub: React.FC<ConciergeHubProps> = ({
  language,
  onBookItem,
  emails = [],
  carState,
  onUpdateCar,
  onAddEvent,
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'travel_intelligence' | 'flights' | 'cinema' | 'dining' | 'shopping' | 'excursion'
  >('travel_intelligence');

  const [searchQuery, setSearchQuery] = useState('Flight EK-601 Ground Transportation · Tesla Model S Plaid');
  const [destination, setDestination] = useState('Dubai International (DXB) Terminal 3');
  const [isSearching, setIsSearching] = useState(false);
  const [bookedNotice, setBookedNotice] = useState<string | null>(null);

  // =========================================================
  // TRAVEL INTELLIGENCE: FLIGHT PARSER & TESLA GROUND TRANSIT
  // =========================================================
  const [parsedFlights, setParsedFlights] = useState<ParsedFlight[]>(() => {
    // 1. Try parsing all provided emails
    const fromEmails = parseAllFlightEmails(emails);
    if (fromEmails.length > 0) return fromEmails;

    // 2. Default initial parsed flights from sample confirmation emails
    const sample1 = parseFlightEmail(SAMPLE_FLIGHT_CONFIRMATION_TEMPLATES[0]);
    const sample2 = parseFlightEmail(SAMPLE_FLIGHT_CONFIRMATION_TEMPLATES[1]);
    return [sample1, sample2].filter(Boolean) as ParsedFlight[];
  });

  const [selectedFlightIndex, setSelectedFlightIndex] = useState<number>(0);
  const [delayAdjustment, setDelayAdjustment] = useState<number>(0);
  const [customDestination, setCustomDestination] = useState<string>('');
  const [showEmailParserModal, setShowEmailParserModal] = useState<boolean>(false);
  const [customEmailSubject, setCustomEmailSubject] = useState<string>('');
  const [customEmailBody, setCustomEmailBody] = useState<string>('');
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);
  const [copiedBrief, setCopiedBrief] = useState<boolean>(false);
  const [climateDispatched, setClimateDispatched] = useState<boolean>(false);

  // Sync emails if updated externally
  useEffect(() => {
    if (emails && emails.length > 0) {
      const detected = parseAllFlightEmails(emails);
      if (detected.length > 0) {
        setParsedFlights((prev) => {
          // Merge unique by flight number
          const existingNums = new Set(prev.map((f) => f.flightNumber));
          const newOnes = detected.filter((d) => !existingNums.has(d.flightNumber));
          return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
        });
      }
    }
  }, [emails]);

  const activeFlight: ParsedFlight | undefined = parsedFlights[selectedFlightIndex]
    ? {
        ...parsedFlights[selectedFlightIndex],
        delayMinutes: delayAdjustment,
      }
    : undefined;

  const groundTransport: GroundTransportRecommendation | null = activeFlight
    ? calculateOptimalGroundTransport(activeFlight, carState, customDestination || undefined)
    : null;

  // Active Curated Results comparing Cheapest vs Best Value vs Executive VIP
  const [currentResult, setCurrentResult] = useState<ConciergeResult>({
    category: 'Cinema & Screenings',
    query: 'IMAX VIP Experience & Premier Screenings',
    summary: 'Analyzed 14 theater chains and discount aggregators. Highlighted the cheapest tier, optimal value, and ultimate private luxury box.',
    options: [
      {
        tier: 'Cheapest Option',
        name: 'Standard IMAX Early-Bird Access',
        provider: 'Cineplex Direct Saver',
        price: '$14.50',
        originalPrice: '$22.00',
        rating: 4.4,
        highlights: ['Verified cheapest rate in city', 'Full 4K laser projection', 'Complimentary medium soda'],
        recommendedFor: 'Maximum price efficiency without seating sacrifice',
        bookingCode: 'SAVER-4912',
      },
      {
        tier: 'Best Value (Recommended)',
        name: "Director's Lounge Recliner & Fast-Track",
        provider: 'Grand Luxury Cinemas',
        price: '$26.00',
        originalPrice: '$38.00',
        rating: 4.9,
        highlights: ['Heated zero-gravity recliners', 'Priority VIP queue bypass', 'Complimentary artisanal truffle popcorn'],
        recommendedFor: 'Highest executive comfort per dollar (Best Market Sweet Spot)',
        bookingCode: 'DIR-VAL-8821',
      },
      {
        tier: 'Executive VIP Luxury',
        name: 'Private Executive Viewing Suite (4-Pax)',
        provider: 'Royal Cinema Club',
        price: '$180.00',
        rating: 5.0,
        highlights: ['Dedicated butler champagne service', 'Private acoustic-isolated suite', 'Gourmet dinner served at seat'],
        recommendedFor: 'High-stakes client entertainment or private executive evening',
        bookingCode: 'ROYAL-BOX-001',
      },
    ],
  });

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/assistant/concierge-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          query: searchQuery,
          destination,
        }),
      });

      const data = await res.json();
      if (data.options && data.options.length > 0) {
        setCurrentResult(data);
      }
    } catch (err: any) {
      console.warn('Notice: Using executive concierge local catalog:', err?.message || err);
      setCurrentResult({
        category: activeCategory,
        query: searchQuery,
        summary: `AURA VIP Concierge verified top executive selections for "${searchQuery}".`,
        options: [
          {
            tier: 'Cheapest Option',
            name: `${activeCategory.toUpperCase()} Early-Access Saver`,
            provider: 'Global Express Tier',
            price: '$45.00',
            rating: 4.6,
            highlights: ['Guaranteed reservation', 'Digital receipt sent to accounting'],
            recommendedFor: 'Cost-conscious delegation',
          },
          {
            tier: 'Best Value (Recommended)',
            name: `Premier Executive Choice`,
            provider: 'AURA Concierge Select',
            price: '$120.00',
            rating: 4.9,
            highlights: ['VIP Priority check-in', 'Full flex cancellation', 'Complimentary lounge access'],
            recommendedFor: 'Optimal balance of prestige and flexibility',
          },
          {
            tier: 'Executive VIP Luxury',
            name: `Royal Presidential Service`,
            provider: 'Black Label Executive Bridge',
            price: '$380.00',
            rating: 5.0,
            highlights: ['Chauffeur transfer included', 'Dedicated 24/7 liaison', 'Bespoke executive catering'],
            recommendedFor: 'Board members and C-Suite hospitality',
          },
        ],
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCategory = (
    cat: 'travel_intelligence' | 'flights' | 'cinema' | 'dining' | 'shopping' | 'excursion'
  ) => {
    setActiveCategory(cat);
    if (cat === 'travel_intelligence') {
      setSearchQuery('Flight EK-601 Ground Transportation · Tesla Model S Plaid');
      setDestination('Dubai International (DXB) Terminal 3');
    } else if (cat === 'flights') {
      setSearchQuery('Non-stop Executive Return Flight to Dubai (DXB)');
      setDestination('Dubai, UAE');
    } else if (cat === 'cinema') {
      setSearchQuery('Dune 3 & IMAX VIP Screening');
      setDestination('Metropolitan VIP Cinemas');
    } else if (cat === 'dining') {
      setSearchQuery('Private Dining Table for 2 at Michelin Star / Monal');
      setDestination('Prime City Center');
    } else if (cat === 'shopping') {
      setSearchQuery('Bose QuietComfort Ultra & Executive Tech Deals');
      setDestination('Global Verified Retailers');
    } else if (cat === 'excursion') {
      setSearchQuery('Weekend Mountain Rejuvenation Retreat');
      setDestination('Alpine Valley / Bhurban');
    }
  };

  const handleBook = (opt: ConciergeOption) => {
    setBookedNotice(
      language === 'ur_slang'
        ? `Zabardast! "${opt.name}" book ho gaya hai (${opt.price}). Booking voucher aapke wallet aur calendar mein add ho gaya hai.`
        : `Booking confirmed for "${opt.name}" at ${opt.price}. Added to calendar with voucher code: ${opt.bookingCode || 'AURA-CONF-77'}.`
    );
    onBookItem?.(opt);
    setTimeout(() => setBookedNotice(null), 6000);
  };

  // =========================================================
  // TRAVEL INTELLIGENCE ACTIONS
  // =========================================================
  const handleDispatchTesla = () => {
    soundEffects.playSuccessChime();
    if (!activeFlight || !groundTransport) return;

    // 1. Pre-condition Tesla Climate
    if (onUpdateCar && carState) {
      onUpdateCar({
        ...carState,
        climateActive: true,
        targetTempCelsius: 21,
      });
      setClimateDispatched(true);
    }

    // 2. Schedule Event in Agenda
    if (onAddEvent) {
      const newEv: ScheduleEvent = {
        id: `ev-tesla-pickup-${Date.now()}`,
        title: `Airport Curbside VIP Pickup: ${activeFlight.airline} ${activeFlight.flightNumber}`,
        timeStart: groundTransport.recommendedCurbsidePickupTime,
        timeEnd: addMinutesToTime(groundTransport.recommendedCurbsidePickupTime, 45),
        date: '2026-10-10',
        location: groundTransport.pickupLocation,
        category: 'travel',
        priority: 'high',
        attendees: [groundTransport.chauffeurName, 'Executive VIP'],
        hasBuffer: true,
        notes: `${groundTransport.vehicleModel} (${groundTransport.vehiclePlate}) staged for pickup. Destination: ${groundTransport.destination}. Pre-cooling cabin to 21°C.`,
      };
      onAddEvent(newEv);
    }

    setBookedNotice(
      language === 'ur_slang'
        ? `Tesla Model S Plaid VIP Curbside pickup dispatch ho chuki hai! Flight ${activeFlight.flightNumber} ke arrival (${groundTransport.recommendedCurbsidePickupTime}) par gari bay par ready hogi.`
        : `Tesla VIP Ground Transport confirmed! ${groundTransport.vehicleModel} dispatched to ${groundTransport.pickupLocation} for ${groundTransport.recommendedCurbsidePickupTime}. Cabin pre-cooling active.`
    );
    setTimeout(() => setBookedNotice(null), 7000);
  };

  const handleSendChauffeurWhatsApp = () => {
    soundEffects.playSuccessChime();
    if (!activeFlight || !groundTransport) return;

    const msg = `Salam Captain Asad, Flight ${activeFlight.airline} ${activeFlight.flightNumber} landing at ${groundTransport.pickupLocation}. Touchdown estimated at ${groundTransport.adjustedTouchdownTime}. VIP Curbside pickup requested at ${groundTransport.recommendedCurbsidePickupTime}. Vehicle: ${groundTransport.vehicleModel} (${groundTransport.vehiclePlate}). Destination: ${groundTransport.destination}.`;
    const cleanPhone = groundTransport.chauffeurPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyChauffeurBrief = () => {
    soundEffects.playSuccessChime();
    if (!activeFlight || !groundTransport) return;

    const brief = `[AURA TRAVEL INTELLIGENCE]\nFlight: ${activeFlight.airline} ${activeFlight.flightNumber}\nRoute: ${activeFlight.departureAirportCode} -> ${activeFlight.arrivalAirportCode}\nTouchdown: ${groundTransport.adjustedTouchdownTime}\nVIP Curbside Pickup: ${groundTransport.recommendedCurbsidePickupTime}\nLocation: ${groundTransport.pickupLocation}\nVehicle: ${groundTransport.vehicleModel} (${groundTransport.vehiclePlate})\nPre-Cooling: 21°C at ${groundTransport.hvacPreConditionTime}\nDestination: ${groundTransport.destination}`;
    navigator.clipboard.writeText(brief).then(() => {
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 3000);
    });
  };

  const handleApplyPresetTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    const tpl = SAMPLE_FLIGHT_CONFIRMATION_TEMPLATES[idx];
    if (tpl) {
      setCustomEmailSubject(tpl.subject);
      setCustomEmailBody(tpl.body);
    }
  };

  const handleParseCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmailSubject.trim() && !customEmailBody.trim()) return;

    soundEffects.playSuccessChime();
    const parsed = parseFlightEmail({
      id: `custom-flight-${Date.now()}`,
      sender: 'Airline Reservation Confirmation',
      subject: customEmailSubject || 'Flight Booking Confirmation',
      body: customEmailBody,
    });

    if (parsed) {
      setParsedFlights((prev) => [parsed, ...prev]);
      setSelectedFlightIndex(0);
      setDelayAdjustment(0);
      setShowEmailParserModal(false);
      setCustomEmailSubject('');
      setCustomEmailBody('');
      setBookedNotice(`✓ Successfully parsed flight confirmation: ${parsed.airline} ${parsed.flightNumber}!`);
      setTimeout(() => setBookedNotice(null), 5000);
    } else {
      alert('Unable to extract flight telemetry from provided text. Ensure it contains flight number, airports, or arrival times.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Executive Concierge & Travel Intelligence</h2>
            <span className="text-[11px] text-cyan-400 font-mono bg-cyan-950/50 border border-cyan-800/60 px-2 py-0.5 rounded">
              AUTONOMOUS FLIGHT-TO-TESLA PIPELINE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ur_slang'
              ? 'Flight confirmation emails ko auto-parse karke airport landing time ke mutabiq Tesla VIP pickup schedule karta hai.'
              : 'Direct email extraction parses airline confirmations to calculate VIP customs clearance and stage Tesla ground transit seamlessly.'}
          </p>
        </div>

        {/* Global Travel Stats Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Active Flights</span>
            <span className="text-sm font-bold text-cyan-400">{parsedFlights.length} Confirmed</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Tesla Fleet</span>
            <span className="text-sm font-bold text-emerald-400">
              {carState?.batteryPercent ? `${carState.batteryPercent}% Charged` : '84% Ready'}
            </span>
          </div>
        </div>
      </div>

      {bookedNotice && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bookedNotice}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">ACTION EXECUTED</span>
        </div>
      )}

      {/* Category Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'travel_intelligence', label: 'Travel Intelligence (Tesla)', icon: Car, badge: 'Smart' },
          { id: 'flights', label: 'Flights & Rail Transit', icon: Plane },
          { id: 'cinema', label: 'Cinema & Screenings', icon: Film },
          { id: 'dining', label: 'Fine Dining & Private Tables', icon: UtensilsCrossed },
          { id: 'shopping', label: 'Executive Gear & Deals', icon: ShoppingBag },
          { id: 'excursion', label: 'Weekend Excursions', icon: Compass },
        ].map((c) => {
          const Icon = c.icon;
          const isSelected = activeCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleSelectCategory(c.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors relative ${
                isSelected
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{c.label}</span>
              {c.badge && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950 font-bold text-[9px] uppercase font-mono">
                  {c.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: TRAVEL INTELLIGENCE (AUTONOMOUS FLIGHT PARSER & TESLA DISPATCH) */}
      {/* ========================================================================= */}
      {activeCategory === 'travel_intelligence' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Action Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold uppercase tracking-wider">
                  FLIGHT CONFIRMATION PARSING PIPELINE
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Inbox Auto-Sync · Real-Time Curbside Math
                </span>
              </div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>Autonomous Flight-to-Ground Telemetry</span>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl">
                AURA reads confirmed airline confirmation emails, calculates gate touchdown, customs and VIP luggage clearance, and stages your pre-conditioned Tesla at the curbside bay.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playSuccessChime();
                  const reDetected = parseAllFlightEmails(emails);
                  if (reDetected.length > 0) {
                    setParsedFlights(reDetected);
                    setBookedNotice(`Inbox re-scanned! Found ${reDetected.length} flight confirmations.`);
                  } else {
                    setBookedNotice('Inbox scanned. 2 active flight itineraries are current.');
                  }
                  setTimeout(() => setBookedNotice(null), 4000);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
                title="Scan inbox for new airline confirmation messages"
              >
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Re-Scan Inbox</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playSuccessChime();
                  handleApplyPresetTemplate(0);
                  setShowEmailParserModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Parse New Flight Email</span>
              </button>
            </div>
          </div>

          {/* Flight Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0 mr-1">Detected Itineraries:</span>
            {parsedFlights.map((flt, idx) => {
              const isSelected = selectedFlightIndex === idx;
              return (
                <button
                  key={flt.id}
                  onClick={() => {
                    setSelectedFlightIndex(idx);
                    setDelayAdjustment(0);
                    soundEffects.playSuccessChime();
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Plane className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span>{flt.flightNumber}</span>
                  <span className="text-[10px] font-mono text-slate-400 font-normal">
                    ({flt.departureAirportCode} → {flt.arrivalAirportCode})
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono uppercase ${
                      flt.cabinClass.includes('First')
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                    }`}
                  >
                    {flt.cabinClass}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Flight & Ground Transportation Grid */}
          {activeFlight && groundTransport && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Parsed Flight Telemetry Card */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
                      <Plane className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white">{activeFlight.airline}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold">
                          {activeFlight.flightNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        PNR: {activeFlight.bookingReference} · {activeFlight.aircraft}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold uppercase">
                    CONFIRMED FLIGHT
                  </span>
                </div>

                {/* Route Visualizer */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/90 relative overflow-hidden">
                  <div className="flex items-center justify-between relative z-10">
                    <div className="text-left">
                      <span className="text-2xl font-black text-white font-mono tracking-tight">
                        {activeFlight.departureAirportCode}
                      </span>
                      <p className="text-xs text-slate-400 font-medium">{activeFlight.departureCity}</p>
                      <span className="text-[10px] font-mono text-slate-500">Depart {activeFlight.departureTime}</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center px-4">
                      <span className="text-[10px] font-mono text-cyan-400 mb-1">Non-stop Scheduled</span>
                      <div className="w-full flex items-center">
                        <div className="w-2 h-2 rounded-full bg-cyan-500" />
                        <div className="flex-1 border-t border-dashed border-cyan-500/60 mx-1" />
                        <Plane className="w-4 h-4 text-cyan-400 rotate-90 shrink-0" />
                        <div className="flex-1 border-t border-dashed border-cyan-500/60 mx-1" />
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 mt-1">
                        Arrival: {activeFlight.arrivalTime} GST
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-cyan-400 font-mono tracking-tight">
                        {activeFlight.arrivalAirportCode}
                      </span>
                      <p className="text-xs text-slate-400 font-medium">{activeFlight.arrivalCity}</p>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {activeFlight.arrivalTerminal}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Passenger & Clearance Metadata */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Passenger / Seat</span>
                    <span className="font-bold text-white block truncate">{activeFlight.passengerName}</span>
                    <span className="text-[10px] font-mono text-cyan-400">
                      {activeFlight.cabinClass} · Seat {activeFlight.seat}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Immigration & Luggage Buffer</span>
                    <span className="font-bold text-emerald-400 block">+{activeFlight.customsBufferMinutes} Minutes</span>
                    <span className="text-[10px] text-slate-400">VIP Priority Fast-Track</span>
                  </div>
                </div>

                {/* Live Touchdown Delay Adjustment Simulator */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      Radar Touchdown Time Adjustment:
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {groundTransport.adjustedTouchdownTime} ({delayAdjustment === 0 ? 'On Time' : `${delayAdjustment > 0 ? '+' : ''}${delayAdjustment}m`})
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'On Time', delta: 0 },
                      { label: '+15m Delay', delta: 15 },
                      { label: '+30m Delay', delta: 30 },
                      { label: '-10m Early', delta: -10 },
                    ].map((sim) => (
                      <button
                        key={sim.label}
                        type="button"
                        onClick={() => {
                          setDelayAdjustment(sim.delta);
                          soundEffects.playSuccessChime();
                        }}
                        className={`py-1.5 px-2 rounded-lg text-[10px] font-bold font-mono transition-colors ${
                          delayAdjustment === sim.delta
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-950 hover:bg-slate-850 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {sim.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source Email Snippet Reference */}
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
                    <FileText className="w-3 h-3" />
                    <span>PARSED FROM EMAIL CONFIRMATION:</span>
                  </div>
                  <p className="line-clamp-2 italic font-mono text-[10px] text-slate-400">
                    "{activeFlight.rawSnippet}"
                  </p>
                </div>
              </div>

              {/* Right Column: Optimal Ground Transportation (Tesla) Suggestion */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-600/20">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-white">{groundTransport.vehicleModel}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold">
                          {groundTransport.vehiclePlate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Autonomous Curbside Staging · Synced to Flight Touchdown
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold uppercase">
                    OPTIMAL GROUND MATCH
                  </span>
                </div>

                {/* Staging & Curbside Timeline Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Step 1: Touchdown */}
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 text-center space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">1. Flight Touchdown</span>
                    <p className="text-xl font-black text-white font-mono">{groundTransport.adjustedTouchdownTime}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Runway Landing & Taxi</p>
                  </div>

                  {/* Step 2: Tesla HVAC Pre-cooling */}
                  <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-800/60 text-center space-y-1 relative">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase flex items-center justify-center gap-1">
                      <Thermometer className="w-3 h-3" />
                      <span>2. HVAC Pre-Cool</span>
                    </span>
                    <p className="text-xl font-black text-cyan-300 font-mono">{groundTransport.hvacPreConditionTime}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Cooling to 21°C (15m before)</p>
                  </div>

                  {/* Step 3: Curbside Pickup */}
                  <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-800/80 text-center space-y-1 shadow-md shadow-emerald-950/40">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>3. Curbside Staged</span>
                    </span>
                    <p className="text-2xl font-black text-emerald-300 font-mono">
                      {groundTransport.recommendedCurbsidePickupTime}
                    </p>
                    <p className="text-[10px] text-emerald-400/80 font-mono">
                      Touchdown + {groundTransport.customsBufferMinutes}m Buffer
                    </p>
                  </div>
                </div>

                {/* Staging Location & Fleet Specs */}
                <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Curbside Pickup Point</span>
                      <p className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                        <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{groundTransport.pickupLocation}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Executive Destination</span>
                      <p className="font-bold text-cyan-300 truncate max-w-[220px]">{groundTransport.destination}</p>
                    </div>
                  </div>

                  {/* Telemetry Chips */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Battery Reserve</span>
                        <span className="font-bold text-white font-mono">{groundTransport.currentBatteryPercent}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Transit Distance</span>
                        <span className="font-bold text-white font-mono">
                          {groundTransport.estimatedDistanceKm} km ({groundTransport.estimatedTransitTimeMins} mins)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">Cabin Target</span>
                        <span className="font-bold text-white font-mono">
                          {groundTransport.targetCabinTempCelsius}°C Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chauffeur Lead Contact Bar */}
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                      CA
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{groundTransport.chauffeurName}</span>
                      <span className="text-[10px] font-mono text-slate-400">{groundTransport.chauffeurPhone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendChauffeurWhatsApp}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Send pre-filled flight arrival brief to chauffeur via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Brief</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyChauffeurBrief}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy dispatch brief to clipboard"
                    >
                      {copiedBrief ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDispatchTesla}
                    className="py-3 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-600/30"
                  >
                    <Car className="w-4 h-4" />
                    <span>Auto-Dispatch Tesla Curbside</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playSuccessChime();
                      if (onUpdateCar && carState) {
                        onUpdateCar({ ...carState, climateActive: !carState.climateActive, targetTempCelsius: 21 });
                        setClimateDispatched(!carState.climateActive);
                      }
                      setBookedNotice('Tesla cabin pre-cooling engaged at 21°C.');
                      setTimeout(() => setBookedNotice(null), 4000);
                    }}
                    className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      climateDispatched || carState?.climateActive
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-200'
                    }`}
                  >
                    <Thermometer className="w-4 h-4 text-cyan-400" />
                    <span>
                      {climateDispatched || carState?.climateActive
                        ? 'Cabin Pre-Cooled (21°C Active)'
                        : 'Pre-Cool Cabin Now (21°C)'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal / Ingestion Drawer for Pasting Custom Flight Confirmation Email */}
          {showEmailParserModal && (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-2xl animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>Parse Custom Flight Confirmation Email</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Paste raw text from Emirates, Qatar Airways, British Airways, Delta, PIA, or any airline e-ticket.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEmailParserModal(false)}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800"
                >
                  Close
                </button>
              </div>

              {/* Sample Quick Preset Pills */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Load Airline Confirmation Preset:</span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_FLIGHT_CONFIRMATION_TEMPLATES.map((tpl, i) => (
                    <button
                      key={tpl.title}
                      type="button"
                      onClick={() => handleApplyPresetTemplate(i)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-colors ${
                        selectedTemplateIndex === i
                          ? 'bg-cyan-950 border-cyan-600 text-cyan-200 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleParseCustomEmail} className="space-y-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={customEmailSubject}
                    onChange={(e) => setCustomEmailSubject(e.target.value)}
                    placeholder="e.g. Flight Confirmation: EK-601 Karachi to Dubai - Ref #EK948X"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Email Body / E-Ticket Text
                  </label>
                  <textarea
                    rows={6}
                    value={customEmailBody}
                    onChange={(e) => setCustomEmailBody(e.target.value)}
                    placeholder="Paste the flight confirmation email body text here..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md shadow-cyan-600/30"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Extract Flight Telemetry & Calculate Tesla Pickup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEmailParserModal(false)}
                    className="py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: OTHER CONCIERGE SEARCH (CINEMA, FLIGHTS, DINING, SHOPPING) */}
      {/* ========================================================================= */}
      {activeCategory !== 'travel_intelligence' && (
        <div className="space-y-6">
          {/* Search Input Bar */}
          <form onSubmit={handleSearch} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What are you booking or shopping for?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Location / Destination"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSearching ? 'Finding Deals...' : 'Search & Compare'}</span>
              </button>
            </div>
          </form>

          {/* Summary Narrative */}
          {currentResult.summary && (
            <div className="text-xs text-slate-400 flex items-center gap-2 px-1">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{currentResult.summary}</span>
            </div>
          )}

          {/* Three-Tier Comparison Grid (Cheapest, Best Value, Executive VIP) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentResult.options.map((opt, idx) => {
              const isBestValue = opt.tier.includes('Best Value');
              const isCheapest = opt.tier.includes('Cheapest');

              return (
                <div
                  key={idx}
                  className={`relative p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                    isBestValue
                      ? 'bg-slate-900 border-cyan-500/80 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                      : isCheapest
                      ? 'bg-slate-900/90 border-emerald-600/60'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  {/* Tier Banner */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span
                        className={`font-mono text-[11px] font-semibold tracking-wide ${
                          isBestValue
                            ? 'text-cyan-400 uppercase'
                            : isCheapest
                            ? 'text-emerald-400 uppercase'
                            : 'text-amber-400 uppercase'
                        }`}
                      >
                        {opt.tier}
                      </span>
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{opt.rating}</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-100">{opt.name}</h3>
                    <div className="text-xs text-slate-400">{opt.provider}</div>
                  </div>

                  {/* Price Block */}
                  <div className="my-3 py-3 border-y border-slate-800/80 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-white tracking-tight">{opt.price}</span>
                    {opt.originalPrice && (
                      <span className="text-xs text-slate-500 line-through">{opt.originalPrice}</span>
                    )}
                    {isCheapest && (
                      <span className="text-[10px] text-emerald-400 font-mono ml-auto">VERIFIED LOWEST</span>
                    )}
                    {isBestValue && (
                      <span className="text-[10px] text-cyan-400 font-mono ml-auto">AURA RECOMMENDED</span>
                    )}
                  </div>

                  {/* Feature Highlights */}
                  <div className="space-y-2 mb-4">
                    {opt.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-400 italic mb-4">
                    "{opt.recommendedFor}"
                  </div>

                  {/* Book Button */}
                  <button
                    onClick={() => handleBook(opt)}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isBestValue
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                        : isCheapest
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {language === 'ur_slang' ? 'AI Se Book Karwao' : `Instant Book (${opt.price})`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Proactive Healthy Lifestyle & Concierge Suggestion */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-950/60 border border-cyan-800/60 rounded-lg text-cyan-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {language === 'ur_slang'
                    ? 'Weekend Excursion Suggestion: Executive Wellness & Nature Walk'
                    : 'Proactive Concierge: Weekend Rejuvenation & Sleep Restoration'}
                </div>
                <p className="text-xs text-slate-400">
                  {language === 'ur_slang'
                    ? 'Aapki continuous 18 ghante ki meetings ho gayi hain. Saturday ko 2 hours ka spa ya trail hike recommended hai.'
                    : 'Based on high cognitive load this week, AURA held a 2-hour recovery window on Saturday at 10:00.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleSelectCategory('excursion')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 shrink-0 transition-colors"
            >
              View Retreat Options
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
