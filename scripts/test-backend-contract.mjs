const baseUrl = process.env.TRUSTPASS_BASE_URL || "http://localhost:3000";

const evidenceForm = new FormData();
evidenceForm.append("file", new File(["demo menu image bytes"], "jay-fai-menu.png", { type: "image/png" }));

const evidenceResponse = await fetch(`${baseUrl}/api/evidence/extract`, {
  method: "POST",
  body: evidenceForm
});
const evidenceData = await evidenceResponse.json();

if (!evidenceResponse.ok || !evidenceData.extractedText || !evidenceData.detectedFields?.hints?.prices?.length) {
  throw new Error(`Evidence extract: expected extracted text and price hints, got ${JSON.stringify(evidenceData)}`);
}

console.log(`Evidence extract: OK (${evidenceData.detectedFields.source})`);

const cases = [
  {
    name: "Taxi normal fare",
    body: {
      message: "Taxi says the fare from Silom to Siam Paragon is 50 THB during Songkran. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-04-14T05:00:00.000Z",
      userLocation: { latitude: 13.7286, longitude: 100.534, accuracy: 80, source: "browser" }
    },
    expectStatus: "completed",
    expectRisk: "Low",
    expectGroundingTool: "fare_reference"
  },
  {
    name: "Taxi overcharging",
    body: {
      message: "Taxi driver says meter broken and asks 800 baht from Siam to Wat Pho.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRiskIn: ["Caution", "High"],
    expectGroundingTool: "fare_reference"
  },
  {
    name: "Jay Fai menu clarification",
    body: {
      message: "This menu photo shows crab omelette 1500 baht and noodles 800 baht. Is this a scam?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      userLocation: { latitude: 13.7526, longitude: 100.5048, accuracy: 60, source: "browser" },
      evidenceText: "Crab omelette 1500 baht. Drunken noodles 800 baht. Menu photo with no restaurant name visible."
    },
    expectStatus: "needs_clarification"
  },
  {
    name: "Confirmed premium venue food grounding",
    body: {
      message: "I am at Jay Fai. The menu shows crab omelette 1500 baht and drunken noodles 800 baht. Is this suspicious?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Jay Fai menu. Crab omelette 1500 baht. Drunken noodles 800 baht."
    },
    expectStatus: "completed",
    expectRiskIn: ["Low", "Caution"],
    rejectRiskIn: ["High", "Emergency"],
    expectCategoryIncludes: "Jay Fai",
    expectGroundingTool: "food_price_reference"
  },
  {
    name: "Mall restaurant food tier grounding",
    body: {
      message: "This department store restaurant menu shows seafood pasta 320 baht and crab fried rice 450 baht. Is this suspicious?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Department store restaurant menu. Seafood pasta 320 baht. Crab fried rice 450 baht."
    },
    expectStatus: "completed",
    expectRiskIn: ["Low", "Caution"],
    expectGroundingTool: "food_price_reference"
  },
  {
    name: "Siam Paragon location food grounding",
    body: {
      message: "This menu shows seafood pasta 320 baht and crab fried rice 450 baht. Is this suspicious?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      userLocation: { latitude: 13.7466, longitude: 100.5347, accuracy: 35, source: "manual" },
      evidenceText: "Seafood pasta 320 baht. Crab fried rice 450 baht."
    },
    expectStatus: "completed",
    expectRiskIn: ["Low", "Caution"],
    expectGroundingTool: "food_price_reference",
    expectFoodTier: "department_store_restaurant"
  },
  {
    name: "Chatuchak market location food grounding",
    body: {
      message: "This stall menu shows pad thai 320 baht and fried rice 350 baht. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      userLocation: { latitude: 13.7999, longitude: 100.5502, accuracy: 45, source: "manual" },
      evidenceText: "Market stall menu. Pad thai 320 baht. Fried rice 350 baht."
    },
    expectStatus: "completed",
    expectRiskIn: ["Caution"],
    expectGroundingTool: "food_price_reference",
    expectFoodTier: "street_food_local_stall"
  },
  {
    name: "Street stall high price clarification",
    body: {
      message: "A street food stall menu shows pad thai 320 baht and fried rice 350 baht. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Street food stall menu. Pad thai 320 baht. Fried rice 350 baht."
    },
    expectStatusIn: ["needs_clarification", "completed"],
    expectRiskIn: ["Caution"],
    expectGroundingTool: "food_price_reference"
  },
  {
    name: "Fake tour payment",
    body: {
      message: "LINE tour agent asks for full payment by bank transfer to a personal account. No license is shown.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRisk: "High"
  },
  {
    name: "QR account mismatch",
    body: {
      message: "Restaurant QR payment account name is a different personal name and they say scan to pay now.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      clarificationAnswers: { qr_account_match: "No, it is a different personal name" }
    },
    expectStatus: "completed",
    expectRisk: "High"
  },
  {
    name: "Passport retention",
    body: {
      message: "The motorbike rental shop wants to keep my original passport as a deposit.",
      city: "Phuket",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRisk: "High"
  },
  {
    name: "Rental damage pressure",
    body: {
      message: "Jet ski shop claims scratch damage and says pay cash now 20,000 baht with no receipt and no police.",
      city: "Pattaya",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRisk: "High"
  },
  {
    name: "Fake job luring",
    body: {
      message: "A WeChat casting job offers free airport pickup and says a driver will take me to Mae Sot. They told me not to tell my hotel.",
      city: "Mae Sot",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRisk: "Emergency"
  }
];

for (const testCase of cases) {
  const response = await fetch(`${baseUrl}/api/situation/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(testCase.body)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${testCase.name}: HTTP ${response.status} ${JSON.stringify(data)}`);
  }

  if (testCase.expectStatus && data.status !== testCase.expectStatus) {
    throw new Error(`${testCase.name}: expected status ${testCase.expectStatus}, got ${data.status}`);
  }

  if (testCase.expectStatusIn && !testCase.expectStatusIn.includes(data.status)) {
    throw new Error(`${testCase.name}: expected status in ${testCase.expectStatusIn.join(", ")}, got ${data.status}`);
  }

  if (testCase.expectRisk && data.risk_level !== testCase.expectRisk) {
    throw new Error(`${testCase.name}: expected risk ${testCase.expectRisk}, got ${data.risk_level}`);
  }

  if (data.status === "completed" && testCase.expectRiskIn && !testCase.expectRiskIn.includes(data.risk_level)) {
    throw new Error(`${testCase.name}: expected risk in ${testCase.expectRiskIn.join(", ")}, got ${data.risk_level}`);
  }

  if (data.status === "completed" && testCase.rejectRiskIn?.includes(data.risk_level)) {
    throw new Error(`${testCase.name}: rejected risk ${data.risk_level}`);
  }

  if (data.status === "completed" && testCase.expectCategoryIncludes && !data.category?.includes(testCase.expectCategoryIncludes)) {
    throw new Error(`${testCase.name}: expected category to include ${testCase.expectCategoryIncludes}, got ${data.category}`);
  }

  if (testCase.expectGroundingTool && !data.grounding?.some((signal) => signal.tool === testCase.expectGroundingTool)) {
    throw new Error(`${testCase.name}: expected grounding tool ${testCase.expectGroundingTool}, got ${JSON.stringify(data.grounding)}`);
  }

  if (testCase.expectFoodTier) {
    const foodSignal = data.grounding?.find((signal) => signal.tool === "food_price_reference");
    if (foodSignal?.metadata?.likely_tier !== testCase.expectFoodTier) {
      throw new Error(`${testCase.name}: expected food tier ${testCase.expectFoodTier}, got ${JSON.stringify(foodSignal?.metadata)}`);
    }
  }

  console.log(`${testCase.name}: OK (${data.status}${data.risk_level ? `, ${data.risk_level}` : ""})`);
}

const legacyMenuResponse = await fetch(`${baseUrl}/api/risk-check`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    message: "Menu: noodles 800 baht, crab omelette 1500 baht. Is this normal?",
    city: "Bangkok",
    language: "English",
    incidentDateIso: "2026-05-03T05:00:00.000Z"
  })
});

const legacyMenuData = await legacyMenuResponse.json();

if (!legacyMenuResponse.ok) {
  throw new Error(`Legacy menu check: HTTP ${legacyMenuResponse.status} ${JSON.stringify(legacyMenuData)}`);
}

if (legacyMenuData.category === "Taxi overcharging") {
  throw new Error(`Legacy menu check: menu prices should not be classified as taxi overcharging, got ${JSON.stringify(legacyMenuData)}`);
}

if (!legacyMenuData.grounding?.some((signal) => signal.tool === "food_price_reference")) {
  throw new Error(`Legacy menu check: expected food price grounding, got ${JSON.stringify(legacyMenuData.grounding)}`);
}

console.log(`Legacy menu check: OK (${legacyMenuData.risk_level}, ${legacyMenuData.category})`);
