module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || ""
  });
};
