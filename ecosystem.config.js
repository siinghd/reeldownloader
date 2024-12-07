module.exports = {
  apps: [
    {
      name: 'instagram-downloader',
      script: 'bun',
      args: 'server.ts',
      watch: true,
      env: {
        NODE_ENV: 'production',
        PORT: 3334,
      },
    },
  ],
};
