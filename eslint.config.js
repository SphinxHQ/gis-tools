import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import * as parserVue from 'vue-eslint-parser'
import configTs from '@typescript-eslint/eslint-plugin'
import parserTs from '@typescript-eslint/parser'
import pluginImport from 'eslint-plugin-import'
import pluginUnusedImports from 'eslint-plugin-unused-imports'

const sharedGlobals = {
  console: 'readonly',
  window: 'readonly',
  document: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  Blob: 'readonly',
  File: 'readonly',
  FileReader: 'readonly',
  URL: 'readonly',
  Uint8Array: 'readonly',
  ArrayBuffer: 'readonly',
  TextDecoder: 'readonly',
  Date: 'readonly',
  Math: 'readonly',
  JSON: 'readonly',
  Promise: 'readonly',
  Error: 'readonly',
  Map: 'readonly',
  Set: 'readonly',
  Reflect: 'readonly',
  IDBFactory: 'readonly',
  IDBDatabase: 'readonly',
  IDBObjectStore: 'readonly',
  IDBRequest: 'readonly',
  IDBOpenDBRequest: 'readonly',
  IDBTransaction: 'readonly',
  ResizeObserver: 'readonly',
  MouseEvent: 'readonly',
  GeoJSON: 'readonly',
  process: 'readonly',
  module: 'readonly',
  require: 'readonly',
  __dirname: 'readonly',
  import: 'readonly',
  vi: 'readonly',
  describe: 'readonly',
  it: 'readonly',
  expect: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
}

const sharedRules = {
  '@typescript-eslint/no-unused-vars': 'error',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/ban-ts-comment': 'off',
  '@typescript-eslint/ban-types': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-empty-function': 'off',
  'no-unused-vars': 'off',
  'no-console': 'warn',
  'no-debugger': 'warn',
  'no-empty': 'off',
  'no-prototype-builtins': 'off',
  'no-async-promise-executor': 'off',
  'no-constant-condition': 'off',
  'no-useless-escape': 'off',
  'no-empty-pattern': 'off',
  'no-case-declarations': 'off',
  'no-fallthrough': 'off',
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': [
    'warn',
    {
      args: 'after-used',
      argsIgnorePattern: '^_',
      vars: 'all',
      varsIgnorePattern: '^_',
    },
  ],
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object'],
      'newlines-between': 'always',
      pathGroups: [
        {
          pattern: '~/**',
          group: 'internal',
        },
      ],
      alphabetize: {
        order: 'asc',
        caseInsensitive: false,
      },
    },
  ],
  'import/no-unresolved': 'off',
  'import/first': 'error',
  'import/no-mutable-exports': 'error',
  'import/no-cycle': 'off',
  'import/no-self-import': 'error',
  'import/no-duplicates': 'error',
}

export default [
  {
    ignores: [
      'node_modules',
      'dist',
      '*.local',
      '*.log*',
      '.vscode',
      '.idea',
      '*.sh',
      'public',
      '.husky',
      '.vite',
      '**/*.test.ts',
      '**/*.spec.ts',
      'src/__tests__',
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: parserVue,
      parserOptions: {
        parser: parserTs,
        ecmaVersion: 'latest',
        sourceType: 'module',
        jsxPragma: 'React',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: sharedGlobals,
    },
    plugins: {
      '@typescript-eslint': configTs,
      'unused-imports': pluginUnusedImports,
      import: pluginImport,
    },
    rules: {
      ...sharedRules,
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/require-default-prop': 'off',
      'vue/require-explicit-emits': 'off',
      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'always',
            normal: 'always',
            component: 'always',
          },
          svg: 'always',
          math: 'always',
        },
      ],
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-indent': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/no-unused-vars': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        jsxPragma: 'React',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: sharedGlobals,
    },
    plugins: {
      '@typescript-eslint': configTs,
      'unused-imports': pluginUnusedImports,
      import: pluginImport,
    },
    rules: sharedRules,
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: sharedGlobals,
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]
