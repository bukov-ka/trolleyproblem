/* trolley-analyser.js  •  v3
   -------------------------------------------------------
   Call analyseRun(decisions) with an array like the one
   in your example.  'autoPath' is ignored now because a
   skipped level stops the trolley.
   -----------------------------------------------------*/

export function analyseRun(decisions) {
  let livesLost = 0; // people actually killed
  let agencyCnt = 0; // times the lever was pulled
  let maxCasualties = 0; // "worst possible" deaths
  let potentialSaved = 0; // total lives that *didn't* die

  // helper – victims on a rail, covering both up/down & top/bottom keys
  const v = (d, rail) =>
    rail === "T" ? d.top ?? d.up ?? 0 : d.bottom ?? d.down ?? 0;

  // ── main loop ──────────────────────────────────────────
  for (const d of decisions) {
    const top = v(d, "T");
    const bottom = v(d, "B");

    maxCasualties += Math.max(top, bottom); // add "worst case"

    if (d.choice === "T") {
      // player chose top
      livesLost += top;
      potentialSaved += bottom; // everyone on bottom track lived
      agencyCnt++;
    } else if (d.choice === "B") {
      // player chose bottom
      livesLost += bottom;
      potentialSaved += top;
      agencyCnt++;
    } else {
      // skipped: trolley stops
      potentialSaved += -Math.abs(top - bottom);
    }
  }

  // ── metrics ───────────────────────────────────────────
  const agency = +(decisions.length ? agencyCnt / decisions.length : 0).toFixed(
    2
  );

  /* Compassion is linearly rescaled so:
         all survive  →  +1
         half survive →   0
         none survive →  −1
    */
  const compassion = +(maxCasualties ? 1 - 2 * (livesLost / maxCasualties) : 0) // empty level list guard
    .toFixed(2);

  // ── verdict ───────────────────────────────────────────
  const { label: verdict, tagline } = pickVerdict(agency, compassion);

  return {
    verdict,
    tagline,
    livesLost,
    potentialSaved,
    agency,
    compassion,
    summary: `${verdict} — ${tagline}`,
  };
}

/* ------------------------------------------------------ */
/*  Nine-level verdict table  (Paragon removed)           */

function pickVerdict(A, C) {
  // 1. low-agency players first
  if (A < 0.2) {
    return { label: "Detached Bystander", tagline: "You let fate decide." };
  }

  // 2. the rest, ordered by compassion
  if (C >= 0.5)
    return {
      label: "Heroic Utilitarian",
      tagline: "You cut losses wherever you could.",
    };

  if (C >= 0.2)
    return {
      label: "Calculating Pragmatist",
      tagline: "Feelings off, calculator on.",
    };

  if (C > -0.2)
    return {
      label: "Chaos Conductor",
      tagline: "Equal parts mercy and mayhem.",
    };

  if (C >= -0.5)
    return {
      label: "Cold Strategist",
      tagline: "Your math favoured the massacre.",
    };

  if (C >= -0.8)
    return {
      label: "Malevolent Mastermind",
      tagline: "You steered straight into crowds.",
    };

  return { label: "Pure Evil", tagline: "All aboard the pain train." };
}

/* ------------------------------------------------------ */
/* Example
     -------------------------------------------------------
  
  import { analyseRun } from "./trolley-analyser.js";
  const result = analyseRun(decisions);
  console.log(result.summary);
  
     A passive run that spared everyone now prints:
     "Hands-Off Saint — You refused to kill – and it worked."
  */
