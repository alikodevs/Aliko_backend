/**
 * CA-20: Seed the 22 Washington State (WABON) Nursing Assistant Core Skills
 * and remove any temporary/test CoreSkill rows not in the official 22-skill list.
 *
 * Usage:
 *   npx ts-node --transpile-only -r dotenv/config -r tsconfig-paths/register scripts/seed_core_skills.ts
 */
import { PrismaClient } from '@prisma/client/academy';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.ACADEMY_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

const WABON_22_CORE_SKILLS = [
  {
    skillNumber: 'SKILL-01',
    name: 'Hand Hygiene (Handwashing)',
    category: 'Infection Control',
    steps: [
      'Wet hands and wrists thoroughly with warm running water',
      'Apply soap and lather all surfaces including wrists, palms, backs of hands, fingers, and under nails for at least 20 seconds',
      'Rinse hands thoroughly with fingers pointed downward',
      'Dry hands with clean paper towel and use paper towel to turn off faucet',
    ],
  },
  {
    skillNumber: 'SKILL-02',
    name: 'Donning and Doffing Personal Protective Equipment (PPE)',
    category: 'Infection Control',
    steps: [
      'Perform hand hygiene before donning PPE',
      'Put on gown, mask/respirator, goggles/face shield, and gloves in proper sequence',
      'Remove gloves first without contaminating skin, then goggles/face shield, gown, and mask',
      'Perform hand hygiene immediately after removing all PPE',
    ],
  },
  {
    skillNumber: 'SKILL-03',
    name: 'Measure and Record Radial Pulse',
    category: 'Vital Signs',
    steps: [
      'Perform hand hygiene and identify resident',
      'Locate radial artery on thumb side of wrist using fingertips',
      'Count beats for 60 full seconds (noting rhythm and strength)',
      'Record rate accurately within +/- 4 bpm of evaluator',
    ],
  },
  {
    skillNumber: 'SKILL-04',
    name: 'Measure and Record Respirations',
    category: 'Vital Signs',
    steps: [
      'Count respirations unobtrusively immediately after radial pulse',
      'Observe one full rise and fall of chest as one respiration for 60 full seconds',
      'Record rate accurately within +/- 2 breaths per minute of evaluator',
    ],
  },
  {
    skillNumber: 'SKILL-05',
    name: 'Measure and Record Blood Pressure (Manual)',
    category: 'Vital Signs',
    steps: [
      'Clean earpieces and diaphragm of stethoscope; position cuff 1 inch above brachial artery',
      'Palpate brachial/radial pulse, inflate cuff 30 mmHg above disappearance point',
      'Release valve slowly (2-3 mmHg/sec), note systolic and diastolic sounds',
      'Deflate cuff completely, remove, and record BP accurately',
    ],
  },
  {
    skillNumber: 'SKILL-06',
    name: 'Measure and Record Oral/Tympanic/Temporal Temperature',
    category: 'Vital Signs',
    steps: [
      'Perform hand hygiene and apply disposable probe cover',
      'Place thermometer correctly according to route',
      'Wait for audible signal, read temperature, discard probe cover',
      'Record reading accurately with route noted',
    ],
  },
  {
    skillNumber: 'SKILL-07',
    name: 'Measure and Record Weight (Standing Scale)',
    category: 'Vital Signs',
    steps: [
      'Balance scale at zero before resident steps on',
      'Ensure resident wears non-skid footwear and light clothing',
      'Assist resident onto scale safely without holding onto scale/wall',
      'Read and record weight accurately',
    ],
  },
  {
    skillNumber: 'SKILL-08',
    name: 'Assist Resident with Ambulation Using Gait Belt',
    category: 'Mobility & Transfers',
    steps: [
      'Lock bed/wheelchair brakes and apply non-skid footwear',
      'Apply gait belt snugly over clothing around waist',
      'Assist resident to stand using proper body mechanics',
      'Walk slightly behind and to the weaker side while holding gait belt',
    ],
  },
  {
    skillNumber: 'SKILL-09',
    name: 'Transfer Resident from Bed to Wheelchair Using Gait Belt',
    category: 'Mobility & Transfers',
    steps: [
      'Position wheelchair at bedside, lock brakes, and remove/swing away footrests',
      'Apply gait belt snugly and assist resident to sitting position on edge of bed',
      'Pivot resident smoothly into wheelchair using proper body mechanics',
      'Remove gait belt, position footrests, and place call light within reach',
    ],
  },
  {
    skillNumber: 'SKILL-10',
    name: 'Position Resident on Side (Lateral Position)',
    category: 'Mobility & Transfers',
    steps: [
      'Lock bed brakes and raise bed to comfortable working height',
      'Move resident to side of bed and roll gently onto side',
      'Place pillows behind back, between knees/ankles, and under upper arm',
      'Lower bed to lowest position and place call light within reach',
    ],
  },
  {
    skillNumber: 'SKILL-11',
    name: 'Perform Passive Range of Motion (PROM) — Upper & Lower Extremities',
    category: 'Restorative Care',
    steps: [
      'Explain procedure and support joints above and below during movement',
      'Move each joint slowly and smoothly through flexion, extension, abduction, adduction',
      'Stop immediately if resident reports pain or resistance is felt',
      'Ensure resident comfort and call light access upon completion',
    ],
  },
  {
    skillNumber: 'SKILL-12',
    name: 'Make an Occupied Bed',
    category: 'Environment & Comfort',
    steps: [
      'Lock bed brakes, explain procedure, and maintain privacy',
      'Roll resident safely to one side, tuck soiled bottom sheet toward center',
      'Place clean bottom sheet and draw sheet smoothly, then roll resident to clean side',
      'Remove soiled linen without shaking, apply top sheet/blanket with toe pleat',
    ],
  },
  {
    skillNumber: 'SKILL-13',
    name: 'Provide Mouth Care (Brushing Teeth & Denture Care)',
    category: 'Personal Care',
    steps: [
      'Don gloves and position resident upright (or on side if unconscious)',
      'Brush all tooth surfaces gently (or clean dentures over lined sink in cool water)',
      'Assist resident to rinse mouth and dry face',
      'Remove gloves, perform hand hygiene, and store supplies properly',
    ],
  },
  {
    skillNumber: 'SKILL-14',
    name: 'Provide Partial Bed Bath (Face, Arm, Hand, Underarm)',
    category: 'Personal Care',
    steps: [
      'Test water temperature and have resident verify comfort',
      'Wash eyes from inner to outer canthus with plain water, then wash face',
      'Wash, rinse, and dry arm, hand, and axilla while keeping resident covered',
      'Apply lotion/deodorant as requested, lower bed, and perform hand hygiene',
    ],
  },
  {
    skillNumber: 'SKILL-15',
    name: 'Provide Perineal Care (Female/Male)',
    category: 'Personal Care',
    steps: [
      'Don gloves, provide privacy, and test water temperature',
      'Cleanse from cleanest to dirtiest area (front to back) using clean cloth sections',
      'Rinse thoroughly and pat dry gently',
      'Dispose of soiled linen/gloves properly and perform hand hygiene',
    ],
  },
  {
    skillNumber: 'SKILL-16',
    name: 'Provide Nail Care (Fingernails)',
    category: 'Personal Care',
    steps: [
      'Soak fingers in warm water and dry gently',
      'Clean under nails with orangewood stick',
      'File nails smoothly in rounded shape (do not cut diabetic residents nails)',
      'Apply lotion to hands and perform hand hygiene',
    ],
  },
  {
    skillNumber: 'SKILL-17',
    name: 'Assist Resident with Dressing (Weak/Affected Arm)',
    category: 'Personal Care',
    steps: [
      'Provide privacy and allow resident to choose clothing',
      'Undress unaffected/strong side first; dress affected/weak side first',
      'Handle affected limb gently and support joints',
      'Ensure clothing is neat, comfortable, and call light is within reach',
    ],
  },
  {
    skillNumber: 'SKILL-18',
    name: 'Apply Elastic Stocking (Anti-Embolism Hose)',
    category: 'Personal Care',
    steps: [
      'Position resident supine with leg flat',
      'Turn stocking inside out to heel, slip over foot, and pull smoothly up leg',
      'Verify heel is properly positioned and no wrinkles or twists remain',
      'Check toes for warmth and circulation',
    ],
  },
  {
    skillNumber: 'SKILL-19',
    name: 'Assist Resident with Bedpan & Measure Urinary Output',
    category: 'Elimination & Output',
    steps: [
      'Don gloves, place protective pad, and position bedpan properly',
      'Raise head of bed for comfort, provide toilet tissue and call light, step out for privacy',
      'Lower head of bed, remove bedpan, and assist with perineal/hand hygiene',
      'Measure urine in graduate on flat surface at eye level and record output',
    ],
  },
  {
    skillNumber: 'SKILL-20',
    name: 'Provide Indwelling Urinary Catheter Care',
    category: 'Elimination & Output',
    steps: [
      'Don gloves and inspect meatus/tubing for irritation or kinks',
      'Stabilize catheter near meatus and cleanse 4 inches down tubing away from meatus',
      'Rinse and pat dry; keep drainage bag below bladder level off the floor',
      'Remove gloves and perform hand hygiene',
    ],
  },
  {
    skillNumber: 'SKILL-21',
    name: 'Feed a Resident Safely & Record Intake',
    category: 'Nutrition & Hydration',
    steps: [
      'Position resident upright (75-90 degrees) and verify diet card',
      'Offer small bites/sips at residents pace, alternating food and fluids',
      'Wipe mouth as needed and keep resident upright 30 minutes after meal',
      'Calculate and record percentage of meal eaten and fluid intake in mL',
    ],
  },
  {
    skillNumber: 'SKILL-22',
    name: 'Empty Urinary Drainage Bag & Record Output',
    category: 'Elimination & Output',
    steps: [
      'Don gloves and place barrier under graduate container',
      'Open drain spout without touching container sides and empty completely',
      'Wipe spout with alcohol swab, close/secure spout in holder',
      'Measure at eye level on flat surface, record mL, and perform hand hygiene',
    ],
  },
];

async function seedCoreSkills() {
  console.log('Seeding 22 WABON Nursing Assistant Core Skills (CA-20)...');

  const officialNumbers = WABON_22_CORE_SKILLS.map((s) => s.skillNumber);
  const deleted = await prisma.coreSkill.deleteMany({
    where: {
      skillNumber: { notIn: officialNumbers },
      checkoffs: { none: {} },
    },
  });
  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} unused test CoreSkill records.`);
  }

  for (const skill of WABON_22_CORE_SKILLS) {
    await prisma.coreSkill.upsert({
      where: { skillNumber: skill.skillNumber },
      update: {
        name: skill.name,
        category: skill.category,
        steps: skill.steps,
      },
      create: {
        skillNumber: skill.skillNumber,
        name: skill.name,
        category: skill.category,
        steps: skill.steps,
      },
    });
  }

  console.log(`Successfully seeded ${WABON_22_CORE_SKILLS.length} WABON core skills.`);
}

seedCoreSkills()
  .catch((err) => {
    console.error('Failed to seed core skills:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
