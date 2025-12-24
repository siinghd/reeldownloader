module.exports = {
  apps: [
    {
      name: 'reelgrab',
      script: 'bun',
      args: 'index.ts',
      cwd: '/home/deploy/reeldownloader',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3021,
        INSTAGRAM_COOKIE: process.env.INSTAGRAM_COOKIE || '',
      },
    },
  ],
};
