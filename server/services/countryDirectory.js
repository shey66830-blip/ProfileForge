// =====================================================
// Country Directory — single source of truth for
// worldwide job-search location handling.
//
// resolveCountry(input) → { code, name } | null
//   null means "Worldwide" (no geographic restriction).
// =====================================================

// Canonical name → ISO 3166-1 alpha-2 code.
const COUNTRIES = {
    "afghanistan": "AF",
    "albania": "AL",
    "algeria": "DZ",
    "andorra": "AD",
    "angola": "AO",
    "argentina": "AR",
    "armenia": "AM",
    "australia": "AU",
    "austria": "AT",
    "azerbaijan": "AZ",
    "bahrain": "BH",
    "bangladesh": "BD",
    "belarus": "BY",
    "belgium": "BE",
    "bolivia": "BO",
    "bosnia and herzegovina": "BA",
    "botswana": "BW",
    "brazil": "BR",
    "brunei": "BN",
    "bulgaria": "BG",
    "cambodia": "KH",
    "cameroon": "CM",
    "canada": "CA",
    "chile": "CL",
    "china": "CN",
    "colombia": "CO",
    "costa rica": "CR",
    "croatia": "HR",
    "cyprus": "CY",
    "czech republic": "CZ",
    "czechia": "CZ",
    "denmark": "DK",
    "dominican republic": "DO",
    "ecuador": "EC",
    "egypt": "EG",
    "el salvador": "SV",
    "estonia": "EE",
    "ethiopia": "ET",
    "finland": "FI",
    "france": "FR",
    "georgia": "GE",
    "germany": "DE",
    "ghana": "GH",
    "greece": "GR",
    "guatemala": "GT",
    "honduras": "HN",
    "hong kong": "HK",
    "hungary": "HU",
    "iceland": "IS",
    "india": "IN",
    "indonesia": "ID",
    "iraq": "IQ",
    "ireland": "IE",
    "israel": "IL",
    "italy": "IT",
    "jamaica": "JM",
    "japan": "JP",
    "jordan": "JO",
    "kazakhstan": "KZ",
    "kenya": "KE",
    "kuwait": "KW",
    "latvia": "LV",
    "lebanon": "LB",
    "libya": "LY",
    "lithuania": "LT",
    "luxembourg": "LU",
    "macau": "MO",
    "malaysia": "MY",
    "maldives": "MV",
    "malta": "MT",
    "mauritius": "MU",
    "mexico": "MX",
    "moldova": "MD",
    "monaco": "MC",
    "mongolia": "MN",
    "montenegro": "ME",
    "morocco": "MA",
    "myanmar": "MM",
    "nepal": "NP",
    "netherlands": "NL",
    "new zealand": "NZ",
    "nicaragua": "NI",
    "nigeria": "NG",
    "north macedonia": "MK",
    "norway": "NO",
    "oman": "OM",
    "pakistan": "PK",
    "panama": "PA",
    "paraguay": "PY",
    "peru": "PE",
    "philippines": "PH",
    "poland": "PL",
    "portugal": "PT",
    "qatar": "QA",
    "romania": "RO",
    "rwanda": "RW",
    "saudi arabia": "SA",
    "senegal": "SN",
    "serbia": "RS",
    "singapore": "SG",
    "slovakia": "SK",
    "slovenia": "SI",
    "south africa": "ZA",
    "south korea": "KR",
    "korea": "KR",
    "spain": "ES",
    "sri lanka": "LK",
    "sweden": "SE",
    "switzerland": "CH",
    "taiwan": "TW",
    "tanzania": "TZ",
    "thailand": "TH",
    "trinidad and tobago": "TT",
    "tunisia": "TN",
    "turkey": "TR",
    "türkiye": "TR",
    "uganda": "UG",
    "ukraine": "UA",
    "united arab emirates": "AE",
    "united kingdom": "GB",
    "united states": "US",
    "uruguay": "UY",
    "uzbekistan": "UZ",
    "venezuela": "VE",
    "vietnam": "VN",
    "zambia": "ZM",
    "zimbabwe": "ZW",
};

// Common aliases → canonical name.
const ALIASES = {
    "usa": "united states",
    "u.s.a": "united states",
    "us": "united states",
    "uk": "united kingdom",
    "u.k": "united kingdom",
    "britain": "united kingdom",
    "great britain": "united kingdom",
    "england": "united kingdom",
    "uae": "united arab emirates",
    "u.a.e": "united arab emirates",
    "emirates": "united arab emirates",
    "dubai": "united arab emirates",
    "south korea": "south korea",
    "republic of korea": "south korea",
    "korea, south": "south korea",
    "holland": "netherlands",
    "burma": "myanmar",
    "czech": "czech republic",
    "türkei": "turkey",
    "türkiye": "turkey",
    "viet nam": "vietnam",
};

// Countries Adzuna's API supports (its /v1/api/jobs/{country}/ endpoints).
// For any country outside this set the Adzuna fetcher is skipped —
// JSearch covers nearly everywhere, so coverage is not lost.
const ADZUNA_SUPPORTED = new Set([
    "AR", "AT", "AU", "BH", "BE", "BR", "CA", "CH", "CL", "CN",
    "CO", "CZ", "DE", "DK", "AE", "EC", "ES", "FI", "FR", "GB",
    "GR", "HK", "HU", "ID", "IE", "IL", "IN", "IT", "JP", "KE",
    "KR", "KW", "MY", "MX", "NL", "NO", "NZ", "OM", "PH", "PK",
    "PL", "PT", "QA", "RO", "RU", "SA", "SE", "SG", "TH", "TR",
    "UA", "US", "VE", "VN", "ZA",
]);

// Values that mean "no geographic restriction".
const WORLDWIDE_TOKENS = new Set([
    "",
    "all",
    "any",
    "world",
    "worldwide",
    "global",
    "international",
    "remote",
    "anywhere",
]);

/**
 * Resolve a free-text country input.
 * @param {string} input  e.g. "India", "usa", "United Arab Emirates"
 * @returns {{ code: string, name: string } | null}  null = Worldwide
 */
export function resolveCountry(input) {
    if (input === null || input === undefined) return null;
    const raw = String(input).trim().toLowerCase();
    if (WORLDWIDE_TOKENS.has(raw)) return null;

    // Exact canonical or alias match.
    const canonical = ALIASES[raw] || raw;
    if (COUNTRIES[canonical]) {
        return { code: COUNTRIES[canonical], name: titleCase(canonical) };
    }

    // Tolerate "Mumbai, India" style input → take the last comma segment.
    const parts = raw.split(",").map(p => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
        const seg = ALIASES[parts[i]] || parts[i];
        if (COUNTRIES[seg]) {
            return { code: COUNTRIES[seg], name: titleCase(seg) };
        }
    }

    // ISO2 code passed directly (e.g. "de").
    if (/^[a-z]{2}$/.test(raw)) {
        const match = Object.entries(COUNTRIES).find(([, code]) => code === raw.toUpperCase());
        if (match) return { code: raw.toUpperCase(), name: titleCase(match[0]) };
    }

    // Unknown but non-empty (e.g. a city like "Tokyo" or "Mumbai") — return it
    // as a raw named location: JSearch resolves natural-language locations,
    // and the country post-filter can still match it against job locations.
    return { code: "", name: titleCase(raw) };
}

/**
 * ISO2 code for Adzuna, or null if Adzuna does not support it.
 */
export function adzunaCode(resolved) {
    if (!resolved || !ADZUNA_SUPPORTED.has(resolved.code)) return null;
    return resolved.code.toLowerCase();
}

function titleCase(s) {
    return s.replace(/\b[a-z]/g, c => c.toUpperCase());
}

// Curated list for the client dropdown (display names).
export const POPULAR_COUNTRIES = [
    "Worldwide", "India", "United States", "United Kingdom", "Canada",
    "Australia", "Germany", "Singapore", "United Arab Emirates",
    "Netherlands", "Ireland", "France", "Spain", "Italy", "Poland",
    "Portugal", "Switzerland", "Sweden", "Norway", "Denmark",
    "Finland", "Belgium", "Austria", "Japan", "South Korea",
    "China", "Hong Kong", "Taiwan", "Malaysia", "Indonesia",
    "Philippines", "Thailand", "Vietnam", "New Zealand",
    "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman",
    "Israel", "Turkey", "Egypt", "South Africa", "Nigeria",
    "Kenya", "Morocco", "Brazil", "Mexico", "Argentina",
    "Chile", "Colombia", "Peru", "Czech Republic", "Romania",
    "Greece", "Hungary", "Ukraine", "Pakistan", "Bangladesh",
    "Sri Lanka", "Nepal", "Ethiopia", "Ghana", "Rwanda",
];

export default { resolveCountry, adzunaCode, POPULAR_COUNTRIES };
