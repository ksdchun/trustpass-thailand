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
    name: "Out of scope casual food diary",
    body: {
      message: "I ate Kapao rice yesterday.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "out_of_scope"
  },
  {
    name: "Out of scope generic no evidence",
    body: {
      message: "Can you check this?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Uploaded evidence could not be read."
    },
    expectStatus: "out_of_scope",
    expectEvidenceRelevance: "weak"
  },
  {
    name: "Taxi message ignores weak OCR",
    body: {
      message: "A taxi driver says he wants 50 baht to take me from Siam to Wat Pho. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Uploaded evidence could not be read."
    },
    expectStatus: "completed",
    expectRisk: "Low",
    expectGroundingTool: "fare_reference",
    rejectGroundingTools: ["food_price_reference"]
  },
  {
    name: "Taxi message with menu evidence mismatch",
    body: {
      message: "A taxi driver says he wants 50 baht to take me from Siam to Wat Pho. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Crab omelette 1500 baht. Drunken noodles seafood 800 baht. Menu photo with no restaurant name visible."
    },
    expectStatus: "evidence_mismatch",
    expectMessageTopic: "transport",
    expectEvidenceTopic: "food_menu"
  },
  {
    name: "Mismatch choose typed situation",
    body: {
      message: "A taxi driver says he wants 50 baht to take me from Siam to Wat Pho. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Crab omelette 1500 baht. Drunken noodles seafood 800 baht. Menu photo with no restaurant name visible.",
      clarificationAnswers: { evidence_choice: "Use my typed situation" }
    },
    expectStatus: "completed",
    expectRisk: "Low",
    expectGroundingTool: "fare_reference",
    rejectGroundingTools: ["food_price_reference"]
  },
  {
    name: "Mismatch choose uploaded evidence",
    body: {
      message: "A taxi driver says he wants 50 baht to take me from Siam to Wat Pho. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Crab omelette 1500 baht. Drunken noodles seafood 800 baht. Menu photo with no restaurant name visible.",
      clarificationAnswers: { evidence_choice: "Use the uploaded evidence" }
    },
    expectStatus: "needs_clarification",
    expectClarificationKey: "venue_location"
  },
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
    expectGroundingTool: "fare_reference",
    expectTaxiDistance: true,
    rejectContactIncludes: ["Tourist Police", "1155", "police"]
  },
  {
    name: "Taxi overcharging",
    body: {
      message: "Taxi driver says the meter is broken and asks 800 baht from Siam to Wat Pho.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRiskIn: ["Caution", "High"],
    expectGroundingTool: "fare_reference",
    expectTaxiDistance: true,
    expectSignalIncludes: ["Meter refusal or meter unavailable", "Fixed fare quote above route baseline"],
    rejectSignalIncludes: ["800 baht"]
  },
  {
    name: "Taxi within tolerance stays low",
    body: {
      message: "A taxi driver says he wants 110 baht to take me from Silom to Siam Paragon.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRisk: "Low",
    expectGroundingTool: "fare_reference",
    expectFareRatioAtMost: 1.3,
    rejectSignalIncludes: ["Fixed fare quote above route baseline"]
  },
  {
    name: "Taxi modest above baseline stays caution",
    body: {
      message: "A taxi driver says he wants 200 baht to take me from Siam to Wat Pho.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRisk: "Caution",
    expectGroundingTool: "fare_reference",
    expectFareRatioBelow: 3,
    expectSignalIncludes: ["Fixed fare quote above route baseline"]
  },
  {
    name: "Taxi extreme over baseline escalates high",
    body: {
      message: "A taxi driver says he wants 2000 baht to take me from Siam to Wat Pho.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRisk: "High",
    expectGroundingTool: "fare_reference",
    expectFareRatioAtLeast: 3,
    expectSignalIncludes: ["Fixed fare quote above route baseline"]
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
    expectStatus: "needs_clarification",
    expectClarificationKey: "venue_confirmation"
  },
  {
    name: "Unknown menu location clarification",
    body: {
      message: "This menu shows crab omelette 1500 baht and noodles 800 baht. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Crab omelette 1500 baht. Drunken noodles 800 baht. Menu photo with no restaurant name visible."
    },
    expectStatus: "needs_clarification",
    expectClarificationKey: "venue_location",
    rejectSuggestedAnswers: ["I can share the restaurant name"]
  },
  {
    name: "Unknown menu clarified as Jay Fai",
    body: {
      message: "This menu shows crab omelette 1500 baht and noodles 800 baht. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Crab omelette 1500 baht. Drunken noodles seafood 800 baht. Menu photo with no restaurant name visible.",
      clarificationAnswers: { venue_location: "Jay Fai" }
    },
    expectStatus: "completed",
    expectRiskIn: ["Low", "Caution"],
    rejectRiskIn: ["High", "Emergency"],
    expectCategoryIncludes: "Jay Fai",
    expectGroundingTool: "food_price_reference",
    expectMatchedVenue: "Jay Fai",
    expectFoodTier: "premium_famous_venue",
    expectMenuItems: ["Crab omelette", "Drunken noodles seafood"]
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
    expectGroundingTool: "food_price_reference",
    expectMenuItems: ["Crab omelette", "Drunken noodles seafood"]
  },
  {
    name: "OCR noisy Jay Fai menu item pairing",
    body: {
      message: "I am at Jay Fai. Please check this OCR menu.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Crab omelette ... 1,500 baht Fresh crab meat, eggs, spring onion. ไข่เจียวปู 蟹肉煎蛋\nDrunken noodles seafood\n.800 baht\nWide rice noodles, seafood, basil, chili, garlic. ผัดขี้เมาทะเล 海鲜醉面\nCrab curry\n1,200 baht\nCrab meat, curry powder, coconut milk, egg, vegetables. แกงปู 螃鲜咖喱\nStir-fried morning glory\n......\n150 baht\nMorning glory, garlic, chili. ผัดผักบุ้งไฟแดง 炒空心菜"
    },
    expectStatus: "completed",
    expectRiskIn: ["Low", "Caution"],
    expectGroundingTool: "food_price_reference",
    expectMenuItems: ["Crab omelette", "Drunken noodles seafood", "Crab curry", "Stir-fried morning glory"],
    expectMenuItemPrices: {
      "Crab omelette": 1500,
      "Drunken noodles seafood": 800,
      "Crab curry": 1200,
      "Stir-fried morning glory": 150
    }
  },
  {
    name: "Jay Fai menu with generic QR acceptance is not QR clarification",
    body: {
      message: "This menu photo looks expensive. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Crab omelette ... 1,500 baht Fresh crab meat, eggs, spring onion.\nDrunken noodles seafood .800 baht\nCrab curry 1,200 baht\nStir-fried morning glory 150 baht\nCash / QR accepted. Price in Thai Baht.",
      clarificationAnswers: { venue_location: "Jay Fai" }
    },
    expectStatus: "completed",
    expectRiskIn: ["Low", "Caution"],
    rejectRiskIn: ["High", "Emergency"],
    expectCategoryIncludes: "Jay Fai",
    expectGroundingTool: "food_price_reference",
    expectMatchedVenue: "Jay Fai",
    expectMenuItems: ["Crab omelette", "Drunken noodles seafood", "Crab curry", "Stir-fried morning glory"]
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
    expectGroundingTool: "food_price_reference",
    expectMenuItems: ["Seafood pasta", "Crab fried rice"]
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
    expectFoodTier: "department_store_restaurant",
    expectMenuItems: ["Seafood pasta", "Crab fried rice"]
  },
  {
    name: "Siam Paragon food over 2x escalates high",
    body: {
      message: "This menu shows seafood pasta 3000 baht and crab fried rice 3000 baht. I am at Siam Paragon. Is this suspicious?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Siam Paragon restaurant menu. Seafood pasta 3000 baht. Crab fried rice 3000 baht."
    },
    expectStatus: "completed",
    expectRisk: "High",
    expectGroundingTool: "food_price_reference",
    expectFoodTier: "department_store_restaurant",
    expectFoodRatioAtLeast: 2
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
    expectRiskIn: ["High"],
    expectGroundingTool: "food_price_reference",
    expectFoodTier: "street_food_local_stall",
    expectMenuItems: ["Pad Thai", "Fried rice"]
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
    expectRiskIn: ["High"],
    expectGroundingTool: "food_price_reference",
    expectMenuItems: ["Pad Thai", "Fried rice"]
  },
  {
    name: "Street stall extreme price escalates high",
    body: {
      message: "This Chatuchak market stall menu shows pad thai 1200 baht and fried rice 1300 baht. Is this normal?",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      userLocation: { latitude: 13.7999, longitude: 100.5502, accuracy: 45, source: "manual" },
      evidenceText: "Market stall menu. Pad thai 1200 baht. Fried rice 1300 baht."
    },
    expectStatus: "completed",
    expectRisk: "High",
    expectGroundingTool: "food_price_reference",
    expectFoodTier: "street_food_local_stall",
    expectFoodRatioAtLeast: 6
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
    expectRisk: "High",
    expectGroundingTool: "operator_payment_reference",
    expectSignalIncludes: ["Full advance payment requested", "Payment account appears personal", "Missing operator or TAT license details"]
  },
  {
    name: "Fake tour OCR should not ask restaurant clarification",
    body: {
      message: "Can you check this tour chat screenshot?",
      city: "Phuket",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "10:42 Andaman Explorer Tours Online May 2, 2026 Messages and calls are end-to-end encrypted. Sawadee ka! We have a special island tour package for you. Island tour 2,999 THB per person Phi Phi + Maya Bay + Bamboo Island + Lunch + Snorkeling. Full payment today to confirm your booking. Limited seats! Transfer to personal account (Thai bank transfer) Account name: Nattapong S. No license number. We are a local team, not a company. Trust us, many customers happy. Limited time offer Price will go up tomorrow! Ok, how do I make the payment? I will send you our account details now. Please transfer and send me the slip."
    },
    expectStatus: "completed",
    expectRisk: "High",
    expectGroundingTool: "operator_payment_reference",
    rejectGroundingTool: "food_price_reference",
    rejectGroundingTools: ["food_price_reference", "venue_reference"],
    expectSignalIncludes: ["Full advance payment requested", "Payment account appears personal", "Missing operator or TAT license details"]
  },
  {
    name: "QR account clarification",
    body: {
      message: "The QR payment account is a personal name and they say scan to pay now.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "needs_clarification",
    expectClarificationKey: "qr_account_match"
  },
  {
    name: "Restaurant QR payment should not become menu grounding",
    body: {
      message: "Restaurant QR payment account name is a different personal name. Bill amount is 1,200 THB and they say scan to pay now.",
      city: "Bangkok",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      clarificationAnswers: { qr_account_match: "No, it is a different personal name" }
    },
    expectStatus: "completed",
    expectRisk: "High",
    expectGroundingTool: "qr_payment_reference",
    rejectGroundingTools: ["food_price_reference", "venue_reference"],
    expectSignalIncludes: ["Payment account appears personal or mismatched", "QR payment requested before identity is verified"]
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
    expectRisk: "High",
    expectGroundingTool: "qr_payment_reference",
    expectSignalIncludes: ["Payment account appears personal or mismatched", "QR payment requested before identity is verified"]
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
    expectRisk: "High",
    expectGroundingTool: "rental_document_reference",
    rejectGroundingTools: ["food_price_reference", "venue_reference"],
    expectSignalIncludes: ["Original passport requested as deposit"]
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
    expectRisk: "High",
    expectGroundingTool: "damage_claim_reference",
    rejectGroundingTools: ["food_price_reference", "venue_reference"],
    expectSignalIncludes: ["Large cash damage demand without neutral inspection", "No receipt or written damage estimate offered"]
  },
  {
    name: "Rental damage within tolerance stays low without pressure",
    body: {
      message: "I rented a motorbike and the rental shop says the scratch repair is 800 baht. They can give me a written estimate and receipt. Is this suspicious?",
      city: "Pattaya",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRisk: "Low",
    expectGroundingTool: "damage_claim_reference",
    expectDamageAmount: 800
  },
  {
    name: "Rental damage modest amount stays caution",
    body: {
      message: "Motorbike rental shop claims scratch damage and asks 800 baht with no receipt.",
      city: "Pattaya",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z"
    },
    expectStatus: "completed",
    expectRisk: "Caution",
    expectGroundingTool: "damage_claim_reference",
    expectDamageAmount: 800
  },
  {
    name: "Rental OCR with baht amount should not become menu grounding",
    body: {
      message: "Please check this rental dispute screenshot.",
      city: "Pattaya",
      language: "English",
      incidentDateIso: "2026-05-02T05:00:00.000Z",
      evidenceText: "Jet ski rental damage claim. Scratch fee 20,000 THB. Pay cash now. No receipt. Do not call police. Passport held at counter."
    },
    expectStatus: "completed",
    expectRisk: "High",
    expectGroundingTool: "damage_claim_reference",
    rejectGroundingTools: ["food_price_reference", "venue_reference"],
    expectSignalIncludes: ["Large cash damage demand without neutral inspection", "No receipt or written damage estimate offered"]
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
    expectRisk: "Emergency",
    expectGroundingTool: "job_lure_reference",
    rejectGroundingTools: ["food_price_reference", "venue_reference"],
    expectSignalIncludes: ["Controlled pickup or free transport offered", "Travel toward Mae Sot, Myanmar, or border area", "Secrecy or isolation instruction"]
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

  if (testCase.expectClarificationKey && data.clarification_key !== testCase.expectClarificationKey) {
    throw new Error(`${testCase.name}: expected clarification key ${testCase.expectClarificationKey}, got ${data.clarification_key}`);
  }

  if (testCase.expectMessageTopic && data.message_topic !== testCase.expectMessageTopic) {
    throw new Error(`${testCase.name}: expected message topic ${testCase.expectMessageTopic}, got ${data.message_topic}`);
  }

  if (testCase.expectEvidenceTopic) {
    const evidenceTopic = data.evidence_topic || data.evidence_relevance?.topic;
    if (evidenceTopic !== testCase.expectEvidenceTopic) {
      throw new Error(`${testCase.name}: expected evidence topic ${testCase.expectEvidenceTopic}, got ${evidenceTopic}`);
    }
  }

  if (testCase.expectEvidenceRelevance && data.evidence_relevance?.relevance !== testCase.expectEvidenceRelevance) {
    throw new Error(`${testCase.name}: expected evidence relevance ${testCase.expectEvidenceRelevance}, got ${JSON.stringify(data.evidence_relevance)}`);
  }

  if (testCase.rejectSuggestedAnswers) {
    const suggestions = data.suggested_answers || [];
    const rejected = testCase.rejectSuggestedAnswers.find((answer) => suggestions.includes(answer));
    if (rejected) {
      throw new Error(`${testCase.name}: rejected suggested answer ${rejected}, got ${JSON.stringify(suggestions)}`);
    }
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

  if (data.status === "completed" && testCase.expectSignalIncludes) {
    const signals = data.signals || [];
    for (const expectedSignal of testCase.expectSignalIncludes) {
      if (!signals.includes(expectedSignal)) {
        throw new Error(`${testCase.name}: expected signal ${expectedSignal}, got ${JSON.stringify(signals)}`);
      }
    }
  }

  if (data.status === "completed" && testCase.rejectSignalIncludes) {
    const signalText = (data.signals || []).join(" | ").toLowerCase();
    const rejected = testCase.rejectSignalIncludes.find((text) => signalText.includes(text.toLowerCase()));
    if (rejected) {
      throw new Error(`${testCase.name}: signal should not include ${rejected}, got ${JSON.stringify(data.signals)}`);
    }
  }

  if (data.status === "completed" && testCase.rejectContactIncludes) {
    const contact = data.contact_recommendation || "";
    const rejected = testCase.rejectContactIncludes.find((text) => contact.toLowerCase().includes(text.toLowerCase()));
    if (rejected) {
      throw new Error(`${testCase.name}: contact recommendation should not include ${rejected}, got ${contact}`);
    }
  }

  if (data.status === "completed" && testCase.expectCategoryIncludes && !data.category?.includes(testCase.expectCategoryIncludes)) {
    throw new Error(`${testCase.name}: expected category to include ${testCase.expectCategoryIncludes}, got ${data.category}`);
  }

  if (testCase.expectGroundingTool && !data.grounding?.some((signal) => signal.tool === testCase.expectGroundingTool)) {
    throw new Error(`${testCase.name}: expected grounding tool ${testCase.expectGroundingTool}, got ${JSON.stringify(data.grounding)}`);
  }

  if (testCase.rejectGroundingTool && data.grounding?.some((signal) => signal.tool === testCase.rejectGroundingTool)) {
    throw new Error(`${testCase.name}: rejected grounding tool ${testCase.rejectGroundingTool}, got ${JSON.stringify(data.grounding)}`);
  }

  if (testCase.rejectGroundingTools) {
    const rejected = testCase.rejectGroundingTools.find((tool) => data.grounding?.some((signal) => signal.tool === tool));
    if (rejected) {
      throw new Error(`${testCase.name}: rejected grounding tool ${rejected}, got ${JSON.stringify(data.grounding)}`);
    }
  }

  if (testCase.expectFoodTier) {
    const foodSignal = data.grounding?.find((signal) => signal.tool === "food_price_reference");
    if (foodSignal?.metadata?.likely_tier !== testCase.expectFoodTier) {
      throw new Error(`${testCase.name}: expected food tier ${testCase.expectFoodTier}, got ${JSON.stringify(foodSignal?.metadata)}`);
    }
  }

  if (testCase.expectMatchedVenue) {
    const foodSignal = data.grounding?.find((signal) => signal.tool === "food_price_reference");
    if (foodSignal?.metadata?.matched_known_venue !== testCase.expectMatchedVenue) {
      throw new Error(`${testCase.name}: expected matched venue ${testCase.expectMatchedVenue}, got ${JSON.stringify(foodSignal?.metadata)}`);
    }
  }

  if (testCase.expectMenuItems && data.status === "completed") {
    const foodSignal = data.grounding?.find((signal) => signal.tool === "food_price_reference");
    const itemNames = foodSignal?.metadata?.menu_items?.map((item) => item.item_name) || [];
    for (const expectedItem of testCase.expectMenuItems) {
      if (!itemNames.includes(expectedItem)) {
        throw new Error(`${testCase.name}: expected menu item ${expectedItem}, got ${JSON.stringify(foodSignal?.metadata)}`);
      }
    }
    if (!foodSignal?.metadata?.price_comparisons?.length) {
      throw new Error(`${testCase.name}: expected item-level price comparisons, got ${JSON.stringify(foodSignal?.metadata)}`);
    }

    if (testCase.expectMenuItemPrices) {
      const menuItems = foodSignal?.metadata?.menu_items || [];
      for (const [itemName, expectedPrice] of Object.entries(testCase.expectMenuItemPrices)) {
        const menuItem = menuItems.find((item) => item.item_name === itemName);
        if (menuItem?.listed_price_baht !== expectedPrice) {
          throw new Error(`${testCase.name}: expected ${itemName} price ${expectedPrice}, got ${JSON.stringify(menuItem)}`);
        }
      }
    }
  }

  if (testCase.expectTaxiDistance && data.status === "completed") {
    const fareSignal = data.grounding?.find((signal) => signal.tool === "fare_reference");
    if (typeof fareSignal?.metadata?.route_distance_km !== "number" || !Array.isArray(fareSignal?.metadata?.taxi_meter_estimate_baht)) {
      throw new Error(`${testCase.name}: expected taxi distance and meter estimate metadata, got ${JSON.stringify(fareSignal?.metadata)}`);
    }
  }

  if (testCase.expectFareRatioAtLeast && data.status === "completed") {
    const fareSignal = data.grounding?.find((signal) => signal.tool === "fare_reference");
    const ratio = fareSignal?.metadata?.fare_ratio_to_baseline;
    if (typeof ratio !== "number" || ratio < testCase.expectFareRatioAtLeast) {
      throw new Error(`${testCase.name}: expected fare ratio at least ${testCase.expectFareRatioAtLeast}, got ${JSON.stringify(fareSignal?.metadata)}`);
    }
  }

  if (testCase.expectFareRatioBelow && data.status === "completed") {
    const fareSignal = data.grounding?.find((signal) => signal.tool === "fare_reference");
    const ratio = fareSignal?.metadata?.fare_ratio_to_baseline;
    if (typeof ratio !== "number" || ratio >= testCase.expectFareRatioBelow) {
      throw new Error(`${testCase.name}: expected fare ratio below ${testCase.expectFareRatioBelow}, got ${JSON.stringify(fareSignal?.metadata)}`);
    }
  }

  if (testCase.expectFareRatioAtMost && data.status === "completed") {
    const fareSignal = data.grounding?.find((signal) => signal.tool === "fare_reference");
    const ratio = fareSignal?.metadata?.fare_ratio_to_baseline;
    if (typeof ratio !== "number" || ratio > testCase.expectFareRatioAtMost) {
      throw new Error(`${testCase.name}: expected fare ratio at most ${testCase.expectFareRatioAtMost}, got ${JSON.stringify(fareSignal?.metadata)}`);
    }
  }

  if (testCase.expectFoodRatioAtLeast && data.status === "completed") {
    const foodSignal = data.grounding?.find((signal) => signal.tool === "food_price_reference");
    const ratio = foodSignal?.metadata?.max_price_ratio_to_reference;
    if (typeof ratio !== "number" || ratio < testCase.expectFoodRatioAtLeast) {
      throw new Error(`${testCase.name}: expected food ratio at least ${testCase.expectFoodRatioAtLeast}, got ${JSON.stringify(foodSignal?.metadata)}`);
    }
  }

  if (testCase.expectDamageAmount && data.status === "completed") {
    const damageSignal = data.grounding?.find((signal) => signal.tool === "damage_claim_reference");
    if (damageSignal?.metadata?.damage_amount_baht !== testCase.expectDamageAmount) {
      throw new Error(`${testCase.name}: expected damage amount ${testCase.expectDamageAmount}, got ${JSON.stringify(damageSignal?.metadata)}`);
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

const legacyFoodSignal = legacyMenuData.grounding?.find((signal) => signal.tool === "food_price_reference");
if (!legacyFoodSignal?.metadata?.price_comparisons?.length) {
  throw new Error(`Legacy menu check: expected item-level price comparisons, got ${JSON.stringify(legacyFoodSignal?.metadata)}`);
}

console.log(`Legacy menu check: OK (${legacyMenuData.risk_level}, ${legacyMenuData.category})`);
