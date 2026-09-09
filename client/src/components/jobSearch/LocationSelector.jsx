import React, { useState } from "react";

// Popular destinations for the dropdown. Anything not listed can be typed
// free-form via "Other…" — the server's country directory resolves names,
// aliases, ISO codes, and even "City, Country" input, and uses it as a
// natural-language location for sources like JSearch.
const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "Singapore", "United Arab Emirates", "Netherlands",
  "Ireland", "France", "Spain", "Italy", "Poland", "Portugal",
  "Switzerland", "Sweden", "Norway", "Denmark", "Finland", "Belgium",
  "Austria", "Japan", "South Korea", "China", "Hong Kong", "Taiwan",
  "Malaysia", "Indonesia", "Philippines", "Thailand", "Vietnam",
  "New Zealand", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman",
  "Israel", "Turkey", "Egypt", "South Africa", "Nigeria", "Kenya",
  "Morocco", "Brazil", "Mexico", "Argentina", "Chile", "Colombia",
  "Peru", "Czech Republic", "Romania", "Greece", "Hungary", "Ukraine",
  "Pakistan", "Bangladesh", "Sri Lanka", "Nepal",
];

const OTHER = "__other__";

const indianStates = [
  "Select State",
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Others",
];

export default function LocationSelector({
  filters,
  setFilters,
}) {
  const [otherMode, setOtherMode] = useState(false);

  const update = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const selectValue =
    otherMode || (filters.country !== "all" && filters.country && !COUNTRIES.includes(filters.country))
      ? OTHER
      : (filters.country || "all");

  const isIndia = filters.country === "India";
  const showOtherInput = selectValue === OTHER;

  return (
    <section className="card">

      <p className="eyebrow">
        Location Preferences
      </p>

      <h2>
        Choose Preferred Job Location
      </h2>

      <div className="grid three">

        <div>

          <label>Country / Region</label>

          <select
            value={selectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === OTHER) {
                setOtherMode(true);
                update("country", "");
              } else {
                setOtherMode(false);
                update("country", v);
              }
            }}
          >
            <option value="all">🌍 Worldwide (default)</option>
            {COUNTRIES.map((country) => (
              <option
                key={country}
                value={country}
              >
                {country}
              </option>
            ))}
            <option value={OTHER}>Other (type any country)…</option>
          </select>

        </div>

        <div>

          {showOtherInput ? (
            <>
              <label>Any country or city</label>
              <input
                autoFocus
                placeholder="e.g. Tokyo, Japan"
                value={filters.country}
                onChange={(e) => update("country", e.target.value)}
              />
            </>
          ) : (
            <>
              <label>City</label>
              <input
                placeholder="Enter City"
                value={filters.city}
                onChange={(e) =>
                  update("city", e.target.value)
                }
              />
            </>
          )}

        </div>

        <div>

          <label>State (India)</label>

          {isIndia ? (
            <select
              value={filters.state}
              onChange={(e) =>
                update("state", e.target.value)
              }
            >
              {indianStates.map((state) => (
                <option
                  key={state}
                  value={state}
                >
                  {state}
                </option>
              ))}
            </select>
          ) : (
            <input
              disabled
              placeholder="— country-wide search —"
              value=""
              onChange={() => {}}
            />
          )}

        </div>

      </div>

      <div className="grid three">

        <div>

          <label>Search Radius</label>

          <select>

            <option>10 KM</option>

            <option>25 KM</option>

            <option>50 KM</option>

            <option>100 KM</option>

            <option>250 KM</option>

            <option>Entire Country</option>

          </select>

        </div>

        <div>

          <label>Preferred Region</label>

          <select>

            <option>No Preference</option>

            <option>Nearby Only</option>

            <option>Same State</option>

            <option>Same Country</option>

            <option>Worldwide</option>

          </select>

        </div>

        <div>

          <label>Relocation</label>

          <select>

            <option>Yes</option>

            <option>No</option>

            <option>Maybe</option>

          </select>

        </div>

      </div>

      <div
        className="card"
        style={{
          marginTop: 25,
          background: "#181825",
        }}
      >

        <h3>
          🌍 Search Anywhere
        </h3>

        <p>

          Pick <b>Worldwide</b> for the widest global results, choose a country

          from the list, or select <b>Other</b> and type any country or city —

          jobs are pulled from 7 international sources and matched to your

          location.

        </p>

      </div>

    </section>
  );
}