/** Conventional Commits, enforced in CI on every commit of every PR (ecosystem §3.2). */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
  },
};
