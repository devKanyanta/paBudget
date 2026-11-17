// PM2 process definitions. Lives at the VPS app root (~/pabudget), next to
// backend/ and web/ which are shipped pre-built from GitHub Actions.
// Secrets: backend/.env (dotenv). Web needs none at runtime (NEXT_PUBLIC_* are baked in at build).
module.exports = {
  apps: [
    {
      name: 'pabudget-api',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      env: { NODE_ENV: 'production', PORT: 4000 },
      max_memory_restart: '500M',
    },
    {
      name: 'pabudget-web',
      cwd: './web',
      script: 'server.js',
      env: { NODE_ENV: 'production', PORT: 4001, HOSTNAME: '127.0.0.1' },
      max_memory_restart: '700M',
    },
  ],
};
