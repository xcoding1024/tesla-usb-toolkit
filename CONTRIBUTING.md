# Contributing

## Language

- **Commit messages**: English only. Use the imperative mood (`Add`, `Fix`, `Update`), and write one or two sentences on *why*.
- **Pull requests**: titles and bodies in English (same tone as commits).
- **Documentation**: English is the source of truth. Add a short **中文摘要** when the audience is mixed.
- **UI copy**: keep `src/i18n/en.ts` and `src/i18n/zh.ts` on the same key tree. Default locale is English.

## Workflow

1. Fork or clone this repository.
2. `npm install`
3. `npm run typecheck` and `npm test`
4. For desktop behavior: `npm run tauri dev`
5. Open a pull request against `main`

Keep files under 50 MB (hard limit 100 MB). Do not commit `node_modules`, `src-tauri/target`, or secrets.

## License

By contributing, you agree that your work is licensed under the **MIT License**, the same as this repository.
