FROM ubuntu:22.04

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Configure apt and install packages
RUN apt-get update \
    && apt-get -y install --no-install-recommends apt-utils dialog 2>&1 \
    # Install essential packages
    && apt-get -y install \
        git \
        curl \
        wget \
        unzip \
        xz-utils \
        zip \
        libglu1-mesa \
        openjdk-8-jdk \
        build-essential \
        libssl-dev \
        clang \
        cmake \
        ninja-build \
        pkg-config \
        libgtk-3-dev \
        liblzma-dev \
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV JAVA_HOME="/usr/lib/jvm/java-8-openjdk-amd64"
ENV FLUTTER_HOME="/opt/flutter"
ENV FLUTTER_VERSION="3.16.0"
ENV PATH="$FLUTTER_HOME/bin:$PATH"

# Install Flutter
RUN git clone https://github.com/flutter/flutter.git -b stable $FLUTTER_HOME \
    && flutter precache \
    && flutter config --enable-web \
    && flutter config --enable-linux-desktop \
    && flutter config --no-analytics \
    && chmod -R 755 $FLUTTER_HOME

# Install Android SDK
ENV ANDROID_HOME="/opt/android-sdk"
ENV ANDROID_SDK_ROOT="$ANDROID_HOME"
ENV PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

RUN mkdir -p $ANDROID_HOME/cmdline-tools \
    && cd $ANDROID_HOME/cmdline-tools \
    && wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip \
    && unzip commandlinetools-linux-9477386_latest.zip \
    && mv cmdline-tools latest \
    && rm commandlinetools-linux-9477386_latest.zip

# Accept Android SDK licenses
RUN yes | sdkmanager --licenses \
    && sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"

# Install Firebase CLI
RUN curl -sL https://firebase.tools | bash

# Create working directory
WORKDIR /workspace

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=dialog

# Set default shell
SHELL ["/bin/bash", "-c"]