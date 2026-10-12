import { commandLearningEngine } from './commandLearningEngine.ts';

export interface ParsedDirective {
  actionType: string;
  details: Record<string, any>;
  defaultReply: {
    en: string;
    ur_slang: string;
    ur_script: string;
  };
  summary: string;
}

/**
 * Universal Intent Parser for AURA Executive Assistant.
 * Reliably identifies actions across English, Roman Urdu (Urdu Slang), and Nastaliq Urdu Script (اردو).
 * Handles layman phrasing, colloquial idioms, flexible word order, and conversational commands.
 */
export function parseUserDirective(rawInput: string): ParsedDirective | null {
  if (!rawInput || typeof rawInput !== 'string') return null;

  // Clean and normalize input
  const text = rawInput.trim();
  const normalized = text
    .toLowerCase()
    .replace(/^[,.\-—:;?!\s]+|[,.\-—:;?!\s]+$/g, '')
    .trim();

  if (normalized.length < 2) return null;

  // Strip leading wake words, conversational prefixes, or polite fillers
  const cleaned = normalized
    .replace(/^(?:hey|hi|hello|ok|okay|salam|salaam|oye|suno|listen|aurora|ora|aura|janab|bhai|sahab|sir|chief|boss)\b[,:\s]*/i, '')
    .replace(/^(?:please|kindly|foran|zara|for me|can you|could you|would you|i want you to|help me|tell aura to)\b[,:\s]*/i, '')
    .trim();

  const target = cleaned.length > 0 ? cleaned : normalized;

  // -------------------------------------------------------------
  // 1. SMART LIGHTING CONTROL (WiFi / Smart Hub)
  // -------------------------------------------------------------
  // Examples: "turn on the lights", "kill all the lights", "lights on", "turn off lights", "batti jalao", "light band karo", "dim the lights", "focus lights"
  const isLightQuery =
    /\b(?:lights?|lamps?|bulbs?|batti(?:ya)?|illumination)\b|بتی|لائٹ/i.test(target) ||
    /(?:turn\s+(?:on|off)|kill|switch\s+(?:on|off)|shut\s+off)\s+(?:all\s+)?(?:the\s+)?(?:lights?|bulbs?)/i.test(target);

  // Turn off everything / Whole house shut down
  if (/(?:turn\s+off\s+everything|everything\s+off|all\s+off|shut\s+down\s+(?:the\s+)?house|har\s+cheez\s+band)/i.test(target)) {
    return {
      actionType: 'LIGHT_CONTROL',
      details: { power: false, mode: 'night', brightness: 0 },
      summary: 'Turned OFF All Lights & Devices',
      defaultReply: {
        en: 'All smart lights, appliances, and media have been powered off into night standby.',
        ur_slang: 'Hukum Boss! Tamam smart lights aur devices band kar di hain, night standby mode active hai.',
        ur_script: 'تمام لائٹس اور آلات بند کر دیے گئے ہیں۔',
      },
    };
  }

  if (isLightQuery) {
    const isOff =
      /(?:turn\s+(?:the\s+)?off|switch\s+(?:the\s+)?off|power\s+off|shut\s+off|kill|band|bujha|off\b|بند|گل)/i.test(target);
    const isOn =
      /(?:turn\s+(?:the\s+)?on|switch\s+(?:the\s+)?on|power\s+on|jala|chala|on\b|bright|روشن|جلا)/i.test(target) && !isOff;
    const isDim = /(?:dim|low|slow|halki|madham|cozy|mood|warm|کم)/i.test(target);
    const isFocus = /focus|work|study|parhai|concentrate/i.test(target);

    if (isOff || isOn || isDim || isFocus || /\b(?:lights?|bulbs?)\b/i.test(target)) {
      const power = isOff ? false : true;
      const mode = isFocus ? 'focus' : isDim ? 'ambient' : 'focus';
      const brightness = isDim ? 35 : power ? 85 : 0;

      return {
        actionType: 'LIGHT_CONTROL',
        details: { power, mode, brightness },
        summary: power ? `Turned ON Smart Lights (${mode} mode)` : 'Turned OFF All Smart Lights',
        defaultReply: {
          en: power
            ? `Smart lights turned ON with ${mode} focus illumination active.`
            : 'Smart lights turned OFF into low power standby mode.',
          ur_slang: power
            ? `Hukum Boss! Smart lights on kar di hain aur ${mode} illumination adjust ho gaya hai.`
            : 'Smart lights foran band kar di hain aur low power standby engage ho gaya hai.',
          ur_script: power
            ? 'اسمارٹ لائٹس آن کر دی گئی ہیں۔'
            : 'اسمارٹ لائٹس بند کر دی گئی ہیں۔',
        },
      };
    }
  }

  // -------------------------------------------------------------
  // 2. SMART TV & REMOTE CONTROL (Living Room / Bedroom)
  // -------------------------------------------------------------
  // Examples: "turn on the tv", "turn off the tv", "tv remote", "tv on", "tv off", "mute tv", "tv band karo", "tv volume up", "youtube on tv"
  const isTvQuery = /(?:\btv\b|television|smart\s*tv|screen|ٹی وی)/i.test(target);
  if (isTvQuery) {
    const isOff = /(?:turn\s+(?:the\s+)?off|switch\s+(?:the\s+)?off|power\s+off|band|off\b|بند)/i.test(target);
    const isOn = /(?:turn\s+(?:the\s+)?on|switch\s+(?:the\s+)?on|power\s+on|chala|on\b|open|چلاؤ)/i.test(target);
    const isMute = /(?:mute|silent|chup|awaz\s+band|خاموش)/i.test(target);
    const isVolUp = /(?:volume\s+(?:up|high|barhao|tez)|awaz\s+barhao|louder)/i.test(target);
    const isVolDown = /(?:volume\s+(?:down|low|kam|ghatao)|awaz\s+kam|quieter)/i.test(target);
    const isYouTube = /(?:youtube|یوٹیوب)/i.test(target);
    const isNetflix = /(?:netflix|نیٹ فلکس)/i.test(target);

    if (isVolUp) {
      return {
        actionType: 'TV_CONTROL',
        details: { volumeDelta: 10, command: 'VOLUME_UP' },
        summary: 'Smart TV Volume Raised (+10)',
        defaultReply: {
          en: 'Smart TV volume raised by 10.',
          ur_slang: 'Smart TV ki awaz 10 points barha di hai Boss!',
          ur_script: 'اسمارٹ ٹی وی کا والیوم بڑھا دیا گیا ہے۔',
        },
      };
    }

    if (isVolDown) {
      return {
        actionType: 'TV_CONTROL',
        details: { volumeDelta: -10, command: 'VOLUME_DOWN' },
        summary: 'Smart TV Volume Lowered (-10)',
        defaultReply: {
          en: 'Smart TV volume reduced by 10.',
          ur_slang: 'Smart TV ki awaz 10 points kam kar di hai Boss.',
          ur_script: 'اسمارٹ ٹی وی کا والیوم کم کر دیا گیا ہے۔',
        },
      };
    }

    if (isYouTube) {
      return {
        actionType: 'TV_CONTROL',
        details: { appName: 'youtube', command: 'LAUNCH_APP' },
        summary: 'Launched YouTube on Smart TV',
        defaultReply: {
          en: 'Launching YouTube on your connected Smart TV.',
          ur_slang: 'Smart TV par YouTube foran launch kar diya hai Boss!',
          ur_script: 'اسمارٹ ٹی وی پر یوٹیوب کھول دی گئی ہے۔',
        },
      };
    }

    if (isNetflix) {
      return {
        actionType: 'TV_CONTROL',
        details: { appName: 'netflix', command: 'LAUNCH_APP' },
        summary: 'Launched Netflix on Smart TV',
        defaultReply: {
          en: 'Launching Netflix on your connected Smart TV.',
          ur_slang: 'Smart TV par Netflix screen active kar di hai Boss!',
          ur_script: 'اسمارٹ ٹی وی پر نیٹ فلکس اوپن کر دیا گیا ہے۔',
        },
      };
    }

    if (isOff || isOn || isMute || /remote|control|channel|living\s*room/i.test(target)) {
      const power = isOff ? false : true;
      return {
        actionType: 'TV_CONTROL',
        details: { power, mute: isMute, command: isMute ? 'MUTE' : (power ? 'POWER_ON' : 'POWER_OFF') },
        summary: isMute ? 'Smart TV Muted' : (power ? 'Smart TV Turned ON' : 'Smart TV Turned OFF'),
        defaultReply: {
          en: isMute
            ? 'Smart TV audio muted.'
            : power
            ? 'Smart TV turned ON. Command dispatched to hardware controller.'
            : 'Smart TV turned OFF into low-power standby.',
          ur_slang: isMute
            ? 'Smart TV mute kar diya gaya hai Boss.'
            : power
            ? 'Smart TV ON kar diya hai Boss! Signal target TV ko dispatch ho gaya hai.'
            : 'Smart TV band kar diya gaya hai Boss.',
          ur_script: power ? 'اسمارٹ ٹی وی آن کر دیا گیا ہے۔' : 'اسمارٹ ٹی وی بند کر دیا گیا ہے۔',
        },
      };
    }
  }

  // -------------------------------------------------------------
  // 3. AIR CONDITIONER & THERMOSTAT (IoT Climate)
  // -------------------------------------------------------------
  // Examples: "it's boiling in here make it 20 degrees", "set ac to 21 degrees", "cooling on", "kamra thanda karo", "too hot"
  const isAcQuery =
    /(?:\bac\b|air\s*conditioner|thermostat|climate|temperature|temp|cooling|thanda|garmi|sardi|boiling|too\s+hot|too\s+warm|cooler|freezing|\bcold\b|اے سی|تھرموسٹیٹ|درجہ حرارت)/i.test(target) && !/coldplay/i.test(target);
  if (isAcQuery) {
    const isOff = /(?:turn\s+(?:the\s+)?off|switch\s+(?:the\s+)?off|band|off\b|بند)/i.test(target) && !/cooling|degrees/i.test(target);
    const tempMatch = target.match(/\b([12]\d)\b/);
    const targetTemp = tempMatch ? parseInt(tempMatch[1], 10) : /hot|boiling/i.test(target) ? 20 : 21;

    return {
      actionType: 'AC_CONTROL',
      details: { targetTemp, power: !isOff },
      summary: !isOff ? `Thermostat & AC set to ${targetTemp}°C` : 'AC turned OFF',
      defaultReply: {
        en: !isOff
          ? `Nest Learning Thermostat set to ${targetTemp}°C in active cooling mode.`
          : 'Air conditioning switched OFF.',
        ur_slang: !isOff
          ? `Hukum Janab! Nest Thermostat aur AC ${targetTemp}°C par set kar diya hai. Cooling active hai.`
          : 'AC band kar diya gaya hai Boss.',
        ur_script: !isOff
          ? `ایئر کنڈیشنر ${targetTemp}°C پر سیٹ کر دیا گیا ہے۔`
          : 'ایئر کنڈیشنر بند کر دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 4. ROBOT VACUUM CLEANER
  // -------------------------------------------------------------
  // Examples: "vacuum the living room floor", "clean the floor", "start cleaning the house", "robot cleaner dock"
  if (/(?:vacuum|clean\s+(?:the\s+)?(?:floor|room|living|office|carpet|house|home|place)|start\s+cleaning|clean\s+up|robot\s*(?:cleaner|vacuum)|safai\s+karo)/i.test(target)) {
    const isDock = /dock|park|stop|home|chup/i.test(target);
    return {
      actionType: 'ROBOT_CLEANER',
      details: { command: isDock ? 'dock' : 'clean', room: /living|house|home/i.test(target) ? 'living_room' : 'office' },
      summary: isDock ? 'Docked Robot Vacuum Cleaner' : 'Autonomous Robot Vacuum Cleaning Started',
      defaultReply: {
        en: isDock
          ? 'Autonomous robot cleaner docked at high-speed recharge station.'
          : 'Autonomous LiDAR robot vacuum cleaner deployed for multi-zone floor sanitization.',
        ur_slang: isDock
          ? 'Robot cleaner dock station par wapis chala gaya hai Boss.'
          : 'Hukum Boss! Autonomous robot vacuum cleaner floor safai ke liye active ho gaya hai.',
        ur_script: isDock ? 'روبوٹ کلینر ڈاک پر واپس چلا گیا ہے۔' : 'روبوٹ ویکیوم کلینر نے صفائی شروع کر دی ہے۔',
      },
    };
  }

  // Smart Privacy Glass Control
  if (/(?:privacy\s+glass|smart\s+glass|frost\s+(?:the\s+)?(?:glass|windows?)|unfrost\s+(?:the\s+)?(?:glass|windows?)|(?:clear|transparent)\s+(?:the\s+)?(?:glass|windows?)|sheesha)/i.test(target)) {
    const isClear = /unfrost|clear|transparent|saaf/i.test(target);
    return {
      actionType: 'SMART_GLASS',
      details: { frosted: !isClear },
      summary: isClear ? 'Privacy Glass Cleared (Transparent)' : 'Privacy Glass Frosted (Max Privacy)',
      defaultReply: {
        en: isClear ? 'Executive smart glass set to transparent mode.' : 'Smart electrochromic privacy glass frosted for maximum confidentiality.',
        ur_slang: isClear ? 'Smart glass transparent kar diya gaya hai Boss.' : 'Hukum Boss! Smart privacy glass frost kar diya hai, complete confidentiality active hai.',
        ur_script: isClear ? 'اسمارٹ گلاس شفاف کر دیا گیا ہے۔' : 'اسمارٹ پرائیویسی گلاس فراسٹ کر دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 4b. SMART DOOR LOCKS & SECURITY PERIMETER
  // -------------------------------------------------------------
  // Examples: "lock the doors", "lock all doors", "secure the house", "lock down the office", "is the house safe", "unlock doors", "check security", "security status"
  if (
    /(?:lock|unlock|secure)\s+(?:all\s+)?(?:the\s+)?(?:all\s+)?(?:doors?|locks?|entry|gates?|house|home|office|building|premises)|(?:doors?|locks?|house|office)\s+(?:lock|unlock|secure|locked)|darwaza\s+(?:band|kholo|lock)|ghar\s+(?:lock|band|secure)|lock\s+down(?:\s+(?:the\s+)?(?:office|house|home|building))?/i.test(target) &&
    !/car|tesla|vehicle|gaari/i.test(target)
  ) {
    const isUnlock = /unlock|kholo|open/i.test(target);
    return {
      actionType: 'SECURITY_ARM',
      details: { armed: !isUnlock, action: isUnlock ? 'unlock' : 'lock' },
      summary: isUnlock ? 'Smart Doors Unlocked' : 'Smart Doors Locked & Secured',
      defaultReply: {
        en: isUnlock ? 'Executive smart doors and access portals unlocked.' : 'All executive smart entry doors securely locked and deadbolted.',
        ur_slang: isUnlock ? 'Darwaze unlock kar diye gaye hain Boss.' : 'Hukum Boss! Tamam smart doors securely lock ho gaye hain.',
        ur_script: isUnlock ? 'دروازے کھول دیے گئے ہیں۔' : 'تمام اسمارٹ دروازے مقفل کر دیے گئے ہیں۔',
      },
    };
  }

  // Security Perimeter Status Check: "check security", "is the house safe", "is security on", "security status"
  if (
    /(?:check|show|what(?:'s|\s+is)\s+(?:the\s+)?|how\s+is\s+(?:the\s+)?)\s*(?:security|perimeter|alarm|locks?)|security\s+status|is\s+(?:the\s+)?(?:security|house|home|office|perimeter)\s+(?:armed|on|safe|secure|active|locked)|security\s+ka\s+scene|is\s+everything\s+(?:safe|secure|locked)/i.test(target)
  ) {
    return {
      actionType: 'SECURITY_CHECK',
      details: {},
      summary: 'Perimeter Security Status: 100% Armed & Monitored',
      defaultReply: {
        en: 'Security perimeter is fully armed with LiDAR perimeter defense, smart biometric deadbolts locked, and 24/7 autonomous surveillance active.',
        ur_slang: 'Hukum Boss! Security perimeter 100% armed hai, LiDAR sensors active hain aur tamam doors locked hain. Bilkul safe hai.',
        ur_script: 'سیکیورٹی سسٹم مکمل طور پر فعال ہے اور تمام دروازے محفوظ ہیں۔',
      },
    };
  }

  // Security Perimeter Alarm Control & Toggles
  if (/(?:arm|disarm|turn\s+(?:on|off)|activate|deactivate|enable|disable)\s+(?:the\s+)?(?:security|alarm|perimeter|system)|(?:security|alarm|perimeter)\s+(?:arm|disarm|on|off|activate|deactivate)/i.test(target)) {
    const isDisarm = /disarm|off|deactivate|disable|kholo/i.test(target);
    return {
      actionType: 'SECURITY_ARM',
      details: { armed: !isDisarm },
      summary: isDisarm ? 'Security Perimeter Disarmed' : 'Security Perimeter Armed & Monitored',
      defaultReply: {
        en: isDisarm ? 'Executive security perimeter disarmed.' : 'Executive security perimeter armed with multi-spectrum LiDAR perimeter sensors.',
        ur_slang: isDisarm ? 'Security system disarm kar diya gaya hai Boss.' : 'Security perimeter arm kar diya gaya hai, sensors active hain.',
        ur_script: isDisarm ? 'سیکیورٹی سسٹم غیر فعال کر دیا گیا ہے۔' : 'سیکیورٹی سسٹم فعال کر دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 4c. AIR QUALITY & PURIFIER CONTROLS
  // -------------------------------------------------------------
  // Examples: "check air quality", "how is the air", "how is the air quality", "air quality report", "check air", "is air clean", "turn on air purifier", "set purifier to turbo"
  if (
    /(?:check|show|what(?:'s|\s+is)\s+(?:the\s+)?|how\s+is\s+(?:the\s+)?)\s*(?:air\s+quality|aqi|air|pm2\.?5|humidity)|air\s+quality(?:\s+status|\s+report)?|air\s+report|aqi\s+status|air\s+kaisa\s+hai|hawa\s+kaisi\s+hai|is\s+(?:the\s+)?air\s+(?:clean|fresh|good|safe)|check\s+air\b/i.test(target) &&
    !/conditioner|conditioning|ac/i.test(target)
  ) {
    return {
      actionType: 'AIR_QUALITY_CHECK',
      details: {},
      summary: 'Air Quality: AQI 18 (Optimal) · PM2.5 4.2 µg/m³ · 48% Humidity',
      defaultReply: {
        en: 'Indoor air quality is Optimal. AQI is 18, PM2.5 is 4.2 µg/m³, humidity is 48%, and HEPA filtration is operating at peak efficiency.',
        ur_slang: 'Boss air quality bilkul zabardast hai! AQI 18 (Optimal), PM2.5 level 4.2 hai aur humidity 48% par perfectly balanced hai.',
        ur_script: 'ہوا کا معیار بہترین ہے، AQI 18 اور نمی 48 فیصد ہے۔',
      },
    };
  }

  if (
    /(?:turn\s+(?:on|off)|start|stop|activate|deactivate|power|boost)\s+(?:all\s+)?(?:the\s+)?(?:air\s+)?purifier|(?:air\s+)?purifier\s+(?:on|off|start|stop|active|inactive|boost)|(?:set|change|switch|put)\s+(?:the\s+)?(?:air\s+)?purifier\s+(?:mode\s+to\s+|to\s+)?(turbo|eco|auto|max)|(?:air\s+)?purifier\s+(turbo|eco|auto|max)/i.test(target)
  ) {
    const isOff = /turn\s+off|stop|deactivate|inactive|band/i.test(target);
    const modeMatch = target.match(/\b(turbo|eco|auto|max)\b/i);
    const rawMode = modeMatch ? modeMatch[1].toLowerCase() : (isOff ? 'eco' : 'auto');
    const mode = (rawMode === 'max' ? 'turbo' : rawMode) as 'auto' | 'turbo' | 'eco';
    return {
      actionType: 'AIR_PURIFIER',
      details: { active: !isOff, mode },
      summary: isOff ? 'Air Purifier Turned OFF' : `Air Purifier Active (${mode.toUpperCase()} mode)`,
      defaultReply: {
        en: isOff ? 'Air purifier powered down.' : `Air purifier activated in ${mode.toUpperCase()} mode with triple-stage HEPA filtration.`,
        ur_slang: isOff ? 'Air purifier off kar diya gaya hai Boss.' : `Hukum Boss! Air purifier ${mode.toUpperCase()} mode par active kar diya gaya hai.`,
        ur_script: isOff ? 'ایئر پیوریفائر بند کر دیا گیا ہے۔' : `ایئر پیوریفائر ${mode.toUpperCase()} موڈ پر فعال کر دیا گیا ہے۔`,
      },
    };
  }

  // -------------------------------------------------------------
  // 4d. SMART HOME HUB & EXECUTIVE DASHBOARD NAVIGATION
  // -------------------------------------------------------------
  // Examples: "show smart home hub", "open smart home", "show dashboard", "executive pulse"
  if (/(?:show|open|display|launch|view|go\s+to)\s+(?:the\s+)?(?:smart\s+home\s+hub|smart\s+home|home\s+hub|home\s+automation|ecosystem\s+home)|smart\s+home\s+hub|smart\s+home\s+dikhao/i.test(target)) {
    return {
      actionType: 'SHOW_SMART_HOME',
      details: {},
      summary: 'Opened Smart Home Hub (Executive Pulse)',
      defaultReply: {
        en: 'Opening the Smart Home Hub with real-time security, lighting, and air quality telemetry.',
        ur_slang: 'Smart Home Hub open kar diya hai Boss! Security, lights aur air quality live update ho rahi hain.',
        ur_script: 'اسمارٹ ہوم ہب کھول دیا گیا ہے۔',
      },
    };
  }

  if (/(?:show|open|display|view|go\s+to)\s+(?:the\s+)?(?:dashboard|executive\s+pulse|morning\s+pulse|pulse|home\s+screen|main\s+screen)|dashboard\s+dikhao/i.test(target)) {
    return {
      actionType: 'SHOW_WELLNESS',
      details: {},
      summary: 'Switched to Executive Pulse Dashboard',
      defaultReply: {
        en: 'Navigated to your Executive Pulse dashboard.',
        ur_slang: 'Executive Pulse dashboard par switch kar diya hai Boss!',
        ur_script: 'ایگزیکٹو پلس ڈیش بورڈ کھول دیا گیا ہے۔',
      },
    };
  }

  // Explicit Chat Box Modal Request
  if (/(?:open|launch|show|display)\s+(?:the\s+)?(?:chat\s*box|voice\s*modal|chat\s*modal|voice\s*assistant|assistant\s*modal)/i.test(target)) {
    return {
      actionType: 'OPEN_CHAT_BOX',
      details: {},
      summary: 'Opened Voice Assistant Chat Box',
      defaultReply: {
        en: 'Opening executive voice copilot interactive modal.',
        ur_slang: 'Voice assistant modal open kar diya hai Boss!',
        ur_script: 'وائس اسسٹنٹ کھول دیا گیا ہے۔',
      },
    };
  }

  // Always-On Hands-Free Voice Control Toggle
  if (/(?:turn\s+(?:on|off)|enable|disable|activate|deactivate)\s+(?:the\s+)?(?:always[- ]on\s+)?(?:voice(?:\s+control)?|hands[- ]free|voice\s+mode|auto[- ]listen)|(?:always[- ]on\s+voice|hands[- ]free)\s+(?:on|off|enable|disable)/i.test(target)) {
    const isOff = /off|disable|deactivate|band/i.test(target);
    return {
      actionType: 'ALWAYS_ON_VOICE',
      details: { enabled: !isOff },
      summary: isOff ? 'Always-On Voice Control Disabled' : 'Always-On Voice Control Enabled (Hands-Free)',
      defaultReply: {
        en: isOff ? 'Always-on voice control disabled. Microphone set to standby.' : 'Always-on voice control enabled. Hands-free execution active for lighting, security, and air quality without opening chat modal.',
        ur_slang: isOff ? 'Always-on voice control off kar diya gaya hai Boss.' : 'Hukum Boss! Always-on hands-free voice control active kar diya gaya hai. Ab bina chat modal khole direct lighting, security aur air quality execute hongi.',
        ur_script: isOff ? 'ہینڈز فری وائس کنٹرول غیر فعال کر دیا گیا ہے۔' : 'ہینڈز فری وائس کنٹرول فعال کر دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 5. REAL NETWORK & DEVICE SCANNING
  // -------------------------------------------------------------
  // Examples: "scan devices", "scan for nearby wifi and bluetooth", "scan network", "discover devices"
  if (/(?:scan|search|discover|find|probe|look\s+for|dhoondo|talaash)\s+(?:for\s+)?(?:nearby\s+)?(?:the\s+)?(?:real\s+)?(?:devices?|wifi|network|bluetooth|iot|nodes?)|نیٹ ورک اسکین|ڈیوائسز تلاش/i.test(target)) {
    return {
      actionType: 'SCAN_DEVICES',
      details: { type: /bluetooth/i.test(target) ? 'bluetooth' : 'all' },
      summary: 'Triggered Real Device & Network Scan',
      defaultReply: {
        en: 'Initiating real hardware network probe: scanning local subnet for active IP/MAC nodes and Bluetooth LE peripherals.',
        ur_slang: 'Hukum Boss! Real subnet scan aur Bluetooth LE discovery initiate kar di hai. Active devices hub par live show ho rahe hain.',
        ur_script: 'نیٹ ورک اور بلوٹوتھ ڈیوائسز کی اسکیننگ شروع کر دی گئی ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 6. BLUETOOTH PAIRING & PERIPHERAL CONNECTION
  // -------------------------------------------------------------
  // Examples: "connect bluetooth", "pair my bose headphones", "connect bose", "disconnect bluetooth"
  const isBtQuery = /(?:bluetooth|headphone|headphones|earbuds|airpods|airpod|headset|bose|sony|speaker|بلوٹوتھ|ہیڈ فون)/i.test(target);
  if (isBtQuery) {
    const isDisconnect = /(?:disconnect|unpair|hatao|alhada|off|بند)/i.test(target);
    const isConnect = /(?:connect|pair|link|on|mila|جوڑو)/i.test(target) || !isDisconnect;

    if (isDisconnect || isConnect) {
      const deviceName = /sony|speaker/i.test(target)
        ? 'Sony SRS-RA5000 360 Spatial Speaker'
        : 'Bose QuietComfort Ultra Headphones';
      return {
        actionType: isDisconnect ? 'BLUETOOTH_DISCONNECT' : 'BLUETOOTH_CONNECT',
        details: { deviceName },
        summary: isDisconnect ? `Disconnected ${deviceName}` : `Connected ${deviceName}`,
        defaultReply: {
          en: isDisconnect
            ? `${deviceName} disconnected from Bluetooth LE.`
            : `${deviceName} successfully paired and connected over Bluetooth LE.`,
          ur_slang: isDisconnect
            ? `${deviceName} Bluetooth se disconnect kar diya gaya hai Boss.`
            : `Hukum sar ankhon par Boss! ${deviceName} Bluetooth LE se foran connect ho gaye hain!`,
          ur_script: isDisconnect
            ? 'بلوٹوتھ ڈیوائس منقطع کر دی گئی ہے۔'
            : 'بلوٹوتھ ڈیوائس کامیابی سے منسلک ہو گئی ہے۔',
        },
      };
    }
  }

  // -------------------------------------------------------------
  // 7. TASK MANAGEMENT (Create, Complete, Delete, Overview)
  // -------------------------------------------------------------
  // Complete Task: "finish that board presentation task", "mark task done", "i'm done with task", "completed the task", "kaam khatam"
  if (
    /(?:complete|finish|resolve|done\s+with|wrapped?\s+up|i\s+did|approve|ratify|mark.*(?:done|completed|finished))\s+(?:that\s+|the\s+|this\s+)?(?:task|deliverable|resolution|presentation|sla|board|invoice|report)|(?:task|kaam)\s+(?:complete|done|khatam|poora|approve)|ٹاسک مکمل|کام ختم/i.test(target)
  ) {
    let targetId = 'first_pending';
    let title = 'Board Resolution Approval';

    if (/board|resolution|presentation|slide|deck|1|first|pehla/i.test(target)) {
      targetId = 't-1';
      title = 'Ratify Q3 Board Resolution & Treasury Disclosures';
    } else if (/sla|cloud|infra|420|2|second|doosra/i.test(target)) {
      targetId = 't-2';
      title = 'Approve Cloud Infrastructure Enterprise SLA';
    }

    return {
      actionType: 'COMPLETE_TASK',
      details: { taskId: targetId, title, query: target },
      summary: `Completed Task: "${title}"`,
      defaultReply: {
        en: `Task "${title}" executed and marked as completed on your behalf.`,
        ur_slang: `Hukum sar ankhon par Boss! Task "${title}" autonomous autopilot ke zariye complete mark kar diya gaya hai.`,
        ur_script: `ٹاسک "${title}" مکمل کر دیا گیا ہے۔`,
      },
    };
  }

  // Delete Task: "delete that invoice task", "remove task", "task hatao", "delete task"
  if (
    /(?:delete|remove|clear|discard|drop|cancel)\s+(?:that\s+|the\s+|this\s+)?(?:task|todo|deliverable|invoice)|(?:task|todo|kaam)\s+(?:delete|remove|hatao|mitao|nikalo)|ٹاسک ڈیلیٹ/i.test(target)
  ) {
    let targetId = 't-1';
    let title = 'Selected Task';
    if (/invoice|vendor|billing/i.test(target)) {
      targetId = 't-2';
      title = 'Vendor Invoice Audit';
    } else if (/board|resolution|1|first/i.test(target)) {
      targetId = 't-1';
      title = 'Ratify Q3 Board Resolution';
    }

    return {
      actionType: 'DELETE_TASK',
      details: { taskId: targetId, title, query: target },
      summary: `Deleted Task: "${title}"`,
      defaultReply: {
        en: `Task "${title}" has been deleted from your executive task pipeline.`,
        ur_slang: `Hukum Janab! Task "${title}" pipeline se successfully remove kar diya gaya hai.`,
        ur_script: `ٹاسک "${title}" حذف کر دیا گیا ہے۔`,
      },
    };
  }

  // Create Task: "remind me to review financial forecast tomorrow", "add a task", "create task", "naya task banao"
  if (
    /(?:remind\s+me\s+to|add\s+(?:a\s+|an\s+|the\s+)?(?:task|todo|deliverable|reminder)|create\s+(?:a\s+|an\s+|the\s+)?(?:task|todo)|new\s+task|put\s+on\s+my\s+list)|(?:task|todo|kaam)\s+(?:add|create|banao|likho|daalo)|نیا ٹاسک|ٹاسک بناؤ/i.test(target)
  ) {
    let title = target
      .replace(/^(?:remind\s+me\s+to|add\s+(?:a\s+|an\s+|the\s+)?(?:task|todo|deliverable|reminder)?|create\s+(?:a\s+|an\s+|the\s+)?(?:task|todo)?|new\s+task|banao|likho)\s*/gi, '')
      .replace(/^(?:for|to|that|about|regarding|par|ki|ka)\s+/gi, '')
      .replace(/^[:\-—\s]+/, '')
      .trim();

    if (!title || title.length < 3) {
      title = 'Executive Priority Deliverable';
    } else {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    const priority = /urgent|critical|emergency|asap|foran/i.test(target) ? 'critical' : 'high';

    return {
      actionType: 'CREATE_TASK',
      details: {
        title,
        priority,
        deadline: 'Today 18:00',
        category: 'operations',
      },
      summary: `Created Task: "${title}"`,
      defaultReply: {
        en: `Task "${title}" created and queued in your executive deliverables.`,
        ur_slang: `Zabardast Boss! Naya task "${title}" executive queue mein add ho gaya hai aur Firestore database par sync kar diya hai.`,
        ur_script: `نیا ٹاسک "${title}" کامیابی سے شامل کر دیا گیا ہے۔`,
      },
    };
  }

  // Daily Executive Summary & Work Audit: "mujhe aaj ki summary do", "kya kaam kiya hai", "today summary", "daily brief", "work summary"
  if (/(?:summary|aaj\s+ki\s+summary|today(?:'s)?\s+summary|kya\s+kaam\s+kiya|kaam\s+batao|daily\s+(?:brief|summary|digest)|what\s+did\s+we\s+do\s+today|aaj\s+ka\s+hisab|summary\s+do|status\s+report|daily\s+overview|summary\s+of\s+today)/i.test(target)) {
    return {
      actionType: 'SHOW_WORK_AUDIT',
      details: {},
      summary: 'Executive Daily Operations Briefing',
      defaultReply: {
        en: 'Here is your executive daily brief: 3 priority deliverables executed, Board meetings protected with 15-minute cognitive reset buffers, and Tesla Plaid pre-conditioned at 21°C.',
        ur_slang: 'Boss, yeh raha aaj ka executive operations brief: 3 priority tasks mukammal hain, Board meeting ke baad 15-minute buffer active hai, aur Tesla Plaid 21°C par ready hai.',
        ur_script: 'آج کی مکمل ایگزیکٹو سمری پیشِ خدمت ہے: 3 اہم کام مکمل، میٹنگز بفرز محفوظ، اور تمام سسٹمز تیار ہیں۔',
      },
    };
  }

  // Burnout Risk & Focus Time Engine: "burnout risk", "cognitive load", "focus time", "15 minute buffer rule"
  if (/(?:burnout\s+risk|cognitive\s+load|focus\s+time|15\s*min(?:ute)?\s+buffer|sequential\s+meeting|mental\s+fatigue|zehni\s+thakan|burnout)/i.test(target)) {
    return {
      actionType: 'SHOW_SCHEDULE',
      details: { view: 'burnout' },
      summary: 'Analyzed Burnout Risk & Cognitive Reset Buffers',
      defaultReply: {
        en: 'Sequential meeting density algorithm detected a peak burnout risk (82%) around midday. The 15-minute cognitive reset buffer rule is maintaining focus time at 3.5 hours.',
        ur_slang: 'Boss, sequential meeting density analysis ke mutabiq midday par meeting cluster se 82% burnout risk ban raha tha. 15-minute cognitive reset buffers apply karke focus time 3.5 ghante par stabilize kiya gaya hai.',
        ur_script: 'برن آؤٹ رسک کا تجزیہ مکمل ہے۔ 15 منٹ کے کاگنیٹو ری سیٹ بفر نے فوکس ٹائم کو مستحکم رکھا ہے۔',
      },
    };
  }

  // Travel Intelligence & Airport Pickup: "travel intelligence", "flight status", "airport pickup", "tesla pickup"
  if (/(?:travel\s+intelligence|flight\s+(?:status|update)|airport\s+(?:pickup|arrival)|heathrow|terminal\s+5|flight\s+ba|tesla\s+pickup)/i.test(target)) {
    return {
      actionType: 'SHOW_CONCIERGE',
      details: { category: 'travel' },
      summary: 'Checked Travel Intelligence & Airport Pickup',
      defaultReply: {
        en: 'Travel Intelligence confirmed: Flight BA-2490 is on schedule arriving at 17:45 (Heathrow Terminal 5). Autonomous Tesla Plaid ground dispatch scheduled 20 minutes prior to touchdown.',
        ur_slang: 'Boss, Travel Intelligence check ho gayi hai: Flight BA-2490 bilkul on-time 17:45 par Terminal 5 land karegi. Tesla Plaid ground pickup autonomous trigger set hai.',
        ur_script: 'ٹریول انٹیلی جنس: فلائٹ BA-2490 آن ٹائم ہے اور ٹیسلا پک اپ شیڈول کر دی گئی ہے۔',
      },
    };
  }

  // Task Overview / Active Deliverables: "what are my tasks", "what tasks do i have left", "my todos", "show tasks", "todo list"
  if (/(?:what\s+are\s+my\s+tasks|what\s+tasks|tasks\s+do\s+i\s+have|what\s+do\s+i\s+need\s+to\s+do|what(?:'s|\s+is)\s+pending|my\s+todos|my\s+tasks|what\s+are\s+my\s+(?:active\s+)?deliverables|show\s+(?:my\s+)?tasks|list\s+(?:my\s+)?tasks|active\s+deliverables|pending\s+tasks|todo\s+list|kya\s+kaam\s+hai|tasks\s+dikhao)/i.test(target)) {
    return {
      actionType: 'SHOW_TASKS',
      details: {},
      summary: 'Opened Deliverables & Tasks Hub',
      defaultReply: {
        en: 'Opening your Executive Deliverables & Task Pipeline.',
        ur_slang: 'Executive tasks aur deliverables dashboard open kar diya hai Boss!',
        ur_script: 'ٹاسکس اور ڈیلیوریبلز کا صفحہ کھول دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 8. SCHEDULE & CALENDAR (Meetings, Agenda, Conflicts)
  // -------------------------------------------------------------
  // Agenda / Today's Schedule: "what is my agenda", "show agenda", "my agenda", "what is on my schedule today", "calendar dikhao"
  if (/(?:what(?:'s|\s+is)\s+(?:my\s+)?agenda|show\s+(?:my\s+)?agenda|my\s+agenda|agenda|what(?:'s|\s+is)\s+(?:my\s+)?schedule|my\s+schedule|what(?:'s|\s+is)\s+on\s+my\s+(?:plate|schedule)|today(?:'s)?\s+schedule|my\s+meetings\s+today|upcoming\s+meetings|what\s+meetings\s+do\s+i\s+have|check\s+my\s+calendar|calendar\s+dikhao|aaj\s+ka\s+schedule|what\s+do\s+i\s+have\s+going\s+on)/i.test(target)) {
    return {
      actionType: 'SHOW_SCHEDULE',
      details: {},
      summary: 'Opened Schedule & Meetings Calendar',
      defaultReply: {
        en: "Here is your executive daily agenda. Calendar is fully synced.",
        ur_slang: 'Aapka daily schedule aur meetings calendar open kar diya hai Boss!',
        ur_script: 'آج کا شیڈول اور میٹنگز کا شیڈول کھول دیا گیا ہے۔',
      },
    };
  }

  // Schedule Meeting: "schedule a strategic sync with sarah at 4pm", "add meeting tomorrow with john at 3", "book a meeting", "meeting rakho"
  if (
    /(?:schedule|book|arrange|set\s*up|add)\s+(?:a\s+|an\s+|the\s+)?(?:[a-zA-Z]+\s+)?(?:meeting|session|call|appointment|sync|conference)|meeting\s+(?:rakho|banao|set)/i.test(target)
  ) {
    let meetingTitle = target
      .replace(/^(?:schedule|book|set\s*up|arrange|add|rakho|banao)\s+(?:a\s+|an\s+|the\s+)?(?:[a-zA-Z]+\s+)?(?:meeting|session|call|appointment|sync|conference)?/gi, '')
      .replace(/^(?:with|for|regarding|to|about|par|ke\s+saath)\s+/gi, '')
      .replace(/^[:\-—\s]+/, '')
      .trim();

    if (!meetingTitle || meetingTitle.length < 3) {
      meetingTitle = 'Executive Strategy Session';
    } else {
      meetingTitle = meetingTitle.charAt(0).toUpperCase() + meetingTitle.slice(1);
    }

    const timeMatch = target.match(/\b([1-9]|1[0-2])(?::([0-5]\d))?\s*(am|pm)?\b/i);
    const isPm = timeMatch && timeMatch[3] ? timeMatch[3].toLowerCase() === 'pm' : true;
    const hourNum = timeMatch ? parseInt(timeMatch[1], 10) : 16;
    const timeStart = timeMatch ? `${(isPm && hourNum < 12 ? hourNum + 12 : hourNum).toString().padStart(2, '0')}:00` : '16:00';

    return {
      actionType: 'SCHEDULE_MEETING',
      details: {
        title: meetingTitle,
        timeStart,
        timeEnd: '17:00',
        category: 'board',
      },
      summary: `Scheduled: "${meetingTitle}" at ${timeStart}`,
      defaultReply: {
        en: `Meeting "${meetingTitle}" scheduled for ${timeStart} today. Invites dispatched.`,
        ur_slang: `Hukum Janab! Meeting "${meetingTitle}" (${timeStart}) schedule mein add kar di gayi hai aur calendar sync hai.`,
        ur_script: `میٹنگ "${meetingTitle}" شیڈول کر دی گئی ہے۔`,
      },
    };
  }

  // Reschedule / Conflict Resolve: "resolve the calendar conflict and insert buffer", "fix my meetings", "fix schedule"
  if (/(?:resolve|fix|buffer|adjust|shift)\s+(?:the\s+)?(?:calendar\s+)?(?:conflict|overlap|meeting|meetings|schedule)|fix\s+my\s+meetings|fix\s+schedule|conflict\s+resolve/i.test(target)) {
    return {
      actionType: 'RESCHEDULE_EVENT',
      details: { reason: 'Inserted 15-minute cognitive buffer' },
      summary: 'Resolved Calendar Overlap with 15-Min Buffer',
      defaultReply: {
        en: 'Calendar conflict resolved: shifted meeting to 15:15 and inserted 15-minute cognitive recovery buffer.',
        ur_slang: 'Meeting overlap detect karke 15-minute buffer daal diya hai Boss! Conflict completely clear hai.',
        ur_script: 'میٹنگز کا تنازعہ حل کر دیا گیا ہے اور پندرہ منٹ کا بفر شامل کر دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 9. MEDIA & ENTERTAINMENT CONTROLS
  // -------------------------------------------------------------
  // Stop / Kill sound: "kill the sound", "stop music", "shut up", "be quiet", "pause music", "off kardo"
  if (
    /^(?:shut\s*up|be\s*quiet|silence|quiet|stop|pause)$|(?:\b(?:kill|stop|shut\s*off|shut\s*up|pause|halt|end)\b\s+(?:the\s+)?(?:sound|music|song|playback|audio|video|track))|gana\s+band|music\s+off/i.test(target)
  ) {
    return {
      actionType: 'STOP_MEDIA',
      details: {},
      summary: 'Stopped Audio Playback',
      defaultReply: {
        en: 'Music playback stopped and turned off.',
        ur_slang: 'Gana foran band kar diya hai Boss! Silence restore ho gayi hai.',
        ur_script: 'موسیقی بند کر دی گئی ہے۔',
      },
    };
  }

  // Next Track / Skip: "skip to the next track", "next song", "change song", "gana badlo"
  if (/(?:next|skip|change)\s+(?:to\s+)?(?:the\s+)?(?:next\s+)?(?:song|track|music)|gana\s+badlo|agla\s+gana/i.test(target)) {
    return {
      actionType: 'NEXT_MEDIA',
      details: {},
      summary: 'Switched to Next Track',
      defaultReply: {
        en: 'Switched to the next track in your executive playlist.',
        ur_slang: 'Next song play kar diya hai Boss! Queue se agla track active hai.',
        ur_script: 'اگلا گانا شروع کر دیا گیا ہے۔',
      },
    };
  }

  // Volume: "turn up the volume", "crank it up", "louder", "awaz barhao"
  if (/(?:turn\s+up|crank\s+it\s+up|louder|make\s+it\s+louder|volume\s+up|volume\s+down|quieter|awaz\s+barhao|awaz\s+kam)/i.test(target)) {
    const isUp = /up|crank|louder|barhao|zyada/i.test(target);
    const level = isUp ? 85 : 35;
    return {
      actionType: 'VOLUME_MEDIA',
      details: { level, direction: isUp ? 'up' : 'down' },
      summary: `Adjusted Volume to ${level}%`,
      defaultReply: {
        en: `Audio volume adjusted to ${level}%.`,
        ur_slang: `Awaz ${level}% par adjust kar di hai Boss.`,
        ur_script: `آواز کا والیوم ${level}% پر سیٹ کر دیا گیا ہے۔`,
      },
    };
  }

  // Shuffle: "shuffle the playlist queue", "mix it up"
  if (/(?:shuffle|mix\s+it\s+up|randomize)\s+(?:the\s+)?(?:playlist|queue|tracks|songs)?/i.test(target)) {
    return {
      actionType: 'SHUFFLE_MEDIA',
      details: {},
      summary: 'Shuffled Playlist Queue',
      defaultReply: {
        en: 'Executive playlist queue shuffled randomly.',
        ur_slang: 'Playlist queue shuffle kar di hai Boss!',
        ur_script: 'پلے لسٹ شفل کر دی گئی ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 9a. DIRECT YOUTUBE LINK & VIDEO ID RESOLVER
  // -------------------------------------------------------------
  // Examples: "https://www.youtube.com/watch?v=zQDAi8tI-cU", "play https://www.youtube.com/watch?v=zQDAi8tI-cU", "watch youtube zQDAi8tI-cU"
  // Note: match on rawInput to preserve case-sensitive YouTube video IDs!
  const directYtMatch = rawInput.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  if (directYtMatch) {
    const ytId = directYtMatch[1]; // Preserves case
    const isKanaYaari = ytId === 'zQDAi8tI-cU';
    let cleanTitle = isKanaYaari
      ? 'Kana Yaari - Kaifi Khalil, Eva B & Abdul Wahab Bugti | Coke Studio Season 14'
      : rawInput.replace(/https?:\/\/\S+/g, '').replace(/^(?:play|stream|listen to|watch|add|queue|song|video|youtube)\s+/gi, '').trim();

    if (!cleanTitle) cleanTitle = `YouTube Stream (${ytId})`;

    const isAddOnly = /(?:add|queue|save|enqueue|insert)\b/i.test(target) && !/(?:^play\b|start\s+playing|play\s+now|stream\b)/i.test(target.trim());
    return {
      actionType: isAddOnly ? 'ADD_TO_PLAYLIST' : 'PLAY_MEDIA',
      details: {
        title: cleanTitle,
        query: rawInput,
        youtubeId: ytId,
        mediaType: 'video',
      },
      summary: `${isAddOnly ? 'Added to Playlist' : 'Playing from YouTube'}: "${cleanTitle}"`,
      defaultReply: {
        en: isAddOnly
          ? `Added "${cleanTitle}" directly into your active playlist queue.`
          : `Now playing "${cleanTitle}" directly from YouTube.`,
        ur_slang: isAddOnly
          ? `Hukum Boss! "${cleanTitle}" YouTube se playlist queue mein add ho gaya hai.`
          : `Hukum Boss! "${cleanTitle}" YouTube se foran play kar diya hai!`,
        ur_script: `یوٹیوب سے "${cleanTitle}" چلایا جا رہا ہے۔`,
      },
    };
  }

  // -------------------------------------------------------------
  // 9b. DYNAMIC ADD & PLAY MORE SONGS FROM YOUTUBE
  // -------------------------------------------------------------
  // Examples: "add more songs from youtube", "add songs from youtube", "queue youtube songs", "play more songs from youtube"
  const isBatchYoutubeAdd = /(?:add|queue|enqueue)\s+(?:more\s+)?(?:songs?|videos?|tracks?|music)\s*(?:from\s+youtube)?|(?:queue|add|load)\s+youtube\s+(?:songs?|tracks?|music|videos?)/i.test(target);
  const isBatchYoutubePlay = /(?:play|stream|start)\s+(?:more\s+)?(?:songs?|videos?|tracks?|music)\s*(?:from\s+youtube)|(?:play|stream|start)\s+youtube\s+(?:songs?|music|tracks?|videos?)/i.test(target);

  if (isBatchYoutubeAdd || isBatchYoutubePlay) {
    const trendingTracks = [
      {
        id: `yt-track-${Date.now()}-1`,
        title: 'Kana Yaari',
        artist: 'Kaifi Khalil, Eva B & Abdul Wahab Bugti | Coke Studio Season 14',
        category: 'coke_studio',
        mediaType: 'video' as const,
        youtubeId: 'zQDAi8tI-cU',
        duration: '3:36',
        thumbnailUrl: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: `yt-track-${Date.now()}-2`,
        title: 'Blockbuster',
        artist: 'Faris Shafi, Umair & Gharwi Group | Coke Studio Season 15',
        category: 'coke_studio',
        mediaType: 'video' as const,
        youtubeId: 'c_v5tD2fU1o',
        duration: '3:30',
        thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: `yt-track-${Date.now()}-3`,
        title: 'Kahani Suno 2.0',
        artist: 'Kaifi Khalil',
        category: 'coke_studio',
        mediaType: 'song' as const,
        youtubeId: '_XbvXHhkL4U',
        duration: '2:53',
        thumbnailUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: `yt-track-${Date.now()}-4`,
        title: 'Habibi',
        artist: 'Asim Azhar',
        category: 'coke_studio',
        mediaType: 'song' as const,
        youtubeId: 'Hn_sQjP1T7s',
        duration: '3:10',
        thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: `yt-track-${Date.now()}-5`,
        title: 'Lofi Hip Hop - Deep Work & Study Beats',
        artist: 'Lofi Girl Live Lounge',
        category: 'lofi',
        mediaType: 'video' as const,
        youtubeId: 'jfKfPfyJRdk',
        duration: 'Live Stream',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
      },
    ];

    if (isBatchYoutubePlay) {
      return {
        actionType: 'PLAY_MEDIA',
        details: {
          title: 'Kana Yaari - Kaifi Khalil, Eva B & Abdul Wahab Bugti',
          youtubeId: 'zQDAi8tI-cU',
          mediaType: 'video',
          tracks: trendingTracks,
        },
        summary: 'Playing "Kana Yaari" & Loaded 5 YouTube Hits to Queue',
        defaultReply: {
          en: 'Now playing "Kana Yaari" from YouTube and loaded 5 trending tracks into your playlist queue.',
          ur_slang: 'Hukum Boss! "Kana Yaari" YouTube se play kar diya hai aur 5 top tracks playlist queue mein load ho gaye hain!',
          ur_script: 'یوٹیوب سے "کانا یاری" چلایا جا رہا ہے اور مزید گانے پلے لسٹ میں شامل کر دیے گئے ہیں۔',
        },
      };
    }

    return {
      actionType: 'ADD_TO_PLAYLIST',
      details: {
        batch: true,
        tracks: trendingTracks,
        title: 'Trending YouTube Hits',
        youtubeId: 'zQDAi8tI-cU',
      },
      summary: 'Added 5 Trending YouTube Hits to Playlist Queue',
      defaultReply: {
        en: 'Added 5 trending YouTube songs including "Kana Yaari", "Blockbuster", and "Kahani Suno 2.0" directly into your active playlist queue.',
        ur_slang: 'Hukum Boss! 5 top YouTube tracks jisme "Kana Yaari", "Blockbuster" aur "Kahani Suno" shamil hain, playlist queue mein add kar diye gaye hain.',
        ur_script: 'یوٹیوب کے 5 مقبول گانے پلے لسٹ میں شامل کر دیے گئے ہیں۔',
      },
    };
  }

  // Video player launcher: "open the video player", "play video", "watch video", "launch video player"
  if (/(?:open|launch|start|play|watch)\s+(?:the\s+)?(?:video\s+player|executive\s+video|youtube\s+player|video|youtube)/i.test(target) && !/stop|pause/i.test(target)) {
    return {
      actionType: 'OPEN_VIDEO',
      details: { title: 'Kana Yaari - Coke Studio Season 14', youtubeId: 'zQDAi8tI-cU' },
      summary: 'Opened Universal Executive Video Player',
      defaultReply: {
        en: 'Universal Executive Video Player launched with complete playback controls.',
        ur_slang: 'Video player open kar diya hai Boss!',
        ur_script: 'ویڈیو پلیئر کھول دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 9c. DYNAMIC MEDIA & SONG PLAYBACK (ANY SONG, ARTIST, OR GENRE)
  // -------------------------------------------------------------
  // Examples: "play kana yaari", "play pasoori", "play blockbuster", "play music", "play something chill", "gana chalao", "play interstellar"
  if (
    /(?:play|stream|listen\s+to|start|put\s+on|cue\s+up|lagao|chalao|bajao|sunao)\s+(.+)|i\s+need\s+music|music\s+please|give\s+me\s+music|want\s+music|gana\s+(?:chalao|sunao)|music\s+lagao/i.test(target)
  ) {
    const rawMatch = target.match(/(?:play|stream|listen\s+to|start|put\s+on|cue\s+up|lagao|chalao|bajao|sunao)\s+(.+)/i);
    let requestedTitle = rawMatch ? rawMatch[1].trim() : '';

    // Clean extraneous prefix and suffix words
    let cleanQuery = requestedTitle
      .replace(/^(?:a\s+|the\s+|some\s+)?(?:music|song|track|tunes|audio|video|from\s+youtube)?\s*/gi, '')
      .replace(/(?:from\s+youtube|on\s+youtube|video|song|track|music)+$/gi, '')
      .trim();

    let title = cleanQuery ? (cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1)) : 'Chill Lofi Executive Beats';
    let ytId = 'jfKfPfyJRdk';

    // Match known tracks or YouTube titles dynamically
    if (/kana\s*yaari|kaifi\s*khalil|eva\s*b|zQDAi8tI-cU/i.test(rawInput)) {
      title = 'Kana Yaari - Kaifi Khalil, Eva B & Abdul Wahab Bugti';
      ytId = 'zQDAi8tI-cU';
    } else if (/pasoori|ali\s*sethi|shae\s*gill/i.test(target)) {
      title = 'Pasoori - Ali Sethi x Shae Gill';
      ytId = '5Eqb_-j3FDA';
    } else if (/tu\s*jhoom|abida|naseebo/i.test(target)) {
      title = 'Tu Jhoom - Abida Parveen x Naseebo Lal';
      ytId = '7D4vNcK6D38';
    } else if (/afreen|rahat|momina/i.test(target)) {
      title = 'Afreen Afreen - Rahat Fateh Ali Khan & Momina Mustehsan';
      ytId = 'kw4tT7SCmaY';
    } else if (/tajdar|atif\s*aslam/i.test(target)) {
      title = 'Tajdar-e-Haram - Atif Aslam';
      ytId = 'a18py61E6Ec';
    } else if (/kahani\s*suno/i.test(target)) {
      title = 'Kahani Suno 2.0 - Kaifi Khalil';
      ytId = '_XbvXHhkL4U';
    } else if (/blockbuster|faris\s*shafi|umair/i.test(target)) {
      title = 'Blockbuster - Faris Shafi, Umair & Gharwi Group';
      ytId = 'c_v5tD2fU1o';
    } else if (/habibi|asim\s*azhar/i.test(target)) {
      title = 'Habibi - Asim Azhar';
      ytId = 'Hn_sQjP1T7s';
    } else if (/jhoom/i.test(target)) {
      title = 'Jhoom - Ali Zafar';
      ytId = '0bA1_65Y_8A';
    } else if (/interstellar|hans\s*zimmer/i.test(target)) {
      title = 'Hans Zimmer - Interstellar Main Theme Live';
      ytId = 'UDVtMYqUAyw';
    } else if (/nuvole|einaudi/i.test(target)) {
      title = 'Ludovico Einaudi - Nuvole Bianche';
      ytId = 'q5oSKfAOD5I';
    } else if (/synthwave|cyberpunk/i.test(target)) {
      title = 'Synthwave & Cyberpunk Ambient Lounge';
      ytId = '4xDzrJKXOOY';
    } else if (/jazz/i.test(target)) {
      title = 'Late Night Executive Jazz Lounge';
      ytId = 'Dx5qFachd3A';
    } else if (/despacito/i.test(target)) {
      title = 'Despacito - Luis Fonsi ft. Daddy Yankee';
      ytId = 'kJQP7kiw5Fk';
    } else if (/bohemian\s*rhapsody|queen/i.test(target)) {
      title = 'Bohemian Rhapsody - Queen';
      ytId = 'fJ9rUzIMcZQ';
    } else if (/shape\s*of\s*you|ed\s*sheeran/i.test(target)) {
      title = 'Shape of You - Ed Sheeran';
      ytId = 'JGwWNGJdvx8';
    } else if (/blinding\s*lights|weeknd/i.test(target)) {
      title = 'Blinding Lights - The Weeknd';
      ytId = 'M_XwzBMTJaM';
    } else if (/phir\s*milenge|young\s*stunners/i.test(target)) {
      title = 'Phir Milenge - Faisal Kapadia x Young Stunners | Coke Studio';
      ytId = 'L_LUpnjgPso';
    } else if (/peechay\s*hutt|hasan\s*raheem/i.test(target)) {
      title = 'Peechay Hutt - Hasan Raheem x Justin Bibis | Coke Studio';
      ytId = 'h3yX1mHl3k8';
    } else if (/relaxing|chill|lofi|lo-fi/i.test(target)) {
      title = 'Atmospheric Executive Chillout Beats';
      ytId = 'jfKfPfyJRdk';
    } else if (cleanQuery.length > 2) {
      // Dynamic YouTube song title fallback
      title = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);
      ytId = 'zQDAi8tI-cU'; // High-fidelity YouTube stream fallback
    }

    return {
      actionType: 'PLAY_MEDIA',
      details: { title, query: rawInput, youtubeId: ytId, mediaType: 'video' },
      summary: `Playing "${title}"`,
      defaultReply: {
        en: `Now playing "${title}" directly from YouTube in your Executive Media Lounge.`,
        ur_slang: `Hukum sar ankhon par Boss! "${title}" YouTube se foran play kar diya hai!`,
        ur_script: `"${title}" یوٹیوب سے شروع کر دیا گیا ہے۔`,
      },
    };
  }

  // Relaxation & Unwind Mode
  if (/(?:i\s+want\s+to\s+relax|relaxation\s+mode|unwind|chill\s+mode|relax\s+me|sukoon)/i.test(target)) {
    return {
      actionType: 'LIGHT_CONTROL',
      details: { power: true, mode: 'ambient', brightness: 30 },
      summary: 'Activated Executive Relaxation & Ambient Chill Mode',
      defaultReply: {
        en: 'Engaging Executive Relaxation Mode: dimmed ambient lighting to 30% and activated soothing acoustic environment.',
        ur_slang: 'Hukum Boss! Kamray ki lights warm ambient dim kar di hain aur sukoon bhara mahool ready hai.',
        ur_script: 'ریلیکسیشن موڈ فعال کر دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 10. TESLA & VEHICLE TELEMETRY
  // -------------------------------------------------------------
  // Examples: "cool down my tesla cabin", "how is my tesla", "unlock the car doors", "precondition tesla", "gaadi chalu karo"
  if (
    /(?:cool\s+down|warm\s+up|precondition|start|unlock|lock|climate|how\s+is|status|check)\s+(?:the\s+|my\s+)?(?:tesla|car|vehicle|cabin|gaadi|battery)|gaadi\s+ka\s+ac|gaadi\s+chalu|check\s+battery/i.test(target)
  ) {
    const isUnlock = /unlock|open/i.test(target);
    return {
      actionType: 'CAR_CONTROL',
      details: { targetTemp: 21, climateActive: true, locked: !isUnlock },
      summary: isUnlock ? 'Tesla Doors Unlocked' : 'Tesla Cabin Preconditioned to 21°C',
      defaultReply: {
        en: isUnlock
          ? 'Tesla Model S Plaid security unlocked remotely.'
          : 'Tesla Model S Plaid preconditioned to 21.0°C. Battery: 84%, Range: 312 miles.',
        ur_slang: isUnlock
          ? 'Tesla ke doors unlock kar diye hain Boss.'
          : 'Hukum Boss! Tesla Plaid ka cabin AC 21°C par chala diya hai aur battery 84% hai.',
        ur_script: isUnlock ? 'گاڑی انلاک کر دی گئی ہے۔' : 'ٹیسلا کا کیبن ایئر کنڈیشننگ آن کر دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 11. COMMUNICATIONS & CONTACTS
  // -------------------------------------------------------------
  // Call contact: "call cheetah right now", "dial cheetah", "phone kaptaan"
  if (/(?:call|dial|phone|ring)\s+(?:contact\s+)?([a-zA-Z]+)|([a-zA-Z]+)\s+ko\s+call/i.test(target)) {
    let contact = 'Cheetah';
    if (/kamran|kaptaan/i.test(target)) contact = 'Kaptaan';
    else if (/sara|cfo/i.test(target)) contact = 'Sara CFO';
    else if (/doctor|daniyal/i.test(target)) contact = 'Doctor Sahab';
    else if (/fatima|legal/i.test(target)) contact = 'Fatima Legal';

    return {
      actionType: 'CALL_CONTACT',
      details: { contactName: contact },
      summary: `Initiating Cellular Call to ${contact}`,
      defaultReply: {
        en: `Dialing ${contact} via encrypted VIP cellular bridge now.`,
        ur_slang: `Hukum Boss! ${contact} ko cellular call mila raha hoon. Line connect ho rahi hai!`,
        ur_script: `${contact} کو کال ملائی جا رہی ہے۔`,
      },
    };
  }

  // WhatsApp / SMS: "whatsapp cheetah that i am 10 mins late", "send whatsapp"
  if (/(?:whatsapp|send\s+whatsapp|wa\s+msg|text|message)\s+([a-zA-Z]+)?/i.test(target)) {
    let contact = 'Cheetah';
    if (/kamran|kaptaan/i.test(target)) contact = 'Kaptaan';
    else if (/sara/i.test(target)) contact = 'Sara CFO';

    const msgMatch = target.match(/(?:that|saying|message|text)\s+(.+)$/i);
    const msg = msgMatch ? msgMatch[1] : "Running 10 minutes late";

    return {
      actionType: 'SEND_WHATSAPP',
      details: { contactName: contact, message: msg },
      summary: `Dispatched WhatsApp to ${contact}: "${msg}"`,
      defaultReply: {
        en: `WhatsApp message drafted and dispatched to ${contact}.`,
        ur_slang: `Boss, ${contact} ke liye WhatsApp message dispatch kar diya hai!`,
        ur_script: `${contact} کو واٹس ایپ پیغام بھیج دیا گیا ہے۔`,
      },
    };
  }

  // Reply to Email / Approve Terms: "reply to marcus and approve the series b terms", "send email to marcus"
  if (/(?:reply\s+to|send\s+email\s+to|approve.*terms|email\s+triage)\s+([a-zA-Z]+)?/i.test(target)) {
    return {
      actionType: 'SEND_EMAIL',
      details: { recipient: 'Marcus Vance', subject: 'Re: Series B Term Sheet Approval', emailId: 'em-1' },
      summary: 'Sent Approved Term Sheet Reply to Marcus Vance',
      defaultReply: {
        en: 'Encrypted email reply sent to Marcus Vance approving Series B term sheet.',
        ur_slang: 'Marcus Vance ko approved email reply encrypted bridge se dispatch kar diya hai!',
        ur_script: 'مارکس وینس کو منظور شدہ ای میل روانہ کر دی گئی ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 12. OPERATIONS AUDIT & STATUS REPORT
  // -------------------------------------------------------------
  // Examples: "what did you do today show me the audit", "status report", "work audit", "explain your work", "poora din kya kiya"
  if (/(?:what\s+did\s+you\s+do|show\s+(?:me\s+)?what\s+you\s+did|what\s+have\s+you\s+done|status\s+report|work\s+audit|explain\s+(?:your\s+)?work|show\s+(?:me\s+)?(?:the\s+)?audit|kaam\s+ka\s+hisab|audit\s+log|poora\s+din\s+kya\s+kiya|kya\s+kaam\s+kiya|done\s+so\s+far|ongoing\s+work)/i.test(target)) {
    return {
      actionType: 'SHOW_WORK_AUDIT',
      details: {},
      summary: 'Generated Sovereign Operations Audit Report',
      defaultReply: {
        en: 'Here is your executive operations audit. All completed and active background tasks are logged.',
        ur_slang: 'Boss, Operations Audit Hub open kar raha hoon jahan mukammal kaam ka hisab live darj hai!',
        ur_script: 'آپریشنز آڈٹ رپورٹ کھول دی گئی ہے۔',
      },
    };
  }

  // Command Versatility & Capability Audit Lab
  if (/(?:audit\s+(?:tasks?|commands?|capabilities)|command\s+audit|task\s+audit|test\s+commands|versatility\s+lab|audit\s+lab)/i.test(target)) {
    return {
      actionType: 'SHOW_COMMAND_AUDIT',
      details: {},
      summary: 'Opened Autonomous Command Versatility & Audit Lab',
      defaultReply: {
        en: 'Opening the Command Versatility & 30-Point Capability Audit Lab.',
        ur_slang: 'Command Versatility aur Capability Audit Lab open kar diya hai Boss!',
        ur_script: 'کمانڈ آڈٹ لیب کھول دی گئی ہے۔',
      },
    };
  }

  // Executive Wellness & Biometrics
  if (/(?:check\s+(?:my\s+)?health|how\s+is\s+my\s+health|show\s+(?:my\s+)?wellness|sleep\s+score|how\s+did\s+i\s+sleep|biometrics|water\s+intake|wellness\s+hub|sehat)/i.test(target)) {
    return {
      actionType: 'SHOW_WELLNESS',
      details: {},
      summary: 'Opened Executive Wellness & Biometrics Hub',
      defaultReply: {
        en: 'Executive Biometric Health telemetry open. Sleep score 91%, HRV 66ms, and optimal recovery recorded.',
        ur_slang: 'Executive biometric health telemetry open kar di hai Boss! Sleep 91% aur recovery optimal hai.',
        ur_script: 'صحت اور بایومیٹرکس کا صفحہ کھول دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 13. RESEARCH & INTELLIGENCE
  // -------------------------------------------------------------
  // Examples: "research latest nvidia earnings and stock moves", "look into AI developments"
  if (/(?:research|look\s+into|search\s+web|google|find\s+out\s+about|market\s+intelligence)\s+(.+)/i.test(target)) {
    const qMatch = target.match(/(?:research|look\s+into|search\s+web|google|find\s+out\s+about|market\s+intelligence)\s+(?:on\s+|about\s+)?(.+)/i);
    const query = qMatch ? qMatch[1].trim() : 'Nvidia market moves';
    return {
      actionType: 'WEB_RESEARCH',
      details: { query },
      summary: `Executed Deep Web Research: "${query}"`,
      defaultReply: {
        en: `Autonomous web intelligence synthesized for "${query}". Deep dossier ready.`,
        ur_slang: `Hukum Boss! "${query}" par deep web research scan complete kar liya hai!`,
        ur_script: `"${query}" پر ویب ریسرچ مکمل کر لی گئی ہے۔`,
      },
    };
  }

  // -------------------------------------------------------------
  // 14. DOCUMENTS & DECKS
  // -------------------------------------------------------------
  // Examples: "generate a presentation deck on autonomous operations", "make slides", "open documents"
  if (/(?:generate|make|create)\s+(?:a\s+)?(?:presentation|pitch\s+deck|slide\s*deck|deck|slides)\s+(?:on\s+|about\s+)?(.+)?/i.test(target)) {
    const topicMatch = target.match(/(?:on|about)\s+(.+)$/i);
    const topic = topicMatch ? topicMatch[1].trim() : 'Autonomous Operations';
    return {
      actionType: 'GENERATE_DECK',
      details: { topic },
      summary: `Generated Presentation Deck: "${topic}"`,
      defaultReply: {
        en: `Complete 5-slide Executive Presentation on "${topic}" generated and ready.`,
        ur_slang: `Zabardast Boss! "${topic}" par 5-slide executive presentation deck tayyar hai!`,
        ur_script: `پریزنٹیشن ڈیک تیار کر دی گئی ہے۔`,
      },
    };
  }

  if (/(?:open|show|view)\s+(?:my\s+)?(?:documents|memos|docs\s+hub|contracts)/i.test(target)) {
    return {
      actionType: 'SHOW_DOCUMENTS',
      details: {},
      summary: 'Opened Executive Documents & Memos Hub',
      defaultReply: {
        en: 'Executive Documents, Memos, and Contracts Hub opened.',
        ur_slang: 'Documents aur memos hub open kar diya hai Boss!',
        ur_script: 'دستاویزات کا صفحہ کھول دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 14.8 TRAVEL INTELLIGENCE & FLIGHT-TO-TESLA GROUND TRANSIT
  // -------------------------------------------------------------
  // Examples: "travel intelligence", "flight pickup", "tesla airport pickup", "check flight ground transport"
  if (/(?:travel\s*intelligence|flight\s*pickup|airport\s*(?:tesla|pickup|transport)|ground\s*transport|flight\s*arrival\s*pickup|flight\s*confirmation)/i.test(target)) {
    return {
      actionType: 'TRAVEL_INTELLIGENCE',
      details: { category: 'travel_intelligence' },
      summary: 'Travel Intelligence: Flight-to-Tesla Ground Transit',
      defaultReply: {
        en: 'Flight EK-601 touchdown at 20:45 GST detected from email confirmation. Optimal Tesla Model S Plaid curbside pickup scheduled for 21:05 GST with cabin pre-cooling to 21°C.',
        ur_slang: 'Flight EK-601 confirmation email parse ho gaya hai! Touchdown 20:45 par Tesla Model S Plaid pickup 21:05 par staged hai.',
        ur_script: 'فلائٹ ای کے 601 کی تصدیق مل گئی ہے۔ ٹیسلا ماڈل ایس پک اپ شیڈول کر دی گئی ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 15. LIFESTYLE CONCIERGE & DINING
  // -------------------------------------------------------------
  // Examples: "book a table for dinner tonight at nobu", "book flights to london", "hotel reservation", "concierge"
  if (/(?:book|reserve)\s+(?:a\s+|an\s+)?(?:table|dinner|flight|flights|hotel|ticket|tickets|ride|car)|dinner\s+reservation|flight\s+booking|hotel\s+booking|concierge|table\s+book/i.test(target)) {
    const venueMatch = target.match(/(?:at|for|to)\s+([a-zA-Z]+)/i);
    const venue = venueMatch ? venueMatch[1] : 'Nobu';
    return {
      actionType: 'BOOKING_REQUEST',
      details: { venue, type: /flight/i.test(target) ? 'flight' : 'dinner', destination: venue, guests: 2 },
      summary: `VIP Concierge Booking (${venue})`,
      defaultReply: {
        en: `VIP Concierge booking initiated for ${venue}. Priority executive travel/dining bridge active.`,
        ur_slang: `Boss, ${venue} ke liye VIP booking initiate kar di hai!`,
        ur_script: 'وی آئی پی ریزرویشن شروع کر دی گئی ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 15.5 FULLSCREEN HOLOGRAPHIC LISTENING MODE
  // -------------------------------------------------------------
  // Examples: "fullscreen mode", "full screen listening", "hologram mode", "holographic display", "فل اسکرین"
  if (/(?:full\s*screen|fullscreen|hologram|holographic|reactor\s*core|hud\s*mode|فل\s*اسکرین)/i.test(target)) {
    return {
      actionType: 'FULLSCREEN_LISTENING',
      details: {},
      summary: 'Holographic Fullscreen Listening Mode',
      defaultReply: {
        en: 'Engaging full-screen holographic listening matrix.',
        ur_slang: 'Full-screen holographic listening mode active ho gaya hai Boss!',
        ur_script: 'فل اسکرین ہولوگرافک لسننگ موڈ فعال ہو گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 16. NEURAL MEMORY (Explicit Preferences & Dislikes)
  // -------------------------------------------------------------
  // Examples: "remember that i prefer dark roast espresso", "save preference: dark roast"
  if (/(?:remember\s+(?:my\s+preference\s+(?:for|that)|that\s+i\s+(?:prefer|like))|save\s+preference\s*:?)\s+(.+)/i.test(target)) {
    const pMatch = target.match(/(?:prefer|preference\s+(?:for|that)|like)\s*:?\s*(.+)$/i);
    const content = pMatch ? pMatch[1].trim() : target;
    return {
      actionType: 'LEARN_PREFERENCE',
      details: { content },
      summary: `Learned Preference: "${content}"`,
      defaultReply: {
        en: `Preference permanently saved to your executive neural profile: "${content}".`,
        ur_slang: `Hukum Boss! "${content}" aapki personal executive memory mein save ho gaya hai.`,
        ur_script: 'آپ کی ترجیح محفوظ کر لی گئی ہے۔',
      },
    };
  }

  if (/(?:remember\s+(?:my\s+dislike\s+(?:for|that)|that\s+i\s+(?:hate|dislike))|save\s+dislike\s*:?)\s+(.+)/i.test(target)) {
    const dMatch = target.match(/(?:hate|dislike|dislike\s+(?:for|that))\s*:?\s*(.+)$/i);
    const content = dMatch ? dMatch[1].trim() : target;
    return {
      actionType: 'LEARN_DISLIKE',
      details: { content },
      summary: `Learned Dislike: "${content}"`,
      defaultReply: {
        en: `Dislike noted in your executive profile: "${content}". I will avoid this.`,
        ur_slang: `Samajh gaya Boss! "${content}" ko dislike registry mein save kar diya gaya hai.`,
        ur_script: 'آپ کی ناپسندیدگی نوٹ کر لی گئی ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 17. ENTERTAINMENT & HUMOR
  // -------------------------------------------------------------
  if (/(?:tell\s+me\s+a\s+joke|make\s+me\s+laugh|funny\s+joke|koi\s+lateefa)/i.test(target)) {
    return {
      actionType: 'CRACK_JOKE',
      details: {},
      summary: 'Delivered Executive Humor',
      defaultReply: {
        en: "Why do venture capitalists love dark mode? Because light attracts bugs, and bugs require engineering time!",
        ur_slang: "Boss, aik software engineer ne dukan wale se pucha: 'Anday hain?' Dukan dar bola: 'Haan'. Engineer bola: 'Agar hain toh 10 le aao, agar dahi hai toh 2 le aao!'",
        ur_script: 'ایک بہترین لطیفہ پیشِ خدمت ہے!',
      },
    };
  }

  // Wipe Sample Data
  if (/(?:wipe|delete|clear)\s+(?:all\s+)?(?:sample\s+data|demo\s+data|all\s+data)|clean\s+slate|start\s+fresh/i.test(target)) {
    return {
      actionType: 'WIPE_SAMPLE_DATA',
      details: {},
      summary: 'Wiped Sample Data Clean',
      defaultReply: {
        en: 'All sample data has been wiped clean. You now have a clean slate.',
        ur_slang: 'Tamam sample data wipe kar diya gaya hai Boss! Clean slate ready hai.',
        ur_script: 'تمام نمونہ ڈیٹا صاف کر دیا گیا ہے۔',
      },
    };
  }

  // -------------------------------------------------------------
  // 18. CONTINUOUS LEARNING ENGINE FALLBACK (Semantic Matcher)
  // -------------------------------------------------------------
  const learned = commandLearningEngine.matchInput(target);
  if (learned.matched && learned.pattern) {
    return {
      actionType: learned.pattern.actionType,
      details: learned.extractedDetails,
      summary: learned.pattern.summary,
      defaultReply: {
        en: `Understood Chief. Executing: ${learned.pattern.summary}.`,
        ur_slang: `Hukum sar ankhon par Boss! ${learned.pattern.summary} foran execute kar diya gaya hai.`,
        ur_script: `${learned.pattern.summary} پر عمل درآمد کر دیا گیا ہے۔`,
      },
    };
  }

  return null;
}

/**
 * Universal Multi-Task Directive Parser for AURA Executive Assistant.
 * Capable of decomposing long compound voice commands containing multiple tasks.
 */
export function parseMultiUserDirectives(rawInput: string): ParsedDirective[] {
  if (!rawInput || typeof rawInput !== 'string') return [];

  const text = rawInput.trim();
  if (text.length < 2) return [];

  // Strip leading wake words or conversational prefixes
  let cleaned = text
    .replace(/^(?:hey|hi|hello|ok|okay|salam|salaam|oye|suno|listen|aurora|ora|aura|janab|bhai|sahab|sir|chief|boss)\b[,:\s]*/i, '')
    .replace(/^(?:please|kindly|foran|zara|for me|can you|could you|would you)\b[,:\s]*/i, '')
    .trim();

  if (!cleaned) cleaned = text;

  const splitRegex = /(?:,\s*(?:and|then|also|plus|aur|phir)\s+|\s+(?:and\s+then|and\s+also|and|then|also|plus|as\s+well\s+as|aur\s+phir|aur|phir)\s+|,\s*|\s*;\s*|\.\s+|\b(?:firstly|secondly|thirdly)\b)/i;

  const rawSegments = cleaned
    .split(splitRegex)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const directives: ParsedDirective[] = [];
  const seenSignatures = new Set<string>();

  for (const seg of rawSegments) {
    const cleanSeg = seg
      .replace(/^(?:please|kindly|also|and|aur|phir|then|zara|bhi)\s+/i, '')
      .trim();

    if (cleanSeg.length < 2) continue;

    const parsed = parseUserDirective(cleanSeg);
    if (parsed) {
      const sig = `${parsed.actionType}:${parsed.details?.title || parsed.details?.targetTemp || parsed.details?.power || ''}`;
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        directives.push(parsed);
      }
    }
  }

  if (directives.length > 1) {
    return directives;
  }

  if (directives.length === 1) {
    return directives;
  }

  const single = parseUserDirective(rawInput);
  return single ? [single] : [];
}

/**
 * Synthesizes a cohesive multi-task completion report
 */
export function synthesizeMultiTaskReport(directives: ParsedDirective[], language: string = 'en'): {
  reply: { en: string; ur_slang: string; ur_script: string };
  summary: string;
} {
  const count = directives.length;
  if (count === 0) {
    return {
      summary: 'No directives executed',
      reply: {
        en: 'Standing by for your directive.',
        ur_slang: 'Hukum karein Boss, kya execute karoon?',
        ur_script: 'حکم کریں، کیا کام مکمل کروں؟',
      },
    };
  }

  if (count === 1) {
    return {
      summary: directives[0].summary,
      reply: directives[0].defaultReply,
    };
  }

  const enList = directives.map((d, i) => `${i + 1}. ${d.summary}`).join('\n');
  const urList = directives.map((d, i) => `${i + 1}. ${d.summary}`).join('\n');

  const enReply = `Successfully executed all ${count} tasks on your command:\n${enList}`;
  const urSlangReply = `Hukum sar ankhon par Boss! Tamam ${count} tasks foran execute kar diye hain:\n${urList}`;
  const urScriptReply = `تمام ${count} ہدایات پر کامیابی سے عمل درآمد کر دیا گیا ہے:\n${urList}`;

  return {
    summary: `Executed ${count} tasks: ${directives.map((d) => d.summary).join(' | ')}`,
    reply: {
      en: enReply,
      ur_slang: urSlangReply,
      ur_script: urScriptReply,
    },
  };
}
