// Only checks for mistakes the build lets through and that crash only when
// that screen is shown, such as a name that's used but never defined or
// imported. Runs as part of `npm test`.
import globals from 'globals';
import react from 'eslint-plugin-react';

export default [
  { ignores: ['dist/', 'src-tauri/', 'node_modules/'] },
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser }
    },
    rules: {
      'no-undef': 'error', // a variable that doesn't exist
      'react/jsx-no-undef': 'error', // a component that doesn't exist
      'react/jsx-uses-vars': 'error' // (lets no-undef see JSX use)
    }
  },
  {
    files: ['src/**/*.test.js', 'vite.config.js', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } }
  }
];
