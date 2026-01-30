FROM node:20-bullseye

# Install pnpm and firebase-tools
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm i -g firebase-tools

# Create app directory
WORKDIR /workspace

# Default user
ARG UID=1000
ARG GID=1000
RUN groupadd -g ${GID} devgroup || true && useradd -m -u ${UID} -g ${GID} devuser || true
USER devuser

# Path
ENV PATH="/home/devuser/.local/bin:$PATH"
