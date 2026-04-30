// ESLint flat config para el backend (Node 22 + TypeScript).
// Filosofía: empezar permisivo (todos los nuevos warnings, no errors) para
// no romper el codebase actual con sus 437 `any`. A medida que reduzcamos
// los warnings, ir subiendo a `error`.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'coverage/**',
            'logs/**',
            'uploads/**',
            '__legacy_tests__/**',
            'prisma/migrations/**',
            'prisma/init-rls.js',
            'prisma/bootstrap.js',
            'scripts/**', // helpers de operaciones, no parte del codebase principal
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            // Tolerable hoy, pero queremos bajar de 437 → 0 con el tiempo.
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],

            // Bugs reales (Promise sin await, await en non-thenable, etc.).
            '@typescript-eslint/no-floating-promises': 'off', // requiere typed-linting; activar después
            'no-async-promise-executor': 'error',
            'no-return-await': 'off',
            'require-await': 'warn',

            // Estilo / consistency
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],

            // Permite `console.*` (usamos winston pero algunos scripts hacen console).
            'no-console': 'off',

            // Express handlers retornan a veces `Response | void`, no es bug.
            '@typescript-eslint/no-unused-expressions': [
                'warn',
                { allowShortCircuit: true, allowTernary: true },
            ],
        },
    },
    // Configs separadas para tests — más permisivo
    {
        files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
);
