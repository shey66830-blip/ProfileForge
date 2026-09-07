// =============================================
// ProfileForge Location Matcher
// Version 1.0
// =============================================

export default function locationMatcher({

    userLocation = {},

    jobLocation = {}

}) {

    const {

        country: userCountry = "",

        state: userState = "",

        city: userCity = ""

    } = userLocation;

    const {

        country: jobCountry = "",

        state: jobState = "",

        city: jobCity = "",

        remote = false

    } = jobLocation;

    // ------------------------

    let score = 0;

    let reason = "";

    // ------------------------

    if (remote) {

        return {

            score: 100,

            reason: "Remote opportunity."

        };

    }

    // ------------------------

    if (

        userCountry &&

        jobCountry &&

        userCountry.toLowerCase() ===

        jobCountry.toLowerCase()

    ) {

        score += 50;

    }

    // ------------------------

    if (

        userState &&

        jobState &&

        userState.toLowerCase() ===

        jobState.toLowerCase()

    ) {

        score += 30;

    }

    // ------------------------

    if (

        userCity &&

        jobCity &&

        userCity.toLowerCase() ===

        jobCity.toLowerCase()

    ) {

        score += 20;

    }

    // ------------------------

    if (score === 100)

        reason = "Perfect location match.";

    else if (score >= 70)

        reason = "Nearby location.";

    else if (score >= 50)

        reason = "Same country.";

    else

        reason = "Different location.";

    // ------------------------

    return {

        score,

        reason

    };

}