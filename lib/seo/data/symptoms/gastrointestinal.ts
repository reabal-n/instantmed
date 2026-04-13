/**
 * Gastrointestinal symptoms -- SEO symptom page data
 * Part of the symptoms data split. See ./index.ts for the combined export.
 */

import type { SymptomData } from "../symptoms"

export const gastrointestinalSymptoms: Record<string, SymptomData> = {
  "stomach-pain": {
    name: "Stomach Pain",
    slug: "stomach-pain",
    description: "Pain or discomfort in the abdomen. Can have many causes from mild to serious.",
    possibleCauses: [
      { name: "Gastroenteritis", likelihood: "common", description: "Stomach bug.", whenToSuspect: ["Nausea", "Diarrhoea or vomiting", "Cramping"] },
      { name: "Indigestion", likelihood: "common", description: "Overeating or fatty foods.", whenToSuspect: ["After eating", "Bloating", "Heartburn"] },
      { name: "Constipation", likelihood: "common", description: "Blocked bowel.", whenToSuspect: ["Haven't had bowel movement", "Bloating", "Straining"] },
      { name: "Irritable bowel syndrome", likelihood: "common", description: "Recurring abdominal discomfort.", whenToSuspect: ["Recurring", "Related to stress or food", "Bloating"] },
      { name: "Appendicitis", likelihood: "rare", description: "Medical emergency.", whenToSuspect: ["Pain starting near belly button", "Moving to right lower abdomen", "Fever"] }
    ],
    selfCareAdvice: ["Rest", "Sip water", "Avoid solid food if vomiting", "Heat pack may help cramps"],
    whenToSeeDoctor: ["Severe pain", "Pain lasting >24 hours", "Blood in stool or vomit", "You need a medical certificate"],
    emergencySigns: ["Severe sudden pain", "Rigid abdomen", "Vomiting blood", "Fainting"],
    relatedSymptoms: ["gastro", "nausea", "bloating"],
    faqs: [
      { q: "Can I get a medical certificate for stomach pain?", a: "Yes. Stomach pain from gastro or other causes can prevent you from working." },
      { q: "When is stomach pain serious?", a: "Seek urgent care for severe sudden pain, rigid abdomen, vomiting blood, or high fever." }
    ],
    serviceRecommendation: { type: "both", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Abdominal pain is one of the broadest symptom categories in medicine - the abdomen contains dozens of organs, and the location, character, and timing of pain all provide diagnostic clues. Epigastric pain (upper centre) after meals suggests gastritis or reflux. Right lower quadrant pain with fever raises concern for appendicitis. Left lower quadrant pain with bowel changes may indicate diverticulitis. Crampy, diffuse pain with diarrhoea points to gastro or IBS. The key emergency features are: sudden severe pain (especially if rigid abdomen), pain with fainting, vomiting blood, or pain in pregnancy. For mild-moderate abdominal discomfort without alarm features, telehealth can help determine the likely cause and appropriate next steps.",
    certGuidance: "Abdominal pain that prevents sitting comfortably, concentrating, or commuting is a valid reason for a certificate. Gastro-related abdominal pain typically warrants 1-3 days off. More complex causes may require longer.",
  },
  "bloating": {
    name: "Bloating",
    slug: "bloating",
    description: "Feeling of fullness or swelling in the abdomen. Often from gas, diet, or digestive issues.",
    possibleCauses: [
      { name: "Diet and eating habits", likelihood: "common", description: "Eating too fast, carbonated drinks, high-fibre foods.", whenToSuspect: ["After eating", "Certain foods trigger it"] },
      { name: "Irritable bowel syndrome", likelihood: "common", description: "Recurring bloating with other gut symptoms.", whenToSuspect: ["Recurring", "With constipation or diarrhoea"] },
      { name: "Constipation", likelihood: "common", description: "Stool buildup causes distension.", whenToSuspect: ["Infrequent bowel movements", "Straining"] },
      { name: "Food intolerance", likelihood: "less-common", description: "Lactose, gluten, or other intolerances.", whenToSuspect: ["After dairy or wheat", "Recurring pattern"] }
    ],
    selfCareAdvice: ["Eat slowly", "Avoid carbonated drinks", "Limit gas-producing foods", "Regular exercise"],
    whenToSeeDoctor: ["Persistent bloating", "Bloating with weight loss", "Severe pain", "You need a medical certificate"],
    emergencySigns: ["Severe abdominal pain", "Unable to pass gas or stool", "Vomiting"],
    relatedSymptoms: ["stomach-pain", "ibs", "gastro"],
    faqs: [
      { q: "When is bloating serious?", a: "See a doctor if bloating is persistent, accompanied by weight loss, or severe pain. Sudden severe bloating needs urgent assessment." },
      { q: "Can I get a medical certificate for bloating?", a: "If bloating with other symptoms (e.g. IBS flare) severely affects work, yes." }
    ],
    serviceRecommendation: { type: "consult", text: "Get assessed", href: "/request?service=consult" },
    doctorPerspective: "Bloating is one of the most common digestive complaints and is usually benign. The most frequent cause is simply eating too quickly or consuming gas-producing foods (beans, cruciferous vegetables, carbonated drinks). IBS is the most common medical cause of recurrent bloating. What I am alert to is persistent bloating that is progressive (getting worse over weeks) - particularly in women over 50, where persistent bloating is one of the key early symptoms of ovarian cancer. Other red flags include bloating with unintentional weight loss, bloating with blood in stool, or new bloating with a change in bowel habits after age 50. For most patients, a food diary and dietary adjustment resolve the issue without medical intervention.",
    certGuidance: "Bloating alone rarely requires a certificate, but when part of an IBS flare with significant pain and urgency, 1-2 days may be warranted.",
  },
}
