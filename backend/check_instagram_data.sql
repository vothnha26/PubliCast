-- 1. Check SocialAccount + InstagramAccount
SELECT sa.id, sa.username, sa.platform, sa.profilePictureUrl, sa.updatedAt,
       ia.followersCount, ia.followingCount, ia.mediaCount
FROM SocialAccount sa
LEFT JOIN InstagramAccount ia ON ia.socialAccountId = sa.id
WHERE sa.platform = 'INSTAGRAM'
LIMIT 5;
