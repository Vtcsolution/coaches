const { OpenAI } = require("openai");
const axios = require("axios");
const ChatMessage = require("../models/chatMessage");
const AiPsychic = require("../models/aiPsychic");
const AiFormData = require("../models/aiFormData");
const { getCoordinatesFromCity } = require("../utils/geocode");
const { getRequiredFieldsByType } = require("../utils/formLogic");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const mongoose = require("mongoose");
const ActiveSession = require("../models/ActiveSession");
const { checkAndUpdateTimer } = require("../utils/timerUtils");
const { processEmojis, addContextualEmojis } = require("../utils/emojiUtils");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.trim(),
});

if (!process.env.OPENAI_API_KEY) {
  process.exit(1);
}

const auth = {
  username: process.env.ASTROLOGY_API_USER_ID,
  password: process.env.ASTROLOGY_API_KEY,
};

if (process.env.HUMAN_DESIGN_API_KEY && !process.env.GEO_API_KEY) {
  console.warn("⚠️ HUMAN_DESIGN_API_KEY found but GEO_API_KEY is missing. Human Design readings may fail.");
}

// ✅ NEW: Language detection helper
const detectLanguage = (text) => {
  // Simple language detection - you can enhance this with more sophisticated logic
  const dutchWords = ['wat', 'hoe', 'ik', 'jij', 'mijn', 'jouw', 'wil', 'heb', 'ben', 'heb', 'dit', 'dat', 'hier', 'daar', 'nu', 'dan', 'als', 'met', 'voor', 'van', 'op', 'in', 'uit', 'door', 'over', 'onder', 'boven', 'naast', 'tussen', 'bij', 'naar', 'vanaf', 'tot', 'sinds', 'totdat', 'waarbij', 'waardoor', 'waarmee', 'waarin', 'waarom', 'waarvoor', 'waarna', 'waartoe', 'waartegen', 'waarvoor', 'waarvan', 'waarop', 'waarin', 'waar', 'wie', 'wat', 'welke', 'wanneer', 'waarom', 'hoe', 'zoveel', 'zoiets', 'zo', 'dus', 'toch', 'toch', 'misschien', 'waarschijnlijk', 'zeker', 'natuurlijk', 'nee', 'ja', 'misschien', 'alsjeblieft', 'dankje', 'sorry', 'excuseer', 'goedemorgen', 'goedemiddag', 'goedenavond', 'welterusten', 'totziens', 'doeg', 'hoi', 'hallo', 'hey', 'hallo', 'goed', 'fijn', 'leuk', 'mooi', 'lekker', 'heerlijk', 'prachtig', 'geweldig', 'fantastisch', 'bizar', 'gek', 'raar', 'vreemd', 'eng', 'griezelig', 'spannend', 'interessant', 'fascinerend', 'vervelend', 'irritant', 'stom', 'dom', 'slim', 'intelligent', 'moeilijk', 'makkelijk', 'eenvoudig', 'complex', 'simpel', 'duidelijk', 'onduidelijk', 'begrijpelijk', 'onbegrijpelijk', 'logisch', 'onlogisch', 'normaal', 'abnormaal', 'typisch', 'uniek', 'speciaal', 'gewoon', 'alledaags', 'dagelijks', 'wekelijks', 'maandelijks', 'jaarlijks', 'toekomst', 'verleden', 'heden', 'vandaag', 'morgen', 'gisteren', 'overmorgen', 'eergisteren', 'week', 'maand', 'jaar', 'leven', 'dood', 'liefde', 'relatie', 'vriend', 'vriendin', 'familie', 'werk', 'geld', 'succes', 'geluk', 'ongeluk', 'gelukkig', 'ongelukkig', 'tevreden', 'ontevreden', 'blij', 'verdrietig', 'boos', 'bang', 'verliefd', 'verward', 'duidelijk', 'onzeker', 'zeker', 'twijfel', 'hoop', 'angst', 'droom', 'doel', 'plan', 'idee', 'gedachte', 'gevoel', 'emotie', 'hart', 'hoofd', 'ziel', 'lichaam', 'geest', 'energie', 'kracht', 'zwakte', 'sterkte', 'zwakheid', 'moed', 'angst', 'vertrouwen', 'twijfel', 'geloof', 'ongeloof', 'waarheid', 'leugen', 'eerlijk', 'oneerlijk', 'rechtvaardig', 'onrechtvaardig', 'goed', 'kwaad', 'wit', 'zwart', 'grijs', 'rood', 'blauw', 'groen', 'geel', 'paars', 'oranje', 'roze', 'bruin', 'goud', 'zilver', 'koper', 'ijzer', 'staal', 'glas', 'hout', 'steen', 'water', 'vuur', 'aarde', 'lucht', 'hemel', 'zee', 'rivier', 'berg', 'vallei', 'bos', 'boom', 'bloem', 'gras', 'blad', 'wortel', 'zaad', 'vrucht', 'appel', 'banaan', 'sinaasappel', 'druif', 'aardbei', 'kers', 'perzik', 'peer', 'meloen', 'watermeloen', 'ananas', 'mango', 'kiwi', 'citroen', 'limoen', 'kokosnoot', 'noot', 'pinda', 'amandel', 'hazelnoot', 'walnoot', 'kastanje', 'brood', 'kaas', 'melk', 'boter', 'ei', 'kip', 'vlees', 'vis', 'zalm', 'tonijn', 'kabeljauw', ' garnalen', 'mosselen', 'oester', 'kreeft', 'rijst', 'pasta', 'noedels', 'pizza', 'hamburger', 'friet', 'salade', 'soep', 'stoofpot', 'roerbak', 'sushi', 'tapas', 'tapenade', 'olijven', 'tomaten', 'komkommer', 'paprika', 'wortel', 'ui', 'knoflook', 'gember', 'kerrie', 'peper', 'zout', 'suiker', 'honing', 'jam', 'chocolade', 'ijs', 'taart', 'koek', 'wafel', 'pannenkoek', 'crêpe', 'stroop', 'slagroom', 'yoghurt', 'kwark', 'vla', 'pudding', 'koffie', 'thee', 'water', 'frisdrank', 'bier', 'wijn', 'whisky', 'gin', 'vodka', 'rum', 'cognac', 'likeur', 'cocktail', 'martini', 'mojito', 'margarita', 'piña colada', 'bloody mary', 'manhattan', 'old fashioned', 'negroni', 'daiquiri', 'cosmo', 'sidecar', 'french 75', 'sazerac', 'mai tai', 'zombie', 'dark n stormy', 'moscow mule', 'gin tonic', 'vodka soda', 'whisky sour', 'tequila sunrise', 'sex on the beach', 'long island iced tea', 'grasshopper', 'white russian', 'black russian', 'espresso martini', 'french connection', 'godfather', 'rusty nail', 'vieux carré', 'suffering bastard', 'monkey gland', 'bee\'s knees', 'southside', 'last word', 'corpse reviver', 'aviation', 'mary pickford', 'between the sheets', 'sidecar', 'french 75', 'sazerac', 'mai tai', 'zombie', 'dark n stormy', 'moscow mule', 'gin tonic', 'vodka soda', 'whisky sour', 'tequila sunrise', 'sex on the beach', 'long island iced tea'];

  const textLower = text.toLowerCase().trim();
  const words = textLower.split(/\s+/).filter(word => word.length > 2);
  
  // Check if any Dutch words are present
  const hasDutchWords = words.some(word => dutchWords.includes(word));
  
  // If no Dutch words found, assume English (or other) and force Dutch response
  return hasDutchWords ? 'nl' : 'en';
};

// ✅ ENHANCED: Improved Human Design API function with User schema integration and Google Geocoding
async function fetchHumanDesignData(birthDate, birthTime, birthPlace, userId = null) {
  // Early validation
  if (!birthDate || !birthTime || !birthPlace) {
    console.warn(`[HumanDesign] Missing required data for user ${userId}: date=${!!birthDate}, time=${!!birthTime}, place=${!!birthPlace}`);
    return {
      type: "Data Missing",
      authority: "Data Missing",
      profile: "Data Missing",
      centers: {},
      gates: [],
      channels: [],
      error: "Please provide birth date, time, and place for accurate Human Design reading",
      status: 400
    };
  }

  try {
    // 1. Validate and format date
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid birth date: ${birthDate}`);
    }

    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    const formattedDate = `${day}-${month}-${year}`;
    
    console.log(`[HumanDesign] Processing for user ${userId}: ${formattedDate} ${birthTime} - ${birthPlace}`);

    // 2. API Key validation
    if (!process.env.HUMAN_DESIGN_API_KEY) {
      throw new Error("Human Design API key not configured");
    }

    if (!process.env.GEO_API_KEY) {
      throw new Error("Google Geocoding API key not configured for Human Design");
    }

    // 3. Clean birth time format
    const cleanBirthTime = birthTime.replace(/[^0-9:]/g, ''); // Remove any non-numeric characters except colon

    // 4. Make API request with location string (API will geocode using HD-Geocode-Key)
    const requestPayload = {
      birthdate: formattedDate,     // "05-Sep-90"
      birthtime: cleanBirthTime,   // "21:17"
      location: birthPlace.trim(), // Send location string, not coordinates
    };

    console.log(`[HumanDesign] API Payload:`, JSON.stringify(requestPayload, null, 2));

    const response = await axios.post(
      'https://api.humandesignapi.nl/v1/bodygraphs',
      requestPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'HD-Api-Key': process.env.HUMAN_DESIGN_API_KEY.trim(),
          'HD-Geocode-Key': process.env.GEO_API_KEY.trim(), // ✅ ADDED GOOGLE GEOCODING KEY
          'Accept': 'application/json'
        },
        timeout: 30000, // Increased timeout
        validateStatus: function (status) {
          return status < 500; // Accept 4xx responses too
        }
      }
    );

    console.log(`[HumanDesign] API Response Status: ${response.status}`);
    console.log(`[HumanDesign] API Response Keys:`, Object.keys(response.data || {}));

    // 5. Validate response structure
    if (response.status !== 200) {
      throw new Error(`API returned status ${response.status}: ${JSON.stringify(response.data || {})}`);
    }

    if (!response.data || typeof response.data !== 'object') {
      throw new Error(`Invalid API response format: ${JSON.stringify(response.data)}`);
    }

    // 6. Extract and validate key fields
    const humanDesignData = {
      type: response.data.type || response.data.hd_type || "Unknown",
      authority: response.data.authority || response.data.inner_authority || "Unknown", 
      profile: response.data.profile || response.data.profile_line || "Unknown",
      centers: response.data.centers || {},
      gates: response.data.gates || [],
      channels: response.data.channels || [],
      incarnationCross: response.data.incarnationCross || response.data.cross || "Unknown",
      strategy: response.data.strategy || "Follow Your Authority",
      status: "success",
      apiResponse: response.data // Keep full response for debugging
    };

    console.log(`[HumanDesign] SUCCESS for user ${userId}: Type=${humanDesignData.type}, Authority=${humanDesignData.authority}, Profile=${humanDesignData.profile}`);
    return humanDesignData;

  } catch (err) {
    console.error(`[HumanDesign] DETAILED ERROR for user ${userId}:`, {
      message: err.message,
      birthDate,
      birthTime,
      birthPlace,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      stack: err.stack
    });

    // More specific error messages
    let errorMessage = "Unable to generate Human Design chart";
    if (err.response?.status === 401) {
      errorMessage = "Human Design API authentication failed - check API key";
    } else if (err.response?.status === 400) {
      errorMessage = "Invalid birth data format for Human Design calculation";
    } else if (err.code === 'ECONNABORTED') {
      errorMessage = "Human Design API timeout - please try again";
    } else if (err.message.includes('ENOTFOUND')) {
      errorMessage = "Human Design API service temporarily unavailable";
    } else if (err.message.includes('Google Geocoding')) {
      errorMessage = "Geocoding service unavailable - please check location spelling";
    }

    return {
      type: "Error",
      authority: "Error", 
      profile: "Error",
      centers: {},
      gates: [],
      channels: [],
      error: errorMessage,
      status: err.response?.status || 500,
      rawError: err.message
    };
  }
}

// ✅ IMPROVED: Expanded Human Design details with traits and more explanation
const humanDesignTypeTraits = {
  'Generator': 'Je hebt duurzame energie en reageert op het leven via je Sacrale centrum. Je bent ontworpen om te doen wat je opwindt en te reageren op kansen. 🔥',
  'Projector': 'Je bent een gids voor anderen, met een focus op systemen en efficiëntie. Wacht op uitnodigingen om je wijsheid te delen en voorkom uitputting. 👁️',
  'Manifestor': 'Je initieert actie en informeert anderen over je plannen. Je energie komt in bursts; rust is essentieel om impact te maken zonder weerstand. ⚡',
  'Manifesting Generator': 'Je bent multi-taskend en efficiënt, met snelle energie. Reageer op wat je exciteert en skip wat niet werkt. 🚀',
  'Reflector': 'Je weerspiegelt de gezondheid van je gemeenschap. Wacht een maan cyclus voor grote beslissingen om clarity te krijgen. 🌙'
};

const getHumanDesignDetails = (hdData, person = "You") => {
  if (!hdData) {
    return `${person} Human Design: No data available. Please ensure complete birth information (date, time, place).`;
  }
  
  if (hdData.status === 'success' || hdData.type !== 'Error' && hdData.type !== 'Data Missing') {
    const typeEmoji = {
      'Generator': '🔥', 'Projector': '👁️', 'Manifestor': '⚡', 
      'Manifesting Generator': '🚀', 'Reflector': '🌙'
    }[hdData.type] || '🔮';
    
    const strategy = hdData.strategy || {
      'Generator': 'Wait to Respond', 'Projector': 'Wait for Invitation', 
      'Manifestor': 'Inform Before Acting', 'Manifesting Generator': 'Wait to Respond',
      'Reflector': 'Wait a Lunar Cycle'
    }[hdData.type] || 'Follow Your Authority';

    const typeTraits = humanDesignTypeTraits[hdData.type] || 'Ontdek je unieke energie en strategie voor een vervullend leven.';
    
    return `
${person} Human Design:
• Type: ${hdData.type} ${typeEmoji} - ${typeTraits}
• Authority: ${hdData.authority} (Beslissingsstrategie gebaseerd op je innerlijke wijsheid)
• Profile: ${hdData.profile} (Je rol en hoe anderen je zien)
• Strategy: ${strategy} (Hoe je het beste navigeert door het leven)
• Incarnation Cross: ${hdData.incarnationCross} (Je levensdoel en thema)
    `.trim();
  }
  
  return `
${person} Human Design: ${hdData.error || 'Unable to process at this time'}
💡 Tip: Human Design requires exact birth time and place for accuracy
  `.trim();
};

// ✅ NEW: Helper function to fetch user birth data from User schema
// ✅ FIXED: Enhanced User Birth Data function with proper date handling
async function getUserBirthData(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.warn(`[UserData] No user found for ID: ${userId}`);
      return null;
    }

    // ✅ FIXED: Handle Date object properly - convert to string for consistency
    const birthDateStr = user.dob instanceof Date 
      ? user.dob.toISOString().split('T')[0] // "2025-09-07"
      : user.dob || null;

    // ✅ FIXED: Format birth time as string
    const birthTimeStr = user.birthTime 
      ? user.birthTime.toString().padStart(5, '0') // Ensure HH:MM format
      : "12:00";

    console.log(`[UserData] Raw user.dob type: ${typeof user.dob}, value:`, user.dob);
    console.log(`[UserData] Formatted birthDateStr: ${birthDateStr}`);

    // Map User schema fields to standard format
    return {
      name: user.username || user.firstName || "Dear Friend",
      birthDate: birthDateStr, // ✅ FIXED: Always string format
      birthTime: birthTimeStr, // ✅ FIXED: Always string format
      birthPlace: user.birthPlace || "Amsterdam, Netherlands",
      rawBirthDate: user.dob, // Keep original Date object for calculations
      hasCompleteData: !!(birthDateStr && birthTimeStr !== "12:00" && user.birthPlace),
      rawUser: user
    };
  } catch (error) {
    console.error(`[UserData] Error fetching user ${userId}:`, error.message);
    return null;
  }
}
async function getPreciseTimezone(lat, lon, date) {
  try {
    const tzRes = await axios.post(
      "https://json.astrologyapi.com/v1/timezone_with_dst",
      { latitude: lat, longitude: lon, date: date },
      { auth, timeout: 5000 }
    );
    console.log(`[Timezone API] Fetched timezone for lat:${lat}, lon:${lon}, date:${date} -> ${tzRes.data.timezone}`);
    return tzRes.data.timezone || 0;
  } catch (err) {
    console.error(`[Timezone API Error] lat:${lat}, lon:${lon}, date:${date} - ${err.message}`);
    return 0;
  }
}

function getSignFromDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date)) return null;

  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Taurus";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Gemini";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Scorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Sagittarius";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Capricorn";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Aquarius";
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Pisces";
  
  return null;
}

const parseTime = (timeStr = "") => {
  const [hourStr, minStr] = timeStr.split(":");
  return {
    hour: parseInt(hourStr, 10) || 12,
    min: parseInt(minStr, 10) || 0,
  };
};

const parseDateParts = (dateStr = "") => {
  if (!dateStr || isNaN(Date.parse(dateStr))) {
    return { day: 1, month: 1, year: 2000 };
  }
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
};

const getWesternChartData = async (formData, coords) => {
  try {
    const { hour, min } = parseTime(formData.birthTime);
    
    // ✅ FIXED: Ensure date is properly formatted for timezone API
    const birthDateStr = formData.birthDate instanceof Date 
      ? formData.birthDate.toISOString().split('T')[0] 
      : new Date(formData.birthDate).toISOString().split('T')[0];
    
    console.log(`[Western Chart] Processing birth data:`, {
      date: birthDateStr,
      time: formData.birthTime,
      place: formData.birthPlace || coords.city,
      coords: coords
    });

    // Get timezone first
    const timezone = await getPreciseTimezone(
      coords.latitude,
      coords.longitude,
      birthDateStr
    );

    // ✅ FIXED: Ensure all payload values are numbers, not strings
    const birthDate = new Date(formData.birthDate);
    const payload = {
      day: parseInt(birthDate.getDate()),
      month: parseInt(birthDate.getMonth() + 1),
      year: parseInt(birthDate.getFullYear()),
      hour: parseInt(hour),
      min: parseInt(min),
      lat: parseFloat(coords.latitude),
      lon: parseFloat(coords.longitude),
      tzone: parseInt(timezone),
      house_system: "placidus"
    };

    // ✅ ENHANCED: Validate payload before sending
    const requiredFields = ['day', 'month', 'year', 'hour', 'min', 'lat', 'lon', 'tzone'];
    const missingFields = requiredFields.filter(field => isNaN(payload[field]) || payload[field] === null || payload[field] === undefined);
    
    if (missingFields.length > 0) {
      throw new Error(`Invalid payload fields: ${missingFields.join(', ')}`);
    }


    // ✅ ENHANCED: Make API calls with individual error handling
    let chartRes, planetsRes, housesRes;
    
    try {
      // Chart data
      console.log(`[Western Chart API] Calling western_chart_data...`);
      chartRes = await axios.post("https://json.astrologyapi.com/v1/western_chart_data", payload, { 
        auth, 
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`[Western Chart API] Chart response status: ${chartRes.status}`);
      console.log(`[Western Chart API] Chart response keys:`, Object.keys(chartRes.data || {}));
      
      if (!chartRes.data || typeof chartRes.data !== 'object') {
        throw new Error(`Invalid chart response format: ${JSON.stringify(chartRes.data)}`);
      }
    } catch (chartError) {
      console.error(`[Western Chart API] Chart error:`, chartError.response?.status, chartError.message, JSON.stringify(chartError.response?.data, null, 2));
      throw new Error(`Chart API failed: ${chartError.response?.data?.error || chartError.message}`);
    }

    try {
      // Planets data
      console.log(`[Western Chart API] Calling planets/tropical...`);
      planetsRes = await axios.post("https://json.astrologyapi.com/v1/planets/tropical", payload, { 
        auth, 
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`[Western Chart API] Planets response status: ${planetsRes.status}`);
      console.log(`[Western Chart API] Planets response keys:`, Object.keys(planetsRes.data || {}));
      
      if (!planetsRes.data || !Array.isArray(planetsRes.data)) {
        throw new Error(`Invalid planets response format: ${JSON.stringify(planetsRes.data)}`);
      }
    } catch (planetsError) {
      console.error(`[Western Chart API] Planets error:`, planetsError.response?.status, planetsError.message, JSON.stringify(planetsError.response?.data, null, 2));
      throw new Error(`Planets API failed: ${planetsError.response?.data?.error || planetsError.message}`);
    }

    try {
      // Houses data
      console.log(`[Western Chart API] Calling house_cusps/tropical...`);
      housesRes = await axios.post("https://json.astrologyapi.com/v1/house_cusps/tropical", payload, { 
        auth, 
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`[Western Chart API] Houses response status: ${housesRes.status}`);
      console.log(`[Western Chart API] Houses response keys:`, Object.keys(housesRes.data || {}));
      
      if (!housesRes.data || typeof housesRes.data !== 'object') {
        throw new Error(`Invalid houses response format: ${JSON.stringify(housesRes.data)}`);
      }
    } catch (housesError) {
      console.error(`[Western Chart API] Houses error:`, housesError.response?.status, housesError.message, JSON.stringify(housesError.response?.data, null, 2));
      throw new Error(`Houses API failed: ${housesError.response?.data?.error || housesError.message}`);
    }

    // ✅ DEEP DIVE: Debug the actual response structure

    // ✅ FIXED: Deep extraction of Sun and Moon signs with multiple fallback paths
    let sunSign = "Onbekend";
    let moonSign = "Onbekend";
    let ascendantSign = "Onbekend";
    
    // Try multiple response structures
    if (chartRes.data && typeof chartRes.data === 'object') {
      // Structure 1: Direct access
      sunSign = chartRes.data.sun?.sign || chartRes.data.sun_sign || "Onbekend";
      moonSign = chartRes.data.moon?.sign || chartRes.data.moon_sign || "Onbekend";
      ascendantSign = chartRes.data.ascendant?.sign || chartRes.data.asc_sign || "Onbekend";
      
      // Structure 2: Nested in planets object
      if (sunSign === "Onbekend" && planetsRes.data && Array.isArray(planetsRes.data)) {
        const sunPlanet = planetsRes.data.find(p => p.name?.toLowerCase().includes('sun'));
        const moonPlanet = planetsRes.data.find(p => p.name?.toLowerCase().includes('moon'));
        const ascPlanet = planetsRes.data.find(p => p.name?.toLowerCase().includes('asc'));
        
        sunSign = sunPlanet?.sign || sunSign;
        moonSign = moonPlanet?.sign || moonSign;
        ascendantSign = ascPlanet?.sign || ascendantSign;
      }
      
      // Structure 3: In a positions object
      if (sunSign === "Onbekend" && chartRes.data.positions) {
        const sunPos = chartRes.data.positions.find(p => p.planet?.toLowerCase() === 'sun');
        const moonPos = chartRes.data.positions.find(p => p.planet?.toLowerCase() === 'moon');
        const ascPos = chartRes.data.positions.find(p => p.planet?.toLowerCase() === 'ascendant');
        
        sunSign = sunPos?.sign || sunSign;
        moonSign = moonPos?.sign || moonSign;
        ascendantSign = ascPos?.sign || ascendantSign;
      }
    }

    // ✅ ULTIMATE FALLBACK: Calculate sun sign from date if API fails completely
    if (sunSign === "Onbekend") {
      sunSign = getSignFromDate(formData.birthDate) || "Onbekend";
      console.log(`[Western Chart] ULTIMATE FALLBACK Sun sign: ${sunSign}`);
    }

    console.log(`[Western Chart] FINAL RESULTS:`, {
      sunSign,
      moonSign,
      ascendantSign,
      timezone,
      rawChart: chartRes.data ? Object.keys(chartRes.data) : 'null'
    });

    return {
      sunSign,
      moonSign,
      ascendant: ascendantSign,
      ascendantDegree: chartRes.data?.ascendant?.normDegree || chartRes.data?.ascendant?.degree || 0,
      planets: planetsRes.data || [],
      houses: housesRes.data || {},
      payload,
      timezone,
      rawChartResponse: chartRes.data, // For debugging
      apiStatus: {
        chartSuccess: !!chartRes.data,
        planetsSuccess: !!planetsRes.data,
        housesSuccess: !!housesRes.data
      }
    };

  } catch (error) {
    console.error(`[Western Chart] CRITICAL ERROR:`, {
      message: error.message,
      response: error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'No response data',
      status: error.response?.status,
      formData: formData,
      coords: coords,
      stack: error.stack
    });

    // ✅ ENHANCED FALLBACK: Return partial data with sun sign calculation
    const fallbackSunSign = getSignFromDate(formData.birthDate) || "Onbekend";
    
    return {
      sunSign: fallbackSunSign,
      moonSign: "Onbekend (API fout)",
      ascendant: "Onbekend (API fout)",
      ascendantDegree: 0,
      planets: [],
      houses: {},
      payload: null,
      timezone: 0,
      error: error.message,
      fallback: true,
      apiStatus: {
        chartSuccess: false,
        planetsSuccess: false,
        housesSuccess: false,
        error: error.message
      }
    };
  }
};

const getTransitData = async (coords, userTimezone, ascendantDegree, natalPayload) => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timezone = await getPreciseTimezone(
    coords.latitude,
    coords.longitude,
    dateStr
  );

  const currentPayload = {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    hour: now.getHours(),
    min: now.getMinutes(),
    lat: coords.latitude,
    lon: coords.longitude,
    tzone: timezone,
    house_system: "placidus"
  };

  const natalHousesPayload = {
    day: natalPayload.day,
    month: natalPayload.month,
    year: natalPayload.year,
    hour: natalPayload.hour,
    min: natalPayload.min,
    lat: natalPayload.lat,
    lon: natalPayload.lon,
    tzone: natalPayload.tzone,
    house_system: "placidus"
  };

  console.log(`[Transit Data] Current Payload: ${JSON.stringify(currentPayload)}`);
  console.log(`[Transit Data] Natal Houses Payload: ${JSON.stringify(natalHousesPayload)}`);

  try {
    const [transitRes, housesRes] = await Promise.all([
      axios.post("https://json.astrologyapi.com/v1/planets/tropical", currentPayload, { auth }),
      axios.post("https://json.astrologyapi.com/v1/house_cusps/tropical", natalHousesPayload, { auth })
    ]);

    console.log(`[Transit Data] Raw transit response: ${JSON.stringify(transitRes.data, null, 2)}`);
    console.log(`[Transit Data] House Cusps (Natal): ${JSON.stringify(housesRes.data)}`);

    // Validate transit response
    if (!transitRes.data || !Array.isArray(transitRes.data)) {
      console.error(`[Transit API Error] Invalid response format: ${JSON.stringify(transitRes.data)}`);
      throw new Error("Transit API returned invalid data format. Expected an array of planets.");
    }

    const calculateHousePosition = (degree, cusps, ascendantDeg) => {
      const normalizedDegree = (degree + 360) % 360;
      const normalizedAscendant = (ascendantDeg + 360) % 360;
      const cuspsArray = Object.keys(cusps)
        .filter(key => key.startsWith('house_'))
        .map(key => ({
          house: parseInt(key.replace('house_', '')),
          degree: (cusps[key] + 360) % 360
        }))
        .sort((a, b) => (a.degree - normalizedAscendant + 360) % 360 - (b.degree - normalizedAscendant + 360) % 360);

      let house = 12;
      for (let i = 0; i < cuspsArray.length; i++) {
        const currentCusp = cuspsArray[i].degree;
        const nextCusp = cuspsArray[(i + 1) % cuspsArray.length].degree;
        const isBetween = nextCusp > currentCusp 
          ? normalizedDegree >= currentCusp && normalizedDegree < nextCusp
          : normalizedDegree >= currentCusp || normalizedDegree < nextCusp;
        
        if (isBetween) {
          house = cuspsArray[i].house;
          break;
        }
      }

      console.log(`[House Calculation] Degree: ${normalizedDegree}, Ascendant: ${normalizedAscendant}, House: ${house}`);
      return house;
    };

    const keyPlanets = ["Sun", "Moon", "Venus", "Mars", "Jupiter", "Saturn"];
    const transits = transitRes.data
      .filter(planet => keyPlanets.includes(planet.name))
      .map(planet => ({
        name: planet.name,
        sign: planet.sign,
        house: calculateHousePosition(planet.norm_degree || planet.full_degree || 0, housesRes.data, ascendantDegree),
        degree: planet.norm_degree || planet.full_degree || 0,
        retrograde: planet.is_retro === true || planet.retrograde === "true",
      }));

    console.log(`[Transit Data] Processed transits: ${JSON.stringify(transits, null, 2)}`);
    return {
      transits,
      currentDate: dateStr,
      currentYear: now.getFullYear()
    };
  } catch (err) {
    console.error(`[Transit API Error] Detailed error:`, {
      message: err.message,
      response: err.response?.data ? JSON.stringify(err.response.data, null, 2) : 'No response data',
      status: err.response?.status,
      stack: err.stack
    });
    return {
      transits: [],
      currentDate: dateStr,
      currentYear: now.getFullYear(),
      error: `Failed to fetch transit data: ${err.message}`
    };
  }
};

const checkChatAvailability = async (userId, psychicId) => {
  return await checkAndUpdateTimer(userId, psychicId);
};

const chatWithPsychic = async (req, res) => {
  try {
    const userId = req.user._id;
    const psychicId = req.params.psychicId;
    const { message } = req.body;

    const emojiData = processEmojis(message);
    const emojiContext = emojiData.length > 0
      ? `User included emojis: ${emojiData.map(e => `${e.emoji} (${e.meaning})`).join(", ")}.`
      : "No emojis used by user.";

    const { available, message: availabilityMessage, isFree } = await checkChatAvailability(userId, psychicId);
    if (!available) {
      const chat = await ChatMessage.findOne({ userId, psychicId }) || new ChatMessage({ userId, psychicId, messages: [] });
      const fallbackText = availabilityMessage || "Please purchase credits to continue your reading. 💳";
      chat.messages.push({ 
        sender: "ai", 
        text: fallbackText,
        emojiMetadata: [],
      });
      await chat.save();
 
      return res.status(402).json({ 
        success: false, 
        reply: fallbackText,
        creditRequired: true,
        messages: chat.messages,
      });
    }

    if (!psychicId || !message) {
      return res.status(400).json({ success: false, message: "Psychic ID and message are required. ❗" });
    }
    const psychic = await AiPsychic.findById(psychicId);
    if (!psychic) return res.status(404).json({ success: false, message: "Psychic not found. 🔍" });

    // ✅ ALWAYS fetch user data from User schema
    const userBirthData = await getUserBirthData(userId);
    const username = userBirthData?.name || "friend";
    
    // Fetch form data if available (for psychics that need it)
    const { type, name: psychicName } = psychic;
    let f = {};

   const greetingPattern = /^(hi|hello|hey|how are you|how're you|how's it going|hoi|hallo|goedemorgen|goedemiddag|goedenavond)(\s|$)/i;
if (greetingPattern.test(message.trim())) {
  const detectedLanguage = detectLanguage(message);
  const greetingResponse = detectedLanguage === 'nl' 
    ? `Hallo lieve ${username}, ik ben blij om je te ontmoeten als ${psychicName}! 😊 Waarmee kan ik je vandaag helpen? 🌟`
    : `Hallo lieve ${username}, ik ben blij om je te ontmoeten als ${psychicName}! 😊 Waarmee kan ik je vandaag helpen? 🌟`;
    
  let chat = await ChatMessage.findOne({ userId, psychicId }) || new ChatMessage({ userId, psychicId, messages: [] });
  chat.messages.push({ 
    sender: "user", 
    text: message, 
    emojiMetadata: emojiData 
  });
  chat.messages.push({ 
    sender: "ai", 
    text: greetingResponse, 
    emojiMetadata: processEmojis(greetingResponse) 
  });
  await chat.save();

  return res.status(200).json({
    success: true,
    reply: greetingResponse,
    messages: chat.messages,
  });
}

    // ✅ ALWAYS try to fetch Human Design data from User schema
    let userHumanDesign = null;
    if (userBirthData?.hasCompleteData) {
      try {
        userHumanDesign = await fetchHumanDesignData(
          userBirthData.birthDate, 
          userBirthData.birthTime, 
          userBirthData.birthPlace,
          userId
        );
        console.log(`[HumanDesign] Fetched for ${username}:`, {
          type: userHumanDesign?.type,
          status: userHumanDesign?.status
        });
      } catch (hdError) {
        console.error(`[HumanDesign] Error for user ${userId}:`, hdError.message);
        userHumanDesign = {
          type: "Integration Error",
          authority: "Integration Error",
          profile: "Integration Error",
          error: "Human Design temporarily unavailable",
          status: 500
        };
      }
    }

    const humanDesignDetails = getHumanDesignDetails(userHumanDesign, username);

    // Form data handling for non-Tarot psychics
    if (type !== "Tarot") {
      const requiredFields = getRequiredFieldsByType(type);
      const form = await AiFormData.findOne({ userId, type });

      if (!form?.formData) {
        return res.status(400).json({ 
          success: false, 
          message: `Please fill the ${type} form first 📝` 
        });
      }

      f = form.formData;
      const missingFields = requiredFields.filter(field => !f[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Missing fields: ${missingFields.join(", ")} ❓` 
        });
      }
    }

    let chat = await ChatMessage.findOne({ userId, psychicId }) || new ChatMessage({ userId, psychicId, messages: [] });
    chat.messages.push({ sender: "user", text: message, emojiMetadata: emojiData });
    await chat.save();

    const addTimerMetadata = async (response, userId, psychicId, isFree) => {
      const session = await ActiveSession.findOne({ userId, psychicId });
      const now = new Date();
      
      let minutesToCharge = 0;
      if (!isFree && session) {
        minutesToCharge = Math.floor((now - session.lastChargeTime) / 60000);
      }

      return {
        ...response,
        meta: {
          isFreePeriod: isFree,
          remainingFreeTime: isFree && session 
            ? Math.max(0, session.freeEndTime - now) 
            : 0,
          creditsDeducted: !isFree ? minutesToCharge : 0,
        },
      };
    };

    // ✅ ASTROLOGY PSYCHIC - Enhanced with Human Design
  // ✅ ASTROLOGY PSYCHIC - Enhanced with Human Design and Dutch responses
// ✅ ASTROLOGY PSYCHIC - FIXED with proper data fetching order
if (type === "Astrology") {
  console.log("[Astrology] Starting process for:", username);
  
  // ✅ FIXED: Fetch coordinates first
  const birthPlace = f.birthPlace || userBirthData?.birthPlace;
  if (!birthPlace) {
    return res.status(400).json({ 
      success: false, 
      message: "Please provide your birth place for astrology reading 🌍" 
    });
  }
  
  const coords = await getCoordinatesFromCity(birthPlace);
  if (!coords?.latitude || !coords?.longitude) {
    return res.status(400).json({ 
      success: false, 
      message: "Could not find coordinates for your birth place. Please check spelling. 🗺️" 
    });
  }

  // ✅ FIXED: Initialize astrologyData object BEFORE using it
  let astrologyData = {
    planetaryData: { user: {} },
    compatibility: { synastry: null, zodiac: null },
    transits: null,
    lifeForecast: null
  };

  try {
    // ✅ FIXED: Use string birthDate consistently
    const birthDateStr = f.birthDate instanceof Date 
      ? f.birthDate.toISOString().split('T')[0]
      : f.birthDate || userBirthData?.birthDate;

    // ✅ FIXED: Create formData with string dates
    const formDataForAstro = {
      ...f,
      birthDate: birthDateStr // Ensure string format
    };

    const western = await getWesternChartData(formDataForAstro, coords);
    
    // ✅ FIXED: Populate astrologyData properly
    astrologyData.planetaryData.user = {
      sun: { sign: western.sunSign, house: western.planets?.find(p => p.name === 'Sun')?.house || "N/A" },
      moon: { sign: western.moonSign, house: western.planets?.find(p => p.name === 'Moon')?.house || "N/A" },
      venus: { sign: western.planets?.find(p => p.name === 'Venus')?.sign || "Unknown", house: "N/A" },
      mars: { sign: western.planets?.find(p => p.name === 'Mars')?.sign || "Unknown", house: "N/A" },
      ascendant: { sign: western.ascendant, house: 1 }
    };
    
    astrologyData.lifeForecast = western.lifeForecast;

    const transitPattern = /(transit|current transits|transits today)/i;
    let transitData = null;
    if (transitPattern.test(message)) {
      transitData = await getTransitData(coords, western.timezone, western.ascendantDegree, western.payload);
      astrologyData.transits = transitData;
    }

    console.log("[Astrology] Successfully fetched data:", {
      sunSign: astrologyData.planetaryData.user.sun.sign,
      moonSign: astrologyData.planetaryData.user.moon.sign,
      hasTransits: !!transitData
    });

  } catch (astroError) {
    console.error("[Astrology] Error:", astroError.message);
    // ✅ FIXED: Provide fallback data
    astrologyData.planetaryData.user = {
      sun: { sign: getSignFromDate(f.birthDate || userBirthData?.birthDate) || "Unknown", house: "N/A" },
      moon: { sign: "Unknown", house: "N/A" },
      venus: { sign: "Unknown", house: "N/A" },
      mars: { sign: "Unknown", house: "N/A" },
      ascendant: { sign: "Unknown", house: 1 }
    };
  }

  // ✅ FIXED: Now safely reference astrologyData
  const planetDetails = Object.entries(astrologyData.planetaryData.user)
    .map(([planet, data]) => `- ${planet.charAt(0).toUpperCase() + planet.slice(1)}: ${data.sign} (Huis ${data.house})`)
    .join("\n");

  const transitDetails = astrologyData.transits
    ? astrologyData.transits.transits.map(t => `- ${t.name}: ${t.sign} (Huis ${t.house})`).join("\n")
    : "Geen transietdata beschikbaar.";

  const lifeForecastDetails = astrologyData.lifeForecast?.report 
    ? `Belangrijke Levensvoorspelling: ${astrologyData.lifeForecast.report.substring(0, 200)}...`
    : "Geen levensvoorspelling beschikbaar.";

  const detectedLanguage = detectLanguage(message);
  const languageInstruction = detectedLanguage === 'nl' 
    ? "ANTWOORD ALTIJD IN HET NEDERLANDS. Gebruik natuurlijk, vloeiend Nederlands met een warme, professionele toon."
    : "ANTWOORD ALTIJD IN HET NEDERLANDS, zelfs als de gebruiker in het Engels of een andere taal vraagt. Gebruik natuurlijk, vloeiend Nederlands met een warme, professionele toon.";

  // ✅ FIXED: Now create systemContent with defined astrologyData
  const systemContent = `
${languageInstruction}

Je bent ${psychicName}, een professionele astroloog met Human Design expertise. Geef een diepgaande, mystieke en gepersonaliseerde astrologische lezing gebaseerd op de vraag van de gebruiker: "${message}". Het huidige jaar is 2025. Gebruik emoji's om reacties boeiend te maken (bijv. ☀️ voor Zon, 🌙 voor Maan, 🌟 voor inzichten).

${emojiContext}

GEBRUIKERSPROFIEL:
• Naam: ${f.yourName || username}
• Planetaire Posities:
${planetDetails}

🔮 ${humanDesignDetails}

${f.partnerName ? `
PARTNER PROFIEL:
• Naam: ${f.partnerName}
• Zon: ${astrologyData.planetaryData.partner?.sun?.sign || "Onbekend"} ☀️
• Maan: ${astrologyData.planetaryData.partner?.moon?.sign || "Onbekend"} 🌙
• Venus: ${astrologyData.planetaryData.partner?.venus?.sign || "Onbekend"} 💖
• Mars: ${astrologyData.planetaryData.partner?.mars?.sign || "Onbekend"} 🔥
• Ascendant: ${astrologyData.planetaryData.partner?.ascendant?.sign || "Onbekend"} ⬆

COMPATIBILITEITSANALYSE:
${astrologyData.compatibility.synastry ? `
• Synastrie Score: ${astrologyData.compatibility.synastry.compatibility_score || "N/A"} 💞
• Belangrijke Aspecten: ${astrologyData.compatibility.synastry.aspects?.slice(0, 3).map(a => `${a.planet1} ${a.aspect} ${a.planet2}`).join(", ") || "Geen"} 🔗
` : astrologyData.compatibility.zodiac ? `
• Basis Compatibiliteit: ${astrologyData.compatibility.zodiac.compatibility_report} 💑
` : "Geen compatibiliteitsdata beschikbaar 😕"}
` : ""}

${astrologyData.transits ? `
🌌 Huidige Transits (2025):
${transitDetails}
` : ""}

${lifeForecastDetails}

RICHTLIJNEN:
1. Beantwoord direct de astrologische vraag van de gebruiker
2. Gebruik het huidige jaar (2025) in alle verwijzingen
3. Integreer Human Design natuurlijk waar relevant
4. Noem kort belangrijke natale posities of transits alleen wanneer relevant
5. Als transits worden gevraagd, focus op hun impact
6. Neem levensvoorspellingsinzichten op waar relevant
7. Gebruik een empathische, warme, professionele toon met emoji's
8. Houd de respons onder 250 woorden
9. Schrijf in natuurlijk Nederlands
  `.trim();

  const messagesForAI = [
    { role: "system", content: systemContent },
    ...chat.messages.slice(-3).map(msg => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
    })),
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: messagesForAI,
    temperature: 0.75,
  });

  let aiText = completion.choices[0].message.content;
  aiText = addContextualEmojis(aiText, type);

  const sources = [
    "AstrologyAPI (western_chart_data + planets/tropical)",
    astrologyData.transits ? "natal_transits/daily" : null,
    userHumanDesign?.status === 'success' ? "HumanDesignAPI" : null,
    "GPT-4",
  ].filter(Boolean).join(" + ");
  
  console.log(`[Response Source] For Astrology type: ${sources}`);

  chat.messages.push({ 
    sender: "ai", 
    text: aiText, 
    emojiMetadata: processEmojis(aiText),
    metadata: { 
      astrologyData, 
      humanDesign: userHumanDesign,
      transitData: astrologyData.transits 
    }
  });
  await chat.save();

  const response = {
    success: true,
    reply: aiText,
    messages: chat.messages,
    source: sources,
  };
  const responseWithMetadata = await addTimerMetadata(response, userId, psychicId, isFree);
  return res.status(200).json(responseWithMetadata);
} else if (type === "Love") {
      console.log("[Love Psychic] Starting enhanced love reading process...");

      const lowerMessage = message.toLowerCase().trim();
      
     if (lowerMessage.includes("my info") || lowerMessage.includes("my information") || lowerMessage.includes("my human design")) {
  // ✅ FIXED: Safe date handling
  const userBirthDateDisplay = f.yourBirthDate 
    ? (f.yourBirthDate instanceof Date ? f.yourBirthDate.toISOString().split('T')[0] : f.yourBirthDate)
    : (userBirthData?.birthDate ? new Date(userBirthData.birthDate).toISOString().split('T')[0] : 'Not provided');
    
  const userInfo = `
🔮 Your Profile:
• Name: ${f.yourName || username}
• Birth Date: ${userBirthDateDisplay}
• Birth Time: ${f.yourBirthTime || userBirthData?.birthTime || 'Not provided'}
• Birth Place: ${f.yourBirthPlace || userBirthData?.birthPlace || 'Not provided'}
• Zodiac Sign: ${getSignFromDate(f.yourBirthDate || userBirthData?.birthDate) || "Unknown"} ♈

${humanDesignDetails}

You can now ask about love compatibility, relationship patterns, or deeper insights! 💖
  `.trim();
  
  chat.messages.push({ sender: "ai", text: userInfo, emojiMetadata: processEmojis(userInfo) });
  await chat.save();
  return res.status(200).json({
    success: true,
    reply: userInfo,
    messages: chat.messages,
  });
} 
      if (lowerMessage.includes("partner info") || lowerMessage.includes("partner name") || 
          lowerMessage.includes("my partner")) {
        if (!f.partnerName) {
          const noPartnerMsg = "You haven't provided partner information yet. Would you like to share their birth details for compatibility insights? 💕";
          chat.messages.push({ sender: "ai", text: noPartnerMsg, emojiMetadata: processEmojis(noPartnerMsg) });
          await chat.save();
          return res.status(200).json({
            success: true,
            reply: noPartnerMsg,
            messages: chat.messages,
          });
        }
        
        const partnerInfo = `
💕 Partner Profile:
• Name: ${f.partnerName}
• Birth Date: ${f.partnerBirthDate || "Not provided"}
• Birth Time: ${f.partnerBirthTime || "Not provided"}
• Birth Place: ${f.partnerPlaceOfBirth || "Not provided"}
• Zodiac Sign: ${f.partnerBirthDate ? getSignFromDate(f.partnerBirthDate) || "Unknown" : "Not provided"} ♎

${f.partnerBirthDate && f.partnerBirthTime && f.partnerPlaceOfBirth ? `
Partner Human Design: Would you like me to analyze their Human Design for deeper compatibility insights? 🔮
` : ""}
        `.trim();
        
        chat.messages.push({ sender: "ai", text: partnerInfo, emojiMetadata: processEmojis(partnerInfo) });
        await chat.save();
        return res.status(200).json({
          success: true,
          reply: partnerInfo,
          messages: chat.messages,
        });
      }

      // Use form data with User schema fallback
      const userBirthDate = f.yourBirthDate || userBirthData?.birthDate;
      const userBirthTime = f.yourBirthTime || userBirthData?.birthTime;
      const userBirthPlace = f.yourBirthPlace || userBirthData?.birthPlace;

      const requiredFields = ["yourName", "yourBirthDate", "yourBirthTime", "yourBirthPlace"];
      const missingFields = requiredFields.filter(field => !f[field] && !userBirthData?.hasCompleteData);
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")} ❗`,
        });
      }

      let userCoords, partnerCoords;
      try {
        userCoords = await getCoordinatesFromCity(userBirthPlace);
        console.log(`[Geocode] User coordinates: ${JSON.stringify(userCoords)}`);
        
        if (f.partnerPlaceOfBirth) {
          partnerCoords = await getCoordinatesFromCity(f.partnerPlaceOfBirth);
          console.log(`[Geocode] Partner coordinates: ${JSON.stringify(partnerCoords)}`);
        }
      } catch (geoError) {
        console.warn("[Geocode] Error getting coordinates:", geoError.message);
        userCoords = { latitude: 0, longitude: 0 };
        partnerCoords = { latitude: 0, longitude: 0 };
      }

      const buildPayload = async (dateStr, timeStr, coords) => {
        if (!dateStr || isNaN(new Date(dateStr))) {
          throw new Error("Invalid date format");
        }
        
        const date = new Date(dateStr);
        const [hour = 12, min = 0] = (timeStr || "").split(":").map(Number);
        
        let timezone = 0;
        try {
          const tzRes = await axios.post(
            "https://json.astrologyapi.com/v1/timezone_with_dst",
            { 
              latitude: coords.latitude || 0, 
              longitude: coords.longitude || 0, 
              date: dateStr 
            },
            { auth, timeout: 5000 }
          );
          timezone = tzRes.data.timezone;
        } catch (err) {
          console.warn("Timezone API error, using default:", err.message);
        }

        return {
          day: date.getDate(),
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          hour: Math.min(23, Math.max(0, hour)),
          min: Math.min(59, Math.max(0, min)),
          lat: coords.latitude || 0,
          lon: coords.longitude || 0,
          tzone: timezone,
          house_system: "placidus"
        };
      };

      let userPayload, partnerPayload;
      try {
        userPayload = await buildPayload(userBirthDate, userBirthTime, userCoords);
        console.log("[Payload] User payload prepared");
        
        if (f.partnerBirthDate) {
          partnerPayload = await buildPayload(f.partnerBirthDate, f.partnerBirthTime, partnerCoords || userCoords);
          console.log("[Payload] Partner payload prepared");
        }
      } catch (err) {
        console.error("[Payload] Error building payload:", err.message);
        throw new Error("Invalid birth data provided");
      }

      console.log("[API] Fetching essential astrological data...");
      let astrologyData = {
        userChart: null,
        partnerChart: null,
        compatibility: {
          zodiac: null,
          synastry: null,
        },
        planetaryData: {
          user: {},
          partner: {},
        },
        zodiacSigns: {
          user: getSignFromDate(userBirthDate),
          partner: f.partnerBirthDate ? getSignFromDate(f.partnerBirthDate) : null,
        },
        transits: null,
        userLifeForecast: null,
        partnerLifeForecast: null,
      };

      try {
        console.log("[API] Getting user chart and planets");
        const [userChartRes, userPlanetsRes, userPersonalityRes, userLifeForecastRes] = await Promise.all([
          axios.post("https://json.astrologyapi.com/v1/western_chart_data", userPayload, { auth }),
          axios.post("https://json.astrologyapi.com/v1/planets/tropical", userPayload, { auth }),
          axios.post("https://json.astrologyapi.com/v1/romantic_personality_report/tropical", userPayload, { auth }),
          axios.post("https://json.astrologyapi.com/v1/life_forecast_report/tropical", userPayload, { auth }),
        ]);
        
        astrologyData.userChart = userChartRes.data;
        astrologyData.planetaryData.user = userPlanetsRes.data.reduce((acc, planet) => {
          const planetName = planet.name.toLowerCase();
          if (["sun", "moon", "venus", "mars", "ascendant"].includes(planetName)) {
            acc[planetName] = {
              sign: planet.sign,
              house: planet.house,
              degree: planet.normDegree,
              retrograde: planet.retrograde === "true",
            };
          }
          return acc;
        }, {});
        astrologyData.userPersonality = userPersonalityRes.data;
        astrologyData.userLifeForecast = userLifeForecastRes.data;

        const transitPattern = /(transit|current transits|transits today)/i;
        if (transitPattern.test(message)) {
          astrologyData.transits = await getTransitData(
            userCoords, 
            userPayload.tzone, 
            astrologyData.planetaryData.user.ascendant?.degree || 0,
            userPayload
          );
        }
      } catch (err) {
        console.error("[API] Error fetching user data:", err.message, JSON.stringify(err.response?.data, null, 2));
        throw new Error("Failed to analyze your birth chart");
      }

      let partnerHumanDesign = null;
      if (f.partnerBirthDate && f.partnerBirthTime && f.partnerPlaceOfBirth) {
        try {
          partnerHumanDesign = await fetchHumanDesignData(
            f.partnerBirthDate,
            f.partnerBirthTime,
            f.partnerPlaceOfBirth,
            `${username}'s Partner`
          );
          console.log("[Love] Partner Human Design:", {
            type: partnerHumanDesign?.type,
            status: partnerHumanDesign?.status
          });
        } catch (partnerHdError) {
          console.error("[Love] Partner Human Design error:", partnerHdError.message);
        }
      }

      const partnerHumanDesignDetails = partnerHumanDesign ? getHumanDesignDetails(partnerHumanDesign, "Partner") : "";

      if (partnerPayload) {
        try {
          console.log("[API] Getting partner chart and synastry report");
          
          const [partnerChartRes, partnerPlanetsRes, partnerLifeForecastRes] = await Promise.all([
            axios.post("https://json.astrologyapi.com/v1/western_chart_data", partnerPayload, { auth }),
            axios.post("https://json.astrologyapi.com/v1/planets/tropical", partnerPayload, { auth }),
            axios.post("https://json.astrologyapi.com/v1/life_forecast_report/tropical", partnerPayload, { auth }),
          ]);

          astrologyData.partnerChart = partnerChartRes.data;
          astrologyData.planetaryData.partner = partnerPlanetsRes.data.reduce((acc, planet) => {
            const planetName = planet.name.toLowerCase();
            if (["sun", "moon", "venus", "mars", "ascendant"].includes(planetName)) {
              acc[planetName] = {
                sign: planet.sign,
                house: planet.house,
                degree: planet.normDegree,
                retrograde: planet.retrograde === "true",
              };
            }
            return acc;
          }, {});
          astrologyData.partnerLifeForecast = partnerLifeForecastRes.data;

          try {
            const synastryRes = await axios.post(
              "https://json.astrologyapi.com/v1/synastry_horoscope",
              {
                p_day: userPayload.day,
                p_month: userPayload.month,
                p_year: userPayload.year,
                p_hour: userPayload.hour,
                p_min: userPayload.min,
                p_lat: userPayload.lat,
                p_lon: userPayload.lon,
                p_tzone: userPayload.tzone,
                s_day: partnerPayload.day,
                s_month: partnerPayload.month,
                s_year: partnerPayload.year,
                s_hour: partnerPayload.hour,
                s_min: partnerPayload.min,
                s_lat: partnerPayload.lat,
                s_lon: partnerPayload.lon,
                s_tzone: partnerPayload.tzone,
              },
              { 
                auth,
                headers: {
                  "Accept-Language": "en",
                },
              }
            );

            console.log("[API] Raw synastry response:", JSON.stringify(synastryRes.data, null, 2));
            
            if (synastryRes.data && typeof synastryRes.data === "object") {
              astrologyData.compatibility.synastry = {
                compatibility_score: synastryRes.data.compatibility_score || 0,
                aspects: synastryRes.data.aspects || [],
                aspects_summary: synastryRes.data.aspects_summary || "",
                report: synastryRes.data.report || "",
              };
              
              console.log("[API] Synastry report processed:", {
                score: astrologyData.compatibility.synastry.compatibility_score,
                aspects: astrologyData.compatibility.synastry.aspects.length,
              });
            } else {
              throw new Error("Invalid synastry response structure");
            }
          } catch (synastryErr) {
            console.error("[API] Detailed synastry error:", {
              message: synastryErr.message,
              response: synastryErr.response?.data,
              stack: synastryErr.stack,
            });
            astrologyData.compatibility.zodiac = {
              compatibility_report: generateBasicCompatibility(
                astrologyData.zodiacSigns.user,
                astrologyData.zodiacSigns.partner
              ),
              isFallback: true,
            };
          }
        } catch (err) {
          console.error("[API] Partner data error:", err.message);
          astrologyData.compatibility.zodiac = {
            compatibility_report: generateBasicCompatibility(
              astrologyData.zodiacSigns.user,
              astrologyData.zodiacSigns.partner
            ),
            isFallback: true,
          };
        }
      }

      const transitDetails = astrologyData.transits
        ? astrologyData.transits.transits.map(t => `- ${t.name}: ${t.sign} (House ${t.house})`).join("\n")
        : "No transit data available.";

      const userLifeForecastDetails = astrologyData.userLifeForecast?.report 
        ? `Your Life Forecast: ${astrologyData.userLifeForecast.report.substring(0, 150)}...`
        : "No life forecast available for you.";

      const partnerLifeForecastDetails = astrologyData.partnerLifeForecast?.report 
        ? `Partner Life Forecast: ${astrologyData.partnerLifeForecast.report.substring(0, 150)}...`
        : "";

     const systemContent = `
Je bent ${psychicName}, een professionele liefdeshelderziende met expertise in Human Design. Geef een diepgaande, mystieke en gepersonaliseerde liefdeslezing op basis van de vraag van de gebruiker: "${message}". Het huidige jaar is 2025. Gebruik emoji's om de antwoorden aantrekkelijk te maken (bijv. ❤️ voor liefde, 😍 voor aantrekkingskracht, 🌟 voor hoop).

${emojiContext}

GEBRUIKERSPROFIEL:
• Naam: ${f.yourName || username}
• Zon: ${astrologyData.planetaryData.user.sun?.sign || "Onbekend"} (Huis ${astrologyData.planetaryData.user.sun?.house || "N.V.T."}) ☀️
• Maan: ${astrologyData.planetaryData.user.moon?.sign || "Onbekend"} (Huis ${astrologyData.planetaryData.user.moon?.house || "N.V.T."}) 🌙
• Venus: ${astrologyData.planetaryData.user.venus?.sign || "Onbekend"} (Huis ${astrologyData.planetaryData.user.venus?.house || "N.V.T."}) 💖
• Mars: ${astrologyData.planetaryData.user.mars?.sign || "Onbekend"} (Huis ${astrologyData.planetaryData.user.mars?.house || "N.V.T."}) 🔥
• Ascendant: ${astrologyData.planetaryData.user.ascendant?.sign || "Onbekend"} ⬆

🔮 ${humanDesignDetails}

${f.partnerName ? `
PARTNERPROFIEL:
• Naam: ${f.partnerName}
• Zon: ${astrologyData.planetaryData.partner?.sun?.sign || "Onbekend"} ☀️
• Maan: ${astrologyData.planetaryData.partner?.moon?.sign || "Onbekend"} 🌙
• Venus: ${astrologyData.planetaryData.partner?.venus?.sign || "Onbekend"} 💖
• Mars: ${astrologyData.planetaryData.partner?.mars?.sign || "Onbekend"} 🔥
• Ascendant: ${astrologyData.planetaryData.partner?.ascendant?.sign || "Onbekend"} ⬆

${partnerHumanDesignDetails}

COMPATIBILITEITSANALYSE:
${astrologyData.compatibility.synastry ? `
• Synastry Score: ${astrologyData.compatibility.synastry.compatibility_score || "N.V.T."} 💞
• Belangrijkste Aspecten: ${astrologyData.compatibility.synastry.aspects?.slice(0, 3).map(a => `${a.planet1} ${a.aspect} ${a.planet2}`).join(", ") || "Geen"} 🔗
${astrologyData.compatibility.synastry.report ? `
• Samenvatting: ${astrologyData.compatibility.synastry.report.substring(0, 150)}... 📜
` : ""} 
` : astrologyData.compatibility.zodiac ? `
• Basiscompatibiliteit: ${astrologyData.compatibility.zodiac.compatibility_report} 💑
` : "Geen compatibiliteitsgegevens beschikbaar 😕"} 
` : ""}

${astrologyData.transits ? `
🌌 Huidige Liefdestransits (2025):
${transitDetails}
` : ""}

${userLifeForecastDetails ? `
${userLifeForecastDetails}
` : ""}

${partnerLifeForecastDetails ? `
${partnerLifeForecastDetails}
` : ""}

ROMANTISCHE KENMERKEN:
${astrologyData.userPersonality?.traits?.join(", ") || "Niet beschikbaar"}

RICHTLIJNEN:
1. Beantwoord direct de vraag van de gebruiker over liefde/relaties
2. Gebruik het huidige jaar (2025) in alle verwijzingen
3. Integreer Human Design op een natuurlijke manier (bijv. "Je Projector-type heeft uitnodigingen nodig in de liefde, wat aansluit bij de wens van je Venus in Weegschaal naar harmonie")
4. Vermeld kort belangrijke geboorteplaats-posities (Venus, Mars) of transits alleen indien relevant voor liefde
5. Als transits worden gevraagd, richt je dan op hun romantische impact met natal_transits/daily API
6. Verwerk inzichten uit levensvoorspellingen waar relevant voor relaties
7. Voor compatibiliteit, combineer astrologie + Human Design (bijv. "Je Generator-energie reageert goed op het initiërende vonkje van hun Manifestor")
8. Maak een vloeiende overgang naar emotionele interpretatie or storytelling
9. Eindig met één praktische relatie-tip
10. Gebruik een empathische, warme en romantische toon met emoji's (bijv. ❤️, 😊, 🌟)
11. Houd de respons onder de 250 woorden
`.trim();


      const messagesForAI = [
        { role: "system", content: systemContent },
        ...chat.messages.slice(-3).map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text.length > 300 ? msg.text.substring(0, 300) + "..." : msg.text,
        })),
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messagesForAI,
        temperature: 0.7,
        max_tokens: 350,
      });

      let aiResponse = completion.choices[0].message.content;
      aiResponse = addContextualEmojis(aiResponse, type);
      
      if (astrologyData.compatibility.zodiac?.isFallback) {
        aiResponse += "\n\nNote: This reading uses basic zodiac compatibility as full synastry data wasn't available. 😔";
      }

      const sources = [
        "western_chart_data",
        "planets/tropical",
        astrologyData.compatibility.synastry ? "synastry_horoscope" : "zodiac_compatibility",
        "romantic_personality_report",
        "life_forecast_report/tropical",
        astrologyData.transits ? "natal_transits/daily" : null,
        userHumanDesign?.status === 'success' ? "HumanDesignAPI (User)" : null,
        partnerHumanDesign?.status === 'success' ? "HumanDesignAPI (Partner)" : null,
      ].filter(Boolean).join(", ");
      console.log(`[Response Source] For Love type: AstrologyAPI (${sources}) + GPT-4`);

      chat.messages.push({ 
        sender: "ai", 
        text: aiResponse,
        emojiMetadata: processEmojis(aiResponse),
        metadata: {
          planetaryData: astrologyData.planetaryData,
          compatibility: {
            score: astrologyData.compatibility.synastry?.compatibility_score,
            aspects: astrologyData.compatibility.synastry?.aspects?.length,
            isFallback: !!astrologyData.compatibility.zodiac?.isFallback,
          },
          transits: astrologyData.transits ? astrologyData.transits.transits : null,
          lifeForecast: {
            user: astrologyData.userLifeForecast,
            partner: astrologyData.partnerLifeForecast,
          },
          humanDesign: {
            user: userHumanDesign,
            partner: partnerHumanDesign
          },
          dataSources: sources.split(", "),
        },
      });
      await chat.save();

      const response = {
        success: true,
        reply: aiResponse,
        messages: chat.messages,
        metadata: chat.messages[chat.messages.length - 1].metadata,
      };
      const responseWithMetadata = await addTimerMetadata(response, userId, psychicId, isFree);
      return res.status(200).json(responseWithMetadata);

    // ✅ NUMEROLOGY PSYCHIC - Enhanced with Human Design and deeper life path explanations
   // ✅ NUMEROLOGY PSYCHIC - Enhanced with Human Design and deeper life path explanations
// ✅ NUMEROLOGY PSYCHIC - FIXED date handling
// ✅ NUMEROLOGY PSYCHIC - FIXED date handling and variable scoping
} 

else if (type === "Numerology") {
  console.log("[Numerology] Starting process for:", f.yourName || username);
  
  // ✅ FIXED: Handle both form data and user schema data properly
  const userName = f.yourName || username;
  let userBirthDateStr = f.birthDate || userBirthData?.birthDate; // ✅ FIXED: Use fallback
  
  // ✅ FIXED: Ensure we have a valid string date
  if (!userBirthDateStr) {
    return res.status(400).json({
      success: false,
      message: "Missing birth date. Please fill out the Numerology form first. 📅",
    });
  }
  
  // ✅ FIXED: Convert Date object to string if needed
  if (userBirthDateStr instanceof Date) {
    userBirthDateStr = userBirthDateStr.toISOString().split('T')[0];
  } else if (typeof userBirthDateStr === 'string') {
    // Ensure it's a valid date string
    const testDate = new Date(userBirthDateStr);
    if (isNaN(testDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid birth date format. Please use YYYY-MM-DD format. 📅",
      });
    }
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid birth date. Please provide a valid date. 📅",
    });
  }

  const nameRegex = /^[a-zA-Z\s]+$/;
  if (!userName || !nameRegex.test(userName.trim())) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid name (letters only). ❗",
    });
  }

  const cleanName = userName.trim().replace(/\s+/g, " ");
  const numerologyData = calculateManualNumbers(cleanName, userBirthDateStr);
  console.log("[ManualCalculation] Numerology data:", numerologyData);

  const lowerMessage = message.toLowerCase().trim();
  if (
    lowerMessage.includes("my info") ||
    lowerMessage.includes("my profile") ||
    lowerMessage.includes("numerology profile") ||
    lowerMessage.includes("my human design")
  ) {
    const profileResponse = `
🔮 Your Complete Profile:
• Name: ${cleanName}
• Life Path Number: ${numerologyData.lifePath} 🔢
• Soul Urge Number: ${numerologyData.soulUrge} 💖
• Personality Number: ${numerologyData.personality} 😊
• Expression Number: ${numerologyData.expression} 🌟
${numerologyData.karmicLessons?.length ? `• Karmic Lessons: ${numerologyData.karmicLessons.join(", ")} 📝` : ""}
${numerologyData.challenges ? `• Challenges: ${formatChallenges(numerologyData.challenges)} ⚠️` : ""}

${humanDesignDetails}

Ask me: "What does my Life Path ${numerologyData.lifePath} mean with my ${userHumanDesign?.type || 'Human Design'} energy?" or "How do my numbers influence my relationships?" 🎉
    `.trim();

    chat.messages.push({ sender: "ai", text: profileResponse, emojiMetadata: processEmojis(profileResponse) });
    await chat.save();

    return res.status(200).json({
      success: true,
      reply: profileResponse,
      messages: chat.messages,
      numerologyData: {
        ...numerologyData,
        source: "ManualCalculation",
      },
    });
  }

  // ✅ FIXED: Add language detection for Numerology section
  const detectedLanguage = detectLanguage(message);
  const languageInstruction = detectedLanguage === 'nl' 
    ? "ANTWOORD ALTIJD IN HET NEDERLANDS. Gebruik natuurlijk, vloeiend Nederlands met een warme, professionele toon."
    : "ANTWOORD ALTIJD IN HET NEDERLANDS, zelfs als de gebruiker in het Engels of een andere taal vraagt. Gebruik natuurlijk, vloeiend Nederlands met een warme, professionele toon.";

  // ✅ IMPROVED: Detailed life path meanings for deeper integration
  const lifePathMeanings = {
    1: "Leiderschap, onafhankelijkheid en pioniersgeest. Jij bent een natuurlijke leider die graag nieuwe paden bewandelt, initiatief neemt en anderen inspireert met je visie en vastberadenheid. Je uitdaging is om afhankelijkheid te vermijden en je unieke stem te vinden. 🚀",
    2: "Samenwerking, diplomatie en gevoeligheid. Jij excelleert in relaties, brengt harmonie en ondersteunt anderen met je intuïtie. Je bent een peacemaker die emotionele balans zoekt, maar leer grenzen stellen om overgevoeligheid te voorkomen. 🤝",
    3: "Creativiteit, zelfexpressie en vreugde. Jij bent charismatisch, artistiek en brengt plezier in het leven van anderen. Je talent ligt in communicatie en inspiratie, maar focus op discipline om je energie niet te versnipperen. 🎨",
    4: "Stabiliteit, discipline en hard werken. Jij bouwt sterke fundamenten, bent betrouwbaar en praktisch. Je succes komt door doorzettingsvermogen, maar onthoud flexibiliteit om rigiditeit te vermijden. 🏗️",
    5: "Vrijheid, avontuur en verandering. Jij gedijt op variatie, nieuwe ervaringen en aanpassingsvermogen. Je bent veelzijdig en charismatisch, maar leer commitment om rusteloosheid te balanceren. 🌍",
    6: "Zorgzaamheid, verantwoordelijkheid en liefde. Jij bent een nurturer die familie en gemeenschap prioriteert, met een sterk gevoel voor rechtvaardigheid. Je geeft diep, maar leer zelfzorg om uitputting te voorkomen. ❤️",
    7: "Introspectie, spiritualiteit en wijsheid. Jij zoekt diepere waarheden, bent analytisch en intuïtief. Je kracht ligt in onderzoek en innerlijke groei, maar open je voor anderen om isolement te vermijden. 🔍",
    8: "Ambitie, macht en materieel succes. Jij streeft naar prestaties, bent een natuurlijke manager met visie voor overvloed. Leer balans tussen werk en persoonlijk leven om machtsmisbruik te voorkomen. 💼",
    9: "Mededogen, humanitarisme en voltooiing. Jij bent altijd daar voor anderen, geeft onzelfzuchtig en streeft naar globale verbetering. Je bent wijs en idealistisch, maar leer loslaten om bitterheid te vermijden. 🌍",
    11: "Intuïtie, inspiratie en verlichting. Als meestergetal ben je een visionair met spirituele gaven. Je inspireert massa's, maar grond jezelf om nerveuze energie te managen. ✨",
    22: "Meesterbouwer, praktisch en grote dromen. Je creëert blijvende impact op grote schaal, combineert visie met actie. Je potentieel is enorm, maar bouw stap voor stap. 🏛️"
  };

  // ✅ FIXED: Use userBirthDateStr instead of undefined userBirthDate
  const systemPrompt = `
${languageInstruction}

Je bent ${psychicName}, een professionele numericus met Human Design expertise. Geef een diepgaande, mystieke en gepersonaliseerde lezing gebaseerd op de vraag van de gebruiker: "${message}". Het huidige jaar is 2025. Gebruik emoji's om reacties boeiend te maken (bijv. 🔢 voor nummers, 🌟 voor inzichten, 😊 voor positiviteit).

${emojiContext}

CLIENT PROFIEL:
• Naam: ${cleanName}
• Geboortedatum: ${userBirthDateStr}  // ✅ FIXED: Use the string variable

🔢 KERNNUMEROLOGIE:
• Levenspad: ${numerologyData.lifePath} 🔢 (${lifePathMeanings[numerologyData.lifePath] || "Doel en levensreis"})
• Zielszucht: ${numerologyData.soulUrge} 💖 (Innerlijke verlangens en motivaties)
• Persoonlijkheid: ${numerologyData.personality} 😊 (Hoe je overkomt op anderen)
• Expressie: ${numerologyData.expression} 🌟 (Je volledige potentieel en talenten)
${numerologyData.karmicLessons?.length ? `• Karmische Lessen: ${numerologyData.karmicLessons.join(", ")} 📝 (Gebieden voor groei en leren)` : ""}
${numerologyData.challenges ? `• Uitdagingen: ${formatChallenges(numerologyData.challenges)} ⚠️ (Obstakels om te overwinnen)` : ""}

🔮 Human Design:
${humanDesignDetails}

INTEGRATIE RICHTLIJNEN:
1. Bouw de respons rond de kerntraits van het Levenspad - gebruik de gedetailleerde beschrijving om de gebruiker zichzelf te laten herkennen (bijv. voor Levenspad 9: "Als iemand die altijd voor anderen klaarstaat, met diep mededogen...")
2. Meng numerologie en Human Design diepgaand voor persoonlijke inzichten (bijv. "Je Levenspad 9's onzelfzuchtige geven sluit perfect aan bij je Generator energie die reageert op behoeften van anderen")
3. Weef traits naturally in storytelling voor herkenbaarheid

RESPONS RICHTLIJNEN:
1. Beantwoord direct de vraag van de gebruiker op een natuurlijke, professionele, beleefde, vriendelijke manier
2. Gebruik het huidige jaar (2025) in alle verwijzingen
3. Noem kort belangrijke nummers en Human Design alleen wanneer relevant voor de vraag
4. Creëer betekenisvolle verbindingen tussen numerologie en Human Design
5. Ga vloeiend over naar emotionele interpretatie or storytelling
6. Vermijd herhalende opsommingen; focus on verhalende inzichten
7. Gebruik een warme, empathische toon met emoji's (bijv. 🔢, 🌟, 😊)
8. Houd de respons onder 300 woorden
9. Schrijf in vloeiend, natuurlijk Nederlands
  `.trim();

  const messagesForAI = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: messagesForAI,
    temperature: 0.6,
    max_tokens: 400,
  });

  let aiText = completion.choices[0].message.content;
  aiText = addContextualEmojis(aiText, type);

  chat.messages.push({ 
    sender: "ai", 
    text: aiText, 
    emojiMetadata: processEmojis(aiText), 
    metadata: { 
      numerologyData, 
      humanDesign: userHumanDesign,
      birthDateUsed: userBirthDateStr  // ✅ ADDED: Log which date was used
    } 
  });
  await chat.save();

  const response = {
    success: true,
    reply: aiText,
    messages: chat.messages,
    numerologyData: {
      ...numerologyData,
      source: "ManualCalculation + GPT-4 + HumanDesignAPI",
      birthDateUsed: userBirthDateStr
    },
  };
  const responseWithMetadata = await addTimerMetadata(response, userId, psychicId, isFree);
  return res.status(200).json(responseWithMetadata);
}else if (type === "Tarot") {
  console.log("[Tarot] Starting Tarot reading for user:", userId, "with question:", message);
  
  // Language detection
  const detectedLanguage = detectLanguage(message);
  const isDutchRequest = detectedLanguage === 'nl';
  const languageInstruction = isDutchRequest 
    ? "ANTWOORD ALTIJD IN HET NEDERLANDS. Gebruik natuurlijk, vloeiend Nederlands met een warme, professionele toon."
    : "ANTWOORD ALTIJD IN HET NEDERLANDS, zelfs als de gebruiker in het Engels of een andere taal vraagt. Gebruik natuurlijk, vloeiend Nederlands met een warme, professionele toon.";
  
  // Define a simplified Rider-Waite Tarot deck (78 cards)
  const tarotDeck = [
    "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor",
    "The Hierophant", "The Lovers", "The Chariot", "Strength", "The Hermit",
    "Wheel of Fortune", "Justice", "The Hanged Man", "Death", "Temperance",
    "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World",
    "Ace of Cups", "Two of Cups", "Three of Cups", "Four of Cups", "Five of Cups",
    "Ace of Wands", "Two of Wands", "Three of Wands", "Four of Wands", "Five of Wands",
    "Ace of Swords", "Two of Swords", "Three of Swords", "Four of Swords", "Five of Swords",
    "Ace of Pentacles", "Two of Pentacles", "Three of Pentacles", "Four of Pentacles", "Five of Pentacles"
  ];

  // Basic card meanings for consistent interpretation
  const cardMeanings = {
    "The Fool": "New beginnings, spontaneity, trust in the universe",
    "The Magician": "Manifestation, skill, resourcefulness",
    "The High Priestess": "Intuition, mystery, inner wisdom",
    "The Empress": "Nurturing, abundance, creativity",
    "The Emperor": "Authority, structure, control",
    "The Hierophant": "Tradition, spiritual guidance, conformity",
    "The Lovers": "Love, harmony, choices",
    "The Chariot": "Willpower, determination, victory",
    "Strength": "Courage, inner strength, compassion",
    "The Hermit": "Introspection, solitude, guidance",
    "Wheel of Fortune": "Cycles, change, destiny",
    "Justice": "Fairness, truth, balance",
    "The Hanged Man": "Surrender, perspective, sacrifice",
    "Death": "Transformation, endings, new beginnings",
    "Temperance": "Balance, moderation, harmony",
    "The Devil": "Temptation, materialism, bondage",
    "The Tower": "Sudden change, upheaval, revelation",
    "The Star": "Hope, inspiration, healing",
    "The Moon": "Illusion, intuition, uncertainty",
    "The Sun": "Success, vitality, joy",
    "Judgement": "Awakening, renewal, reckoning",
    "The World": "Completion, fulfillment, unity",
    "Ace of Cups": "Emotional new beginnings, love, intuition",
    "Two of Cups": "Partnership, connection, unity",
    "Three of Cups": "Celebration, friendship, joy",
    "Four of Cups": "Apathy, reevaluation, missed opportunities",
    "Five of Cups": "Loss, regret, moving on",
    "Ace of Wands": "Inspiration, new ventures, energy",
    "Two of Wands": "Planning, decisions, exploration",
    "Three of Wands": "Expansion, foresight, progress",
    "Four of Wands": "Celebration, stability, home",
    "Five of Wands": "Conflict, competition, tension",
    "Ace of Swords": "Clarity, truth, mental breakthrough",
    "Two of Swords": "Indecision, stalemate, balance",
    "Three of Swords": "Heartbreak, sorrow, betrayal",
    "Four of Swords": "Rest, recovery, contemplation",
    "Five of Swords": "Hardship, insecurity, isolation",
    "Ace of Pentacles": "Prosperity, new opportunities, abundance",
    "Two of Pentacles": "Balance, adaptability, juggling",
    "Three of Pentacles": "Collaboration, skill, teamwork",
    "Four of Pentacles": "Security, control, possessiveness",
    "Five of Pentacles": "Hardship, insecurity, isolation"
  };

  // Dutch translations for Tarot cards
  const dutchCardNames = {
    "The Fool": "De Dwaas",
    "The Magician": "De Magiër",
    "The High Priestess": "De Hogepriesteres",
    "The Empress": "De Keizerin",
    "The Emperor": "De Keizer",
    "The Hierophant": "De Hogepriester",
    "The Lovers": "De Geliefden",
    "The Chariot": "De Zegewagen",
    "Strength": "Kracht",
    "The Hermit": "De Kluizenaar",
    "Wheel of Fortune": "Het Rad van Fortuin",
    "Justice": "Gerechtigheid",
    "The Hanged Man": "De Gehangene",
    "Death": "De Dood",
    "Temperance": "Matigheid",
    "The Devil": "De Duivel",
    "The Tower": "De Toren",
    "The Star": "De Ster",
    "The Moon": "De Maan",
    "The Sun": "De Zon",
    "Judgement": "Het Oordeel",
    "The World": "De Wereld",
    "Ace of Cups": "Aas van Bekers",
    "Two of Cups": "Twee van Bekers",
    "Three of Cups": "Drie van Bekers",
    "Four of Cups": "Vier van Bekers",
    "Five of Cups": "Vijf van Bekers",
    "Ace of Wands": "Aas van Staven",
    "Two of Wands": "Twee van Staven",
    "Three of Wands": "Drie van Staven",
    "Four of Wands": "Vier van Staven",
    "Five of Wands": "Vijf van Staven",
    "Ace of Swords": "Aas van Zwaarden",
    "Two of Swords": "Twee van Zwaarden",
    "Three of Swords": "Drie van Zwaarden",
    "Four of Swords": "Vier van Zwaarden",
    "Five of Swords": "Vijf van Zwaarden",
    "Ace of Pentacles": "Aas van Munten",
    "Two of Pentacles": "Twee van Munten",
    "Three of Pentacles": "Drie van Munten",
    "Four of Pentacles": "Vier van Munten",
    "Five of Pentacles": "Vijf van Munten"
  };

  // Improved life path meanings (Dutch)
  const lifePathMeanings = {
    1: "Leiderschap, onafhankelijkheid en pioniersgeest. Je bent een natuurlijke leider die graag nieuwe paden bewandelt. 🚀",
    2: "Samenwerking, diplomatie en gevoeligheid. Je brengt harmonie en ondersteunt anderen. 🤝",
    3: "Creativiteit, zelfexpressie en vreugde. Je bent charismatisch en inspireert anderen. 🎨",
    4: "Stabiliteit, discipline en hard werken. Je bouwt sterke fundamenten. 🏗️",
    5: "Vrijheid, avontuur en verandering. Je gedijt op variatie. 🌍",
    6: "Zorgzaamheid, verantwoordelijkheid en liefde. Je bent een nurturer. ❤️",
    7: "Introspectie, spiritualiteit en wijsheid. Je zoekt diepere waarheden. 🔍",
    8: "Ambitie, macht en succes. Je streeft naar prestaties. 💼",
    9: "Mededogen, humanitarisme en voltooiing. Je geeft onzelfzuchtig. 🌍",
    11: "Intuïtie en inspiratie. Je bent een visionair met spirituele gaven. ✨",
    22: "Meesterbouwer met grote dromen. Je creëert blijvende impact. 🏛️"
  };

  // Sun and Moon sign traits (Dutch)
  const sunSignTraits = {
    "Aries": "Avontuurlijk, energiek, moedig. Je leidt met passie. ♈",
    "Taurus": "Betrouwbaar, sensueel, volhardend. Je bouwt stabiliteit. ♉",
    "Gemini": "Nieuwsgierig, communicatief, veelzijdig. Je gedijt op variatie. ♊",
    "Cancer": "Zorgzaam, intuïtief, emotioneel. Je bouwt veilige nests. ♋",
    "Virgo": "Analytisch, praktisch, dienstbaar. Je perfectioneert details. ♍",
    "Libra": "Harmonieus, diplomatiek, esthetisch. Je creëert balans. ♎",
    "Scorpio": "Intens, transformatief, gepassioneerd. Je duikt diep in mysteries. ♏",
    "Sagittarius": "Optimistisch, avontuurlijk, filosofisch. Je zoekt vrijheid. ♐",
    "Capricorn": "Ambitieus, gedisciplineerd, verantwoordelijk. Je bouwt succes. ♑",
    "Aquarius": "Innovatief, onafhankelijk, humaan. Je visionairt een betere wereld. ♒",
    "Pisces": "Mededogend, intuïtief, artistiek. Je droomt diep. ♓"
  };

  const moonSignTraits = {
    "Aries": "Emotioneel impulsief en enthousiast. Je gevoelens komen snel op. ♈",
    "Taurus": "Emotioneel stabiel en loyaal. Je zoekt emotionele veiligheid. ♉",
    "Gemini": "Emotioneel nieuwsgierig en communicatief. Je verwerkt gevoelens door te praten. ♊",
    "Cancer": "Emotioneel voedend en beschermend. Je bent diep verbonden met familie. ♋",
    "Virgo": "Emotioneel analytisch en bescheiden. Je helpt anderen emotioneel. ♍",
    "Libra": "Emotioneel harmonieus en sociaal. Je bloeit op in partnerschappen. ♎",
    "Scorpio": "Emotioneel intens en transformatief. Je duikt diep in gevoelens. ♏",
    "Sagittarius": "Emotioneel optimistisch en vrijheidslievend. Je zoekt avontuur. ♐",
    "Capricorn": "Emotioneel gereserveerd en verantwoordelijk. Je bouwt structuur. ♑",
    "Aquarius": "Emotioneel onafhankelijk en innovatief. Je rationaliseert gevoelens. ♒",
    "Pisces": "Emotioneel empathisch en dromerig. Je absorbeert andermans gevoelens. ♓"
  };

  // Select exactly 3 cards for Past, Present, Future
  const numberOfCards = 3;
  const selectedCards = [];
  const positions = ["Past", "Present", "Future"];
  const deckCopy = [...tarotDeck];
  for (let i = 0; i < numberOfCards; i++) {
    const randomIndex = Math.floor(Math.random() * deckCopy.length);
    selectedCards.push({ card: deckCopy[randomIndex], position: positions[i] });
    deckCopy.splice(randomIndex, 1);
  }

  // Use User schema data for basic zodiac
  const zodiacSign = getSignFromDate(userBirthData?.birthDate) || "Unknown";

  // Calculate numerology data if DOB is valid
  let numerologyData = {};
  if (userBirthData?.birthDate && !isNaN(new Date(userBirthData.birthDate))) {
    numerologyData = calculateManualNumbers(username || "Anonymous", userBirthData.birthDate);
  } else {
    console.warn("[Tarot] No valid DOB for numerology integration; proceeding without numerology");
  }

  // Fetch Human Design data
  let userHumanDesign = null;
  if (userBirthData?.hasCompleteData) {
    try {
      userHumanDesign = await fetchHumanDesignData(
        userBirthData.birthDate,
        userBirthData.birthTime,
        userBirthData.birthPlace,
        userId
      );
      console.log(`[Tarot HumanDesign] Fetched for ${username}:`, {
        type: userHumanDesign?.type,
        status: userHumanDesign?.status
      });
    } catch (hdError) {
      console.error(`[Tarot HumanDesign] Error for user ${userId}:`, hdError.message);
      userHumanDesign = {
        type: "Integration Error",
        authority: "Integration Error",
        profile: "Integration Error",
        error: "Human Design tijdelijk niet beschikbaar",
        status: 500
      };
    }
  }

  const humanDesignDetails = getHumanDesignDetails(userHumanDesign, username);

  // Fetch Astrology data for Sun and Moon signs
  let sunSign = "Onbekend", moonSign = "Onbekend", personalityTraits = [];
  let astrologyData = null;
  let tarotAstroError = null;

  if (userBirthData?.hasCompleteData) {
    try {
      console.log("[Tarot Astrology] Attempting to fetch Astrology data for user:", username);
      const tarotFormData = {
        birthDate: userBirthData.birthDate,
        birthTime: userBirthData.birthTime,
        birthPlace: userBirthData.birthPlace,
        yourName: username
      };
      const tarotCoords = await getCoordinatesFromCity(userBirthData.birthPlace);
      console.log(`[Tarot Astrology] Coordinates for ${userBirthData.birthPlace}:`, tarotCoords);

      if (!tarotCoords || !tarotCoords.latitude || !tarotCoords.longitude) {
        throw new Error(`Ongeldige coördinaten voor ${userBirthData.birthPlace}`);
      }

      const westernTarotData = await getWesternChartData(tarotFormData, tarotCoords);
      const { hour, min } = parseTime(userBirthData.birthTime);
      const timezone = await getPreciseTimezone(
        tarotCoords.latitude,
        tarotCoords.longitude,
        userBirthData.birthDate
      );

      const personalityPayload = {
        day: new Date(userBirthData.birthDate).getDate(),
        month: new Date(userBirthData.birthDate).getMonth() + 1,
        year: new Date(userBirthData.birthDate).getFullYear(),
        hour,
        min,
        lat: tarotCoords.latitude,
        lon: tarotCoords.longitude,
        tzone: timezone,
        house_system: "placidus"
      };

      const personalityRes = await axios.post(
        "https://json.astrologyapi.com/v1/personality_report/tropical",
        personalityPayload,
        { auth, timeout: 15000 }
      );

      sunSign = westernTarotData.sunSign || "Onbekend";
      moonSign = westernTarotData.moonSign || "Onbekend";
      personalityTraits = personalityRes.data?.traits || [];

      let transitData = null;
      if (userBirthData.hasCompleteData) {
        transitData = await getTransitData(tarotCoords, westernTarotData.timezone, westernTarotData.ascendantDegree, personalityPayload);
      }

      astrologyData = {
        sunSign,
        moonSign,
        personalityTraits,
        ascendant: westernTarotData.ascendant,
        planets: westernTarotData.planets,
        timezone: westernTarotData.timezone,
        transits: transitData
      };

    } catch (astroError) {
      console.error("[Tarot Astrology] DETAILED ERROR:", {
        message: astroError.message,
        status: astroError.response?.status,
        data: astroError.response?.data ? JSON.stringify(astroError.response.data, null, 2) : 'No data',
        birthData: {
          date: userBirthData?.birthDate,
          time: userBirthData?.birthTime,
          place: userBirthData?.birthPlace,
          hasCompleteData: userBirthData?.hasCompleteData
        },
        stack: astroError.stack
      });

      tarotAstroError = astroError.message;
      sunSign = getSignFromDate(userBirthData.birthDate) || "Onbekend";
      moonSign = "Onbekend (vereist geboortetijd)";
      personalityTraits = ["intuïtief", "gevoelig", "creatief"];
    }
  } else {
    console.warn("[Tarot Astrology] No complete birth data available, using basic fallback");
    sunSign = getSignFromDate(userBirthData?.birthDate) || "Onbekend";
    moonSign = "Onbekend (vereist geboortetijd)";
    personalityTraits = ["intuïtief", "gevoelig", "creatief"];
  }

  const dutchZodiacSigns = {
    "Aries": "Ram", "Taurus": "Stier", "Gemini": "Tweelingen",
    "Cancer": "Kreeft", "Leo": "Leeuw", "Virgo": "Maagd",
    "Libra": "Weegschaal", "Scorpio": "Schorpioen", "Sagittarius": "Boogschutter",
    "Capricorn": "Steenbok", "Aquarius": "Waterman", "Pisces": "Vissen"
  };

  const dutchSunSign = dutchZodiacSigns[sunSign] || sunSign;
  const dutchMoonSign = dutchZodiacSigns[moonSign] || moonSign;
  const dutchZodiacSign = dutchZodiacSigns[zodiacSign] || zodiacSign;

  const dutchSelectedCards = selectedCards.map(card => ({
    ...card,
    dutchName: dutchCardNames[card.card] || card.card,
    englishName: card.card
  }));

  const astrologySummary = tarotAstroError
    ? `⚠️ Astrologie data niet volledig beschikbaar: ${tarotAstroError.substring(0, 100)}... (Zon: ${dutchSunSign})`
    : `✅ Astrologie data geladen: Zon ${dutchSunSign} ☀️, Maan ${dutchMoonSign} 🌙, Persoonlijkheid: ${personalityTraits.slice(0, 3).join(", ")}${personalityTraits.length > 3 ? "..." : ""}`;

  console.log(`[Tarot Astrology Summary] ${astrologySummary}`);

  const tarotSystemPrompt = `
${languageInstruction}

Je bent ${psychicName}, een diep intuïtieve Tarot lezer met expertise in Human Design en Astrologie. De huidige datum is 25 september 2025. Geef een professionele, boeiende en empathische lezing met een vloeiende, verhalende stijl. Gebruik emoji's om de betrokkenheid te vergroten (bijv. 🔮 voor intuïtie, 🃏 voor kaarten, ✨ voor magie).

${emojiContext}

CLIENT PROFIEL:
• Naam: ${username}
• Zonneteken: ${dutchSunSign} ☀️ (${sunSignTraits[sunSign] || "Mysterieus potentieel voor unieke groei"})
• Maanteken: ${dutchMoonSign} 🌙 (${moonSignTraits[moonSign] || "Diepe emotionele lagen om te verkennen"})
• Sterrenbeeld: ${dutchZodiacSign || "Onbekend"} ♈

ASTROLOGIE STATUS: ${astrologySummary}

${Object.keys(numerologyData).length > 0 ? `
🔢 NUMEROLOGIE INZICHTEN:
• Levenspad: ${numerologyData.lifePath || "N/A"} 🔢 (${lifePathMeanings[numerologyData.lifePath] || "Doel en levensreis"})
• Zielszucht: ${numerologyData.soulUrge || "N/A"} 💖 (Innerlijke verlangens en motivaties)
• Expressie: ${numerologyData.expression || "N/A"} 🌟 (Hoe je jezelf presenteert aan de wereld)
${numerologyData.karmicLessons?.length ? `• Karmische Lessen: ${numerologyData.karmicLessons.join(", ")} 📝` : ""}
${numerologyData.challenges?.length ? `• Uitdagingen: ${formatChallenges(numerologyData.challenges)} ⚠️` : ""}
` : "🔢 Numerologie: Niet beschikbaar door ontbrekende geboortedatum 📅"}

🔮 HUMAN DESIGN:
${humanDesignDetails}

${personalityTraits.length > 0 ? `
🌟 PERSOONLIJKHEIDSEIGENSCHAPPEN (${personalityTraits.length} eigenschappen):
${personalityTraits.slice(0, 6).join(", ")}${personalityTraits.length > 6 ? ` en ${personalityTraits.length - 6} meer...` : ""}
` : "🌟 Persoonlijkheidskenmerken: intuïtief, gevoelig, creatief (generieke fallback)"}

🃏 TAROT SPREAD: Drie-kaarten lezing (Verleden, Heden, Toekomst)
Getrokken kaarten: ${dutchSelectedCards.map(c => `${c.dutchName} (${c.position})`).join(", ")}
Kaart betekenissen: ${dutchSelectedCards.map(c => `${c.dutchName}: ${cardMeanings[c.englishName] || "Algemene spirituele energie"}`).join("; ")}.

${astrologyData?.transits ? `
🌌 Huidige Transits (2025):
${astrologyData.transits.transits.map(t => `- ${t.name}: ${t.sign} (Huis ${t.house})`).join("\n")}
` : ""}

BELANGRIJKE INSTRUCTIES:
1. Beantwoord de vraag van de gebruiker: "${message || "Wat biedt het universum me vandaag voor begeleiding?"}" met een spiritueel, empowerend en zeer gepersonaliseerd verhaal.
2. Interpreteer elke kaart (${dutchSelectedCards.map(c => c.dutchName).join(", ")}) op basis van haar positie en betekenis.
3. VOOR DE TOEKOMST KAART: Integreer ALTIJD specifiek inzichten van de Zon (${dutchSunSign}) en Maan (${dutchMoonSign}) tekens, inclusief hun traits. Gebruik persoonlijkheidskenmerken voor diepgang. Toon altijd huidige transits (inclusief Saturn) naast de voorspelling.
4. Weef naadloos door:
   a. Astrologische energie (specifiek ${dutchSunSign} Zon en ${dutchMoonSign} Maan)
   b. Numerologie inzichten (vooral Levenspad ${numerologyData.lifePath || "N/A"})
   c. Human Design strategie (${userHumanDesign?.strategy || "Volg je innerlijke begeleiding"})
5. VOOR DE TOEKOMST KAART: Bouw rond traits: "De ${dutchSelectedCards[2].dutchName} in je toekomst resoneert met je ${dutchSunSign} Zon energie die je [specifieke trait uit sunSignTraits] geeft, gecombineerd met je ${dutchMoonSign} Maan die je emotionele diepgang versterkt door [specifieke trait uit moonSignTraits]. Samen met je Levenspad ${numerologyData.lifePath || "N/A"}'s [key trait uit lifePathMeanings] en je Human Design [type trait], wijst dit op [diepgaande voorspelling]. **Huidige Transits:** [lijst van transits, inclusief Saturn]."
6. **EINDE MET HAPPY ENDING**: Sluit ALTIJD af met een hoopvolle, inspirerende boodschap en een praktische tip (bijv. "Omarm deze kans met vertrouwen, en mediteer dagelijks 5 minuten om je intuïtie te versterken. ✨").
7. Maak betekenisvolle verbindingen (bijv. "De Toren resoneert met je Levenspad 5's liefde voor transformatie en je ${dutchSunSign} Zon's [trait]"). Maak het persoonlijk.
8. Houd de toon compassievol, uplifting, professioneel en vriendelijk met emoji's (🔮, 🃏, ✨).
9. Vermijd spelfouten en zorg voor een gepolijste stijl.
10. Houd de respons tussen 200-250 woorden, volledig en zonder afgebroken zinnen.

TAALREGELS:
- ALTIJD Nederlands, zelfs als de gebruiker Engels spreekt
- Gebruik natuurlijke, vloeiende Nederlandse zinnen
- Vermijd letterlijke vertalingen
- Gebruik Nederlandse Tarot kaartnamen
- Zelfs bij "Onbekend" data, maak creatieve interpretaties
`.trim();

  const messagesForAI = [
    { role: "system", content: tarotSystemPrompt },
    ...chat.messages.slice(-5).map(msg => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
    })),
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: messagesForAI,
    temperature: 0.8,
    max_tokens: 500, // Increased to ensure complete sentences
  });

  let aiText = completion.choices[0].message.content;
  aiText = addContextualEmojis(aiText, type);

  // Ensure happy ending if not present
  if (!aiText.includes("✨") || !aiText.match(/Omarm|Vertrouw|Grijp|Tip:/i)) {
    aiText += `\n\nVertrouw op deze begeleiding, ${username}, en laat je innerlijke licht schijnen. 🌟 Tip: Neem dagelijks een moment om te reflecteren op wat je dankbaar maakt om je pad te verlichten.`;
  }

  console.log(`[Tarot] Cards pulled: ${dutchSelectedCards.map(c => `${c.dutchName} (${c.position})`).join(", ")}`);
  console.log(`[Tarot] Astrology: Sun=${dutchSunSign}, Moon=${dutchMoonSign}, Error=${!!tarotAstroError}`);
  console.log(`[Tarot] Human Design: ${userHumanDesign?.type || 'N/A'}`);
  console.log(`[Tarot] Language: Dutch, Response preview: ${aiText.substring(0, 100)}...`);

  chat.messages.push({
    sender: "ai",
    text: aiText,
    emojiMetadata: processEmojis(aiText),
    metadata: {
      selectedCards: dutchSelectedCards,
      numerologyData,
      humanDesign: userHumanDesign,
      astrologyData: astrologyData || null,
      detectedLanguage: detectedLanguage,
      isDutchRequest: isDutchRequest,
      tarotAstroError: tarotAstroError || null,
      sunSign: dutchSunSign,
      moonSign: dutchMoonSign
    }
  });
  await chat.save();

  const response = {
    success: true,
    reply: aiText,
    messages: chat.messages,
    source: astrologyData && !tarotAstroError && userHumanDesign?.status === 'success'
      ? "GPT-4 Tarot (Three-Card Spread) + AstrologyAPI (Sun/Moon/Personality) + Manual Numerology + HumanDesignAPI + Dutch"
      : "GPT-4 Tarot (Three-Card Spread) + Basic Astrology Fallback + Manual Numerology + HumanDesignAPI + Dutch",
    metadata: {
      selectedCards: dutchSelectedCards,
      numerologyData,
      humanDesign: userHumanDesign,
      astrologyData: astrologyData || null,
      detectedLanguage: detectedLanguage,
      tarotAstroError: tarotAstroError || null,
      sunSign: dutchSunSign,
      moonSign: dutchMoonSign
    }
  };
  const responseWithMetadata = await addTimerMetadata(response, userId, psychicId, isFree);
  return res.status(200).json(responseWithMetadata);
}


  } catch (err) {
  console.error("Chat Error:", err?.response?.data || err.message || err);
  const detectedLanguage = detectLanguage(message || "test");
  const fallbackText = detectedLanguage === 'nl'
    ? `Het spijt me, er is iets misgegaan. Probeer het later nog eens! 😔`
    : `Het spijt me, er is iets misgegaan. Probeer het later nog eens! 😔`;
    
  let chat = await ChatMessage.findOne({ userId, psychicId }) || new ChatMessage({ userId, psychicId, messages: [] });
  chat.messages.push({ sender: "ai", text: fallbackText, emojiMetadata: processEmojis(fallbackText) });
  await chat.save();
  res.status(500).json({ success: false, message: fallbackText, error: err.message });
}
};

function generateBasicCompatibility(sign1, sign2) {
  if (!sign1 || !sign2) return "Insufficient data for compatibility analysis";
  
  const compatibilityMap = {
    "Aries": { good: ["Leo", "Sagittarius", "Gemini"], challenging: ["Cancer", "Capricorn"] },
    "Taurus": { good: ["Virgo", "Capricorn", "Cancer"], challenging: ["Leo", "Aquarius"] },
    "Gemini": { good: ["Libra", "Aquarius", "Aries"], challenging: ["Virgo", "Pisces"] },
    "Cancer": { good: ["Scorpio", "Pisces", "Taurus"], challenging: ["Aries", "Libra"] },
    "Leo": { good: ["Aries", "Sagittarius", "Gemini"], challenging: ["Taurus", "Scorpio"] },
    "Virgo": { good: ["Taurus", "Capricorn", "Cancer"], challenging: ["Gemini", "Sagittarius"] },
    "Libra": { good: ["Gemini", "Aquarius", "Leo"], challenging: ["Cancer", "Capricorn"] },
    "Scorpio": { good: ["Cancer", "Pisces", "Virgo"], challenging: ["Leo", "Aquarius"] },
    "Sagittarius": { good: ["Aries", "Leo", "Aquarius"], challenging: ["Virgo", "Pisces"] },
    "Capricorn": { good: ["Taurus", "Virgo", "Pisces"], challenging: ["Aries", "Libra"] },
    "Aquarius": { good: ["Gemini", "Libra", "Sagittarius"], challenging: ["Taurus", "Scorpio"] },
    "Pisces": { good: ["Cancer", "Scorpio", "Taurus"], challenging: ["Gemini", "Sagittarius"] }
  };
  
  const compatibility = compatibilityMap[sign1] || {};
  const relationship = compatibility.good?.includes(sign2) ? "excellent" :
                      compatibility.challenging?.includes(sign2) ? "challenging but growth-oriented" : "balanced";
  
  return `${sign1} and ${sign2} typically have ${relationship} compatibility, creating opportunities for beautiful growth together. 💞`;
}

// ✅ NEW: Missing formatChallenges function
function formatChallenges(challenges) {
  if (!challenges || typeof challenges !== 'object') return "";
  
  const formatted = [];
  if (challenges.firstChallenge) formatted.push(`Eerste Uitdaging: ${challenges.firstChallenge}`);
  if (challenges.secondChallenge) formatted.push(`Tweede Uitdaging: ${challenges.secondChallenge}`);
  if (challenges.thirdChallenge) formatted.push(`Derde Uitdaging: ${challenges.thirdChallenge}`);
  if (challenges.mainChallenge) formatted.push(`Hoofd Uitdaging: ${challenges.mainChallenge}`);
  
  return formatted.join(", ");
}

function calculateManualNumbers(name, birthDate) {
  return {
    lifePath: calculateLifePathNumber(birthDate),
    soulUrge: calculateSoulUrgeNumber(name),
    personality: calculatePersonalityNumber(name),
    expression: calculateExpressionNumber(name),
    challenges: calculateChallengeNumbers(birthDate),
    karmicLessons: calculateKarmicLessons(name),
  };
}

// ✅ COMPLETE CORRECTED: Robust Life Path Number calculation
function calculateLifePathNumber(birthDate) {
  try {
    // ✅ STEP 1: Validate and parse input date
    let date;
    
    // Handle different input types
    if (birthDate instanceof Date) {
      date = new Date(birthDate);
    } else if (typeof birthDate === 'string') {
      // Try multiple date parsing strategies
      const parsedDate = new Date(birthDate);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate;
      } else {
        // Fallback: try reformatting common date strings
        const reformatted = reformatDateString(birthDate);
        date = new Date(reformatted);
      }
    } else {
      throw new Error(`Unsupported birthDate type: ${typeof birthDate}. Expected Date or string.`);
    }
    
    // ✅ STEP 2: Validate parsed date
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${birthDate}`);
    }
    
    // Basic date range validation
    const now = new Date();
    const minYear = 1900;
    const maxYear = now.getFullYear();
    
    if (date > now) {
      throw new Error(`Birth date cannot be in the future: ${birthDate}`);
    }
    
    if (date.getFullYear() < minYear) {
      console.warn(`[LifePath] Warning: Birth year ${date.getFullYear()} is unusually old`);
    }
    
    // Extract date components
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    // Validate components
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month} (must be 1-12)`);
    }
    if (day < 1 || day > 31) {
      throw new Error(`Invalid day: ${day} (must be 1-31)`);
    }
    
    // ✅ STEP 3: Calculate numerology reduction
    console.log(`[LifePath] Processing: ${month}/${day}/${year}`);
    
    // Reduce each component to single digit (preserving master numbers)
    const reducedDay = reduceToSingleDigit(day);
    const reducedMonth = reduceToSingleDigit(month);
    const reducedYear = reduceToSingleDigit(year);
    
    // Sum the reduced components
    const totalSum = reducedDay + reducedMonth + reducedYear;
    
    // Final reduction to single digit (preserving master numbers)
    const lifePathNumber = reduceToSingleDigit(totalSum);
    
    // ✅ STEP 4: Log calculation for debugging
    console.log(`[LifePath] Calculation details:`, {
      input: birthDate,
      parsedDate: date.toISOString().split('T')[0],
      components: { day, month, year },
      reduced: { day: reducedDay, month: reducedMonth, year: reducedYear },
      totalSum,
      final: lifePathNumber
    });
    
    return lifePathNumber;
    
  } catch (error) {
    // ✅ STEP 5: Comprehensive error handling
    console.error(`[LifePath] ERROR: ${error.message}`, {
      input: birthDate,
      inputType: typeof birthDate,
      errorType: error.name,
      stack: error.stack
    });
    
    // Return null to indicate failure (caller can handle gracefully)
    return null;
  }
}

// ✅ HELPER: Reformat various date string formats
function reformatDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  
  const cleaned = dateStr.trim().replace(/\s+/g, ' ');
  
  // Handle common formats
  // DD/MM/YYYY or MM/DD/YYYY
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(cleaned)) {
    const parts = cleaned.split(/[/\-\.]/);
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    // If day > 12, assume DD/MM/YYYY format
    if (day > 12 && month <= 12) {
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    // Otherwise assume MM/DD/YYYY
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }
  
  // Handle month names (English)
  const monthNames = {
    'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
    'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
    'may': '05', 'june': '06', 'jun': '06',
    'july': '07', 'august': '08', 'aug': '08',
    'september': '09', 'sep': '09', 'october': '10', 'oct': '10',
    'november': '11', 'nov': '11', 'december': '12', 'dec': '12'
  };
  
  // Simple month name extraction (this is basic - you might want to enhance)
  for (const [name, num] of Object.entries(monthNames)) {
    if (cleaned.toLowerCase().includes(name)) {
      // This is a very basic replacement - for production you might want a proper parser
      return cleaned.replace(new RegExp(name, 'i'), num);
    }
  }
  
  // Fallback to original
  return cleaned;
}

// ✅ COMPLETE CORRECTED: Enhanced single digit reduction with master number support
function reduceToSingleDigit(num, preserveMasters = true) {
  // Handle edge cases
  if (num === 0 || num === null || num === undefined) return 0;
  if (typeof num !== 'number') {
    num = parseInt(num.toString(), 10);
    if (isNaN(num)) return 0;
  }
  
  // Handle negative numbers
  if (num < 0) num = Math.abs(num);
  
  // ✅ Preserve master numbers (11, 22, 33)
  if (preserveMasters && [11, 22, 33].includes(num)) {
    return num;
  }
  
  // Reduce to single digit
  let result = num;
  while (result > 9) {
    // Break into individual digits and sum
    result = result
      .toString()
      .split('')
      .reduce((sum, digit) => sum + parseInt(digit, 10), 0);
    
    // Check for master numbers after each reduction
    if (preserveMasters && [11, 22, 33].includes(result)) {
      return result;
    }
  }
  
  return result;
}

// ✅ UPDATED: Enhanced calculateManualNumbers to handle the new return type
function calculateManualNumbers(name, birthDate) {
  try {
    // Validate name
    if (!name || typeof name !== 'string') {
      console.warn('[ManualNumbers] Invalid name provided:', name);
      name = 'Unknown';
    }
    
    const cleanName = name.trim().replace(/\s+/g, ' ');
    
    // Calculate all numbers
    const lifePathResult = calculateLifePathNumber(birthDate);
    const soulUrgeResult = calculateSoulUrgeNumber(cleanName);
    const personalityResult = calculatePersonalityNumber(cleanName);
    const expressionResult = calculateExpressionNumber(cleanName);
    const challengesResult = calculateChallengeNumbers(birthDate);
    const karmicLessonsResult = calculateKarmicLessons(cleanName);
    
    // Handle potential null values from life path calculation
    const results = {
      lifePath: lifePathResult !== null ? lifePathResult : 0,
      soulUrge: soulUrgeResult || 0,
      personality: personalityResult || 0,
      expression: expressionResult || 0,
      challenges: challengesResult || {
        firstChallenge: 0,
        secondChallenge: 0,
        thirdChallenge: 0,
        mainChallenge: 0
      },
      karmicLessons: karmicLessonsResult || []
    };
    
    // Add calculation status for debugging
    if (lifePathResult === null) {
      results.calculationWarning = 'Life Path calculation failed - using fallback value 0';
    }
    
    console.log('[ManualNumbers] Complete calculation:', {
      name: cleanName,
      birthDate,
      results
    });
    
    return results;
    
  } catch (error) {
    console.error('[ManualNumbers] Critical error:', error.message);
    return {
      lifePath: 0,
      soulUrge: 0,
      personality: 0,
      expression: 0,
      challenges: {
        firstChallenge: 0,
        secondChallenge: 0,
        thirdChallenge: 0,
        mainChallenge: 0
      },
      karmicLessons: [],
      calculationError: error.message
    };
  }
}

// ✅ UPDATED: Enhanced challenge calculation to match new date handling
function calculateChallengeNumbers(birthDate) {
  try {
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      return { firstChallenge: 0, secondChallenge: 0, thirdChallenge: 0, mainChallenge: 0 };
    }
    
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const reducedDay = reduceToSingleDigit(day);
    const reducedMonth = reduceToSingleDigit(month);
    const reducedYear = reduceToSingleDigit(year);
    
    return {
      firstChallenge: reduceToSingleDigit(Math.abs(reducedMonth - reducedDay)),
      secondChallenge: reduceToSingleDigit(Math.abs(reducedDay - reducedYear)),
      thirdChallenge: reduceToSingleDigit(Math.abs(reducedMonth - reducedYear)),
      mainChallenge: reduceToSingleDigit(Math.abs(reducedMonth - reducedDay - reducedYear))
    };
    
  } catch (error) {
    console.error('[Challenges] Error:', error.message);
    return { firstChallenge: 0, secondChallenge: 0, thirdChallenge: 0, mainChallenge: 0 };
  }
}

// ✅ Keep existing functions unchanged (they're already correct)
function calculateExpressionNumber(name) {
  const letterValues = {
    "a": 1, "j": 1, "s": 1,
    "b": 2, "k": 2, "t": 2,
    "c": 3, "l": 3, "u": 3,
    "d": 4, "m": 4, "v": 4,
    "e": 5, "n": 5, "w": 5,
    "f": 6, "o": 6, "x": 6,
    "g": 7, "p": 7, "y": 7,
    "h": 8, "q": 8, "z": 8,
    "i": 9, "r": 9,
  };

  let sum = 0;
  name.toLowerCase().split("").forEach(char => {
    if (letterValues[char]) sum += letterValues[char];
  });

  return reduceToSingleDigit(sum);
}

function calculateSoulUrgeNumber(name) {
  const vowelValues = { "a": 1, "e": 5, "i": 9, "o": 6, "u": 3, "y": 7 };
  let sum = 0;
  
  name.toLowerCase().split("").forEach(char => {
    if (vowelValues[char]) sum += vowelValues[char];
  });

  return reduceToSingleDigit(sum);
}

function calculatePersonalityNumber(name) {
  const consonantValues = {
    "b": 2, "c": 3, "d": 4, "f": 6, "g": 7, 
    "h": 8, "j": 1, "k": 2, "l": 3, "m": 4,
    "n": 5, "p": 7, "q": 8, "r": 9, "s": 1,
    "t": 2, "v": 4, "w": 5, "x": 6, "y": 7, "z": 8,
  };
  
  let sum = 0;
  name.toLowerCase().split("").forEach(char => {
    if (consonantValues[char]) sum += consonantValues[char];
  });

  return reduceToSingleDigit(sum);
}

function calculateKarmicLessons(name) {
  const allNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const presentNumbers = new Set();
  
  name.toLowerCase().split("").forEach(char => {
    if (char.match(/[a-z]/)) {
      const num = char.charCodeAt(0) - 96;
      const reducedNum = reduceToSingleDigit(num);
      if (reducedNum >= 1 && reducedNum <= 9) {
        presentNumbers.add(reducedNum);
      }
    }
  });

  return allNumbers.filter(num => !presentNumbers.has(num));
}

function calculateExpressionNumber(name) {
  const letterValues = {
    "a": 1, "j": 1, "s": 1,
    "b": 2, "k": 2, "t": 2,
    "c": 3, "l": 3, "u": 3,
    "d": 4, "m": 4, "v": 4,
    "e": 5, "n": 5, "w": 5,
    "f": 6, "o": 6, "x": 6,
    "g": 7, "p": 7, "y": 7,
    "h": 8, "q": 8, "z": 8,
    "i": 9, "r": 9,
  };

  let sum = 0;
  name.toLowerCase().split("").forEach(char => {
    if (letterValues[char]) sum += letterValues[char];
  });

  return reduceToSingleDigit(sum);
}

function calculateSoulUrgeNumber(name) {
  const vowelValues = { "a": 1, "e": 5, "i": 9, "o": 6, "u": 3, "y": 7 };
  let sum = 0;
  
  name.toLowerCase().split("").forEach(char => {
    if (vowelValues[char]) sum += vowelValues[char];
  });

  return reduceToSingleDigit(sum);
}

function calculatePersonalityNumber(name) {
  const consonantValues = {
    "b": 2, "c": 3, "d": 4, "f": 6, "g": 7, 
    "h": 8, "j": 1, "k": 2, "l": 3, "m": 4,
    "n": 5, "p": 7, "q": 8, "r": 9, "s": 1,
    "t": 2, "v": 4, "w": 5, "x": 6, "y": 7, "z": 8,
  };
  
  let sum = 0;
  name.toLowerCase().split("").forEach(char => {
    if (consonantValues[char]) sum += consonantValues[char];
  });

  return reduceToSingleDigit(sum);
}

function calculateChallengeNumbers(birthDate) {
  const date = new Date(birthDate);
  const day = reduceToSingleDigit(date.getDate());
  const month = reduceToSingleDigit(date.getMonth() + 1);
  const year = reduceToSingleDigit(date.getFullYear());
  
  return {
    firstChallenge: Math.abs(month - day),
    secondChallenge: Math.abs(day - year),
    thirdChallenge: Math.abs(month - year),
    mainChallenge: reduceToSingleDigit(Math.abs(month - day - year)),
  };
}

function calculateKarmicLessons(name) {
  const allNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const presentNumbers = new Set();
  
  name.toLowerCase().split("").forEach(char => {
    if (char.match(/[a-z]/)) {
      const num = char.charCodeAt(0) - 96;
      presentNumbers.add(reduceToSingleDigit(num));
    }
  });

  return allNumbers.filter(num => !presentNumbers.has(num));
}

function reduceToSingleDigit(num) {
  if (num === 11 || num === 22 || num === 33) return num;
  while (num > 9) {
    num = num.toString().split("").reduce((sum, digit) => sum + parseInt(digit), 0);
    if (num === 11 || num === 22 || num === 33) return num;  // Check after each reduction
  }
  return num;
}

const getChatHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { psychicId } = req.params;

    // ✅ 1. Find psychic and its type
    const psychic = await AiPsychic.findById(psychicId);
    if (!psychic) {
      return res.status(404).json({ success: false, message: "Psychic not found" });
    }

    const { type } = psychic;

    // ✅ 2. Get required fields for that type
    const requiredFields = getRequiredFieldsByType(type);

    // ✅ 3. Fetch form if needed, but don't error - set to null if missing
    let formData = null;
    if (type !== "Tarot") {
      const form = await AiFormData.findOne({ userId, type });
      if (form?.formData) {
        formData = {};
        requiredFields.forEach((field) => {
          formData[field] = form.formData[field] || "N/A";
        });
      }
      // Removed 400 returns here - allow history even if form incomplete
    }

    // ✅ 4. Get chat history
    const chat = await ChatMessage.findOne({ userId, psychicId });

    return res.status(200).json({
      success: true,
      messages: chat?.messages.map(msg => ({
        ...msg.toObject(),
        id: msg._id,
        createdAt: msg.createdAt || new Date(),
      })) || [],
      formData: formData || null, // include form data if present, null otherwise
      psychicType: type,
    });

  } catch (error) {
    console.error("Error fetching chat history:", error);
    return res.status(500).json({ success: false, message: "Failed to get chat history" });
  }
};

// controllers/chatController.js
const getAllUserChats = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const chats = await ChatMessage.find()
      .populate("userId", "username image")
      .populate("psychicId", "name image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalChats = await ChatMessage.countDocuments();
    const totalPages = Math.ceil(totalChats / limit);

    const formatted = chats.map(chat => ({
      id: chat._id,
      user: chat.userId,
      advisor: chat.psychicId,
      credits: Math.floor(Math.random() * 200 + 20), // Dummy credits for now
      createdAt: chat.createdAt
    }));

    res.status(200).json({
      success: true,
      chats: formatted,
      pagination: {
        currentPage: page,
        totalPages,
        totalChats,
        limit
      }
    });
  } catch (error) {
    console.error("❌ getAllUserChats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch chats" });
  }
};
const getChatMessagesById = async (req, res) => {
  try {
    const chatId = req.params.chatId;

    const chat = await ChatMessage.findById(chatId)
      .populate("userId", "username image")
      .populate("psychicId", "name image");

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    res.status(200).json({
      success: true,
      chat: {
        id: chat._id,
        user: {
          id: chat.userId._id,
          username: chat.userId.username,
          image: chat.userId.image,
        },
        advisor: {
          id: chat.psychicId._id,
          name: chat.psychicId.name,
          image: chat.psychicId.image,
        },
        messages: chat.messages.map(msg => ({
          id: msg._id,
          sender: msg.sender, // 'user' or 'ai'
          text: msg.text,
          timestamp: msg.timestamp,
        })),
      },
    });
  } catch (error) {
    console.error("❌ getChatMessagesById error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getUserChatDetails = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?._id;
    const psychicId = req.query.psychicId; // Optional: filter by psychicId

    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    // If psychicId is provided, validate it
    if (psychicId && !mongoose.Types.ObjectId.isValid(psychicId)) {
      return res.status(400).json({ success: false, error: "Invalid psychic ID" });
    }

    // Find user
    const user = await User.findById(userId).select("username");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Build query for sessions
    const sessionQuery = { userId, isArchived: false };
    if (psychicId) {
      sessionQuery.psychicId = psychicId;
    }

    // Fetch sessions
    const sessions = await ActiveSession.find(sessionQuery)
      .populate("psychicId", "name")
      .lean();

    // Group sessions by psychicId to calculate totals
    const chatDetails = [];
    const psychicMap = {};

    for (const session of sessions) {
      const psychicIdStr = session.psychicId._id.toString();
      if (!psychicMap[psychicIdStr]) {
        psychicMap[psychicIdStr] = {
          psychicName: session.psychicId.name,
          totalCreditsUsed: 0,
          totalSessions: 0,
        };
      }
      psychicMap[psychicIdStr].totalSessions += 1;
      if (session.paidSession && session.initialCredits) {
        psychicMap[psychicIdStr].totalCreditsUsed += session.initialCredits;
      }
    }

    // Convert map to array
    for (const psychicId in psychicMap) {
      chatDetails.push({
        username: user.username,
        psychicName: psychicMap[psychicId].psychicName,
        totalCreditsUsed: psychicMap[psychicId].totalCreditsUsed,
        totalSessions: psychicMap[psychicId].totalSessions,
      });
    }

    // If no sessions found
    if (chatDetails.length === 0) {
      return res.json({ success: true, data: [] });
    }

    res.json({
      success: true,
      data: chatDetails,
    });
  } catch (error) {
    console.error("Error fetching user chat details:", {
      error: error.message,
      stack: error.stack,
      userId: req.params.userId,
      psychicId: req.query.psychicId,
    });
    res.status(500).json({ success: false, error: "Failed to fetch chat details" });
  }
};

const deleteChatById = async (req, res) => {
  try {
    const chatId = req.params.chatId;

    // Validate chatId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, error: "Invalid chat ID" });
    }

    // Find and delete the chat
    const chat = await ChatMessage.findByIdAndDelete(chatId);

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found" });
    }

    res.status(200).json({ success: true, message: "Chat deleted successfully" });
  } catch (error) {
    console.error("❌ deleteChatById error:", error);
    res.status(500).json({ success: false, message: "Failed to delete chat" });
  }
};
module.exports = {
  chatWithPsychic,
  getAllUserChats,
  getChatHistory,
  getUserChatDetails,
  getChatMessagesById,
  deleteChatById
};
