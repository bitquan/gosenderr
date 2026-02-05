Title: Xcode Pod Build Failure Diagnostics

Environment

- macOS (local dev machine)
- Xcode 26.2 (as used by `xcodebuild` on macOS runner)
- React Native: 0.76.5 (project uses RN)

Reproduction (local)

1. cd apps/courieriosnativeclean/ios
2. pod install
3. Run triage script (fast + build mode):
   - ../../scripts/test-pods-targets.sh --build --targets="gRPC-Core,rnmapbox-maps"

Background / Observations

- The failing pods that need triage are: **BoringSSL-GRPC**, **gRPC-Core**, and **rnmapbox-maps**.
- During quick per-target runs we observed:
  - BoringSSL-GRPC compilation fails with missing OpenSSL headers (e.g. `openssl/ssl.h`, `openssl/asn1t.h`).
  - `rnmapbox-maps` is sometimes absent from Pods project (in some clean workspaces) and in other runs compiles many files until the build was manually interrupted.
  - We also saw repeated warnings: "ONLY_ACTIVE_ARCH=YES requested with multiple ARCHS and no active architecture could be computed" — suggesting we should pass an explicit simulator destination in CI to limit architectures.

Logs

- gRPC-Core immediate failure snippet: `gRPC-Core-first-errors.txt`
- rnmapbox tail: `rnmapbox-last-tail.txt`

Next steps

1. Run CI job that executes `scripts/test-pods-targets.sh --build` with an explicit simulator destination to capture the first failing compiler errors in a reproducible run.
2. Inspect/fix how BoringSSL-GRPC includes OpenSSL headers (add missing header search paths or ensure the pod author-provided headers are available).
3. If a source-level fix is required, allow Copilot on a PR to propose small patches and re-run the CI job.

Notes

- The included GitHub Actions workflow is intentionally minimal: it installs CocoaPods, runs the triage script for the two suspect targets, and uploads artifacts containing the logs for quick review. It runs on macOS and uses an explicit iOS simulator destination to avoid building unnecessary architectures.
