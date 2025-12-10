import antfu from '@antfu/eslint-config';

export default antfu(
  {
    stylistic: {
      quotes: 'single',
      semi: true,
    },
  },
  {
    rules: {
      'node/prefer-global/buffer': 'off',
      'unused-imports/no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-console': 'off',
      'node/prefer-global/process': 'off',
      'perfectionist/sort-imports': [
        'error',
        {
          newlinesBetween: 'always',
          internalPattern: ['^\\$lib/.+'],
        },
      ],
    },
  },
);
