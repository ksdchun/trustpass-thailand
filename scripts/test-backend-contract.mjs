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
    expectRisk: "Low"
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

  if (data.status !== testCase.expectStatus) {
    throw new Error(`${testCase.name}: expected status ${testCase.expectStatus}, got ${data.status}`);
  }

  if (testCase.expectRisk && data.risk_level !== testCase.expectRisk) {
    throw new Error(`${testCase.name}: expected risk ${testCase.expectRisk}, got ${data.risk_level}`);
  }

  console.log(`${testCase.name}: OK (${data.status}${data.risk_level ? `, ${data.risk_level}` : ""})`);
}
