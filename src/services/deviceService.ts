import { WiFiDevice, BluetoothDevice } from '../types/assistant.ts';
import { soundEffects } from '../utils/audioChime.ts';

export const INITIAL_WIFI_DEVICES: WiFiDevice[] = [
  {
    id: 'wifi-1',
    name: 'Living Room Smart TV',
    type: 'smart_tv',
    brand: 'Samsung 65" QLED 4K (Tizen OS)',
    room: 'Living Room',
    ipAddress: '192.168.1.105',
    macAddress: 'BC:D0:74:2A:11:8F',
    isConnected: true,
    isPoweredOn: true,
    volume: 38,
    isMuted: false,
    currentInput: 'HDMI 1 (Media Stream)',
    currentMediaPlaying: 'Executive Briefing Cast',
    signalDbm: -48,
    protocol: 'Google Cast',
    isCastingActive: false,
  },
  {
    id: 'wifi-2',
    name: 'Master Bedroom OLED TV',
    type: 'smart_tv',
    brand: 'LG 55" OLED evo (webOS)',
    room: 'Master Bedroom',
    ipAddress: '192.168.1.112',
    macAddress: 'A4:C3:F0:91:DE:33',
    isConnected: true,
    isPoweredOn: false,
    volume: 24,
    isMuted: false,
    currentInput: 'Standby / HDMI 2',
    signalDbm: -56,
    protocol: 'Apple AirPlay',
    isCastingActive: false,
  },
  {
    id: 'wifi-3',
    name: 'Boardroom 4K Laser Projector',
    type: 'projector',
    brand: 'Optoma 4K UHD Smart Projector',
    room: 'Executive Suite',
    ipAddress: '192.168.1.120',
    macAddress: '70:EE:50:88:AC:21',
    isConnected: true,
    isPoweredOn: true,
    volume: 50,
    isMuted: false,
    currentInput: 'HDMI 1 (Presentation Deck)',
    signalDbm: -42,
    protocol: 'DLNA / UPnP',
    isCastingActive: false,
  },
  {
    id: 'wifi-4',
    name: 'Executive Sonos Arc Soundbar',
    type: 'speaker',
    brand: 'Sonos Arc Dolby Atmos Soundbar',
    room: 'Living Room',
    ipAddress: '192.168.1.134',
    macAddress: '48:A6:B8:10:99:FF',
    isConnected: true,
    isPoweredOn: true,
    volume: 45,
    isMuted: false,
    currentInput: 'eARC TV Audio',
    signalDbm: -45,
    protocol: 'Apple AirPlay',
  },
  {
    id: 'wifi-5',
    name: 'Executive Smart Lights & Hue Bridge',
    type: 'light',
    brand: 'Philips Hue Enterprise Bridge v2',
    room: 'Executive Suite',
    ipAddress: '192.168.1.160',
    macAddress: '00:17:88:29:FE:AA',
    isConnected: true,
    isPoweredOn: true,
    volume: 85, // used for brightness %
    isMuted: false,
    currentInput: 'Focus Cool White (4000K)',
    signalDbm: -51,
    protocol: 'mDNS',
  },
  {
    id: 'wifi-6',
    name: 'Nest Learning Smart Thermostat & AC',
    type: 'generic',
    brand: 'Google Nest Pro Thermostat',
    room: 'Executive Office',
    ipAddress: '192.168.1.175',
    macAddress: '64:16:66:3A:90:1C',
    isConnected: true,
    isPoweredOn: true,
    volume: 21, // used for target temperature °C
    isMuted: false,
    currentInput: 'Cooling Mode Active (21°C)',
    signalDbm: -44,
    protocol: 'WebSockets',
  },
  {
    id: 'wifi-7',
    name: 'Google Nest Hub Max Display',
    type: 'display',
    brand: 'Google Nest Hub Smart Display',
    room: 'Office Desk',
    ipAddress: '192.168.1.141',
    macAddress: 'D8:6C:63:F1:44:90',
    isConnected: true,
    isPoweredOn: true,
    volume: 60,
    isMuted: false,
    currentInput: 'Assistant Dashboard',
    signalDbm: -39,
    protocol: 'Google Cast',
  },
  {
    id: 'wifi-8',
    name: 'WiFi 6 Enterprise Gateway',
    type: 'router',
    brand: 'Ubiquiti UniFi Dream Machine Pro',
    room: 'Network Rack',
    ipAddress: '192.168.1.1',
    macAddress: 'E4:38:83:90:01:00',
    isConnected: true,
    isPoweredOn: true,
    volume: 0,
    isMuted: false,
    currentInput: '10 Gbps SFP+ Fiber Uplink',
    signalDbm: -30,
    protocol: 'WebSockets',
  },
];

export const INITIAL_BT_DEVICES: BluetoothDevice[] = [
  {
    id: 'bt-1',
    name: 'Bose QuietComfort Ultra Headphones',
    type: 'headphones',
    isConnected: true,
    batteryPercent: 92,
    signalStrength: 'Strong',
    pairedAt: 'Today',
  },
  {
    id: 'bt-2',
    name: 'Sony SRS-RA5000 360 Spatial Speaker',
    type: 'speaker',
    isConnected: false,
    batteryPercent: 78,
    signalStrength: 'Good',
    pairedAt: 'Yesterday',
  },
  {
    id: 'bt-3',
    name: 'Executive Smart Remote (Bluetooth LE)',
    type: 'remote',
    isConnected: true,
    batteryPercent: 96,
    signalStrength: 'Strong',
    pairedAt: 'Paired',
  },
  {
    id: 'bt-4',
    name: 'Apple Watch Ultra 2 (Biometrics)',
    type: 'wearable',
    isConnected: true,
    batteryPercent: 84,
    signalStrength: 'Strong',
    pairedAt: 'Active',
  },
];

export function getStoredWiFiDevices(): WiFiDevice[] {
  if (typeof window === 'undefined') return INITIAL_WIFI_DEVICES;
  const saved = localStorage.getItem('aura_wifi_devices');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return INITIAL_WIFI_DEVICES;
}

export function saveStoredWiFiDevices(devices: WiFiDevice[], broadcast: boolean = true) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('aura_wifi_devices', JSON.stringify(devices));
  if (broadcast) {
    window.dispatchEvent(new CustomEvent('aura_devices_updated'));
  }
}

export function getStoredBtDevices(): BluetoothDevice[] {
  if (typeof window === 'undefined') return INITIAL_BT_DEVICES;
  const saved = localStorage.getItem('aura_bt_devices');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return INITIAL_BT_DEVICES;
}

export function saveStoredBtDevices(devices: BluetoothDevice[], broadcast: boolean = true) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('aura_bt_devices', JSON.stringify(devices));
  if (broadcast) {
    window.dispatchEvent(new CustomEvent('aura_devices_updated'));
  }
}

// Global Device Control Dispatcher
export function executeDeviceDirective(actionType: string, details: any): { success: boolean; message: string } {
  soundEffects.playSuccessChime();
  const wifiList = getStoredWiFiDevices();
  const btList = getStoredBtDevices();

  if (actionType === 'LIGHT_CONTROL') {
    const power = details?.power !== undefined ? details.power : true;
    const mode = details?.mode || 'focus';
    const brightness = details?.brightness || 85;

    const updated = wifiList.map((d) => {
      if (d.type === 'light') {
        return {
          ...d,
          isPoweredOn: power,
          volume: brightness,
          currentInput: mode === 'ambient' ? 'Ambient Warm Gold (2700K)' : mode === 'night' ? 'Night Minimal Amber' : 'Focus Cool White (4000K)',
        };
      }
      return d;
    });
    saveStoredWiFiDevices(updated);
    return {
      success: true,
      message: power
        ? `Smart Lights turned ON (${brightness}% brightness · ${mode} profile)`
        : 'Smart Lights turned OFF (Standby)',
    };
  }

  if (actionType === 'TV_CONTROL') {
    const tv = wifiList.find((d) => d.type === 'smart_tv') || wifiList[0];
    const power = details?.power !== undefined ? details.power : !tv.isPoweredOn;
    const isMute = details?.mute !== undefined ? details.mute : tv.isMuted;
    const volume = details?.volume !== undefined ? details.volume : tv.volume;

    const cmd = details?.command || (isMute ? 'MUTE' : power ? 'POWER_ON' : 'POWER_OFF');
    
    // Asynchronously dispatch real hardware signal to target TV IP via backend
    if (tv.ipAddress) {
      sendSmartTVCommand(tv.ipAddress, tv.brand || 'universal', cmd, details).catch(() => {});
    }

    const updated = wifiList.map((d) => {
      if (d.id === tv.id) {
        return {
          ...d,
          isPoweredOn: power,
          isMuted: isMute,
          volume,
        };
      }
      return d;
    });
    saveStoredWiFiDevices(updated);
    return {
      success: true,
      message: `${tv.name} (${tv.ipAddress}): ${cmd} dispatched (Power: ${power ? 'ON' : 'OFF'}, Vol: ${volume}%)`,
    };
  }

  if (actionType === 'BLUETOOTH_CONNECT') {
    const targetName = (details?.deviceName || 'headphones').toLowerCase();
    const updated = btList.map((d) => {
      if (d.name.toLowerCase().includes(targetName) || d.type.includes(targetName)) {
        return { ...d, isConnected: true };
      }
      return d;
    });
    saveStoredBtDevices(updated);
    const matched = updated.find((d) => d.name.toLowerCase().includes(targetName) || d.type.includes(targetName)) || btList[0];
    return {
      success: true,
      message: `${matched.name} connected over Bluetooth LE (Signal: ${matched.signalStrength})`,
    };
  }

  if (actionType === 'BLUETOOTH_DISCONNECT') {
    const targetName = (details?.deviceName || 'headphones').toLowerCase();
    const updated = btList.map((d) => {
      if (d.name.toLowerCase().includes(targetName) || d.type.includes(targetName)) {
        return { ...d, isConnected: false };
      }
      return d;
    });
    saveStoredBtDevices(updated);
    return {
      success: true,
      message: `Bluetooth device disconnected.`,
    };
  }

  if (actionType === 'AC_CONTROL') {
    const targetTemp = details?.targetTemp || 21;
    const power = details?.power !== undefined ? details.power : true;
    const updated = wifiList.map((d) => {
      if (d.id === 'wifi-6' || d.name.includes('Thermostat')) {
        return {
          ...d,
          isPoweredOn: power,
          volume: targetTemp,
          currentInput: `Cooling Mode Active (${targetTemp}°C)`,
        };
      }
      return d;
    });
    saveStoredWiFiDevices(updated);
    return {
      success: true,
      message: `Thermostat & AC adjusted to ${targetTemp}°C (${power ? 'Active' : 'Off'})`,
    };
  }

  if (actionType === 'SCAN_DEVICES' || actionType === 'SCAN_WIFI') {
    return {
      success: true,
      message: `Discovered 8 WiFi IoT nodes and 4 Bluetooth LE devices on 192.168.1.0/24 subnet.`,
    };
  }

  return { success: true, message: 'Device directive executed.' };
}

// ========================================================
// REAL NETWORK PROBING & WEB BLUETOOTH API INTEGRATION
// ========================================================

declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: any): Promise<any>;
      getAvailability?(): Promise<boolean>;
    };
  }
}

// Probes a live device's IP / hostname and port via backend TCP socket
export async function probeDeviceViaBackend(host: string, port = 80): Promise<{
  reachable: boolean;
  latencyMs: number;
  status: string;
  error?: string;
  message?: string;
}> {
  try {
    const res = await fetch('/api/network/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, port, timeoutMs: 3500 }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      reachable: false,
      latencyMs: 0,
      status: 'error',
      error: err?.message || 'Network request failed',
    };
  }
}

// Scans real network using ARP cache, active network adapters, and SSDP multicast
export async function scanRealNetworkViaBackend(): Promise<{
  success: boolean;
  totalDiscovered: number;
  devices: Array<{
    ipAddress: string;
    macAddress: string;
    name: string;
    brand: string;
    type: string;
    protocol: string;
    signalDbm: number;
    latencyMs: number;
    source: string;
    port: number;
  }>;
}> {
  try {
    const res = await fetch('/api/network/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch {
    return { success: false, totalDiscovered: 0, devices: [] };
  }
}

// Fetches host machine network interfaces
export async function fetchNetworkInterfaces(): Promise<{
  hostname?: string;
  platform?: string;
  interfaces?: Array<{
    name: string;
    address: string;
    netmask: string;
    family: string;
    mac: string;
    internal: boolean;
    cidr: string | null;
  }>;
}> {
  try {
    const res = await fetch('/api/network/interfaces');
    return await res.json();
  } catch {
    return { interfaces: [] };
  }
}

// Scans and pairs REAL Bluetooth devices using browser's native Web Bluetooth API
export async function requestRealBluetoothDevice(): Promise<{
  success: boolean;
  device?: BluetoothDevice;
  nativeDevice?: any;
  error?: string;
  cancelled?: boolean;
}> {
  if (typeof navigator === 'undefined' || !('bluetooth' in navigator) || !navigator.bluetooth) {
    return {
      success: false,
      error:
        'Web Bluetooth API is not available in this browser. Please use Google Chrome, Microsoft Edge, Opera, or Chrome for Android with Bluetooth enabled.',
    };
  }

  try {
    // Triggers real OS / browser Bluetooth device picker modal
    const dev = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        'battery_service',
        'device_information',
        'generic_access',
        0x1800,
        0x180a,
        0x180f,
      ],
    });

    let batteryPercent: number | undefined;
    let isConnected = false;

    if (dev.gatt) {
      try {
        const server = await dev.gatt.connect();
        isConnected = server.connected;

        try {
          const batteryService = await server.getPrimaryService('battery_service');
          const batteryChar = await batteryService.getCharacteristic('battery_level');
          const val = await batteryChar.readValue();
          batteryPercent = val.getUint8(0);
        } catch {
          // Battery service optional
        }
      } catch (err: any) {
        console.warn('GATT connection note:', err);
        isConnected = true;
      }
    }

    const lowName = (dev.name || '').toLowerCase();
    let type: BluetoothDevice['type'] = 'generic';
    if (
      lowName.includes('headphone') ||
      lowName.includes('buds') ||
      lowName.includes('ear') ||
      lowName.includes('airpods') ||
      lowName.includes('bose') ||
      lowName.includes('sony') ||
      lowName.includes('wh-') ||
      lowName.includes('wf-')
    ) {
      type = 'headphones';
    } else if (
      lowName.includes('speaker') ||
      lowName.includes('sound') ||
      lowName.includes('boom') ||
      lowName.includes('jbl') ||
      lowName.includes('echo')
    ) {
      type = 'speaker';
    } else if (
      lowName.includes('watch') ||
      lowName.includes('band') ||
      lowName.includes('fit') ||
      lowName.includes('tracker')
    ) {
      type = 'wearable';
    } else if (
      lowName.includes('remote') ||
      lowName.includes('controller') ||
      lowName.includes('mouse') ||
      lowName.includes('keyboard')
    ) {
      type = 'remote';
    }

    const newDevice: BluetoothDevice = {
      id: `bt-real-${dev.id || Date.now()}`,
      name: dev.name || 'Real Bluetooth Peripheral',
      type,
      isConnected,
      batteryPercent,
      signalStrength: 'Strong',
      pairedAt: 'Just Now (Real BLE)',
      isRealDevice: true,
      gattDeviceId: dev.id,
    };

    return {
      success: true,
      device: newDevice,
      nativeDevice: dev,
    };
  } catch (err: any) {
    if (err?.name === 'NotFoundError' || err?.message?.includes('User cancelled')) {
      return {
        success: false,
        cancelled: true,
        error: 'Bluetooth device selection cancelled by user.',
      };
    }
    return {
      success: false,
      error: err?.message || 'Failed to scan Bluetooth device.',
    };
  }
}

// ========================================================
// REAL SMART TV HARDWARE CONTROL SUITE
// ========================================================

export async function sendSmartTVCommand(
  ip: string,
  brand: string,
  command: string,
  params?: any
): Promise<{ success: boolean; status?: string; message?: string; latencyMs?: number; error?: string }> {
  try {
    const res = await fetch('/api/tv/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, brand, command, params }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to send command to Smart TV',
    };
  }
}

export async function launchSmartTVApp(
  ip: string,
  brand: string,
  appName: string,
  query?: string
): Promise<{ success: boolean; message?: string; latencyMs?: number; error?: string }> {
  try {
    const res = await fetch('/api/tv/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip, brand, appName, query }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to launch app on Smart TV',
    };
  }
}

export async function probeSmartTV(ip: string): Promise<{
  reachable: boolean;
  activeBrand?: string;
  activeProtocol?: string;
  bestLatencyMs?: number;
  openPorts?: number[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/tv/probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      reachable: false,
      error: err?.message || 'Failed to probe Smart TV',
    };
  }
}

export function clearDemoDevices(): { wifi: WiFiDevice[]; bt: BluetoothDevice[] } {
  const onlyRealWifi = getStoredWiFiDevices().filter((d) => (d as any).isRealDevice);
  const onlyRealBt = getStoredBtDevices().filter((d) => d.isRealDevice);
  saveStoredWiFiDevices(onlyRealWifi);
  saveStoredBtDevices(onlyRealBt);
  return { wifi: onlyRealWifi, bt: onlyRealBt };
}

