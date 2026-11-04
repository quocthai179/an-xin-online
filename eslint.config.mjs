import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // DESIGN section 11: user text is only ever rendered as React text nodes
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is banned: all user content is rendered as plain text.',
        },
      ],
    },
  },
  {
    // The 3D scene mutates three.js objects (pools of meshes/sprites/materials) inside useFrame by design.
    files: ['src/components/scene/**/*.tsx'],
    rules: { 'react-hooks/immutability': 'off' },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'coverage/**', 'e2e/**'],
  },
];

export default config;
