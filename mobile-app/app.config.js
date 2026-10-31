// Extends app.json. Only for the GitHub Pages web build: when EXPO_WEB_BASE_URL is set
// (e.g. Rahati/app), the web app is built to live under /Rahati/app. Phone builds and
// `expo start` don't set it, so they are unchanged.
// (Given without the leading slash because Git Bash on Windows rewrites "/x" into a Windows path.)
const base = process.env.EXPO_WEB_BASE_URL;

module.exports = ({ config }) =>
  base ? { ...config, experiments: { ...config.experiments, baseUrl: "/" + base.replace(/^\/+|\/+$/g, "") } } : config;
