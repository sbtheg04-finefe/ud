import { db } from "@workspace/db";
import {
  usersTable,
  mealsTable,
  videosTable,
  battlesTable,
  battleRequirementsTable,
  battleEntriesTable,
  battleInterestTable,
} from "@workspace/db/schema";

async function seedBattles() {
  console.log("Seeding battle engine demo data...");

  const existing = await db.select().from(battlesTable).limit(1);
  if (existing.length > 0) {
    console.log("Battle data already exists, skipping.");
    process.exit(0);
  }

  const users = await db.select().from(usersTable);
  const meals = await db.select().from(mealsTable);
  const videos = await db.select().from(videosTable);

  if (users.length === 0) {
    console.log("No users found. Run seed.ts first.");
    process.exit(1);
  }

  const maya = users.find(u => u.username === "mayachen") || users[0];
  const carlos = users.find(u => u.username === "carlosriv") || users[1];
  const priya = users.find(u => u.username === "priyasharma") || users[2];
  const tom = users.find(u => u.username === "tomnakamura") || users[3];
  const leila = users[4] || users[0];

  const tonkotsuMeal = meals.find(m => m.title.toLowerCase().includes("tonkotsu")) || meals[0];
  const beanMeal = meals.find(m => m.title.toLowerCase().includes("bean")) || meals[1];
  const ramenVideo = videos.find(v => v.title.toLowerCase().includes("ramen")) || videos[0];
  const sushiVideo = videos.find(v => v.title.toLowerCase().includes("sushi")) || videos[1];

  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  const battles = await db.insert(battlesTable).values([
    {
      title: "36-Hour Tonkotsu Showdown",
      slug: "36-hour-tonkotsu-showdown-" + Date.now(),
      description: "Think you can nail a silky, cloud-white tonkotsu broth? This is the ultimate ramen challenge — patience, technique, and your personal touch. Submit your best bowl.",
      sourceType: "meal" as const,
      sourceMealId: tonkotsuMeal?.id || null,
      challengeType: "solo_remake" as const,
      scopeType: "public" as const,
      battleStatus: "live" as const,
      createdBy: maya.id,
      battleWorthinessScore: 8.7,
      maxTeamSize: 1,
      registrationStart: yesterday,
      registrationEnd: fiveDays,
      prepStart: now,
      submissionDeadline: fiveDays,
      participantCount: 14,
      entryCount: 7,
      coverImageUrl: tonkotsuMeal?.imageUrl || "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800",
    },
    {
      title: "Abuela's Black Bean Remix",
      slug: "abuelas-black-bean-remix-" + Date.now(),
      description: "Take Carlos's legendary family black bean recipe and make it your own. Keep the soul of the dish, add your cultural twist. Best interpretation wins.",
      sourceType: "meal" as const,
      sourceMealId: beanMeal?.id || null,
      challengeType: "remix_battle" as const,
      scopeType: "public" as const,
      battleStatus: "open" as const,
      createdBy: carlos.id,
      battleWorthinessScore: 8.2,
      maxTeamSize: 2,
      registrationStart: now,
      registrationEnd: weekOut,
      prepStart: now,
      submissionDeadline: weekOut,
      participantCount: 9,
      entryCount: 3,
      coverImageUrl: beanMeal?.imageUrl || "https://images.unsplash.com/photo-1607301406259-dfb186e15de8?w=800",
    },
    {
      title: "Ramen Egg in 6-Minute Battle",
      slug: "ramen-egg-6-minute-battle-" + Date.now(),
      description: "The perfect marinated ramen egg is an art. 6 minutes soft-boil, 24-hour marinade. Show us your version — proof photo required. Judged on visual appeal and method.",
      sourceType: "video" as const,
      sourceVideoId: ramenVideo?.id || null,
      challengeType: "speed_battle" as const,
      scopeType: "global" as const,
      battleStatus: "open" as const,
      createdBy: tom.id,
      battleWorthinessScore: 9.1,
      maxTeamSize: 1,
      registrationStart: now,
      registrationEnd: twoWeeks,
      prepStart: now,
      submissionDeadline: twoWeeks,
      participantCount: 31,
      entryCount: 18,
      coverImageUrl: ramenVideo?.thumbnailUrl || "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800",
    },
    {
      title: "Plant-Based Sushi Challenge",
      slug: "plant-based-sushi-challenge-" + Date.now(),
      description: "No fish, no problem. Take your favorite sushi rolls and make them 100% plant-based. Creativity and presentation are key — bonus points for ingredient substitution notes.",
      sourceType: "video" as const,
      sourceVideoId: sushiVideo?.id || null,
      challengeType: "ingredient_restriction" as const,
      scopeType: "circle" as const,
      battleStatus: "open" as const,
      createdBy: priya.id,
      battleWorthinessScore: 7.8,
      maxTeamSize: 3,
      registrationStart: now,
      registrationEnd: weekOut,
      prepStart: now,
      submissionDeadline: weekOut,
      participantCount: 5,
      entryCount: 2,
      coverImageUrl: sushiVideo?.thumbnailUrl || "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800",
    },
    {
      title: "Rivera Family Kitchen Throwdown",
      slug: "rivera-family-kitchen-throwdown-" + Date.now(),
      description: "The Rivera family is opening the kitchen to challengers. Your mission: make a traditional Mexican dish with a modern fitness twist — high protein, low carb, maximum flavor.",
      sourceType: "external" as const,
      challengeType: "culture_variation" as const,
      scopeType: "circle" as const,
      battleStatus: "judging" as const,
      createdBy: carlos.id,
      battleWorthinessScore: 7.4,
      maxTeamSize: 4,
      registrationStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      registrationEnd: yesterday,
      prepStart: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      submissionDeadline: yesterday,
      judgingEnd: weekOut,
      participantCount: 6,
      entryCount: 6,
      coverImageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800",
    },
    {
      title: "Budget Pasta Battle — $5 Challenge",
      slug: "budget-pasta-battle-5-challenge-" + Date.now(),
      description: "Great pasta doesn't need expensive ingredients. Make the best pasta dish you can with a $5 budget. Judged on flavor, creativity, and value.",
      sourceType: "external" as const,
      challengeType: "budget_battle" as const,
      scopeType: "public" as const,
      battleStatus: "open" as const,
      createdBy: leila.id,
      battleWorthinessScore: 8.9,
      maxTeamSize: 1,
      registrationStart: now,
      registrationEnd: twoWeeks,
      prepStart: now,
      submissionDeadline: twoWeeks,
      participantCount: 22,
      entryCount: 11,
      coverImageUrl: "https://images.unsplash.com/photo-1551183053-bf91798d792e?w=800",
    },
  ]).returning();

  console.log(`Created ${battles.length} battles`);

  // Add requirements for each battle
  const requirementsData = [
    {
      battleId: battles[0].id,
      ingredientList: ["Pork neck bones (2-3 lbs)", "Chicken carcass", "Garlic (1 head)", "Ginger (3 inch piece)", "Green onions", "Ramen noodles", "Soy sauce", "Mirin", "Salt"],
      optionalSubstitutions: ["Chicken only (no pork) for lighter broth", "Store-bought broth as base shortcut", "Rice noodles for gluten-free version"],
      toolList: ["Large stock pot (6+ qt)", "Fine mesh strainer", "Ladle", "Deep bowls"],
      estimatedCostMin: 15, estimatedCostMax: 30,
      estimatedTimeMinutes: 180,
      difficultyLevel: 4,
      dietaryNotes: [],
      regionNotes: "Pork bones available at Asian grocery stores. Chicken version is more widely accessible.",
    },
    {
      battleId: battles[1].id,
      ingredientList: ["Black beans (dried or canned)", "Onion", "Garlic", "Cumin", "Oregano", "Bay leaves", "Salt and pepper", "Olive oil", "Rice or tortillas"],
      optionalSubstitutions: ["Pinto beans instead of black beans", "Smoked paprika for extra depth", "Add chorizo for non-vegetarian version"],
      toolList: ["Dutch oven or heavy pot", "Wooden spoon", "Pressure cooker (optional)"],
      estimatedCostMin: 5, estimatedCostMax: 12,
      estimatedTimeMinutes: 90,
      difficultyLevel: 2,
      dietaryNotes: ["vegan", "vegetarian"],
      regionNotes: "Ingredients universally available.",
    },
    {
      battleId: battles[2].id,
      ingredientList: ["Eggs (large, room temp)", "Soy sauce (1/2 cup)", "Mirin (1/4 cup)", "Rice vinegar (2 tbsp)", "Sugar (1 tsp)", "Water (1/4 cup)"],
      optionalSubstitutions: ["Tamari for gluten-free", "Coconut aminos for lower sodium", "Add chili for spicy version"],
      toolList: ["Small saucepan", "Timer", "Ice bath bowl", "Airtight container for marinating"],
      estimatedCostMin: 3, estimatedCostMax: 6,
      estimatedTimeMinutes: 30,
      difficultyLevel: 1,
      dietaryNotes: ["vegetarian"],
      regionNotes: "Soy sauce and mirin available at most grocery stores, Asian aisle.",
    },
    {
      battleId: battles[3].id,
      ingredientList: ["Sushi rice", "Rice vinegar", "Nori sheets", "Avocado", "Cucumber", "Carrots", "Mango", "Cream cheese (vegan)"],
      optionalSubstitutions: ["Cauliflower rice for low-carb", "Hearts of palm as crab substitute", "Jackfruit for texture variety"],
      toolList: ["Bamboo sushi mat", "Sharp knife", "Rice cooker or pot", "Small bowl of water"],
      estimatedCostMin: 10, estimatedCostMax: 18,
      estimatedTimeMinutes: 60,
      difficultyLevel: 3,
      dietaryNotes: ["vegan", "plant-based"],
      regionNotes: "Nori and sushi rice available at Asian grocery stores or online.",
    },
    {
      battleId: battles[4].id,
      ingredientList: ["Your choice of protein", "Vegetables (your choice)", "Spices from your pantry", "Tortillas or rice"],
      optionalSubstitutions: ["Any protein works", "Regional vegetables welcome"],
      toolList: ["Skillet", "Sharp knife", "Cutting board"],
      estimatedCostMin: 8, estimatedCostMax: 20,
      estimatedTimeMinutes: 45,
      difficultyLevel: 2,
      dietaryNotes: [],
      regionNotes: null,
    },
    {
      battleId: battles[5].id,
      ingredientList: ["Pasta (any shape, ~$1)", "Garlic (2-3 cloves)", "Olive oil", "Parmesan or nutritional yeast", "Salt and pepper", "Fresh or dried herbs"],
      optionalSubstitutions: ["Any cheese works", "Tomato sauce from canned tomatoes", "Add an egg for carbonara style"],
      toolList: ["Large pot", "Pan or skillet", "Strainer", "Grater"],
      estimatedCostMin: 3, estimatedCostMax: 5,
      estimatedTimeMinutes: 25,
      difficultyLevel: 1,
      dietaryNotes: ["vegetarian"],
      regionNotes: "All ingredients available at any grocery store.",
    },
  ];

  await db.insert(battleRequirementsTable).values(requirementsData);
  console.log("Created battle requirements");

  // Add sample entries to the live battle (tonkotsu)
  const entryImages = [
    "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=600",
    "https://images.unsplash.com/photo-1591814468924-caf88d1232e1?w=600",
    "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600",
  ];

  const entries = [
    {
      battleId: battles[0].id,
      userId: carlos.id,
      photoUrl: entryImages[0],
      caption: "My spin on tonkotsu — added smoked chipotle to the tare for a Latin twist. 4 hours of simmering paid off!",
      journalNote: "Key insight: the secret is the low and slow boil. Too high and the broth gets cloudy. Next time I'd add more green onions to the garnish.",
      substitutionsUsed: ["Used chicken + pork mix", "Chipotle in tare"],
      status: "submitted" as const,
      completionScore: 9.0,
      creativityScore: 8.5,
      presentationScore: 8.8,
      peerVotes: 12,
      totalScore: 8.77,
      rank: 1,
    },
    {
      battleId: battles[0].id,
      userId: priya.id,
      photoUrl: entryImages[1],
      caption: "Vegetarian tonkotsu using kombu and shiitake. The umami is real — I promise you won't miss the pork!",
      journalNote: "Used a blend of kombu, dried shiitake, and miso for the base. It took longer to develop the richness but worth every minute.",
      substitutionsUsed: ["Full vegetarian broth", "Kombu + shiitake base", "Miso for depth"],
      status: "submitted" as const,
      completionScore: 8.5,
      creativityScore: 9.5,
      presentationScore: 8.0,
      peerVotes: 9,
      totalScore: 8.67,
      rank: 2,
    },
    {
      battleId: battles[0].id,
      userId: tom.id,
      photoUrl: entryImages[2],
      caption: "Classic technique, classic results. 36 hours was non-negotiable. The double chashu is my signature.",
      journalNote: "Stuck to the traditional method. The key was blanching the bones first to remove impurities. Second attempt was dramatically better than the first.",
      substitutionsUsed: [],
      status: "submitted" as const,
      completionScore: 9.5,
      creativityScore: 7.0,
      presentationScore: 9.0,
      peerVotes: 15,
      totalScore: 8.5,
      rank: 3,
    },
  ];

  await db.insert(battleEntriesTable).values(entries);
  console.log("Created battle entries");

  // Add interest tracking for global battles
  const interestData = [
    { battleId: battles[2].id, userId: maya.id, intentType: "wants_to_join" as const },
    { battleId: battles[2].id, userId: carlos.id, intentType: "opened_prep" as const },
    { battleId: battles[2].id, userId: leila.id, intentType: "saved" as const },
    { battleId: battles[5].id, userId: maya.id, intentType: "wants_to_join" as const },
    { battleId: battles[5].id, userId: priya.id, intentType: "wants_to_join" as const },
    { battleId: battles[0].id, userId: leila.id, intentType: "viewed" as const },
  ];

  await db.insert(battleInterestTable).values(interestData);
  console.log("Created interest tracking data");

  console.log("✅ Battle engine seeding complete!");
  process.exit(0);
}

seedBattles().catch((e) => {
  console.error(e);
  process.exit(1);
});
