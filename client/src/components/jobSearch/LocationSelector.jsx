import React from "react";

const countries = [
  "Auto Detect",
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Singapore",
  "Japan",
  "UAE",
  "Worldwide",
];

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
  const update = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

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

          <label>Country</label>

          <select
            value={filters.country}
            onChange={(e) =>
              update("country", e.target.value)
            }
          >
            {countries.map((country) => (
              <option
                key={country}
                value={country}
              >
                {country}
              </option>
            ))}
          </select>

        </div>

        <div>

          <label>State</label>

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

        </div>

        <div>

          <label>City</label>

          <input
            placeholder="Enter City"
            value={filters.city}
            onChange={(e) =>
              update("city", e.target.value)
            }
          />

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
          📍 Smart Location Detection
        </h3>

        <p>

          Final version automatically detects

          <br />

          • Country

          <br />

          • State

          <br />

          • City

          <br />

          • Nearby opportunities

          <br />

          • Remote opportunities

          <br />

          using IP + Browser Location API.

        </p>

      </div>

    </section>
  );
}