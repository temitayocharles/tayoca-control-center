import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // This application does not use the React Compiler. These compiler-oriented
      // diagnostics reject established, valid synchronization patterns in the upstream app.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',
    },
  },
  {
    files: ['src/components/WorkflowTable.tsx'],
    rules: {
      // The existing switch uses uniquely named lexical declarations and is safe as written.
      'no-case-declarations': 'off',
    },
  },
  {
    files: ['src/contexts/**/*.{ts,tsx}', 'src/components/Toast.tsx'],
    rules: {
      // Context/provider modules intentionally co-export hooks alongside components.
      'react-refresh/only-export-components': 'off',
    },
  },
])
