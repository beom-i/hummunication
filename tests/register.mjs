import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'next/cache' || specifier === 'next/headers' || specifier === 'next/server') return next(specifier + '.js', context);
  if (specifier.startsWith('@/')) {
    const base = new URL('../src/' + specifier.slice(2), import.meta.url);
    for (const suffix of ['.ts', '.tsx', '/index.ts']) {
      const candidate = new URL(base.href + suffix);
      if (existsSync(candidate)) return next(candidate.href, context);
    }
  }
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const base = new URL(specifier, context.parentURL);
    for (const suffix of ['.ts', '.tsx']) if (existsSync(new URL(base.href + suffix))) return next(base.href + suffix, context);
  }
  return next(specifier, context);
}});
