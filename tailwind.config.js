module.exports = {
  purge: {
    // enabled: process.env.NODE_ENV !== 'development',
    content: ['./src/**/*.ts', './src/**/*.tsx'],
    options: {
      defaultExtractor: (content) => content.match(/[\w-/.:]+(?<!:)/g) || [],
    },
  },
  theme: {
    extend: {},
    customForms: (theme) => ({
      sm: {
        'input, textarea, multiselect, select': {
          fontSize: theme('fontSize.sm'),
          padding: `${theme('spacing.1')} ${theme('spacing.2')}`,
        },
        select: {
          paddingRight: `${theme('spacing.4')}`,
        },
        'checkbox, radio': {
          width: theme('spacing.3'),
          height: theme('spacing.3'),
        },
      },
    }),
  },
  variants: {},
  plugins: [
    require('@tailwindcss/custom-forms'),
    require('@tailwindcss/typography'),
  ],
};
