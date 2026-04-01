import { pool } from "@workspace/db";

interface VideoRow {
  id: number;
  like_count: number;
  save_count: number;
  comment_count: number;
}

async function main() {
  console.log("Seeding hack approval data...");

  const { rows: videos } = await pool.query<VideoRow>(
    "SELECT id, like_count, save_count, comment_count FROM videos ORDER BY id ASC"
  );

  if (videos.length === 0) {
    console.log("No videos found. Run the main seed first.");
    process.exit(1);
  }

  const voteSeeds: { videoId: number; userId: number; voteType: "up" | "down" }[] = [
    { videoId: 1, userId: 2, voteType: "up" },
    { videoId: 1, userId: 3, voteType: "up" },
    { videoId: 1, userId: 4, voteType: "up" },
    { videoId: 1, userId: 5, voteType: "up" },
    { videoId: 2, userId: 1, voteType: "up" },
    { videoId: 2, userId: 3, voteType: "up" },
    { videoId: 2, userId: 4, voteType: "up" },
    { videoId: 2, userId: 5, voteType: "down" },
    { videoId: 3, userId: 1, voteType: "up" },
    { videoId: 3, userId: 2, voteType: "up" },
    { videoId: 3, userId: 4, voteType: "up" },
    { videoId: 3, userId: 5, voteType: "up" },
    { videoId: 4, userId: 1, voteType: "up" },
    { videoId: 4, userId: 2, voteType: "down" },
    { videoId: 4, userId: 3, voteType: "up" },
    { videoId: 5, userId: 1, voteType: "up" },
    { videoId: 5, userId: 2, voteType: "up" },
    { videoId: 5, userId: 3, voteType: "up" },
    { videoId: 5, userId: 4, voteType: "up" },
    { videoId: 5, userId: 5, voteType: "up" },
    { videoId: 6, userId: 1, voteType: "up" },
    { videoId: 6, userId: 2, voteType: "down" },
    { videoId: 7, userId: 2, voteType: "up" },
    { videoId: 7, userId: 3, voteType: "up" },
    { videoId: 7, userId: 4, voteType: "up" },
    { videoId: 7, userId: 5, voteType: "down" },
    { videoId: 8, userId: 1, voteType: "up" },
    { videoId: 8, userId: 2, voteType: "up" },
    { videoId: 8, userId: 3, voteType: "up" },
    { videoId: 8, userId: 4, voteType: "up" },
    { videoId: 9, userId: 1, voteType: "up" },
    { videoId: 9, userId: 2, voteType: "up" },
    { videoId: 9, userId: 3, voteType: "up" },
    { videoId: 10, userId: 1, voteType: "up" },
    { videoId: 10, userId: 2, voteType: "up" },
    { videoId: 10, userId: 4, voteType: "down" },
  ];

  const existingVideoIds = new Set(videos.map(v => v.id));
  const validVotes = voteSeeds.filter(v => existingVideoIds.has(v.videoId));

  for (const vote of validVotes) {
    await pool.query(
      `INSERT INTO hack_votes (video_id, user_id, vote_type) VALUES ($1, $2, $3)
       ON CONFLICT (video_id, user_id) DO UPDATE SET vote_type = EXCLUDED.vote_type`,
      [vote.videoId, vote.userId, vote.voteType]
    );
  }

  const upvoteCounts: Record<number, number> = {};
  const downvoteCounts: Record<number, number> = {};
  for (const vote of validVotes) {
    if (vote.voteType === "up") upvoteCounts[vote.videoId] = (upvoteCounts[vote.videoId] ?? 0) + 1;
    else downvoteCounts[vote.videoId] = (downvoteCounts[vote.videoId] ?? 0) + 1;
  }

  const aiReviews: Record<number, { status: string; aiScore: number; aiAnalysis: string; approvedAt: string | null }> = {
    1: {
      status: "approved",
      aiScore: 8.4,
      aiAnalysis: "This hack communicates its technique with excellent clarity — the step-by-step structure makes it immediately actionable for home cooks at any level. Originality is a standout here. The approach challenges conventional cooking assumptions and introduces a genuinely fresh technique to the community canon. Highly practical — concise, well-scoped, and immediately applicable without special equipment or advanced skill. Community response is strongly positive. Overall score: 8.4/10 — Approved for the Community Cookbook.",
      approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    2: {
      status: "approved",
      aiScore: 7.7,
      aiAnalysis: "The core idea is clearly presented, though additional detail on timing or quantities would make this even more replicable. Originality is a standout — the approach challenges conventional cooking assumptions. Highly practical and immediately actionable. Community response is strongly positive. Overall score: 7.7/10 — Approved for the Community Cookbook.",
      approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    3: {
      status: "approved",
      aiScore: 9.1,
      aiAnalysis: "This hack communicates its technique with excellent clarity. Originality is exceptional — this approach challenges conventional cooking assumptions and introduces a genuinely fresh technique. Highly practical and immediately applicable. Community response is overwhelmingly positive. Overall score: 9.1/10 — Approved for the Community Cookbook.",
      approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    5: {
      status: "approved",
      aiScore: 8.8,
      aiAnalysis: "This hack communicates its technique with excellent clarity. Originality is exceptional — this approach to flavor layering is rarely explained this clearly in community content. Highly practical and immediately actionable. Community response is overwhelmingly positive. Overall score: 8.8/10 — Approved for the Community Cookbook.",
      approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    6: {
      status: "challenged",
      aiScore: 5.9,
      aiAnalysis: "The concept shows promise but needs clearer instruction — consider specifying temperatures, ratios, or timing to improve reproducibility. The technique has a solid creative angle but closely follows established approaches. Community engagement is mixed. Overall score: 5.9/10 — Needs refinement before approval.",
      approvedAt: null,
    },
  };

  for (const video of videos) {
    const upvotes = upvoteCounts[video.id] ?? 0;
    const downvotes = downvoteCounts[video.id] ?? 0;
    const total = upvotes + downvotes;
    const review = aiReviews[video.id];

    let hackStatus = "submitted";
    if (total >= 3) hackStatus = "community_voting";
    if (review && review.status) hackStatus = review.status;

    const engagementScore = video.like_count + video.save_count * 2 + upvotes * 3 + video.comment_count;

    if (review && review.aiScore > 0) {
      await pool.query(
        `UPDATE videos SET
          community_upvotes = $1, community_downvotes = $2,
          hack_status = $3, creative_engagement_score = $4,
          ai_score = $5, ai_analysis = $6, ai_reviewed_at = NOW(),
          approved_at = $7
         WHERE id = $8`,
        [upvotes, downvotes, hackStatus, engagementScore,
         review.aiScore, review.aiAnalysis, review.approvedAt, video.id]
      );
    } else {
      await pool.query(
        `UPDATE videos SET
          community_upvotes = $1, community_downvotes = $2,
          hack_status = $3, creative_engagement_score = $4
         WHERE id = $5`,
        [upvotes, downvotes, hackStatus, engagementScore, video.id]
      );
    }
  }

  console.log(`✅ Updated ${videos.length} videos with hack approval data`);
  await pool.end();
  process.exit(0);
}

main().catch(console.error);
