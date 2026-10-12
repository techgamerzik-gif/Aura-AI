import { EmailMessage, CarTelemetry } from '../types/assistant.ts';

export interface ParsedFlight {
  id: string;
  sourceEmailId?: string;
  sourceSender?: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departureAirport: string;
  departureAirportCode: string;
  departureCity: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalAirportCode: string;
  arrivalCity: string;
  arrivalTerminal: string;
  arrivalTime: string; // "20:45"
  arrivalDate: string; // "Today" or YYYY-MM-DD
  bookingReference: string;
  passengerName: string;
  cabinClass: 'First Class' | 'Business Class' | 'Premium Economy' | 'Economy';
  seat?: string;
  aircraft?: string;
  status: 'Confirmed' | 'On Time' | 'Delayed' | 'Early';
  delayMinutes: number;
  customsBufferMinutes: number;
  rawSubject: string;
  rawSnippet: string;
}

export interface GroundTransportRecommendation {
  vehicleModel: string;
  vehiclePlate: string;
  chauffeurName: string;
  chauffeurPhone: string;
  flightArrivalTime: string;
  adjustedTouchdownTime: string;
  customsBufferMinutes: number;
  recommendedCurbsidePickupTime: string;
  hvacPreConditionTime: string;
  pickupLocation: string;
  destination: string;
  estimatedTransitTimeMins: number;
  estimatedDistanceKm: number;
  batteryRequiredPercent: number;
  currentBatteryPercent: number;
  batterySufficient: boolean;
  targetCabinTempCelsius: number;
  luggageCapability: string;
  flightRadarSyncStatus: 'Tracking Active' | 'Gate Confirmed' | 'Approaching Terminal';
  rationale: string;
}

// Known Airline Signatures
const AIRLINE_SIGNATURES: Array<{
  name: string;
  code: string;
  regex: RegExp;
  hub: string;
}> = [
  { name: 'Emirates', code: 'EK', regex: /emirates|fly\s*emirates|\bek[-\s]?\d{3,4}\b/i, hub: 'Dubai (DXB)' },
  { name: 'Qatar Airways', code: 'QR', regex: /qatar\s*airways|\bqr[-\s]?\d{3,4}\b/i, hub: 'Doha (DOH)' },
  { name: 'Etihad Airways', code: 'EY', regex: /etihad|\bey[-\s]?\d{3,4}\b/i, hub: 'Abu Dhabi (AUH)' },
  { name: 'British Airways', code: 'BA', regex: /british\s*airways|\bba[-\s]?\d{3,4}\b/i, hub: 'London (LHR)' },
  { name: 'Pakistan International Airlines (PIA)', code: 'PK', regex: /pia|pakistan\s*int|\bpk[-\s]?\d{3,4}\b/i, hub: 'Karachi (KHI)' },
  { name: 'Turkish Airlines', code: 'TK', regex: /turkish\s*airlines|thy|\btk[-\s]?\d{3,4}\b/i, hub: 'Istanbul (IST)' },
  { name: 'Lufthansa', code: 'LH', regex: /lufthansa|\blh[-\s]?\d{3,4}\b/i, hub: 'Frankfurt (FRA)' },
  { name: 'Delta Air Lines', code: 'DL', regex: /delta(?:\s*air)?|\bdl[-\s]?\d{3,4}\b/i, hub: 'Atlanta (ATL)' },
  { name: 'United Airlines', code: 'UA', regex: /united(?:\s*airlines)?|\bua[-\s]?\d{3,4}\b/i, hub: 'Chicago (ORD)' },
  { name: 'Airblue', code: 'PA', regex: /airblue|\bpa[-\s]?\d{3,4}\b/i, hub: 'Islamabad (ISB)' },
  { name: 'Flydubai', code: 'FZ', regex: /flydubai|\bfz[-\s]?\d{3,4}\b/i, hub: 'Dubai (DXB)' },
];

// Airport & City Mapping
const AIRPORT_MAP: Record<string, { city: string; name: string }> = {
  DXB: { city: 'Dubai', name: 'Dubai International Airport' },
  KHI: { city: 'Karachi', name: 'Jinnah International Airport' },
  ISB: { city: 'Islamabad', name: 'Islamabad International Airport' },
  LHE: { city: 'Lahore', name: 'Allama Iqbal International Airport' },
  LHR: { city: 'London', name: 'London Heathrow Airport' },
  JFK: { city: 'New York', name: 'John F. Kennedy International Airport' },
  DOH: { city: 'Doha', name: 'Hamad International Airport' },
  AUH: { city: 'Abu Dhabi', name: 'Zayed International Airport' },
  RUH: { city: 'Riyadh', name: 'King Khalid International Airport' },
  JED: { city: 'Jeddah', name: 'King Abdulaziz International Airport' },
  IST: { city: 'Istanbul', name: 'Istanbul Airport' },
  SIN: { city: 'Singapore', name: 'Singapore Changi Airport' },
  FRA: { city: 'Frankfurt', name: 'Frankfurt Airport' },
  ORD: { city: 'Chicago', name: "O'Hare International Airport" },
  LAX: { city: 'Los Angeles', name: 'Los Angeles International Airport' },
  CDG: { city: 'Paris', name: 'Charles de Gaulle Airport' },
};

/**
 * Intelligent Flight Confirmation Email Parser
 */
export function parseFlightEmail(email: {
  id?: string;
  sender?: string;
  subject: string;
  body: string;
  snippet?: string;
}): ParsedFlight | null {
  const fullText = `${email.subject}\n${email.snippet || ''}\n${email.body}`;

  // 1. Check if email is flight-related
  const isFlightEmail =
    /flight|airline|e-ticket|itinerary|booking\s*ref|boarding\s*pass|terminal\s*\d|gate\s*[a-z0-9]|arrival\s*time|touchdown|flight\s*confirmation/i.test(
      fullText
    );

  if (!isFlightEmail) {
    return null;
  }

  // 2. Identify Airline
  let matchedAirline = AIRLINE_SIGNATURES.find((sig) => sig.regex.test(fullText));
  const airlineName = matchedAirline ? matchedAirline.name : 'Executive Airline';
  const airlineCode = matchedAirline ? matchedAirline.code : 'EX';

  // 3. Extract Flight Number (e.g. EK-601, QR 611, PK302, BA-108)
  const flightNumMatch = fullText.match(/\b([A-Z]{2,3})[-\s]?(\d{3,4})\b/);
  const flightNumber = flightNumMatch
    ? `${flightNumMatch[1].toUpperCase()}-${flightNumMatch[2]}`
    : `${airlineCode}-501`;

  // 4. Extract Airports / Route
  // Look for 3-letter IATA codes
  const iataMatches = fullText.match(/\b(DXB|KHI|ISB|LHE|LHR|JFK|DOH|AUH|RUH|JED|IST|SIN|FRA|ORD|LAX|CDG)\b/g);
  let depCode = 'KHI';
  let arrCode = 'DXB';

  if (iataMatches && iataMatches.length >= 2) {
    depCode = iataMatches[0].toUpperCase();
    arrCode = iataMatches[1].toUpperCase();
    // Avoid dep and arr being identical
    if (depCode === arrCode && iataMatches.length > 2) {
      arrCode = iataMatches[2].toUpperCase();
    }
  } else if (iataMatches && iataMatches.length === 1) {
    arrCode = iataMatches[0].toUpperCase();
    depCode = arrCode === 'DXB' ? 'KHI' : 'DXB';
  } else {
    // City name heuristics
    if (/dubai/i.test(fullText)) arrCode = 'DXB';
    else if (/london|heathrow/i.test(fullText)) arrCode = 'LHR';
    else if (/islamabad/i.test(fullText)) arrCode = 'ISB';
    else if (/karachi/i.test(fullText)) arrCode = 'KHI';
    else if (/lahore/i.test(fullText)) arrCode = 'LHE';
    else if (/new york|jfk/i.test(fullText)) arrCode = 'JFK';
  }

  const departureAirportInfo = AIRPORT_MAP[depCode] || { city: depCode, name: `${depCode} Airport` };
  const arrivalAirportInfo = AIRPORT_MAP[arrCode] || { city: arrCode, name: `${arrCode} Airport` };

  // 5. Extract Arrival Terminal
  const terminalMatch = fullText.match(/terminal\s*([0-9A-Z]+)/i);
  const arrivalTerminal = terminalMatch ? `Terminal ${terminalMatch[1].toUpperCase()}` : 'Terminal 3';

  // 6. Extract Arrival Time (e.g. "20:45", "18:30 PKT", "08:15 AM")
  let arrivalTime = '20:45';
  const arrivalTimeRegex = /(?:arrival(?:\s*time)?|arrives?(?:\s*at)?|landing(?:\s*at)?|touchdown)\s*[:=]?\s*(\d{1,2}:\d{2})/i;
  const arrMatch = fullText.match(arrivalTimeRegex);

  if (arrMatch && arrMatch[1]) {
    arrivalTime = arrMatch[1];
  } else {
    // Look for standalone timestamp
    const anyTimeMatch = fullText.match(/\b(\d{1,2}:\d{2})\s*(?:gst|pkt|bst|est|pm|am)?\b/i);
    if (anyTimeMatch) {
      arrivalTime = anyTimeMatch[1];
    }
  }

  // Normalize arrival time string format (HH:MM)
  if (arrivalTime.includes(':')) {
    const parts = arrivalTime.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    arrivalTime = `${hh}:${mm}`;
  }

  // 7. Extract Booking Reference (PNR)
  const pnrMatch = fullText.match(/(?:booking\s*(?:ref|reference|code)|pnr|ticket\s*#?)\s*[:#]?\s*([A-Z0-9]{5,8})\b/i);
  const bookingReference = pnrMatch ? pnrMatch[1].toUpperCase() : 'EK948X';

  // 8. Extract Cabin Class
  let cabinClass: ParsedFlight['cabinClass'] = 'Business Class';
  if (/first\s*class|suite|residence/i.test(fullText)) {
    cabinClass = 'First Class';
  } else if (/business|qsuite|club\s*world/i.test(fullText)) {
    cabinClass = 'Business Class';
  } else if (/premium\s*economy/i.test(fullText)) {
    cabinClass = 'Premium Economy';
  } else if (/economy/i.test(fullText)) {
    cabinClass = 'Economy';
  }

  // 9. Extract Seat & Aircraft
  const seatMatch = fullText.match(/seat\s*[:#]?\s*([0-9]{1,2}[A-K])/i);
  const seat = seatMatch ? seatMatch[1].toUpperCase() : cabinClass === 'First Class' ? '01A' : '03K';

  const aircraftMatch = fullText.match(/(?:boeing\s*|airbus\s*|[bba][\s-]?)(777|787|380|350|330|320)[-A-Za-z0-9]*/i);
  const aircraft = aircraftMatch ? aircraftMatch[0].toUpperCase() : 'Boeing 777-300ER';

  // 10. Extract Passenger Name
  const nameMatch = fullText.match(/(?:dear|passenger|mr\.|mrs\.|dr\.)\s+([A-Za-z\s]+?)(?:,|\n|<)/i);
  const passengerName = nameMatch ? nameMatch[1].trim() : 'Executive Chief';

  // 11. Determine Customs & Immigration Clearance Buffer
  // First/Business class passengers have fast-track VIP immigration and priority baggage tag (20-25 mins)
  // Economy passengers average 40-50 mins
  const customsBufferMinutes = cabinClass === 'First Class' ? 20 : cabinClass === 'Business Class' ? 25 : 45;

  return {
    id: `flight-${email.id || Date.now()}`,
    sourceEmailId: email.id,
    sourceSender: email.sender,
    airline: airlineName,
    airlineCode,
    flightNumber,
    departureAirport: departureAirportInfo.name,
    departureAirportCode: depCode,
    departureCity: departureAirportInfo.city,
    departureTime: '17:15',
    arrivalAirport: arrivalAirportInfo.name,
    arrivalAirportCode: arrCode,
    arrivalCity: arrivalAirportInfo.city,
    arrivalTerminal,
    arrivalTime,
    arrivalDate: 'Today',
    bookingReference,
    passengerName,
    cabinClass,
    seat,
    aircraft,
    status: 'Confirmed',
    delayMinutes: 0,
    customsBufferMinutes,
    rawSubject: email.subject,
    rawSnippet: email.snippet || email.body.slice(0, 150),
  };
}

/**
 * Parses all flight emails from inbox
 */
export function parseAllFlightEmails(emails: EmailMessage[]): ParsedFlight[] {
  const parsedList: ParsedFlight[] = [];
  emails.forEach((em) => {
    const flight = parseFlightEmail(em);
    if (flight) {
      parsedList.push(flight);
    }
  });
  return parsedList;
}

/**
 * Calculate time math (HH:MM +/- minutes)
 */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const [hStr, mStr] = timeStr.split(':');
  let hours = parseInt(hStr || '20', 10);
  let mins = parseInt(mStr || '00', 10);

  const totalMinutes = hours * 60 + mins + minutes;
  // Handle wrapping over midnight
  const normalizedMins = ((totalMinutes % 1440) + 1440) % 1440;
  const newHours = Math.floor(normalizedMins / 60);
  const newMins = normalizedMins % 60;

  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

/**
 * Calculates Optimal Tesla Ground Transportation
 */
export function calculateOptimalGroundTransport(
  flight: ParsedFlight,
  carState?: CarTelemetry,
  customDestination?: string
): GroundTransportRecommendation {
  const currentBattery = carState?.batteryPercent || 84;
  const isPlaid = carState?.model ? carState.model.includes('Plaid') : true;

  // Selected vehicle based on cabin class and destination
  let vehicleModel: string;
  let vehiclePlate: string;
  let luggageCap: string;

  if (flight.cabinClass === 'First Class' || flight.cabinClass === 'Business Class') {
    vehicleModel = isPlaid ? 'Tesla Model S Plaid (Tri-Motor)' : 'Tesla Model S Long Range';
    vehiclePlate = 'DXB · EXEC 01';
    luggageCap = '3x Full-Sized Hard Cases + 2x Garment Bags';
  } else {
    vehicleModel = 'Tesla Model X Plaid (Falcon Wing)';
    vehiclePlate = 'DXB · VIP 99';
    luggageCap = '5x Full-Sized Hard Cases (Maximum Cargo)';
  }

  // Timing Calculations
  const adjustedTouchdown = flight.delayMinutes !== 0
    ? addMinutesToTime(flight.arrivalTime, flight.delayMinutes)
    : flight.arrivalTime;

  // Curbside pickup is precisely touchdown + customs buffer
  const curbsidePickupTime = addMinutesToTime(adjustedTouchdown, flight.customsBufferMinutes);

  // Pre-condition cabin 15 minutes before the curbside pickup time so the car is exactly 21°C upon entry
  const preConditionTime = addMinutesToTime(curbsidePickupTime, -15);

  const destination =
    customDestination ||
    (flight.arrivalAirportCode === 'DXB'
      ? 'The Ritz-Carlton Financial Center, DIFC'
      : flight.arrivalAirportCode === 'LHR'
      ? 'The Connaught, Mayfair, London'
      : flight.arrivalAirportCode === 'ISB'
      ? 'Serena Hotel, Executive Suite, Islamabad'
      : 'Executive Downtown Headquarters');

  const estimatedDistanceKm = flight.arrivalAirportCode === 'DXB' ? 42 : flight.arrivalAirportCode === 'LHR' ? 28 : 36;
  const estimatedTransitTimeMins = flight.arrivalAirportCode === 'DXB' ? 28 : flight.arrivalAirportCode === 'LHR' ? 45 : 32;
  const batteryRequiredPercent = Math.ceil(estimatedDistanceKm * 0.22); // ~9% battery for 42km
  const batterySufficient = currentBattery >= (batteryRequiredPercent + 15); // Require 15% safety margin

  const pickupLocation = `${flight.arrivalAirportCode} ${flight.arrivalTerminal} · VIP Chauffeur Lane (Bay 4)`;

  const rationale = `${flight.airline} ${flight.flightNumber} landing at ${adjustedTouchdown}. With ${flight.cabinClass} VIP baggage priority (${flight.customsBufferMinutes} min customs buffer), curbside staging is optimized for ${curbsidePickupTime}. ${vehicleModel} will pre-cool cabin to 21°C starting at ${preConditionTime}.`;

  return {
    vehicleModel,
    vehiclePlate,
    chauffeurName: 'Captain Asad (Fleet Lead)',
    chauffeurPhone: '+971 50 123 4567',
    flightArrivalTime: flight.arrivalTime,
    adjustedTouchdownTime: adjustedTouchdown,
    customsBufferMinutes: flight.customsBufferMinutes,
    recommendedCurbsidePickupTime: curbsidePickupTime,
    hvacPreConditionTime: preConditionTime,
    pickupLocation,
    destination,
    estimatedTransitTimeMins,
    estimatedDistanceKm,
    batteryRequiredPercent,
    currentBatteryPercent: currentBattery,
    batterySufficient,
    targetCabinTempCelsius: 21,
    luggageCapability: luggageCap,
    flightRadarSyncStatus: 'Tracking Active',
    rationale,
  };
}

/**
 * Pre-built Flight Confirmation Email Templates for Demonstration & Quick Testing
 */
export const SAMPLE_FLIGHT_CONFIRMATION_TEMPLATES = [
  {
    title: 'Emirates First Class (EK-601 KHI -> DXB)',
    subject: 'Flight Confirmation: EK-601 Karachi (KHI) to Dubai (DXB) - Booking Ref #EK948X',
    sender: 'Emirates Airline Bookings <reservations@emirates.com>',
    snippet: 'Flight EK-601 arrives Dubai International (DXB) Terminal 3 at 20:45 GST...',
    body: `Dear Executive,\n\nYour flight booking is confirmed.\n\nFlight: EK-601\nAirline: Emirates\nRoute: Karachi (KHI) -> Dubai (DXB) Terminal 3\nDeparture: 18:25 PKT\nArrival Time: 20:45 GST\nSeat: 02A (First Class Private Suite)\nBooking Reference: EK948X\nAircraft: Boeing 777-300ER\n\nVIP Fast Track immigration and baggage carousel #04 active.`,
  },
  {
    title: 'Qatar Airways Qsuite (QR-611 ISB -> LHR)',
    subject: 'E-Ticket & Itinerary: QR-611 Islamabad (ISB) to London Heathrow (LHR) - Booking Ref #QR7821P',
    sender: 'Qatar Airways Privilege Club <confirmations@qatarairways.com>',
    snippet: 'Booking Confirmed: QR-611 ISB -> DOH -> LHR. Arrival at London Heathrow (LHR) Terminal 4 at 13:30 BST...',
    body: `Dear Passenger,\n\nHere is your confirmed flight itinerary.\n\nFlight: QR-611\nAirline: Qatar Airways\nRoute: Islamabad (ISB) -> London Heathrow (LHR) Terminal 4\nArrival Time: 13:30 BST\nCabin: Qsuite Business Class\nSeat: 03E\nBooking Reference: QR7821P\nAircraft: Airbus A350-1000\n\nPriority baggage tags attached.`,
  },
  {
    title: 'British Airways Club World (BA-108 DXB -> LHR)',
    subject: 'Booking Confirmation: BA-108 Dubai (DXB) to London Heathrow (LHR) Terminal 5 - Ref #BA5541X',
    sender: 'British Airways Executive Club <bookings@britishairways.com>',
    snippet: 'Confirmed: BA-108 DXB to LHR Terminal 5, arriving at 07:15 GMT...',
    body: `Dear Chief,\n\nYour flight BA-108 is confirmed.\n\nFlight: BA-108\nRoute: Dubai (DXB) -> London Heathrow (LHR) Terminal 5\nArrival Time: 07:15 GMT\nCabin: Business Class\nSeat: 12B (Club Suite)\nBooking Reference: BA5541X\nAircraft: Boeing 787-9 Dreamliner\n\nArrival lounge breakfast included.`,
  },
  {
    title: 'PIA Executive Economy (PK-302 KHI -> LHE)',
    subject: 'PIA Electronic Ticket: PK-302 Karachi (KHI) to Lahore (LHE) - PNR #PK8832',
    sender: 'PIA Customer Care <tickets@piac.aero>',
    snippet: 'PIA Flight PK-302 scheduled from Karachi (KHI) to Allama Iqbal (LHE) Terminal 1 at 19:10 PKT...',
    body: `Dear Valued Passenger,\n\nYour domestic executive booking is confirmed.\n\nFlight: PK-302\nAirline: PIA\nRoute: Karachi (KHI) -> Lahore (LHE) Terminal 1\nArrival Time: 19:10 PKT\nCabin: Business Class\nSeat: 02C\nPNR: PK8832\n\nVIP Lounge access at Karachi Jinnah International.`,
  },
];
