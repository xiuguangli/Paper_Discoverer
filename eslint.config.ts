import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import pluginPlaywright from 'eslint-plugin-playwright'
import vueParser from 'vue-eslint-parser'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default [
  // 全局忽略
  {
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**']
  },
  
  // Vue配置
  ...pluginVue.configs['flat/essential'],
  
  // TypeScript配置
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      }
    }
  },
  
  // Vue文件特别配置
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: process.cwd(),
        extraFileExtensions: ['.vue']
      }
    }
  },
  
  // Vitest配置
  {
    files: ['src/**/__tests__/*'],
    plugins: {
      vitest: pluginVitest,
    },
    rules: {
      "vitest/expect-expect": "error",
      "vitest/no-identical-title": "error",
      "vitest/no-standalone-expect": "error"
    },
    languageOptions: {
      globals: {
        suite: 'readonly',
        test: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly'
      }
    }
  },
  
  // Playwright配置
  {
    files: ['e2e/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    plugins: {
      playwright: pluginPlaywright,
    },
    rules: {
      "playwright/expect-expect": "error",
      "playwright/no-skipped-test": "warn",
      "playwright/valid-expect": "error"
    },
    languageOptions: {
      globals: {
        page: 'readonly',
        browser: 'readonly',
        context: 'readonly'
      }
    }
  }
]
