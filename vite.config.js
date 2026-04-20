import { defineConfig } from 'vite';

export default defineConfig(() => {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

  return {
    base: isGitHubActions && repo ? `/${repo}/` : '/',
    server: {
      host: true,
    },
  };
});
