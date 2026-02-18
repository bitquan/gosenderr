# Senderr iOS Templates

This directory is the source of truth for canonical iOS bootstrap files used by:

- `apps/courieriosnativeclean/ios/Podfile`
- `apps/courieriosnativeclean/ios/.xcode.env`
- `apps/courieriosnativeclean/ios/LocalDebug.xcconfig`

## Sync commands

```bash
pnpm run ios:pod:sync
pnpm run ios:pod:check
```

## Notes

- Update templates first, then sync into `apps/courieriosnativeclean/ios`.
- Do not hand-edit generated target support files in `Pods/`.
