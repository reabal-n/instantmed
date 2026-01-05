/**
 * Test sitemap functions
 * Run: npx tsx scripts/test_sitemap.ts
 */

import { getAllSlugs } from "../lib/seo/pages"
import { getAllMedicationSlugs } from "../lib/seo/medications"
import { getAllIntentSlugs } from "../lib/seo/intents"
import { getAllSymptomSlugs } from "../lib/seo/symptoms"
import { getAllComparisonSlugs } from "../lib/seo/comparisons"

console.log("Testing sitemap functions...\n")

try {
  const conditionSlugs = getAllSlugs("conditions")
  console.log(`✅ getAllSlugs('conditions'): ${conditionSlugs.length} slugs`)
  console.log(`   First 3: ${conditionSlugs.slice(0, 3).join(", ")}`)

  const medicationSlugs = getAllMedicationSlugs()
  console.log(`✅ getAllMedicationSlugs(): ${medicationSlugs.length} slugs`)
  console.log(`   First 3: ${medicationSlugs.slice(0, 3).join(", ")}`)

  const intentSlugs = getAllIntentSlugs()
  console.log(`✅ getAllIntentSlugs(): ${intentSlugs.length} slugs`)
  console.log(`   First 3: ${intentSlugs.slice(0, 3).join(", ")}`)

  const symptomSlugs = getAllSymptomSlugs()
  console.log(`✅ getAllSymptomSlugs(): ${symptomSlugs.length} slugs`)
  console.log(`   First 3: ${symptomSlugs.slice(0, 3).join(", ")}`)

  const comparisonSlugs = getAllComparisonSlugs()
  console.log(`✅ getAllComparisonSlugs(): ${comparisonSlugs.length} slugs`)
  console.log(`   First 3: ${comparisonSlugs.slice(0, 3).join(", ")}`)

  const certificateSlugs = getAllSlugs("certificates")
  console.log(`✅ getAllSlugs('certificates'): ${certificateSlugs.length} slugs`)

  const benefitSlugs = getAllSlugs("benefits")
  console.log(`✅ getAllSlugs('benefits'): ${benefitSlugs.length} slugs`)

  const resourceSlugs = getAllSlugs("resources")
  console.log(`✅ getAllSlugs('resources'): ${resourceSlugs.length} slugs`)

  console.log("\n✅ All sitemap functions working correctly!")
} catch (error) {
  console.error("❌ Error testing sitemap functions:", error)
  process.exit(1)
}

