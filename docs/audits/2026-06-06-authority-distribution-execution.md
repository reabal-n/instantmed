# Authority Resource Distribution Execution

**Date:** 2026-06-06  
**Scope:** Phase 4 execution for the `/resources/*` authority cluster after publication, production deployment, and GSC submission.

## Current State

- Production deployment is live on `instantmed.com.au`.
- GSC Indexing API submission completed for the hub plus every authority resource: **Submitted 12/12**, errors `0`.
- First live `pnpm seo:authority-pulse -- --format=json` baseline:
  - 11 authority targets inspected.
  - All 11 currently report `URL is unknown to Google`.
  - 0 GSC performance rows, which is expected immediately after launch.
- Weekly monitor command:

```bash
pnpm seo:authority-pulse
pnpm seo:authority-pulse -- --format=json
```

## Guardrails

- No partner-link outreach.
- No video or transcript work.
- Use company attribution: `InstantMed`, `InstantMed clinical team`, or `an AHPRA-registered doctor at InstantMed`.
- Do not name individual doctors or founders in public source profiles.
- Use natural anchors only, usually the resource title.
- Do not request exact-match anchor text.
- Do not pay for ranking links.
- Do not use link farms, no PBNs, bulk guest-post lists, automated outreach blasts, fake reviews, or private blog networks.
- Do not pitch prescription-drug access, medicine-specific claims, treatment outcomes, "accepted everywhere" certificate claims, or guaranteed approval.

## Why This Is The Next Step

The site now has pages that are worth citing. The next job is not more generic blog content. It is getting credible third parties to discover and reference the pages that already exist.

The best targets are:

1. Journalists who need quick Australian source material.
2. Digital health outlets covering telehealth safety, access, and governance.
3. HR and workplace publications covering sick leave evidence and certificate verification.
4. Entity profiles that corroborate InstantMed as a real Australian business, while staying careful with online-only eligibility rules.

## Weekly Operating Loop

| Day | Action | Output |
|---|---|---|
| Monday | Run `pnpm seo:authority-pulse` | Note index verdicts, first impressions, and any crawled pages. |
| Monday | Check source-request platforms | Save only AU health, work, HR, privacy, and digital-health requests. |
| Tuesday | Send 2 source responses | One telehealth/access response, one certificate/workplace response. |
| Wednesday | Direct pitch 3 targets | Use the page-level tracker below. No broad blasts. |
| Friday | Check published mentions | Record links, nofollow/follow when visible, and whether the page cited is correct. |
| Monthly | Review GSC and referring domains | Keep what earns links. Drop what creates noise. |

## Source Platforms

| Platform | Current research note | Use |
|---|---|---|
| [SourceBottle](https://www.sourcebottle.com/?lang=en) | Australian-founded source platform with free expert profiles and AU media call-outs. | Best first signup for AU health, workplace, and lifestyle queries. |
| [Featured / HARO](https://featured.com/haro) | Featured owns HARO and offers real-time HARO query access with public expert profiles. | Use for broader media requests. Create a company-attributed profile. |
| [Qwoted](https://www.qwoted.com/for-newsrooms/) | Built around newsroom source discovery and expert verification. | Use for higher-quality source requests. Answer only where InstantMed is a genuine fit. |
| [Muck Rack](https://muckrack.com/media-database) | Paid media database with journalist profiles, beats, preferences, and outlet filters. | Optional. Useful if manual target discovery becomes the bottleneck. |

## Entity And Directory Layer

These are trust and entity-corroboration moves, not the main ranking lever.

| Target | Research note | Decision |
|---|---|---|
| [Google Business Profile eligibility](https://support.google.com/business/answer/13763036?hl=en-AU) | Google says online-only businesses are generally not eligible for a Business Profile. | Attempt only if the registered office and in-person eligibility can be represented honestly. Do not force it. |
| [Bing Places](https://www.bingplaces.com/Home/MoreFAQ) | Bing Places supports healthcare facility or professional segments and lets businesses manage Bing local data. | Safe to attempt after NAP is final. |
| [Apple Business Connect](https://www.apple.com/business/connect/) | Free business presence across Apple Maps, Wallet, Siri, and related Apple surfaces. | Safe entity profile if verification accepts the business. |
| [LinkedIn Page](https://www.linkedin.com/help/linkedin/answer/a550417) | LinkedIn recommends complete company pages with website, logo, description, industry, and location. | Create or complete a company page. No founder bio needed. |
| [Healthdirect NHSD](https://about.healthdirect.gov.au/what-we-do/portfolio/nhsd) | NHSD is a national directory of health services and practitioners. | Investigate eligibility carefully. Do not create a misleading appointment-clinic listing. |

## Editorial Targets

| Target | Why it fits | Best resource target |
|---|---|---|
| [The Medical Republic editorial submissions](https://www.medicalrepublic.com.au/about-us/contact-us) | Accepts editorial enquiries and expert submissions. Covers telehealth, digital health, GP pressure, and medical governance. | `/resources/when-telehealth-is-not-appropriate` or `/resources/rural-remote-telehealth-access` |
| [Talking HealthTech](https://www.talkinghealthtech.com/about) | Australian healthtech community and content hub. | `/resources/telehealth-privacy-health-data-checklist` |
| [AIDH media enquiries](https://digitalhealth.org.au/about/contact-us/) | Digital health institute with policy, media, and workforce channels. | `/resources/telehealth-safety-checklist` |
| [Digital Health CRC contact](https://digitalhealthcrc.com/contact/) | Digital health research and education body. | `/resources/telehealth-privacy-health-data-checklist` |
| [Health Industry Hub](https://www.australianhealthcareweek.com/events-austhealthweek/mediapartners/health-industry-hub) | Healthcare industry and digital innovation coverage. | `/resources/gp-wait-times-telehealth-access` |
| [Australian HR Institute resources](https://www.ahri.com.au/resources) | HR analysis and workplace policy audience. | `/resources/medical-certificate-employer-policy` |
| [Fair Work evidence source](https://www.fairwork.gov.au/leave/sick-and-carers-leave/paid-sick-and-carers-leave/notice-and-medical-certificates) | Not an outreach target. Use as the public baseline source when pitching HR outlets. | `/resources/medical-certificate-employer-policy` |

## Page-Level Tracker

| Status | Resource | Natural anchor | Best outside audience | First action |
|---|---|---|---|---|
| Not sent | `/resources/telehealth-safety-checklist` | Australian telehealth safety checklist | Digital health, consumer health, source-request platforms | Pitch as a neutral checklist for assessing online healthcare safety. |
| Not sent | `/resources/medical-certificate-employer-policy` | Medical certificate employer policy explainer | HR, payroll, small business, workplace law commentators | Pitch as a careful Fair Work evidence explainer where policies can vary. |
| Not sent | `/resources/secure-online-prescription-requests` | Secure online prescription request explainer | Digital health and consumer safety writers | Pitch only as secure review process, never as medicine access. |
| Not sent | `/resources/gp-wait-times-telehealth-access` | GP wait-time and telehealth access brief | Health access, rural access, business press | Pitch with ABS and public-source access-pressure framing. |
| Not sent | `/resources/complaints-clinical-governance` | Plain-English complaints and clinical governance page | Consumer rights, privacy, digital health governance | Pitch as a model of visible complaints and escalation information. |
| Not sent | `/resources/online-medical-certificate-verification` | Online medical certificate verification guide for employers | HR, employer, payroll, small business | Pitch as a document-checking guide for employers without making acceptance claims. |
| Not sent | `/resources/telehealth-privacy-health-data-checklist` | Telehealth privacy and health data checklist | Privacy, health data, digital health | Pitch as a plain-English checklist for health data handling. |
| Not sent | `/resources/when-telehealth-is-not-appropriate` | When telehealth is not appropriate | Health safety, consumer health, digital health | Pitch as the safety-boundary page that fast telehealth brands usually omit. |
| Not sent | `/resources/medicare-bulk-billing-private-telehealth` | Medicare, bulk billing, and private telehealth explainer | Consumer finance, health access, HR benefits | Pitch as a plain-English billing distinction page. |
| Not sent | `/resources/rural-remote-telehealth-access` | Rural and remote telehealth access brief | Rural health, regional media, digital health | Pitch as a careful access-layer brief, not a replacement-for-local-care claim. |
| Not sent | `/resources/repeat-prescription-safety-checklist` | Repeat prescription safety checklist | Digital health safety, clinical governance, source requests | Pitch as a medicine-neutral safety checklist. |

## Company Source Profile

Use this on SourceBottle, Featured, Qwoted, and any profile that allows company source attribution.

**Display name:** InstantMed clinical team

**Short bio:**

InstantMed is an Australian telehealth service for online medical certificates, repeat prescription requests, and one-off doctor reviews. Requests start with a secure clinical form and are reviewed by AHPRA-registered doctors. InstantMed can comment on telehealth access, online medical certificates, workplace evidence, health data privacy, and safe online healthcare boundaries.

**Attribution line:**

Source: InstantMed, an Australian telehealth service, instantmed.com.au.

## Response Template: Telehealth Safety

Subject: Source comment: telehealth safety in Australia

Hi,

InstantMed can comment on this from the perspective of an Australian telehealth service.

The safest telehealth services make their limits visible. A remote review can be appropriate for low-risk, well-defined requests, but it is not a shortcut around examination, urgent symptoms, monitoring, or clinical uncertainty. A credible service should be willing to decline, ask for more information, or redirect a patient to in-person care.

Useful background: https://instantmed.com.au/resources/when-telehealth-is-not-appropriate

Attribution if useful: InstantMed, an Australian telehealth service.

## Response Template: Workplace Evidence

Subject: Source comment: medical certificates and workplace evidence

Hi,

InstantMed can provide a careful Australian workplace-evidence angle.

Employers can ask for evidence for sick or carer's leave, including short absences, but the useful question is whether the evidence is reasonable in the circumstances and consistent with the workplace policy, award, or agreement. A medical certificate supports that review. It does not override every employer process, and it should not require the employee to disclose a diagnosis.

Useful background: https://instantmed.com.au/resources/medical-certificate-employer-policy

Attribution if useful: InstantMed, an Australian telehealth service.

## Response Template: Health Data Privacy

Subject: Source comment: telehealth privacy and health data

Hi,

InstantMed can comment on what patients should look for when a telehealth service collects health information.

Health information is not ordinary contact data. Patients should be able to see what is collected, why it is needed, who can access it, how it is stored, and how to raise a complaint if something goes wrong. Privacy claims are more credible when the service explains the practical workflow rather than only saying data is secure.

Useful background: https://instantmed.com.au/resources/telehealth-privacy-health-data-checklist

Attribution if useful: InstantMed, an Australian telehealth service.

## Review Triggers

Re-run this execution pass if any of these happen:

- GSC pulse shows a page indexed but no impressions after 30 days.
- A source platform publishes a profile that names an individual doctor or founder.
- A journalist asks for medicine-specific advice, patient-specific advice, or treatment-outcome commentary.
- A directory requires clinic, appointment, walk-in, or physical-practice claims that are not true for InstantMed.
- Any outreach reply asks for paid placement, reciprocal links, exact-match anchor text, or a bulk package.
