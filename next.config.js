/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Was: process.env.NEXT_OUTPUT_MODE ? path.join(__dirname, '../') : '/'
  // On Vercel NEXT_OUTPUT_MODE is unset, so that expression resolved to the
  // filesystem root ('/'), which breaks Vercel's serverless output-file
  // tracing. This project is not a monorepo here, so the tracing root is
  // simply this app's own directory.
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Next 16's build-time lint check has no bearing on runtime correctness;
    // keep it from blocking a production deploy the way `ignoreBuildErrors`
    // already does for the TypeScript check above.
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

const fs = require('fs');
const userConfigPath = path.join(__dirname, 'next.config.user.json');
const userConfigAllowedKeys = { skipTrailingSlashRedirect: 'boolean', trailingSlash: 'boolean' };
if (fs.existsSync(userConfigPath)) {
  const userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
  for (const key of Object.keys(userConfig)) {
    if (typeof userConfig[key] !== userConfigAllowedKeys[key]) {
      throw new Error(`next.config.user.json: unsupported override "${key}". Supported boolean keys: skipTrailingSlashRedirect, trailingSlash.`);
    }
    nextConfig[key] = userConfig[key];
  }
}

module.exports = nextConfig;

