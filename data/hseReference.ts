export type HseSection = {
  id: string;
  title: string;
  summary: string;
  points: string[];
};

export const UAE_HSE_SECTIONS: HseSection[] = [
  {
    id: "summer-midday-break",
    title: "Summer Midday Break (Heat Stress)",
    summary:
      "Mandatory work stoppage for outdoor work during peak summer heat, enforced by MOHRE.",
    points: [
      "Applies every day 15 June to 15 September, including weekends and public holidays.",
      "All outdoor work in direct sunlight or open areas must stop between 12:30 PM and 3:00 PM.",
      "Legal basis: MOHRE Ministerial Resolution No. 44 of 2022.",
      "Employer must provide shaded rest areas, cooling, cold drinking water, electrolytes, and first-aid facilities.",
      "Fines AED 5,000–50,000 per worker affected; repeated violations can result in labour supply suspension.",
    ],
  },
  {
    id: "work-at-height",
    title: "Work at Height & Fall Protection",
    summary:
      "Falls from height are a leading cause of construction fatalities in the UAE.",
    points: [
      "Dubai Municipality Code requires fall protection above 1.8 metres.",
      "Hierarchy: eliminate working at height first, then collective protection (guardrails, edge protection, nets), then personal fall arrest (harness + lanyard to a rated anchor) as a last resort.",
      "Workers must be trained and medically fit for height work, with records documented.",
      "Inspect fall-protection equipment daily before use; remove defective items immediately.",
      "A rescue plan must be in place before any work at height commences.",
      "Record all height-work inspections and near-misses.",
    ],
  },
  {
    id: "scaffolding",
    title: "Scaffolding Safety",
    summary:
      "Governed by Chapter 8 of the Dubai Municipality Code of Construction Safety Practice.",
    points: [
      "Designed to BS 1139 or EN 12811 and fit for purpose.",
      "Main contractor may erect up to 10 m; above 10 m requires specialist scaffolding contractors.",
      "Lightweight scaffolding maximum 10 m and only where there is no material loading on the platform.",
      "Erected by competent scaffolders assessed by a third party; contractor appoints a qualified Scaffolding Supervisor.",
      "Supported scaffolds must rest on firm, level ground with base plates and sole boards.",
      "Weekly inspection by a competent person is required, and after adverse weather or any modification.",
      "Scaffold tag system: green (pass), yellow (restricted use), red (do not use).",
    ],
  },
  {
    id: "lifting-operations",
    title: "Lifting Operations & Cranes",
    summary:
      "High-risk activity requiring planning, certification, and exclusion zones.",
    points: [
      "Every lift requires a lifting plan and an appointed competent person.",
      "Cranes and all lifting equipment must have valid third-party certificates kept on site.",
      "Operators, riggers, and signallers must be certified for their specific role.",
      "Barricade an exclusion zone around the lift; no person permitted under a suspended load.",
      "Check load chart, ground conditions, outrigger pads, wind speed limits, and SWL before each lift.",
      "One trained banksman controls each lift; all personnel stop on any ambiguous signal.",
      "Record all lifts, near-misses, and equipment inspections.",
    ],
  },
  {
    id: "permit-to-work",
    title: "Permit to Work (PTW)",
    summary:
      "Formal authorisation system for high-risk activities, reviewed in DM inspections.",
    points: [
      "Required for hot work, confined space entry, work at height, excavation, and energised electrical work.",
      "The permit defines the task, hazards, controls, validity period, and competent persons involved.",
      "Work must not start until the permit is issued and signed; it must be formally closed out on completion.",
      "Hot work permits require a fire watch, combustibles cleared, and extinguishers on standby.",
      "Confined space permits require atmospheric testing, adequate ventilation, a standby person, and a rescue plan.",
      "PTW records are inspected by Dubai Municipality during site audits.",
    ],
  },
  {
    id: "ppe",
    title: "Personal Protective Equipment (PPE)",
    summary: "Last line of defence — baseline requirement on all UAE construction sites.",
    points: [
      "Standard PPE: safety helmet, safety footwear, hi-vis vest, and eye protection.",
      "Task-specific additions: gloves, hearing protection, respiratory protection, face shield, and harness as required.",
      "PPE must fit correctly, be in good condition, and worn properly; inspect before each use and replace when damaged.",
      "PPE is the lowest control level — it supplements but never replaces engineering and procedural controls.",
      "Employer must provide all required PPE free of charge under UAE OHS regulations.",
    ],
  },
  {
    id: "excavation-trenching",
    title: "Excavation & Trenching",
    summary: "Collapse and buried-services risks, permit-controlled in Dubai.",
    points: [
      "Over 3 m depth triggers an HSE plan and permit requirement under Dubai Municipality regulations.",
      "Identify and mark all underground services before any digging commences.",
      "Collapse protection: use battering, benching, or shoring as depth and soil conditions require.",
      "Provide safe access/egress ladders within reach of all workers in the excavation.",
      "Keep spoil, plant, and loads set back from the edge at a safe distance.",
      "Barricade the excavation and use reflective markers and lighting at night.",
    ],
  },
  {
    id: "electrical-safety",
    title: "Electrical Safety",
    summary: "Electrocution and fire risk, especially in high-rise fit-out works.",
    points: [
      "Only competent, authorised persons may work on electrical installations.",
      "Isolate and apply LOTO (Lockout/Tagout) before any energised work; verify dead before touching.",
      "RCD/ELCB protection is required for all portable tools and temporary supplies.",
      "Inspect cables, plugs, and tools regularly; remove defective equipment immediately.",
      "Temporary distribution boards must be weatherproof, clearly labelled, and circuit-breaker protected.",
      "Route cables to avoid mechanical damage and trip hazards.",
    ],
  },
  {
    id: "fire-safety",
    title: "Fire Safety & Emergency Preparedness",
    summary: "Required across the site, with extra focus during hot work activities.",
    points: [
      "Know the emergency procedure, alarm signal, assembly point, and emergency numbers before starting work.",
      "Keep firefighting equipment accessible; know the location of the nearest extinguisher and its type.",
      "Control combustible materials and waste near all ignition sources.",
      "Hot work requires a permit, a fire watch during and after the work, and combustibles cleared from the area.",
      "Keep all escape routes and stairways clear at all times.",
      "UAE emergency numbers: Police 999, Ambulance 998/999, Civil Defence 997.",
    ],
  },
  {
    id: "dm-inspections",
    title: "DM Inspections & Penalties",
    summary:
      "Dubai Municipality enforces site safety via scheduled and unannounced inspections.",
    points: [
      "Inspectors may arrive unannounced and can request the HSE Plan, risk assessments, inspection records, and HSE personnel qualifications.",
      "Active work is inspected: scaffolding, excavations, work at height, and lifting operations.",
      "Penalties range from AED 2,000 to AED 500,000 depending on the severity of the violation.",
      "Stop-work orders are issued immediately for serious or imminent hazards.",
      "Serious or repeated violations can result in permit suspension or cancellation, referral to MOHRE, or prosecution.",
      "Maintain a complete and up-to-date HSE file on site at all times.",
    ],
  },
  {
    id: "site-discipline",
    title: "Everyday Site Discipline",
    summary: "The basics that prevent most incidents on construction sites.",
    points: [
      "Attend HSE induction before starting work; participate in toolbox talks before each shift.",
      "Never start an unfamiliar task without a RAMS (Risk Assessment & Method Statement) and briefing.",
      "Maintain good housekeeping — most slips, trips, and fires start with poor housekeeping.",
      "Report near-misses and incidents immediately; reporting is protected and encouraged.",
      "You have the right and duty to stop unsafe work; raise concerns with your supervisor or HSE officer.",
      "Stay hydrated in summer; know the early signs of heat illness and report them promptly.",
    ],
  },
];
