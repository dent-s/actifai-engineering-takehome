// eslint.config.js
import eslint from '@eslint/js'; // Recommended rules
import globals from 'globals'; // For defining global variables

export default [
  eslint.configs.recommended, // Extends ESLint's recommended rules
  {
    languageOptions: {
      ecmaVersion: 2022, // Specify ECMAScript version
      sourceType: 'commonjs', // Use ES modules
      globals: {
        ...globals.node // Define Node.js global variables (e.g., process, require)
      }
    },
    rules: {
      // Custom rules can be added here
      'no-unused-vars': 'warn', // Warn about unused variables
      'indent': ['error', 2] // Enforce 2-space indentation
    }
  }
];