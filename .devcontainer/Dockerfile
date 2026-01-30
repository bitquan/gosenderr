FROM node:20-bullseye

# Install pnpm and firebase-tools
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm i -g firebase-tools

# Install Java for Firestore emulator
USER root
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/* && \
    # Install Eclipse Temurin JDK 21 (detect arch and fetch matching binary)
    set -eux; \
    ARCH=$(dpkg --print-architecture); \
    if [ "$ARCH" = "arm64" ]; then ARCH_TAG="aarch64"; else ARCH_TAG="x64"; fi; \
    JDK_VERSION=21; \
    curl -sL "https://api.adoptium.net/v3/binary/latest/${JDK_VERSION}/ga/linux/${ARCH_TAG}/jdk/hotspot/normal/adoptium" -o /tmp/jdk.tar.gz; \
    mkdir -p /opt/jdk && tar -xzf /tmp/jdk.tar.gz -C /opt/jdk --strip-components=1; \
    rm /tmp/jdk.tar.gz; \
    update-alternatives --install /usr/bin/java java /opt/jdk/bin/java 1; \
    java -version

# Create app directory
WORKDIR /workspace

# Default user
ARG UID=1000
ARG GID=1000
RUN groupadd -g ${GID} devgroup || true && useradd -m -u ${UID} -g ${GID} devuser || true
# We run as root inside the emulator container to avoid user mapping issues.

# Path
ENV PATH="/home/devuser/.local/bin:$PATH"

# Add entrypoint to normalize ownership of mounted volumes (firebase-emulator-data)
COPY .devcontainer/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create emulator data dir at build time and set ownership (best-effort)
RUN mkdir -p /workspace/firebase-emulator-data && chown -R ${UID}:${GID} /workspace/firebase-emulator-data || true

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["sh", "-c", "npm i -g firebase-tools && npx firebase emulators:start --only auth,firestore,functions --export-on-exit ./firebase-emulator-data"]
